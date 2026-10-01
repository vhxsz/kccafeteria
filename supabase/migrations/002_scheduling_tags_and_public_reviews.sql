alter table public.cafeteria_tables
  add column table_number integer,
  add column tag_code text;

with numbered as (
  select
    id,
    row_number() over (
      partition by school_id, cafeteria_id
      order by created_at, id
    ) as generated_number
  from public.cafeteria_tables
)
update public.cafeteria_tables as cafeteria_table
set
  table_number = numbered.generated_number,
  tag_code = 'tag' || numbered.generated_number || '-' ||
    substring(cafeteria_table.public_token from 1 for 6)
from numbered
where numbered.id = cafeteria_table.id;

alter table public.cafeteria_tables
  alter column table_number set not null,
  alter column tag_code set not null,
  alter column tag_code set default ('tag-' || encode(gen_random_bytes(6), 'hex')),
  add constraint cafeteria_tables_positive_number check (table_number > 0),
  add constraint cafeteria_tables_tag_code_format check (tag_code ~ '^[a-z0-9_-]{3,64}$'),
  add constraint cafeteria_tables_school_number_unique
    unique (school_id, cafeteria_id, table_number),
  add constraint cafeteria_tables_tag_code_unique unique (tag_code);

create index cafeteria_tables_tag_lookup_idx
  on public.cafeteria_tables (lower(tag_code))
  where active = true;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_name text;
  requested_slug text;
  final_slug text;
  requested_timezone text;
  requested_cafeteria text;
  created_school_id uuid;
  created_cafeteria_id uuid;
begin
  if coalesce(new.raw_user_meta_data ->> 'account_type', '') = 'school_admin' then
    requested_name := trim(coalesce(new.raw_user_meta_data ->> 'school_name', ''));
    requested_slug := lower(regexp_replace(
      coalesce(new.raw_user_meta_data ->> 'school_slug', requested_name),
      '[^a-zA-Z0-9]+',
      '-',
      'g'
    ));
    requested_slug := trim(both '-' from requested_slug);
    requested_timezone := coalesce(
      nullif(new.raw_user_meta_data ->> 'timezone', ''),
      'America/Toronto'
    );
    requested_cafeteria := coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'cafeteria_name'), ''),
      'Main cafeteria'
    );

    if char_length(requested_name) < 2 then
      raise exception 'school_name_required';
    end if;

    if char_length(requested_slug) < 2 then
      requested_slug := 'school';
    end if;

    final_slug := requested_slug;
    if exists (select 1 from public.schools where slug = final_slug) then
      final_slug := requested_slug || '-' || substring(new.id::text from 1 for 6);
    end if;

    insert into public.schools (name, slug, timezone)
    values (requested_name, final_slug, requested_timezone)
    returning id into created_school_id;

    insert into public.profiles (id, school_id, role, display_name)
    values (
      new.id,
      created_school_id,
      'school_admin',
      nullif(trim(new.raw_user_meta_data ->> 'display_name'), '')
    );

    insert into public.cafeterias (school_id, name)
    values (created_school_id, requested_cafeteria)
    returning id into created_cafeteria_id;

    insert into public.meal_periods (
      school_id,
      cafeteria_id,
      name,
      starts_at,
      ends_at,
      sort_order
    )
    values
      (created_school_id, created_cafeteria_id, 'Breakfast', '06:30', '10:00', 1),
      (created_school_id, created_cafeteria_id, 'Lunch', '11:30', '14:30', 2),
      (created_school_id, created_cafeteria_id, 'Dinner', '17:00', '20:30', 3);

    insert into public.feedback_tags (school_id, name, sentiment, category)
    values
      (created_school_id, 'Tasty', 'positive', 'taste'),
      (created_school_id, 'Fresh', 'positive', 'freshness'),
      (created_school_id, 'Good temperature', 'positive', 'temperature'),
      (created_school_id, 'Good portion', 'positive', 'portion'),
      (created_school_id, 'Too cold', 'negative', 'temperature'),
      (created_school_id, 'Too salty', 'negative', 'seasoning'),
      (created_school_id, 'Small portion', 'negative', 'portion'),
      (created_school_id, 'Needs more variety', 'negative', 'variety');
  else
    insert into public.profiles (id, display_name)
    values (new.id, nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''));
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

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
  active_meal record;
  active_menu record;
  local_date date;
  local_time time;
  menu_items jsonb := '[]'::jsonb;
