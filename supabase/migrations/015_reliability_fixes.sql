-- Reliability fixes:
-- 1. Weekly schedules are saved in one transaction (no half-saved weeks and no
--    moment where students see an empty meal while staff are saving).
-- 2. School timezones must be valid, because voting computes the local time
--    with `at time zone` and an invalid value would block every vote.
-- 3. Public pages resolve an active table tag instead of hard-coding one.
-- 4. Votes can include the optional taste, temperature, portion and
--    appearance ratings that the rankings already report.

-- 1. Atomic weekly schedule save --------------------------------------------
create or replace function public.save_week_schedule(
  p_cafeteria_id uuid,
  p_schedule jsonb,
  p_meal_times jsonb default '{}'::jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_school_id uuid := (select private.current_school_id());
  v_day record;
  v_period record;
  v_menu_id uuid;
  v_dish_ids uuid[];
  v_time jsonb;
  v_starts time;
  v_ends time;
begin
  if v_school_id is null or not (select private.is_school_manager()) then
    raise exception 'not_authorized';
  end if;

  if not exists (
    select 1 from public.cafeterias as cafeteria
    where cafeteria.id = p_cafeteria_id
      and cafeteria.school_id = v_school_id
      and cafeteria.active = true
  ) then
    raise exception 'not_authorized';
  end if;

  if jsonb_typeof(p_schedule) is distinct from 'object'
    or jsonb_typeof(coalesce(p_meal_times, '{}'::jsonb)) is distinct from 'object'
    or (select count(*) from jsonb_object_keys(p_schedule)) > 14 then
    raise exception 'invalid_schedule';
  end if;

  for v_day in
    select entry.key::date as service_date, entry.value as meals
    from jsonb_each(p_schedule) as entry
  loop
    if jsonb_typeof(v_day.meals) is distinct from 'object' then
      raise exception 'invalid_schedule';
    end if;

    for v_period in
      select period.id, period.name, period.starts_at, period.ends_at
      from public.meal_periods as period
      where period.school_id = v_school_id
        and period.cafeteria_id = p_cafeteria_id
        and period.active = true
    loop
      select coalesce(array_agg(dish.value::uuid order by dish.ordinality), '{}')
      into v_dish_ids
      from jsonb_array_elements_text(
        coalesce(v_day.meals -> v_period.name, '[]'::jsonb)
      ) with ordinality as dish(value, ordinality);

      if cardinality(v_dish_ids) > 30
        or cardinality(v_dish_ids) <> (select count(distinct id) from unnest(v_dish_ids) as id) then
        raise exception 'invalid_schedule';
      end if;

      if exists (
        select 1 from unnest(v_dish_ids) as dish_id
        where not exists (
          select 1 from public.food_items as food
          where food.id = dish_id and food.school_id = v_school_id
        )
      ) then
        raise exception 'unknown_dish';
      end if;

      v_time := coalesce(p_meal_times, '{}'::jsonb) -> (v_day.service_date::text) -> v_period.name;
      v_starts := coalesce((v_time ->> 'startsAt')::time, v_period.starts_at);
      v_ends := coalesce((v_time ->> 'endsAt')::time, v_period.ends_at);
      if v_starts >= v_ends then
        raise exception 'invalid_meal_time';
      end if;

      insert into public.menus (
        school_id, cafeteria_id, meal_period_id, service_date,
        service_starts_at, service_ends_at, published
      ) values (
        v_school_id, p_cafeteria_id, v_period.id, v_day.service_date,
        v_starts, v_ends, cardinality(v_dish_ids) > 0
      )
      on conflict (cafeteria_id, meal_period_id, service_date) do update set
        service_starts_at = excluded.service_starts_at,
        service_ends_at = excluded.service_ends_at,
        published = excluded.published
      returning id into v_menu_id;

      delete from public.menu_items where menu_id = v_menu_id;

      insert into public.menu_items (menu_id, food_item_id, school_id, sort_order)
      select v_menu_id, dish.id, v_school_id, (dish.ordinality - 1)::smallint
      from unnest(v_dish_ids) with ordinality as dish(id, ordinality);
    end loop;
  end loop;
end;
$$;

revoke all on function public.save_week_schedule(uuid, jsonb, jsonb) from public, anon;
grant execute on function public.save_week_schedule(uuid, jsonb, jsonb) to authenticated;

-- 2. Valid school timezones -------------------------------------------------
create or replace function private.validate_school_timezone()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1 from pg_catalog.pg_timezone_names as zone where zone.name = new.timezone
  ) then
    raise exception 'invalid_timezone' using errcode = '22023';
  end if;
  return new;
end;
$$;

drop trigger if exists schools_validate_timezone on public.schools;
create trigger schools_validate_timezone
before insert or update of timezone on public.schools
for each row execute function private.validate_school_timezone();

-- 3. Public pages use any active table tag ------------------------------------
create or replace function public.resolve_public_tag(p_preferred text default null)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select cafeteria_table.tag_code
  from public.cafeteria_tables as cafeteria_table
  join public.schools as school on school.id = cafeteria_table.school_id
  join public.cafeterias as cafeteria on cafeteria.id = cafeteria_table.cafeteria_id
  where cafeteria_table.active and school.active and cafeteria.active
  order by
    (p_preferred is not null and lower(cafeteria_table.tag_code) = lower(p_preferred)) desc,
    (school.email_domain is not null) desc,
    school.created_at,
    cafeteria.created_at,
    cafeteria_table.table_number,
    cafeteria_table.created_at
  limit 1;
