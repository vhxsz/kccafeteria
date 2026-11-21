-- Students join their school on first Google sign-in, so staff can see real
-- participation in the user directory. Because school membership used to grant
-- read access to every tenant table, direct table reads become manager-only
-- first. Students never query tables directly: every student flow goes through
-- security-definer RPCs (resolve_table_experience, resolve_week_menu,
-- has_reviewed_menu, submit_verified_review, get_school_rankings).

-- 1. Map each school to the Google Workspace domain its students sign in with.
alter table public.schools add column if not exists email_domain text;

create unique index if not exists schools_email_domain_key
  on public.schools (lower(email_domain))
  where email_domain is not null;

update public.schools
set email_domain = 'kingsway.college'
where id = (
  select school.id
  from public.schools as school
  where school.active = true
  order by (
    select count(*) from public.cafeteria_tables as cafeteria_table
    where cafeteria_table.school_id = school.id
  ) desc, school.created_at
  limit 1
)
and not exists (
  select 1 from public.schools where lower(email_domain) = 'kingsway.college'
);

-- 2. Manager check used by the read policies below.
create or replace function private.is_school_manager()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select profile.role in ('cafeteria_manager', 'school_admin', 'platform_admin')
    from public.profiles as profile
    where profile.id = (select auth.uid()) and profile.active = true
  ), false);
$$;

revoke all on function private.is_school_manager() from public;
grant execute on function private.is_school_manager() to authenticated;

-- 3. Tenant data is readable by managers of that school only.
drop policy if exists "Members can read their school" on public.schools;
drop policy if exists "Managers can read their school" on public.schools;
create policy "Managers can read their school"
on public.schools for select to authenticated
using (
  id = (select private.current_school_id())
  and (select private.is_school_manager())
);

drop policy if exists "Members can read profiles in their school" on public.profiles;
drop policy if exists "Users can read their own profile" on public.profiles;
drop policy if exists "Managers can read profiles in their school" on public.profiles;
create policy "Users can read their own profile"
on public.profiles for select to authenticated
using (id = (select auth.uid()));
create policy "Managers can read profiles in their school"
on public.profiles for select to authenticated
using (
  school_id = (select private.current_school_id())
  and (select private.is_school_manager())
);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'cafeterias',
    'dining_areas',
    'cafeteria_tables',
    'meal_periods',
    'food_items',
    'menus',
    'menu_items',
    'reviews',
    'review_items',
    'feedback_tags',
    'review_tags',
    'audit_logs'
  ]
  loop
    execute format('drop policy if exists "Tenant members can read %1$s" on public.%1$I', table_name);
    execute format('drop policy if exists "Managers can read %1$s" on public.%1$I', table_name);
    execute format(
      'create policy "Managers can read %1$s" on public.%1$I for select to authenticated using (
        school_id = (select private.current_school_id())
        and (select private.is_school_manager())
      )',
      table_name
    );
  end loop;
end
$$;

-- 4. New Google accounts on a school's domain join that school as students.
-- Roles are never taken from client-controlled metadata; staff access is still
-- granted only by an administrator.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  matched_school_id uuid;
begin
  if new.raw_app_meta_data ->> 'provider' = 'google' then
    select school.id into matched_school_id
    from public.schools as school
    where school.active = true
      and school.email_domain is not null
      and lower(school.email_domain) = lower(split_part(coalesce(new.email, ''), '@', 2))
    limit 1;
  end if;

  insert into public.profiles (id, school_id, display_name)
  values (
    new.id,
    matched_school_id,
    nullif(trim(coalesce(
      new.raw_user_meta_data ->> 'display_name',
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name'
    )), '')
  );
  return new;
end;
$$;

-- 5. Attach students who already signed in before this migration.
update public.profiles as profile
set school_id = school.id,
  display_name = coalesce(
    profile.display_name,
    nullif(trim(coalesce(
      auth_user.raw_user_meta_data ->> 'full_name',
      auth_user.raw_user_meta_data ->> 'name'
    )), '')
  ),
  updated_at = now()
from auth.users as auth_user, public.schools as school
where auth_user.id = profile.id
  and profile.school_id is null
  and profile.role = 'student'
  and auth_user.raw_app_meta_data ->> 'provider' = 'google'
  and school.active = true
  and school.email_domain is not null
  and lower(school.email_domain) = lower(split_part(coalesce(auth_user.email, ''), '@', 2));

-- 6. The staff directory shows participation, not what each student said.
-- Ratings and comments stay available in the review reports without names.
drop function if exists public.get_school_users_with_latest_review();

create function public.get_school_users_with_latest_review()
returns table (
  user_id uuid,
  email text,
  display_name text,
  role public.app_role,
  joined_at timestamptz,
  vote_count integer,
  last_vote_at timestamptz,
  last_service_date date,
  last_meal_name text
)
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  requester_school_id uuid;
begin
  select profile.school_id
  into requester_school_id
  from public.profiles as profile
  where profile.id = auth.uid()
    and profile.active = true
    and profile.role in ('cafeteria_manager', 'school_admin', 'platform_admin');

  if requester_school_id is null then
    raise exception 'not_authorized';
  end if;

  return query
  select
    profile.id,
    auth_user.email::text,
    profile.display_name,
    profile.role,
    profile.created_at,
    coalesce(vote_stats.vote_count, 0)::integer,
    latest_review.created_at,
    latest_review.service_date,
    latest_review.meal_name
  from public.profiles as profile
  join auth.users as auth_user on auth_user.id = profile.id
  left join lateral (
    select count(*)::integer as vote_count
    from public.reviews as review
    where review.school_id = requester_school_id
      and review.user_id = profile.id
      and review.status = 'published'
  ) as vote_stats on true
  left join lateral (
    select
      review.created_at,
      menu.service_date,
      meal_period.name as meal_name
    from public.reviews as review
    join public.menus as menu on menu.id = review.menu_id
    join public.meal_periods as meal_period on meal_period.id = review.meal_period_id
    where review.school_id = requester_school_id
      and review.user_id = profile.id
      and review.status = 'published'
    order by review.created_at desc
    limit 1
  ) as latest_review on true
  where profile.school_id = requester_school_id
    and profile.active = true
  order by latest_review.created_at desc nulls last, auth_user.email;
end;
$$;

revoke all on function public.get_school_users_with_latest_review() from public, anon;
grant execute on function public.get_school_users_with_latest_review() to authenticated;
