-- MealUp: Kingsway College demo data
-- Run in Supabase SQL Editor after the schema migrations.
-- Safe to run more than once: it adds missing dishes and refreshes this week's
-- published schedule without deleting real food, menus, reviews, or users.

do $$
declare
  target_school_id uuid;
  target_cafeteria_id uuid;
  target_timezone text;
  week_start date;
  service_day date;
  period_record record;
  target_menu_id uuid;
  slot_record record;
begin
  select s.id, s.timezone
  into target_school_id, target_timezone
  from public.schools s
  where s.active = true
  order by s.created_at
  limit 1;

  if target_school_id is null then
    raise exception 'No active school exists. Create the Kingsway workspace first.';
  end if;

  select c.id
  into target_cafeteria_id
  from public.cafeterias c
  where c.school_id = target_school_id and c.active = true
  order by c.created_at
  limit 1;

  if target_cafeteria_id is null then
    insert into public.cafeterias (school_id, name, description)
    values (target_school_id, 'Main cafeteria', 'Kingsway College dining service')
    returning id into target_cafeteria_id;
  end if;

  update public.schools
  set name = 'Kingsway College', timezone = 'America/Toronto', active = true
  where id = target_school_id;

  update public.cafeterias
  set name = 'Main cafeteria', active = true
  where id = target_cafeteria_id;

  insert into public.meal_periods (
    school_id, cafeteria_id, name, starts_at, ends_at, sort_order, active
  )
  select target_school_id, target_cafeteria_id, seed.name, seed.starts_at,
    seed.ends_at, seed.sort_order, true
  from (values
    ('Breakfast', '07:00'::time, '10:30'::time, 1::smallint),
    ('Lunch', '11:30'::time, '14:30'::time, 2::smallint),
    ('Dinner', '16:45'::time, '19:45'::time, 3::smallint)
  ) as seed(name, starts_at, ends_at, sort_order)
  where not exists (
    select 1 from public.meal_periods p
    where p.school_id = target_school_id
      and p.cafeteria_id = target_cafeteria_id
      and lower(p.name) = lower(seed.name)
  );

  insert into public.food_items (
    school_id, name, description, category, image_url, ingredients,
    allergens, dietary_information, serving_size, active
  )
  select target_school_id, seed.name, seed.description,
    seed.category::public.food_category, seed.image_url, seed.ingredients,
    seed.allergens, seed.dietary_information, seed.serving_size, true
  from (values
    ('Maple oatmeal', 'Warm oats with Canadian maple syrup and cinnamon.', 'main_dish',
      'https://images.unsplash.com/photo-1517673400267-0251440c45dc?auto=format&fit=crop&w=900&q=80',
      array['Oats','Milk','Maple syrup','Cinnamon'], array['Dairy'], array['Vegetarian'], '1 bowl'),
    ('Yogurt parfait', 'Vanilla yogurt, berries, and toasted granola.', 'other',
      'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=900&q=80',
      array['Yogurt','Berries','Granola'], array['Dairy','Gluten'], array['Vegetarian'], '1 cup'),
    ('French toast', 'Cinnamon French toast with maple syrup.', 'main_dish',
      'https://images.unsplash.com/photo-1484723091739-30a097e8f929?auto=format&fit=crop&w=900&q=80',
      array['Bread','Eggs','Milk','Maple syrup'], array['Gluten','Eggs','Dairy'], array['Vegetarian'], '2 slices'),
    ('Scrambled eggs', 'Soft scrambled eggs prepared for morning service.', 'side',
      'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=900&q=80',
      array['Eggs','Milk'], array['Eggs','Dairy'], array['Vegetarian','Gluten-free'], '2 eggs'),
    ('Breakfast burrito', 'Eggs, beans, peppers, and cheese in a warm tortilla.', 'main_dish',
      'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&w=900&q=80',
      array['Eggs','Beans','Tortilla','Cheese','Peppers'], array['Eggs','Dairy','Gluten'], array['Vegetarian'], '1 burrito'),
    ('Berry smoothie', 'Blended berries, banana, and yogurt.', 'drink',
      'https://images.unsplash.com/photo-1505252585461-04db1eb84625?auto=format&fit=crop&w=900&q=80',
      array['Berries','Banana','Yogurt'], array['Dairy'], array['Vegetarian','Gluten-free'], '300 mL'),
    ('Orange juice', 'Chilled 100% orange juice.', 'drink',
      'https://images.unsplash.com/photo-1600271886742-f049cd451bba?auto=format&fit=crop&w=900&q=80',
      array['Orange juice'], array[]::text[], array['Vegan','Gluten-free'], '250 mL'),
    ('Chicken shawarma bowl', 'Spiced chicken, rice, cucumber, and garlic sauce.', 'main_dish',
      'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=80',
      array['Chicken','Rice','Cucumber','Garlic sauce'], array['Dairy'], array['Halal','Gluten-free'], '1 bowl'),
    ('Beef tacos', 'Seasoned beef, lettuce, salsa, and cheese in soft tortillas.', 'main_dish',
      'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?auto=format&fit=crop&w=900&q=80',
      array['Beef','Tortilla','Lettuce','Salsa','Cheese'], array['Dairy','Gluten'], array[]::text[], '3 tacos'),
    ('Tomato basil pasta', 'Penne pasta in a bright tomato and basil sauce.', 'main_dish',
      'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=900&q=80',
      array['Penne','Tomato','Basil','Olive oil'], array['Gluten'], array['Vegan'], '1 bowl'),
    ('Veggie stir-fry', 'Crisp seasonal vegetables with ginger soy sauce.', 'main_dish',
      'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=900&q=80',
      array['Broccoli','Peppers','Carrots','Soy sauce','Ginger'], array['Soy'], array['Vegan','Gluten-free'], '1 bowl'),
    ('Baked salmon', 'Oven-baked salmon with lemon and dill.', 'main_dish',
      'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=900&q=80',
      array['Salmon','Lemon','Dill'], array['Fish'], array['Gluten-free'], '150 g'),
    ('Mac and cheese', 'Creamy baked macaroni with cheddar cheese.', 'main_dish',
      'https://images.unsplash.com/photo-1543339494-b4cd4f7ba686?auto=format&fit=crop&w=900&q=80',
      array['Pasta','Cheddar','Milk'], array['Gluten','Dairy'], array['Vegetarian'], '1 bowl'),
    ('Grilled chicken', 'Herb-marinated grilled chicken breast.', 'main_dish',
      'https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&w=900&q=80',
      array['Chicken','Olive oil','Herbs'], array[]::text[], array['Halal','Gluten-free'], '150 g'),
    ('Herbed rice', 'Long-grain rice with parsley and mild herbs.', 'side',
      'https://images.unsplash.com/photo-1516684732162-798a0062be99?auto=format&fit=crop&w=900&q=80',
      array['Rice','Parsley','Vegetable stock'], array[]::text[], array['Vegan','Gluten-free'], '1 cup'),
    ('Garden salad', 'Greens, cucumber, tomato, and light vinaigrette.', 'salad',
      'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=900&q=80',
      array['Lettuce','Cucumber','Tomato','Vinaigrette'], array[]::text[], array['Vegan','Gluten-free'], '1 bowl'),
    ('Roasted vegetables', 'Seasonal vegetables roasted with herbs.', 'side',
      'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=80',
      array['Carrots','Zucchini','Peppers','Olive oil'], array[]::text[], array['Vegan','Gluten-free'], '1 cup'),
    ('Vegetable soup', 'House-made vegetable soup with herbs.', 'other',
      'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=900&q=80',
      array['Vegetables','Tomato','Vegetable stock'], array[]::text[], array['Vegan','Gluten-free'], '1 bowl'),
    ('Caesar salad', 'Romaine, Parmesan, croutons, and Caesar dressing.', 'salad',
      'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?auto=format&fit=crop&w=900&q=80',
      array['Romaine','Parmesan','Croutons','Caesar dressing'], array['Dairy','Eggs','Gluten','Fish'], array['Vegetarian'], '1 bowl'),
    ('Garlic bread', 'Toasted bread with garlic butter and herbs.', 'bread',
      'https://images.unsplash.com/photo-1573140401552-3fab0b24306f?auto=format&fit=crop&w=900&q=80',
      array['Bread','Garlic','Butter'], array['Gluten','Dairy'], array['Vegetarian'], '2 pieces'),
    ('Fresh fruit cup', 'A seasonal mix of fresh-cut fruit.', 'fruit',
      'https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?auto=format&fit=crop&w=900&q=80',
      array['Seasonal fruit'], array[]::text[], array['Vegan','Gluten-free'], '1 cup'),
    ('Chocolate chip cookie', 'Fresh-baked cookie with chocolate chips.', 'dessert',
      'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=900&q=80',
      array['Flour','Butter','Eggs','Chocolate'], array['Gluten','Dairy','Eggs'], array['Vegetarian'], '1 cookie')
  ) as seed(name, description, category, image_url, ingredients, allergens, dietary_information, serving_size)
  where not exists (
    select 1 from public.food_items f
    where f.school_id = target_school_id and lower(f.name) = lower(seed.name)
  );

  create temporary table mealup_demo_slots (
    weekday integer not null,
    meal_name text not null,
    items text[] not null,
    primary key (weekday, meal_name)
  ) on commit drop;

  insert into mealup_demo_slots (weekday, meal_name, items) values
    (1, 'Breakfast', array['Maple oatmeal','Yogurt parfait','Fresh fruit cup']),
    (1, 'Lunch', array['Chicken shawarma bowl','Herbed rice','Garden salad']),
    (1, 'Dinner', array['Tomato basil pasta','Garlic bread','Caesar salad']),
    (2, 'Breakfast', array['French toast','Scrambled eggs','Orange juice']),
    (2, 'Lunch', array['Beef tacos','Garden salad','Fresh fruit cup']),
    (2, 'Dinner', array['Baked salmon','Roasted vegetables','Herbed rice']),
    (3, 'Breakfast', array['Breakfast burrito','Berry smoothie','Fresh fruit cup']),
    (3, 'Lunch', array['Veggie stir-fry','Herbed rice','Garden salad']),
    (3, 'Dinner', array['Mac and cheese','Roasted vegetables','Chocolate chip cookie']),
    (4, 'Breakfast', array['Maple oatmeal','Yogurt parfait','Orange juice']),
    (4, 'Lunch', array['Grilled chicken','Herbed rice','Caesar salad']),
    (4, 'Dinner', array['Vegetable soup','Garlic bread','Garden salad']),
    (5, 'Breakfast', array['French toast','Scrambled eggs','Fresh fruit cup']),
    (5, 'Lunch', array['Chicken shawarma bowl','Roasted vegetables','Chocolate chip cookie']),
    (5, 'Dinner', array['Tomato basil pasta','Caesar salad','Garlic bread']),
    (6, 'Breakfast', array['Breakfast burrito','Berry smoothie','Orange juice']),
    (6, 'Lunch', array['Beef tacos','Garden salad','Fresh fruit cup']),
    (6, 'Dinner', array['Baked salmon','Herbed rice','Roasted vegetables']),
    (7, 'Breakfast', array['Yogurt parfait','Maple oatmeal','Fresh fruit cup']),
    (7, 'Lunch', array['Veggie stir-fry','Garden salad','Chocolate chip cookie']),
    (7, 'Dinner', array['Mac and cheese','Vegetable soup','Garlic bread']);

  week_start := ((now() at time zone coalesce(target_timezone, 'America/Toronto'))::date
    - (extract(isodow from (now() at time zone coalesce(target_timezone, 'America/Toronto'))::date)::integer - 1));

  for service_day in
    select generate_series(week_start, week_start + 6, interval '1 day')::date
  loop
    for period_record in
      select p.* from public.meal_periods p
      where p.school_id = target_school_id
        and p.cafeteria_id = target_cafeteria_id
        and p.active
        and lower(p.name) in ('breakfast', 'lunch', 'dinner')
      order by p.sort_order
    loop
      select * into slot_record
      from mealup_demo_slots
      where weekday = extract(isodow from service_day)::integer
        and lower(meal_name) = lower(period_record.name);

      insert into public.menus (
        school_id, cafeteria_id, meal_period_id, service_date, published,
        service_starts_at, service_ends_at
      ) values (
        target_school_id, target_cafeteria_id, period_record.id, service_day, true,
        period_record.starts_at, period_record.ends_at
      )
      on conflict (cafeteria_id, meal_period_id, service_date)
      do update set
        published = true,
        service_starts_at = excluded.service_starts_at,
        service_ends_at = excluded.service_ends_at,
        updated_at = now()
      returning id into target_menu_id;

      delete from public.menu_items where menu_id = target_menu_id;

      insert into public.menu_items (menu_id, food_item_id, school_id, sort_order)
      select target_menu_id, f.id, target_school_id, choices.ordinality::smallint
      from unnest(slot_record.items) with ordinality as choices(name, ordinality)
      join public.food_items f
        on f.school_id = target_school_id and lower(f.name) = lower(choices.name);
    end loop;
  end loop;
end;
$$;

-- Promote an EXISTING Supabase Auth user. This creates no password and never
-- exposes credentials. Change the email if you use a different admin account.
insert into public.profiles (id, school_id, role, display_name, active)
select u.id, s.id, 'school_admin'::public.app_role,
  coalesce(nullif(u.raw_user_meta_data ->> 'display_name', ''), 'MealUp administrator'), true
from auth.users u
cross join lateral (
  select id from public.schools where active = true order by created_at limit 1
) s
where lower(u.email) = 'admtesting@gmail.com'
on conflict (id) do update set
  school_id = excluded.school_id,
  role = 'school_admin'::public.app_role,
  active = true,
  updated_at = now();

select
  case when exists (select 1 from auth.users where lower(email) = 'admtesting@gmail.com')
    then 'Admin ready: sign in at /login with admtesting@gmail.com.'
    else 'Admin not changed: create admtesting@gmail.com in Supabase Authentication > Users first, then rerun the final section.'
  end as admin_status;
