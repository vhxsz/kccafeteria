-- Empty schedule slots are planning placeholders, not student-facing meals.
-- A previous schedule save published every slot, which could make an empty
-- Lunch or Dinner replace the last real meal on table-tag pages.

update public.menus as menu
set
  published = false,
  updated_at = now()
where menu.published = true
  and not exists (
    select 1
    from public.menu_items as menu_item
    where menu_item.menu_id = menu.id
  );
