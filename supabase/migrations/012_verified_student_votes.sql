-- One verified Kingsway Google account can review a scheduled meal once.
-- Existing anonymous reviews remain for historical analytics, but cannot be
-- created through the public RPC after this migration.
create table if not exists private.vote_secret (
  id boolean primary key default true check (id),
  secret bytea not null default gen_random_bytes(32)
);
revoke all on private.vote_secret from public, anon, authenticated;
insert into private.vote_secret (id) values (true) on conflict do nothing;

alter table public.reviews add column if not exists voter_email_digest text;

create unique index if not exists reviews_one_vote_per_user_and_menu
  on public.reviews (menu_id, user_id)
  where user_id is not null;

create unique index if not exists reviews_one_vote_per_email_and_menu
  on public.reviews (menu_id, voter_email_digest)
  where voter_email_digest is not null;

revoke all on function public.submit_public_review(
  text, text, integer, jsonb, jsonb, text, uuid, text
) from public, anon, authenticated, service_role;

create or replace function public.is_kingsway_google_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.users u
    where u.id = (select auth.uid())
      and u.email_confirmed_at is not null
      and lower(u.email) ~ '^[^@[:space:]]+@kingsway[.]college$'
      and u.raw_app_meta_data ->> 'provider' = 'google'
      and exists (
        select 1 from auth.identities i
        where i.user_id = u.id and i.provider = 'google'
      )
  );
$$;

revoke all on function public.is_kingsway_google_user() from public, anon;
grant execute on function public.is_kingsway_google_user() to authenticated;

create or replace function public.has_reviewed_menu(p_menu_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.reviews r
    where r.menu_id = p_menu_id
      and (
        r.user_id = (select auth.uid())
        or r.voter_email_digest = (
          select encode(sha256(s.secret || convert_to(lower(trim(u.email)), 'UTF8') || s.secret), 'hex')
          from auth.users u cross join private.vote_secret s
          where u.id = (select auth.uid()) and s.id = true
        )
      )
  );
$$;

revoke all on function public.has_reviewed_menu(uuid) from public, anon;
grant execute on function public.has_reviewed_menu(uuid) to authenticated;

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
      or (item_rating ->> 'rating')::integer not between 1 and 5 then
      raise exception 'invalid_item_rating';
    end if;

    if not exists (
      select 1 from public.menu_items
      where menu_id = context_record.menu_id
        and food_item_id = (item_rating ->> 'foodItemId')::uuid
    ) then raise exception 'food_not_in_menu'; end if;

    insert into public.review_items (school_id, review_id, food_item_id, rating)
    values (
      context_record.school_id, created_review_id,
      (item_rating ->> 'foodItemId')::uuid,
      (item_rating ->> 'rating')::integer
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

-- Enable this as the Supabase Auth "Before User Created" hook. Existing staff
-- accounts are unaffected; new accounts require a school Google identity.
create or replace function public.kingsway_before_user_created(event jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
begin
  if lower(coalesce(event -> 'user' ->> 'email', '')) !~ '^[^@[:space:]]+@kingsway[.]college$'
    or event -> 'user' -> 'app_metadata' ->> 'provider' is distinct from 'google' then
    return jsonb_build_object('error', jsonb_build_object(
      'http_code', 403,
      'message', 'Use your Kingsway College Google account to sign in.'
    ));
  end if;
  return '{}'::jsonb;
end;
$$;

revoke all on function public.kingsway_before_user_created(jsonb) from public, anon, authenticated;
grant execute on function public.kingsway_before_user_created(jsonb) to supabase_auth_admin;
