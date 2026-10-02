-- Make the pilot a single Kingsway College workspace, restore image uploads,
-- and add an idempotent set of useful demonstration data.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'meal-images',
  'meal-images',
  true,
  4194304,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "School managers can view meal images" on storage.objects;
create policy "School managers can view meal images"
on storage.objects for select to authenticated
using (
  bucket_id = 'meal-images'
  and (storage.foldername(name))[1] = (select private.current_school_id())::text
);

drop policy if exists "School managers can upload meal images" on storage.objects;
create policy "School managers can upload meal images"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'meal-images'
  and (storage.foldername(name))[1] = (select private.current_school_id())::text
  and (select private.current_app_role()) in ('cafeteria_manager', 'school_admin', 'platform_admin')
);

drop policy if exists "School managers can update meal images" on storage.objects;
create policy "School managers can update meal images"
on storage.objects for update to authenticated
using (
  bucket_id = 'meal-images'
  and (storage.foldername(name))[1] = (select private.current_school_id())::text
  and (select private.current_app_role()) in ('cafeteria_manager', 'school_admin', 'platform_admin')
)
with check (
  bucket_id = 'meal-images'
  and (storage.foldername(name))[1] = (select private.current_school_id())::text
);

drop policy if exists "School managers can delete meal images" on storage.objects;
create policy "School managers can delete meal images"
on storage.objects for delete to authenticated
using (
  bucket_id = 'meal-images'
  and (storage.foldername(name))[1] = (select private.current_school_id())::text
  and (select private.current_app_role()) in ('cafeteria_manager', 'school_admin', 'platform_admin')
);

do $$
declare
  target_school_id uuid;
  target_cafeteria_id uuid;
  target_timezone text;
  target_date date;
  week_start date;
  service_day date;
  period_record record;
  created_menu_id uuid;
