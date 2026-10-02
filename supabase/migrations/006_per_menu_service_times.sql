alter table public.menus
  add column if not exists service_starts_at time,
  add column if not exists service_ends_at time;

alter table public.menus
  drop constraint if exists menu_service_time_order;

alter table public.menus
  add constraint menu_service_time_order check (
    (service_starts_at is null and service_ends_at is null)
    or (
      service_starts_at is not null
      and service_ends_at is not null
      and service_starts_at < service_ends_at
    )
  );

update public.menus as menu
set
  service_starts_at = meal_period.starts_at,
  service_ends_at = meal_period.ends_at
from public.meal_periods as meal_period
where meal_period.id = menu.meal_period_id
  and (menu.service_starts_at is null or menu.service_ends_at is null);

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
  selected_meal record;
  selected_menu record;
  local_date date;
  local_time time;
  menu_items jsonb := '[]'::jsonb;
  is_current_meal boolean := false;
begin
  select
    cafeteria_table.id as table_id,
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
    and cafeteria.active = true;

  if not found then
    return null;
  end if;

  local_date := (p_now at time zone tag_record.timezone)::date;
  local_time := (p_now at time zone tag_record.timezone)::time;

  select
    menu.*,
    meal_period.id as selected_meal_id,
    meal_period.name as selected_meal_name,
    coalesce(menu.service_starts_at, meal_period.starts_at) as selected_starts_at,
    coalesce(menu.service_ends_at, meal_period.ends_at) as selected_ends_at
  into selected_menu
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

  if found then
    select
      selected_menu.selected_meal_id as id,
      selected_menu.selected_meal_name as name,
      selected_menu.selected_starts_at as starts_at,
      selected_menu.selected_ends_at as ends_at
    into selected_meal;

    is_current_meal := selected_menu.service_date = local_date
      and local_time >= selected_meal.starts_at
      and local_time < selected_meal.ends_at;

    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', food.id,
          'name', food.name,
          'category', initcap(replace(food.category::text, '_', ' ')),
          'imageUrl', food.image_url
        )
        order by menu_item.sort_order, food.name
      ),
      '[]'::jsonb
    )
    into menu_items
    from public.menu_items as menu_item
    join public.food_items as food on food.id = menu_item.food_item_id
    where menu_item.menu_id = selected_menu.id
      and food.active = true;
  end if;

  return jsonb_build_object(
    'schoolName', tag_record.school_name,
    'cafeteriaName', tag_record.cafeteria_name,
    'tableNumber', tag_record.table_number,
    'tagCode', tag_record.tag_code,
    'timezone', tag_record.timezone,
    'serviceDate', coalesce(selected_menu.service_date, local_date),
    'meal', case
      when selected_meal.id is null then null
      else jsonb_build_object(
        'id', selected_meal.id,
        'name', selected_meal.name,
        'startsAt', to_char(selected_meal.starts_at, 'HH24:MI'),
        'endsAt', to_char(selected_meal.ends_at, 'HH24:MI')
      )
    end,
    'menuId', selected_menu.id,
    'items', menu_items,
    'isCurrentMeal', is_current_meal
  );
end;
$$;

create or replace function public.submit_public_review(
  p_tag_code text,
  p_menu_id text,
  p_overall_rating integer,
  p_item_ratings jsonb,
  p_tag_names jsonb,
  p_comment text,
  p_idempotency_key uuid,
  p_anonymous_hash text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  context_record record;
  local_date date;
  local_time time;
  created_review_id uuid;
  item_rating jsonb;
  selected_tag text;
begin
  if p_overall_rating not between 1 and 5 then
    raise exception 'invalid_rating';
  end if;

  if char_length(coalesce(p_comment, '')) > 280 then
    raise exception 'comment_too_long';
  end if;

  select school.timezone
  into context_record
  from public.cafeteria_tables as cafeteria_table
  join public.schools as school on school.id = cafeteria_table.school_id
  where lower(cafeteria_table.tag_code) = lower(p_tag_code)
    and cafeteria_table.active = true
  limit 1;

  if not found then
    raise exception 'inactive_or_invalid_meal';
  end if;

  local_date := (now() at time zone context_record.timezone)::date;
  local_time := (now() at time zone context_record.timezone)::time;

  select
    cafeteria_table.id as table_id,
    cafeteria_table.school_id,
    cafeteria_table.cafeteria_id,
    school.timezone,
    meal_period.id as meal_period_id,
    menu.id as menu_id
  into context_record
  from public.cafeteria_tables as cafeteria_table
  join public.schools as school on school.id = cafeteria_table.school_id
  join public.menus as menu
    on menu.school_id = cafeteria_table.school_id
    and menu.cafeteria_id = cafeteria_table.cafeteria_id
    and menu.published = true
  join public.meal_periods as meal_period
    on meal_period.id = menu.meal_period_id
    and meal_period.active = true
  where lower(cafeteria_table.tag_code) = lower(p_tag_code)
    and cafeteria_table.active = true
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

  if not found or context_record.menu_id <> p_menu_id::uuid then
    raise exception 'inactive_or_invalid_meal';
  end if;

  if (
    select count(*)
    from public.reviews as existing_review
    where existing_review.school_id = context_record.school_id
      and existing_review.menu_id = context_record.menu_id
      and existing_review.anonymous_identifier_hash = p_anonymous_hash
  ) >= 3 then
    raise exception 'review_limit_reached';
  end if;

  insert into public.reviews (
    school_id,
    cafeteria_id,
    table_id,
    meal_period_id,
    menu_id,
    anonymous_identifier_hash,
    overall_rating,
    comment,
    idempotency_key
  )
  values (
    context_record.school_id,
    context_record.cafeteria_id,
    context_record.table_id,
    context_record.meal_period_id,
    context_record.menu_id,
    p_anonymous_hash,
    p_overall_rating,
    nullif(trim(p_comment), ''),
    p_idempotency_key
  )
  returning id into created_review_id;

  for item_rating in select value from jsonb_array_elements(coalesce(p_item_ratings, '[]'))
  loop
    if (item_rating ->> 'rating')::integer not between 1 and 5 then
      raise exception 'invalid_item_rating';
    end if;

    if not exists (
      select 1
      from public.menu_items
      where menu_id = context_record.menu_id
        and food_item_id = (item_rating ->> 'foodItemId')::uuid
    ) then
      raise exception 'food_not_in_menu';
    end if;

    insert into public.review_items (school_id, review_id, food_item_id, rating)
    values (
      context_record.school_id,
      created_review_id,
      (item_rating ->> 'foodItemId')::uuid,
      (item_rating ->> 'rating')::integer
    );
  end loop;

  for selected_tag in
    select value #>> '{}'
    from jsonb_array_elements(coalesce(p_tag_names, '[]'))
  loop
    insert into public.review_tags (review_id, tag_id, school_id)
    select created_review_id, feedback_tag.id, context_record.school_id
    from public.feedback_tags as feedback_tag
    where feedback_tag.school_id = context_record.school_id
      and lower(feedback_tag.name) = lower(selected_tag)
      and feedback_tag.active = true
    on conflict do nothing;
  end loop;

  return created_review_id;
end;
$$;

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
            'startsAt', to_char(coalesce(menu.service_starts_at, meal_period.starts_at), 'HH24:MI'),
            'endsAt', to_char(coalesce(menu.service_ends_at, meal_period.ends_at), 'HH24:MI'),
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
