-- ─────────────────────────────────────────────────────────────────────────────
-- 001_initial_schema.sql — Purity Farms initial schema
-- UUID primary keys, snake_case columns, enum domains, updated_at triggers.
-- ─────────────────────────────────────────────────────────────────────────────

create extension if not exists "pgcrypto";

do $$ begin create type public.user_role as enum ('owner', 'manager', 'staff'); exception when duplicate_object then null; end $$;
do $$ begin create type public.batch_type as enum ('broiler', 'layer'); exception when duplicate_object then null; end $$;
do $$ begin create type public.batch_status as enum ('active', 'completed', 'closed'); exception when duplicate_object then null; end $$;
do $$ begin create type public.feed_type as enum ('starter', 'grower', 'finisher', 'layer_mash'); exception when duplicate_object then null; end $$;
do $$ begin create type public.sale_category as enum ('live_birds', 'dressed_meat', 'manure', 'cull_hens', 'egg_crates'); exception when duplicate_object then null; end $$;
do $$ begin create type public.expense_category as enum ('feed', 'day_old_chicks', 'vet_vaccines', 'utilities', 'labor', 'housing', 'bedding'); exception when duplicate_object then null; end $$;

-- Farms -----------------------------------------------------------------------
create table if not exists public.farms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text,
  created_at timestamptz not null default now()
);

-- Profiles (one row per person; auth_user_id links to auth.users) -------------
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  full_name text not null default 'Unnamed user',
  email text not null unique,
  role public.user_role not null default 'staff',
  farm_id uuid references public.farms(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Reference directories -------------------------------------------------------
create table if not exists public.sheds (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  name text not null,
  capacity integer,
  created_at timestamptz not null default now()
);

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  name text not null,
  contact text,
  category text,
  created_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  name text not null,
  contact text,
  location text,
  created_at timestamptz not null default now()
);

-- Batches (the core production unit) ------------------------------------------
create table if not exists public.batches (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  name text not null,
  type public.batch_type not null default 'broiler',
  start_date date not null default current_date,
  initial_count integer not null default 0 check (initial_count >= 0),
  breed text,
  initial_avg_weight numeric(8, 4) not null default 0.042,
  shed_id text,
  point_of_lay_date date,
  status public.batch_status not null default 'active',
  created_at timestamptz not null default now()
);

-- Daily operations logs -------------------------------------------------------
create table if not exists public.mortality_logs (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.batches(id) on delete cascade,
  farm_id uuid not null references public.farms(id) on delete cascade,
  log_date date not null default current_date,
  count integer not null default 0 check (count >= 0),
  reason text,
  culled boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.feed_logs (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.batches(id) on delete cascade,
  farm_id uuid not null references public.farms(id) on delete cascade,
  log_date date not null default current_date,
  feed_type public.feed_type not null default 'starter',
  quantity_kg numeric(12, 2) not null default 0,
  bags_50kg integer not null default 0,
  cost_per_bag numeric(12, 2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.medication_logs (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.batches(id) on delete cascade,
  farm_id uuid not null references public.farms(id) on delete cascade,
  log_date date not null default current_date,
  name text not null,
  dosage text,
  method text,
  withdrawal_days integer not null default 0,
  cost numeric(12, 2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.egg_collection_logs (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.batches(id) on delete cascade,
  farm_id uuid not null references public.farms(id) on delete cascade,
  log_date date not null default current_date,
  total_eggs integer not null default 0,
  damaged_eggs integer not null default 0,
  crates numeric(10, 2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.weight_logs (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.batches(id) on delete cascade,
  farm_id uuid not null references public.farms(id) on delete cascade,
  log_date date not null default current_date,
  sample_size integer not null default 0,
  avg_weight_kg numeric(8, 4) not null default 0,
  created_at timestamptz not null default now()
);

-- Financials ------------------------------------------------------------------
create table if not exists public.sales_records (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.batches(id) on delete cascade,
  farm_id uuid not null references public.farms(id) on delete cascade,
  log_date date not null default current_date,
  category public.sale_category not null default 'live_birds',
  quantity numeric(12, 2) not null default 0,
  unit_price numeric(12, 2) not null default 0,
  total numeric(14, 2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.expense_records (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.batches(id) on delete cascade,
  farm_id uuid not null references public.farms(id) on delete cascade,
  log_date date not null default current_date,
  category public.expense_category not null default 'feed',
  description text,
  amount numeric(14, 2) not null default 0,
  created_at timestamptz not null default now()
);

-- Indexes ---------------------------------------------------------------------
create index if not exists sheds_farm_id_idx on public.sheds (farm_id);
create index if not exists profiles_farm_id_idx on public.profiles (farm_id);
create index if not exists suppliers_farm_id_idx on public.suppliers (farm_id);
create index if not exists customers_farm_id_idx on public.customers (farm_id);
create index if not exists batches_farm_id_idx on public.batches (farm_id);
create index if not exists batches_status_idx on public.batches (status);
create index if not exists mortality_logs_batch_idx on public.mortality_logs (batch_id, log_date desc);
create index if not exists feed_logs_batch_idx on public.feed_logs (batch_id, log_date desc);
create index if not exists medication_logs_batch_idx on public.medication_logs (batch_id, log_date desc);
create index if not exists egg_logs_batch_idx on public.egg_collection_logs (batch_id, log_date desc);
create index if not exists weight_logs_batch_idx on public.weight_logs (batch_id, log_date desc);
create index if not exists sales_batch_idx on public.sales_records (batch_id, log_date desc);
create index if not exists expenses_batch_idx on public.expense_records (batch_id, log_date desc);

-- updated_at maintenance ------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
  tbls text[] := array[
    'farms', 'profiles', 'sheds', 'suppliers', 'customers', 'batches',
    'mortality_logs', 'feed_logs', 'medication_logs', 'egg_collection_logs',
    'weight_logs', 'sales_records', 'expense_records'
  ];
begin
  foreach t in array tbls loop
    execute format('alter table public.%I add column if not exists updated_at timestamptz not null default now()', t);
    execute format('drop trigger if exists %I on public.%I', t || '_touch_updated_at', t);
    execute format('create trigger %I before update on public.%I for each row execute function public.touch_updated_at()', t || '_touch_updated_at', t);
  end loop;
end $$;