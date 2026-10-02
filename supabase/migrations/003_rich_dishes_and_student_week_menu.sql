alter table public.food_items
  add column if not exists ingredients text[] not null default '{}',
  add column if not exists serving_size text;

create or replace function public.resolve_week_menu(
  p_tag_code text,
  p_week_start date
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  tag_record record;
  result_days jsonb;
begin
  select
    cafeteria_table.school_id,
    cafeteria_table.cafeteria_id,
    lower(cafeteria_table.tag_code) as tag_code,
    school.name as school_name,
    school.timezone,
    cafeteria.name as cafeteria_name
  into tag_record
  from public.cafeteria_tables as cafeteria_table
  join public.schools as school on school.id = cafeteria_table.school_id
  join public.cafeterias as cafeteria on cafeteria.id = cafeteria_table.cafeteria_id
  where lower(cafeteria_table.tag_code) = lower(p_tag_code)
    and cafeteria_table.active = true
    and school.active = true
    and cafeteria.active = true
  limit 1;

  if not found then
    return null;
  end if;

  select jsonb_agg(
    jsonb_build_object(
      'serviceDate', day.service_date,
      'meals', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'id', meal_period.id,
            'name', meal_period.name,
            'startsAt', to_char(meal_period.starts_at, 'HH24:MI'),
            'endsAt', to_char(meal_period.ends_at, 'HH24:MI'),
            'items', coalesce((
              select jsonb_agg(
                jsonb_build_object(
                  'id', food.id,
                  'name', food.name,
                  'category', initcap(replace(food.category::text, '_', ' ')),
                  'imageUrl', food.image_url,
                  'description', food.description,
                  'ingredients', food.ingredients,
                  'allergens', food.allergens,
                  'dietaryInformation', food.dietary_information,
                  'servingSize', food.serving_size
                ) order by menu_item.sort_order, food.name
              )
              from public.menu_items as menu_item
              join public.food_items as food on food.id = menu_item.food_item_id
              where menu_item.menu_id = menu.id and food.active = true
            ), '[]'::jsonb)
          ) order by meal_period.sort_order
        )
        from public.menus as menu
        join public.meal_periods as meal_period on meal_period.id = menu.meal_period_id
        where menu.school_id = tag_record.school_id
          and menu.cafeteria_id = tag_record.cafeteria_id
          and menu.service_date = day.service_date
          and menu.published = true
          and meal_period.active = true
      ), '[]'::jsonb)
    ) order by day.service_date
  )
  into result_days
  from generate_series(p_week_start, p_week_start + 6, interval '1 day')
    as day(service_date);

  return jsonb_build_object(
    'schoolName', tag_record.school_name,
    'cafeteriaName', tag_record.cafeteria_name,
    'tagCode', tag_record.tag_code,
    'timezone', tag_record.timezone,
    'weekStart', p_week_start,
    'days', result_days
  );
end;
$$;

revoke all on function public.resolve_week_menu(text, date) from public;
grant execute on function public.resolve_week_menu(text, date)
  to anon, authenticated, service_role;

create index if not exists menus_public_week_lookup_idx
  on public.menus (cafeteria_id, service_date, published);
