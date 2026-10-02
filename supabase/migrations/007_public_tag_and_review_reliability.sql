-- Keep valid table-tag pages available even before the first menu is published,
-- and allow the public API route to submit tightly validated reviews with the
-- project's publishable Supabase client.

create or replace function public.resolve_table_experience(
  p_tag_code text,
  p_now timestamptz default now()
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  tag_record record;
  local_date date;
  local_time time;
  selected_menu_id uuid;
  selected_service_date date;
  selected_meal_id uuid;
  selected_meal_name text;
  selected_starts_at time;
  selected_ends_at time;
  menu_items jsonb := '[]'::jsonb;
  is_current_meal boolean := false;
begin
  select
    cafeteria_table.table_number,
    cafeteria_table.tag_code,
    cafeteria_table.school_id,
    cafeteria_table.cafeteria_id,
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

  local_date := (p_now at time zone tag_record.timezone)::date;
  local_time := (p_now at time zone tag_record.timezone)::time;

  select
    menu.id,
    menu.service_date,
    meal_period.id,
    meal_period.name,
    coalesce(menu.service_starts_at, meal_period.starts_at),
    coalesce(menu.service_ends_at, meal_period.ends_at)
  into
    selected_menu_id,
    selected_service_date,
    selected_meal_id,
    selected_meal_name,
    selected_starts_at,
    selected_ends_at
  from public.menus as menu
  join public.meal_periods as meal_period on meal_period.id = menu.meal_period_id
  where menu.school_id = tag_record.school_id
    and menu.cafeteria_id = tag_record.cafeteria_id
    and menu.published = true
    and meal_period.active = true
    and (
      menu.service_date < local_date
      or (
        menu.service_date = local_date
        and coalesce(menu.service_starts_at, meal_period.starts_at) <= local_time
      )
    )
  order by
    menu.service_date desc,
    coalesce(menu.service_starts_at, meal_period.starts_at) desc
  limit 1;

  if selected_menu_id is not null then
    is_current_meal := selected_service_date = local_date
      and local_time >= selected_starts_at
      and local_time < selected_ends_at;

    select coalesce(
      jsonb_agg(
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
        )
        order by menu_item.sort_order, food.name
      ),
      '[]'::jsonb
    )
    into menu_items
    from public.menu_items as menu_item
    join public.food_items as food on food.id = menu_item.food_item_id
    where menu_item.menu_id = selected_menu_id
      and food.active = true;
  end if;

  return jsonb_build_object(
    'schoolName', tag_record.school_name,
    'cafeteriaName', tag_record.cafeteria_name,
    'tableNumber', tag_record.table_number,
    'tagCode', tag_record.tag_code,
    'timezone', tag_record.timezone,
    'serviceDate', coalesce(selected_service_date, local_date),
    'meal', case
      when selected_meal_id is null then null
      else jsonb_build_object(
        'id', selected_meal_id,
        'name', selected_meal_name,
        'startsAt', to_char(selected_starts_at, 'HH24:MI'),
        'endsAt', to_char(selected_ends_at, 'HH24:MI')
      )
    end,
    'menuId', selected_menu_id,
    'items', menu_items,
    'isCurrentMeal', is_current_meal
  );
end;
$$;

revoke all on function public.submit_public_review(
  text,
  text,
  integer,
  jsonb,
  jsonb,
  text,
  uuid,
  text
) from public;

grant execute on function public.submit_public_review(
  text,
  text,
  integer,
  jsonb,
  jsonb,
  text,
  uuid,
  text
) to anon, authenticated, service_role;
