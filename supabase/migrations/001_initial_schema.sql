create extension if not exists pgcrypto;

create type public.app_role as enum (
  'student',
  'staff',
  'cafeteria_manager',
  'school_admin',
  'platform_admin'
);

create type public.food_category as enum (
  'main_dish',
  'side',
  'salad',
  'dessert',
  'fruit',
  'bread',
  'drink',
  'other'
);

create type public.review_status as enum (
  'published',
  'flagged',
  'under_review',
  'hidden',
  'deleted'
);

create table public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  timezone text not null default 'America/Toronto',
  logo_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  school_id uuid references public.schools(id) on delete cascade,
  role public.app_role not null default 'student',
  display_name text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cafeterias (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  name text not null,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.dining_areas (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  cafeteria_id uuid not null references public.cafeterias(id) on delete cascade,
  name text not null,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.cafeteria_tables (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  cafeteria_id uuid not null references public.cafeterias(id) on delete cascade,
  dining_area_id uuid references public.dining_areas(id) on delete set null,
  name text not null,
  display_name text not null,
  public_token text not null unique default encode(gen_random_bytes(12), 'hex'),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.meal_periods (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  cafeteria_id uuid not null references public.cafeterias(id) on delete cascade,
  name text not null,
  starts_at time not null,
  ends_at time not null,
  sort_order smallint not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint meal_period_time_order check (starts_at < ends_at)
);

create table public.food_items (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  name text not null,
  description text,
  category public.food_category not null default 'other',
  image_url text,
  allergens text[] not null default '{}',
  dietary_information text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.menus (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  cafeteria_id uuid not null references public.cafeterias(id) on delete cascade,
  meal_period_id uuid not null references public.meal_periods(id) on delete restrict,
  service_date date not null,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cafeteria_id, meal_period_id, service_date)
);

create table public.menu_items (
  menu_id uuid not null references public.menus(id) on delete cascade,
  food_item_id uuid not null references public.food_items(id) on delete restrict,
  school_id uuid not null references public.schools(id) on delete cascade,
  sort_order smallint not null default 0,
  primary key (menu_id, food_item_id)
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  cafeteria_id uuid not null references public.cafeterias(id) on delete cascade,
  table_id uuid references public.cafeteria_tables(id) on delete set null,
  meal_period_id uuid not null references public.meal_periods(id) on delete restrict,
  menu_id uuid not null references public.menus(id) on delete restrict,
  user_id uuid references auth.users(id) on delete set null,
  anonymous_identifier_hash text,
  overall_rating smallint not null check (overall_rating between 1 and 5),
  comment text check (char_length(comment) <= 280),
  status public.review_status not null default 'published',
  idempotency_key uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  unique (school_id, idempotency_key)
);

create table public.review_items (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  review_id uuid not null references public.reviews(id) on delete cascade,
  food_item_id uuid not null references public.food_items(id) on delete restrict,
  rating smallint check (rating between 1 and 5),
  taste_rating smallint check (taste_rating between 1 and 5),
  temperature_rating smallint check (temperature_rating between 1 and 5),
  portion_rating smallint check (portion_rating between 1 and 5),
  appearance_rating smallint check (appearance_rating between 1 and 5),
  created_at timestamptz not null default now(),
  unique (review_id, food_item_id)
);

create table public.feedback_tags (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  name text not null,
  sentiment text not null check (sentiment in ('positive', 'negative', 'neutral')),
  category text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (school_id, name)
);

create table public.review_tags (
  review_id uuid not null references public.reviews(id) on delete cascade,
  tag_id uuid not null references public.feedback_tags(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  primary key (review_id, tag_id)
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  school_id uuid not null references public.schools(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index reviews_school_created_idx on public.reviews (school_id, created_at desc);
create index reviews_school_meal_created_idx on public.reviews (school_id, meal_period_id, created_at desc);
create index reviews_school_rating_idx on public.reviews (school_id, overall_rating);
create index menus_lookup_idx on public.menus (school_id, cafeteria_id, service_date, meal_period_id)
  where published = true;
create index cafeteria_tables_school_idx on public.cafeteria_tables (school_id, cafeteria_id);
create index audit_logs_school_created_idx on public.audit_logs (school_id, created_at desc);

create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger schools_set_updated_at before update on public.schools
for each row execute function public.set_updated_at();
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger cafeterias_set_updated_at before update on public.cafeterias
for each row execute function public.set_updated_at();
create trigger tables_set_updated_at before update on public.cafeteria_tables
for each row execute function public.set_updated_at();
create trigger foods_set_updated_at before update on public.food_items
for each row execute function public.set_updated_at();
create trigger menus_set_updated_at before update on public.menus
for each row execute function public.set_updated_at();

create schema if not exists private;

create function private.current_school_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select school_id from public.profiles
  where id = (select auth.uid()) and active = true;
$$;

create function private.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles
  where id = (select auth.uid()) and active = true;
$$;

revoke all on function private.current_school_id() from public;
revoke all on function private.current_app_role() from public;
grant usage on schema private to authenticated;
grant execute on function private.current_school_id() to authenticated;
grant execute on function private.current_app_role() to authenticated;

alter table public.schools enable row level security;
alter table public.profiles enable row level security;
alter table public.cafeterias enable row level security;
alter table public.dining_areas enable row level security;
alter table public.cafeteria_tables enable row level security;
alter table public.meal_periods enable row level security;
alter table public.food_items enable row level security;
alter table public.menus enable row level security;
alter table public.menu_items enable row level security;
alter table public.reviews enable row level security;
alter table public.review_items enable row level security;
alter table public.feedback_tags enable row level security;
alter table public.review_tags enable row level security;
alter table public.audit_logs enable row level security;

create policy "Members can read their school"
on public.schools for select to authenticated
using (id = (select private.current_school_id()));

create policy "Members can read profiles in their school"
on public.profiles for select to authenticated
using (school_id = (select private.current_school_id()));

create policy "Users can update their own profile"
on public.profiles for update to authenticated
using (id = auth.uid())
with check (id = (select auth.uid()) and school_id = (select private.current_school_id()));

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
    execute format(
      'create policy "Tenant members can read %1$s" on public.%1$I for select to authenticated using (school_id = (select private.current_school_id()))',
      table_name
    );
    execute format(
      'create policy "Managers can create %1$s" on public.%1$I for insert to authenticated with check (
        school_id = (select private.current_school_id())
        and (select private.current_app_role()) in (''cafeteria_manager'', ''school_admin'', ''platform_admin'')
      )',
      table_name
    );
    execute format(
      'create policy "Managers can update %1$s" on public.%1$I for update to authenticated using (
        school_id = (select private.current_school_id())
        and (select private.current_app_role()) in (''cafeteria_manager'', ''school_admin'', ''platform_admin'')
      ) with check (school_id = (select private.current_school_id()))',
      table_name
    );

    execute format(
      'create policy "Managers can delete %1$s" on public.%1$I for delete to authenticated using (
        school_id = (select private.current_school_id())
        and (select private.current_app_role()) in (''cafeteria_manager'', ''school_admin'', ''platform_admin'')
      )',
      table_name
    );
  end loop;
end
$$;

comment on function private.current_school_id() is
  'Returns the signed-in user tenant id without exposing cross-tenant profile rows.';
comment on table public.reviews is
  'Public review submissions must go through a rate-limited server endpoint; anonymous direct inserts are intentionally disabled.';
