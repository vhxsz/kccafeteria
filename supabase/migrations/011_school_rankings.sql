-- Aggregate published feedback by the meal's service date. Anonymous callers
-- only receive groups with at least three responses; signed-in managers of the
-- same school may see the full aggregates.
-- Profile roles and school membership must not be self-editable because the
-- analytics function uses them to decide whether small groups may be shown.
revoke update on public.profiles from public, anon, authenticated;
grant update (display_name) on public.profiles to authenticated;

-- Client-controlled signup metadata must never assign a privileged role.
-- Staff access is provisioned separately by a trusted administrator.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''));
  return new;
end;
$$;

create or replace function public.get_school_rankings(
  p_tag_code text,
  p_days integer default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  target_record record;
  minimum_count integer := 3;
  local_today date;
  result jsonb;
begin
  if p_days is not null and p_days not in (7, 30, 90) then
    raise exception 'invalid_ranking_period';
  end if;

  select s.id as school_id, s.name as school_name, s.timezone,
         c.id as cafeteria_id, c.name as cafeteria_name
  into target_record
  from public.cafeteria_tables t
  join public.schools s on s.id = t.school_id
  join public.cafeterias c on c.id = t.cafeteria_id
  where lower(t.tag_code) = lower(p_tag_code)
    and t.active and s.active and c.active
  limit 1;

  if not found then return null; end if;

  if exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.school_id = target_record.school_id
      and p.active
      and p.role in ('cafeteria_manager', 'school_admin', 'platform_admin')
  ) then
    minimum_count := 1;
  end if;

  local_today := (now() at time zone target_record.timezone)::date;

  with eligible_reviews as (
    select r.id, r.overall_rating, r.comment, r.meal_period_id,
           m.service_date
    from public.reviews r
    join public.menus m on m.id = r.menu_id
    where r.school_id = target_record.school_id
      and r.cafeteria_id = target_record.cafeteria_id
      and r.status = 'published'
      and (p_days is null or m.service_date >= local_today - (p_days - 1))
      and m.service_date <= local_today
  ),
  food_stats as (
    select f.id, f.name, f.category, f.image_url, f.active,
           count(*)::integer as votes,
           round(avg(ri.rating)::numeric, 2) as average_rating,
           round(avg(ri.taste_rating)::numeric, 2) as taste_rating,
           round(avg(ri.temperature_rating)::numeric, 2) as temperature_rating,
           round(avg(ri.portion_rating)::numeric, 2) as portion_rating,
           round(avg(ri.appearance_rating)::numeric, 2) as appearance_rating,
           round(100.0 * count(*) filter (where ri.rating >= 4) / count(*), 1) as positive_percent,
           array[
             count(*) filter (where ri.rating = 1),
             count(*) filter (where ri.rating = 2),
             count(*) filter (where ri.rating = 3),
             count(*) filter (where ri.rating = 4),
             count(*) filter (where ri.rating = 5)
           ] as distribution,
           max(er.service_date) as last_served
    from eligible_reviews er
    join public.review_items ri on ri.review_id = er.id and ri.rating is not null
    join public.food_items f on f.id = ri.food_item_id
    where f.school_id = target_record.school_id
    group by f.id, f.name, f.category, f.image_url, f.active
  ),
  weekday_stats as (
    select extract(isodow from er.service_date)::integer as weekday,
           count(*)::integer as reviews,
           count(distinct er.service_date)::integer as service_days,
           round(avg(er.overall_rating)::numeric, 2) as average_rating,
           round(100.0 * count(*) filter (where er.overall_rating >= 4) / count(*), 1) as positive_percent
    from eligible_reviews er
    group by extract(isodow from er.service_date)
  ),
  category_stats as (
    select f.category, count(*)::integer as votes,
           count(distinct f.id)::integer as foods,
           round(avg(ri.rating)::numeric, 2) as average_rating,
           round(100.0 * count(*) filter (where ri.rating >= 4) / count(*), 1) as positive_percent
    from eligible_reviews er
    join public.review_items ri on ri.review_id = er.id and ri.rating is not null
    join public.food_items f on f.id = ri.food_item_id
    where f.school_id = target_record.school_id
    group by f.category
  ),
  day_stats as (
    select er.service_date, count(*)::integer as reviews,
           round(avg(er.overall_rating)::numeric, 2) as average_rating,
           round(100.0 * count(*) filter (where er.overall_rating >= 4) / count(*), 1) as positive_percent
    from eligible_reviews er
    group by er.service_date
  ),
  meal_stats as (
    select mp.name, mp.sort_order, count(*)::integer as reviews,
           round(avg(er.overall_rating)::numeric, 2) as average_rating,
           round(100.0 * count(*) filter (where er.overall_rating >= 4) / count(*), 1) as positive_percent
    from eligible_reviews er
    join public.meal_periods mp on mp.id = er.meal_period_id
    group by mp.id, mp.name, mp.sort_order
  ),
  tag_stats as (
    select ft.name, ft.sentiment, count(*)::integer as uses
    from eligible_reviews er
    join public.review_tags rt on rt.review_id = er.id
    join public.feedback_tags ft on ft.id = rt.tag_id
    group by ft.id, ft.name, ft.sentiment
  ),
  summary_stats as (
    select count(*)::integer as reviews,
           round(avg(overall_rating)::numeric, 2) as average_rating,
           count(*) filter (where comment is not null and trim(comment) <> '')::integer as comments,
           round(100.0 * count(*) filter (where overall_rating >= 4) / nullif(count(*), 0), 1) as positive_percent,
           array[
             count(*) filter (where overall_rating = 1),
             count(*) filter (where overall_rating = 2),
             count(*) filter (where overall_rating = 3),
             count(*) filter (where overall_rating = 4),
             count(*) filter (where overall_rating = 5)
           ] as distribution
    from eligible_reviews
  )
  select jsonb_build_object(
    'schoolName', target_record.school_name,
    'cafeteriaName', target_record.cafeteria_name,
    'periodDays', p_days,
    'asOfDate', local_today,
    'minimumCount', minimum_count,
    'summary', (
      select jsonb_build_object(
        'reviewCount', case when reviews >= minimum_count then reviews else null end,
        'averageRating', case when reviews >= minimum_count then average_rating else null end,
        'positivePercent', case when reviews >= minimum_count then positive_percent else null end,
        'commentCount', case when minimum_count = 1 then comments else null end,
        'itemVoteCount', (
          select case when count(*) >= minimum_count then count(*)::integer else null end
          from eligible_reviews er
          join public.review_items ri on ri.review_id = er.id and ri.rating is not null
        ),
        'distribution', case when reviews >= minimum_count then distribution else null end
      ) from summary_stats
    ),
    'foods', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', id, 'name', name, 'category', category, 'imageUrl', image_url,
        'active', active, 'votes', votes, 'averageRating', average_rating,
        'tasteRating', taste_rating, 'temperatureRating', temperature_rating,
        'portionRating', portion_rating, 'appearanceRating', appearance_rating,
        'positivePercent', positive_percent, 'distribution', distribution,
        'lastServed', last_served
      ) order by average_rating desc, votes desc, name), '[]'::jsonb)
      from food_stats where votes >= minimum_count
    ),
    'categories', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'category', category, 'foods', foods, 'votes', votes,
        'averageRating', average_rating, 'positivePercent', positive_percent
      ) order by average_rating desc, votes desc), '[]'::jsonb)
      from category_stats where votes >= minimum_count
    ),
    'weekdays', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'weekday', weekday, 'reviews', reviews, 'serviceDays', service_days,
        'averageRating', average_rating, 'positivePercent', positive_percent
      ) order by average_rating desc, reviews desc, weekday), '[]'::jsonb)
      from weekday_stats where reviews >= minimum_count
    ),
    'bestDates', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'serviceDate', service_date, 'reviews', reviews,
        'averageRating', average_rating, 'positivePercent', positive_percent
      ) order by average_rating desc, reviews desc, service_date desc), '[]'::jsonb)
      from (
        select * from day_stats where reviews >= minimum_count
        order by average_rating desc, reviews desc, service_date desc limit 20
      ) ranked_dates
    ),
    'dailyTrend', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'serviceDate', service_date, 'reviews', reviews,
        'averageRating', average_rating, 'positivePercent', positive_percent
      ) order by service_date), '[]'::jsonb)
      from (
        select * from day_stats where reviews >= minimum_count
        order by service_date desc limit 30
      ) recent_dates
    ),
    'meals', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'name', name, 'reviews', reviews,
        'averageRating', average_rating, 'positivePercent', positive_percent
      ) order by sort_order, name), '[]'::jsonb)
      from meal_stats where reviews >= minimum_count
    ),
    'tags', case when minimum_count = 1 then (
      select coalesce(jsonb_agg(jsonb_build_object(
        'name', name, 'sentiment', sentiment, 'uses', uses
      ) order by uses desc, name), '[]'::jsonb)
      from tag_stats
    ) else '[]'::jsonb end
  ) into result;

  return result;
end;
$$;

revoke all on function public.get_school_rankings(text, integer) from public;
grant execute on function public.get_school_rankings(text, integer) to anon, authenticated;