begin
  select menu.*
  into active_menu
  from public.menus as menu
  where false;

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

  select meal_period.*
  into active_meal
  from public.meal_periods as meal_period
  where meal_period.school_id = tag_record.school_id
    and meal_period.cafeteria_id = tag_record.cafeteria_id
    and meal_period.active = true
    and local_time >= meal_period.starts_at
    and local_time < meal_period.ends_at
  order by meal_period.sort_order
  limit 1;

  if found then
    select menu.*
    into active_menu
    from public.menus as menu
    where menu.school_id = tag_record.school_id
      and menu.cafeteria_id = tag_record.cafeteria_id
      and menu.meal_period_id = active_meal.id
      and menu.service_date = local_date
      and menu.published = true
    limit 1;

    if found then
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
      where menu_item.menu_id = active_menu.id
        and food.active = true;
    end if;
  end if;

  return jsonb_build_object(
    'schoolName', tag_record.school_name,
    'cafeteriaName', tag_record.cafeteria_name,
    'tableNumber', tag_record.table_number,
    'tagCode', tag_record.tag_code,
    'timezone', tag_record.timezone,
    'serviceDate', local_date,
    'meal', case
      when active_meal.id is null then null
      else jsonb_build_object(
        'id', active_meal.id,
        'name', active_meal.name,
        'startsAt', to_char(active_meal.starts_at, 'HH24:MI'),
        'endsAt', to_char(active_meal.ends_at, 'HH24:MI')
      )
    end,
    'menuId', active_menu.id,
    'items', menu_items
  );
end;
$$;

revoke all on function public.resolve_table_experience(text, timestamptz) from public;
grant execute on function public.resolve_table_experience(text, timestamptz)
  to anon, authenticated, service_role;

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
  join public.meal_periods as meal_period
    on meal_period.school_id = cafeteria_table.school_id
    and meal_period.cafeteria_id = cafeteria_table.cafeteria_id
    and (now() at time zone school.timezone)::time >= meal_period.starts_at
    and (now() at time zone school.timezone)::time < meal_period.ends_at
    and meal_period.active = true
  join public.menus as menu
    on menu.school_id = cafeteria_table.school_id
    and menu.cafeteria_id = cafeteria_table.cafeteria_id
    and menu.meal_period_id = meal_period.id
    and menu.service_date = (now() at time zone school.timezone)::date
    and menu.published = true
  where lower(cafeteria_table.tag_code) = lower(p_tag_code)
    and cafeteria_table.active = true
    and menu.id = p_menu_id::uuid
  limit 1;

  if not found then
    raise exception 'inactive_or_invalid_meal';
  end if;

  local_date := (now() at time zone context_record.timezone)::date;

  if (
    select count(*)
    from public.reviews as existing_review
    where existing_review.school_id = context_record.school_id
      and existing_review.meal_period_id = context_record.meal_period_id
      and existing_review.anonymous_identifier_hash = p_anonymous_hash
      and (existing_review.created_at at time zone context_record.timezone)::date = local_date
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

    insert into public.review_items (
      school_id,
      review_id,
      food_item_id,
      rating
    )
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

revoke all on function public.submit_public_review(
  text,
  text,
  integer,
  jsonb,
  jsonb,
  text,
  uuid,
  text
) from public, anon, authenticated;
grant execute on function public.submit_public_review(
  text,
  text,
  integer,
  jsonb,
  jsonb,
  text,
  uuid,
  text
) to service_role;