$$;

revoke all on function public.resolve_public_tag(text) from public;
grant execute on function public.resolve_public_tag(text) to anon, authenticated;

-- 4. Optional per-item criteria in verified votes -----------------------------
create or replace function private.optional_item_rating(p_value jsonb)
returns smallint
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p_value is null or jsonb_typeof(p_value) = 'null' then
    return null;
  end if;
  if jsonb_typeof(p_value) <> 'number'
    or (p_value #>> '{}')::numeric not in (1, 2, 3, 4, 5) then
    raise exception 'invalid_item_rating';
  end if;
  return (p_value #>> '{}')::smallint;
end;
$$;

revoke all on function private.optional_item_rating(jsonb) from public;

create or replace function public.submit_verified_review(
  p_tag_code text,
  p_menu_id text,
  p_overall_rating integer,
  p_item_ratings jsonb,
  p_tag_names jsonb,
  p_comment text,
  p_idempotency_key uuid
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
  voting_user_id uuid := (select auth.uid());
  voting_email text;
  voting_email_digest text;
begin
  if voting_user_id is null or not public.is_kingsway_google_user() then
    raise exception 'school_google_login_required';
  end if;

  select lower(trim(u.email)),
    encode(sha256(s.secret || convert_to(lower(trim(u.email)), 'UTF8') || s.secret), 'hex')
  into voting_email, voting_email_digest
  from auth.users u cross join private.vote_secret s
  where u.id = voting_user_id and s.id = true;
  if voting_email is null or voting_email_digest is null then
    raise exception 'school_google_login_required';
  end if;

  if p_overall_rating not between 1 and 5
    or jsonb_typeof(p_item_ratings) is distinct from 'array'
    or jsonb_typeof(p_tag_names) is distinct from 'array'
    or char_length(coalesce(p_comment, '')) > 280 then
    raise exception 'invalid_review_data';
  end if;

  if jsonb_array_length(p_item_ratings) not between 1 and 30
    or jsonb_array_length(p_tag_names) > 12 then
    raise exception 'invalid_review_data';
  end if;

  select school.timezone
  into context_record
  from public.cafeteria_tables as cafeteria_table
  join public.schools as school on school.id = cafeteria_table.school_id
  where lower(cafeteria_table.tag_code) = lower(p_tag_code)
    and cafeteria_table.active = true
    and school.active = true
  limit 1;

  if not found then raise exception 'inactive_or_invalid_meal'; end if;

  local_date := (now() at time zone context_record.timezone)::date;
  local_time := (now() at time zone context_record.timezone)::time;

  select
    cafeteria_table.id as table_id,
    cafeteria_table.school_id,
    cafeteria_table.cafeteria_id,
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
    and school.active = true
    and (
      menu.service_date < local_date
      or (
        menu.service_date = local_date
        and coalesce(menu.service_starts_at, meal_period.starts_at) <= local_time
      )
    )
  order by menu.service_date desc,
    coalesce(menu.service_starts_at, meal_period.starts_at) desc
  limit 1;

  if not found or context_record.menu_id <> p_menu_id::uuid then
    raise exception 'inactive_or_invalid_meal';
  end if;

  if exists (
    select 1 from public.reviews r
    where r.menu_id = context_record.menu_id
      and (r.user_id = voting_user_id or r.voter_email_digest = voting_email_digest)
  ) then
    raise exception 'review_already_submitted';
  end if;

  insert into public.reviews (
    school_id, cafeteria_id, table_id, meal_period_id, menu_id,
    user_id, voter_email_digest, overall_rating, comment, idempotency_key
  ) values (
    context_record.school_id, context_record.cafeteria_id,
    context_record.table_id, context_record.meal_period_id,
    context_record.menu_id, voting_user_id, voting_email_digest, p_overall_rating,
    nullif(trim(p_comment), ''), p_idempotency_key
  ) returning id into created_review_id;

  for item_rating in select value from jsonb_array_elements(p_item_ratings)
  loop
    if jsonb_typeof(item_rating) <> 'object'
      or private.optional_item_rating(item_rating -> 'rating') is null then
      raise exception 'invalid_item_rating';
    end if;

    if not exists (
      select 1 from public.menu_items
      where menu_id = context_record.menu_id
        and food_item_id = (item_rating ->> 'foodItemId')::uuid
    ) then raise exception 'food_not_in_menu'; end if;

    insert into public.review_items (
      school_id, review_id, food_item_id, rating,
      taste_rating, temperature_rating, portion_rating, appearance_rating
    )
    values (
      context_record.school_id, created_review_id,
      (item_rating ->> 'foodItemId')::uuid,
      private.optional_item_rating(item_rating -> 'rating'),
      private.optional_item_rating(item_rating -> 'taste'),
      private.optional_item_rating(item_rating -> 'temperature'),
      private.optional_item_rating(item_rating -> 'portion'),
      private.optional_item_rating(item_rating -> 'appearance')
    );
  end loop;

  for selected_tag in
    select value #>> '{}' from jsonb_array_elements(p_tag_names)
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
exception
  when unique_violation then
    raise exception 'review_already_submitted';
end;
$$;

revoke all on function public.submit_verified_review(
  text, text, integer, jsonb, jsonb, text, uuid
) from public, anon;
grant execute on function public.submit_verified_review(
  text, text, integer, jsonb, jsonb, text, uuid
) to authenticated;