begin
  select school.id, school.timezone
  into target_school_id, target_timezone
  from public.schools as school
  where school.active = true
  order by (
    select count(*)
    from public.cafeteria_tables as existing_table
    where existing_table.school_id = school.id
  ) desc, school.created_at
  limit 1;

  if target_school_id is null then
    raise exception 'An active Kingsway workspace was not found';
  end if;

  select cafeteria.id
  into target_cafeteria_id
  from public.cafeterias as cafeteria
  where cafeteria.school_id = target_school_id and cafeteria.active = true
  order by cafeteria.created_at
  limit 1;

  if target_cafeteria_id is null then
    insert into public.cafeterias (school_id, name, description)
    values (target_school_id, 'Main cafeteria', 'Kingsway College main dining service')
    returning id into target_cafeteria_id;
  end if;

  update public.schools
  set name = 'Kingsway College', timezone = 'America/Toronto', active = true
  where id = target_school_id;

  update public.cafeterias
  set name = 'Main cafeteria', active = true
  where id = target_cafeteria_id;

  -- Every administrator sees the same data-rich Kingsway workspace.
  update public.profiles
  set school_id = target_school_id, active = true, updated_at = now()
  where role in ('cafeteria_manager', 'school_admin', 'platform_admin')
    and school_id is distinct from target_school_id;

  insert into public.meal_periods (
    school_id, cafeteria_id, name, starts_at, ends_at, sort_order, active
  )
  select target_school_id, target_cafeteria_id, seed.name, seed.starts_at, seed.ends_at,
    seed.sort_order, true
  from (values
    ('Breakfast', '06:30'::time, '10:59'::time, 1::smallint),
    ('Lunch', '11:30'::time, '15:59'::time, 2::smallint),
    ('Dinner', '17:00'::time, '20:30'::time, 3::smallint)
  ) as seed(name, starts_at, ends_at, sort_order)
  where not exists (
    select 1 from public.meal_periods as existing_period
    where existing_period.school_id = target_school_id
      and existing_period.cafeteria_id = target_cafeteria_id
      and lower(existing_period.name) = lower(seed.name)
  );

  insert into public.cafeteria_tables (
    school_id, cafeteria_id, name, display_name, table_number, tag_code, active
  )
  select target_school_id, target_cafeteria_id, 'Table ' || seed.table_number,
    seed.area_name, seed.table_number, 'tag' || seed.table_number, true
  from (values
    (3, 'Main hall'), (4, 'Main hall'), (5, 'Main hall'), (6, 'Main hall'),
    (7, 'Window area'), (8, 'Window area'), (9, 'Quiet area'), (10, 'Quiet area')
  ) as seed(table_number, area_name)
  where not exists (
    select 1 from public.cafeteria_tables as existing_table
    where existing_table.school_id = target_school_id
      and existing_table.cafeteria_id = target_cafeteria_id
      and existing_table.table_number = seed.table_number
  )
  and not exists (
    select 1 from public.cafeteria_tables as any_table
    where lower(any_table.tag_code) = lower('tag' || seed.table_number)
  );

  insert into public.food_items (
    school_id, name, description, category, image_url, ingredients,
    allergens, dietary_information, serving_size, active
  )
  select target_school_id, seed.name, seed.description,
    seed.category::public.food_category, seed.image_url, seed.ingredients,
    seed.allergens, seed.dietary_information, seed.serving_size, true
  from (values
    ('Yogurt parfait', 'Vanilla yogurt layered with berries and toasted granola.', 'other',
      'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=900&q=80',
      array['Yogurt','Berries','Granola'], array['Dairy','Gluten'], array['Vegetarian'], '1 cup'),
    ('French toast', 'Golden French toast with cinnamon and Canadian maple syrup.', 'main_dish',
      'https://images.unsplash.com/photo-1484723091739-30a097e8f929?auto=format&fit=crop&w=900&q=80',
      array['Bread','Eggs','Milk','Maple syrup'], array['Gluten','Eggs','Dairy'], array['Vegetarian'], '2 slices'),
    ('Grilled chicken', 'Herb-marinated chicken breast grilled until tender.', 'main_dish',
      'https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&w=900&q=80',
      array['Chicken','Olive oil','Herbs'], array[]::text[], array['Halal','Gluten-free'], '150 g'),
    ('Herbed rice', 'Steamed long-grain rice with parsley and mild herbs.', 'side',
      'https://images.unsplash.com/photo-1516684732162-798a0062be99?auto=format&fit=crop&w=900&q=80',
      array['Rice','Parsley','Vegetable stock'], array[]::text[], array['Vegan','Gluten-free'], '1 cup'),
    ('Garden salad', 'Crisp greens, cucumber, tomato, and a light vinaigrette.', 'salad',
      'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=900&q=80',
      array['Lettuce','Cucumber','Tomato','Vinaigrette'], array[]::text[], array['Vegan','Gluten-free'], '1 bowl'),
    ('Tomato basil pasta', 'Penne pasta in a tomato and basil sauce.', 'main_dish',
      'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=900&q=80',
      array['Penne','Tomato','Basil','Olive oil'], array['Gluten'], array['Vegan'], '1 bowl'),
    ('Roasted vegetables', 'Seasonal vegetables roasted with olive oil and herbs.', 'side',
      'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=900&q=80',
      array['Carrots','Zucchini','Peppers','Olive oil'], array[]::text[], array['Vegan','Gluten-free'], '1 cup'),
    ('Vegetable soup', 'A warm house-made soup with vegetables and herbs.', 'other',
      'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=900&q=80',
      array['Vegetables','Tomato','Vegetable stock'], array[]::text[], array['Vegan','Gluten-free'], '1 bowl'),
    ('Orange juice', 'Chilled 100% orange juice.', 'drink',
      'https://images.unsplash.com/photo-1600271886742-f049cd451bba?auto=format&fit=crop&w=900&q=80',
      array['Orange juice'], array[]::text[], array['Vegan','Gluten-free'], '250 mL'),
    ('Berry smoothie', 'A cold blended smoothie with berries, banana, and yogurt.', 'drink',
      'https://images.unsplash.com/photo-1505252585461-04db1eb84625?auto=format&fit=crop&w=900&q=80',
      array['Berries','Banana','Yogurt'], array['Dairy'], array['Vegetarian','Gluten-free'], '300 mL')
  ) as seed(name, description, category, image_url, ingredients, allergens, dietary_information, serving_size)
  where not exists (
    select 1 from public.food_items as existing_food
    where existing_food.school_id = target_school_id
      and lower(existing_food.name) = lower(seed.name)
  );

  target_date := (now() at time zone coalesce(target_timezone, 'America/Toronto'))::date;
  week_start := target_date - (extract(isodow from target_date)::integer - 1);

  for service_day in select generate_series(week_start, week_start + 6, interval '1 day')::date
  loop
    for period_record in
      select * from public.meal_periods
      where school_id = target_school_id
        and cafeteria_id = target_cafeteria_id
        and active = true
        and lower(name) in ('breakfast', 'lunch', 'dinner')
      order by sort_order
    loop
      insert into public.menus (
        school_id, cafeteria_id, meal_period_id, service_date, published,
        service_starts_at, service_ends_at
      ) values (
        target_school_id, target_cafeteria_id, period_record.id, service_day, true,
        period_record.starts_at, period_record.ends_at
      )
      on conflict (cafeteria_id, meal_period_id, service_date)
      do update set published = true, updated_at = now()
      returning id into created_menu_id;

      insert into public.menu_items (menu_id, food_item_id, school_id, sort_order)
      select created_menu_id, food.id, target_school_id,
        row_number() over (order by food.name)::smallint
      from public.food_items as food
      where food.school_id = target_school_id and food.active = true and (
        (lower(period_record.name) = 'breakfast' and lower(food.name) in
          ('maple oatmeal','scrambled eggs','fresh fruit cup','yogurt parfait','french toast','orange juice'))
        or (lower(period_record.name) = 'lunch' and lower(food.name) in
          ('grilled chicken','herbed rice','garden salad','fresh fruit cup','orange juice'))
        or (lower(period_record.name) = 'dinner' and lower(food.name) in
          ('tomato basil pasta','roasted vegetables','vegetable soup','garden salad','berry smoothie'))
      )
      on conflict (menu_id, food_item_id) do nothing;
    end loop;
  end loop;
end;
$$;

-- Future admin sign-ups, if created through Supabase, join Kingsway instead of
-- silently creating another school. The public application no longer exposes sign-up.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_school_id uuid;
begin
  if coalesce(new.raw_user_meta_data ->> 'account_type', '') = 'school_admin' then
    select school.id into target_school_id
    from public.schools as school
    where school.active = true
    order by (
      select count(*) from public.cafeteria_tables as cafeteria_table
      where cafeteria_table.school_id = school.id
    ) desc, school.created_at
    limit 1;

    insert into public.profiles (id, school_id, role, display_name)
    values (
      new.id,
      target_school_id,
      'school_admin',
      nullif(trim(new.raw_user_meta_data ->> 'display_name'), '')
    );
  else
    insert into public.profiles (id, display_name)
    values (new.id, nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''));
  end if;

  return new;
end;
$$;
