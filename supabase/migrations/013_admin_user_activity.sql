-- Staff-only student directory. Email addresses live in auth.users, so they
-- must never be selected by the browser directly. This function verifies the
-- caller is an active manager for the same school before returning any data.

create or replace function public.get_school_users_with_latest_review()
returns table (
  user_id uuid,
  email text,
  display_name text,
  role public.app_role,
  joined_at timestamptz,
  vote_count integer,
  last_vote_at timestamptz,
  last_vote_rating smallint,
  last_vote_comment text,
  last_service_date date,
  last_meal_name text,
  last_dishes text[]
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
    auth_user.email,
    profile.display_name,
    profile.role,
    profile.created_at,
    coalesce(vote_stats.vote_count, 0)::integer,
    latest_review.created_at,
    latest_review.overall_rating,
    latest_review.comment,
    latest_review.service_date,
    latest_review.meal_name,
    latest_dishes.dishes
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
      review.id,
      review.created_at,
      review.overall_rating,
      review.comment,
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
  left join lateral (
    select array_agg(food.name order by food.name) as dishes
    from public.review_items as review_item
    join public.food_items as food on food.id = review_item.food_item_id
    where review_item.review_id = latest_review.id
  ) as latest_dishes on true
  where profile.school_id = requester_school_id
    and profile.active = true
  order by latest_review.created_at desc nulls last, auth_user.email;
end;
$$;

revoke all on function public.get_school_users_with_latest_review() from public;
grant execute on function public.get_school_users_with_latest_review() to authenticated;
