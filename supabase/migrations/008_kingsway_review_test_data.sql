-- Idempotent pilot data for validating the public table-tag review flow.
-- This deliberately targets the active pilot workspace that already owns tags.

do $$
declare
  target_school_id uuid;
  target_cafeteria_id uuid;
  target_timezone text;
  target_date date;
  breakfast_id uuid;
  test_menu_id uuid;
  oatmeal_id uuid;
  eggs_id uuid;
  fruit_id uuid;
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
    raise exception 'Active school workspace was not found';
  end if;

  select cafeteria.id
  into target_cafeteria_id
  from public.cafeterias as cafeteria
  where cafeteria.school_id = target_school_id
    and cafeteria.active = true
  order by cafeteria.created_at
  limit 1;

  if target_cafeteria_id is null then
    raise exception 'Active Kingsway cafeteria was not found';
  end if;

  target_date := (now() at time zone target_timezone)::date;

  select meal_period.id
  into breakfast_id
  from public.meal_periods as meal_period
  where meal_period.school_id = target_school_id
    and meal_period.cafeteria_id = target_cafeteria_id
    and lower(meal_period.name) = 'breakfast'
  order by meal_period.created_at
  limit 1;

  if breakfast_id is null then
    insert into public.meal_periods (
      school_id, cafeteria_id, name, starts_at, ends_at, sort_order
    )
    values (
      target_school_id, target_cafeteria_id, 'Breakfast', '10:00', '12:00', 1
    )
    returning id into breakfast_id;
  else
    update public.meal_periods
    set starts_at = '10:00', ends_at = '12:00', active = true
    where id = breakfast_id;
  end if;

  -- Preserve the tag links that were used in the original pilot UI.
  insert into public.cafeteria_tables (
    school_id, cafeteria_id, name, display_name, table_number, tag_code, active
  )
  select target_school_id, target_cafeteria_id, 'Table ' || seed.table_number,
    seed.display_name, seed.table_number, seed.tag_code, true
  from (values
    (14, 'tag14', 'Main hall'),
    (15, 'tag15', 'Main hall'),
    (21, 'tag21', 'Window area')
  ) as seed(table_number, tag_code, display_name)
  where not exists (
    select 1
    from public.cafeteria_tables as existing_table
    where existing_table.school_id = target_school_id
      and existing_table.cafeteria_id = target_cafeteria_id
      and (
        existing_table.table_number = seed.table_number
        or lower(existing_table.tag_code) = lower(seed.tag_code)
      )
  );

  select food.id into oatmeal_id
  from public.food_items as food
  where food.school_id = target_school_id and lower(food.name) = 'maple oatmeal'
  limit 1;
  if oatmeal_id is null then
    insert into public.food_items (
      school_id, name, description, category, image_url, ingredients,
      allergens, dietary_information, serving_size
    ) values (
      target_school_id, 'Maple oatmeal', 'Warm oats with Canadian maple and cinnamon.',
      'main_dish', 'https://images.unsplash.com/photo-1517673400267-0251440c45dc?auto=format&fit=crop&w=900&q=80',
      array['Oats', 'Milk', 'Maple syrup', 'Cinnamon'], array['Dairy'],
      array['Vegetarian'], '1 bowl'
    ) returning id into oatmeal_id;
  end if;

  select food.id into eggs_id
  from public.food_items as food
  where food.school_id = target_school_id and lower(food.name) = 'scrambled eggs'
  limit 1;
  if eggs_id is null then
    insert into public.food_items (
      school_id, name, description, category, image_url, ingredients,
      allergens, dietary_information, serving_size
    ) values (
      target_school_id, 'Scrambled eggs', 'Soft scrambled eggs prepared for morning service.',
      'side', 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=900&q=80',
      array['Eggs', 'Milk'], array['Eggs', 'Dairy'], array['Vegetarian'], '2 eggs'
    ) returning id into eggs_id;
  end if;

  select food.id into fruit_id
  from public.food_items as food
  where food.school_id = target_school_id and lower(food.name) = 'fresh fruit cup'
  limit 1;
  if fruit_id is null then
    insert into public.food_items (
      school_id, name, description, category, image_url, ingredients,
      allergens, dietary_information, serving_size
    ) values (
      target_school_id, 'Fresh fruit cup', 'A seasonal mix of fresh-cut fruit.',
      'fruit', 'https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?auto=format&fit=crop&w=900&q=80',
      array['Seasonal fruit'], array[]::text[], array['Vegan', 'Gluten-free'], '1 cup'
    ) returning id into fruit_id;
  end if;

  insert into public.menus (
    school_id, cafeteria_id, meal_period_id, service_date, published,
    service_starts_at, service_ends_at
  ) values (
    target_school_id, target_cafeteria_id, breakfast_id, target_date, true,
    '10:00', '12:00'
  )
  on conflict (cafeteria_id, meal_period_id, service_date)
  do update set
    published = true,
    service_starts_at = excluded.service_starts_at,
    service_ends_at = excluded.service_ends_at,
    updated_at = now()
  returning id into test_menu_id;

  insert into public.menu_items (menu_id, food_item_id, school_id, sort_order)
  values
    (test_menu_id, oatmeal_id, target_school_id, 1),
    (test_menu_id, eggs_id, target_school_id, 2),
    (test_menu_id, fruit_id, target_school_id, 3)
  on conflict (menu_id, food_item_id)
  do update set sort_order = excluded.sort_order;
end;
$$;
