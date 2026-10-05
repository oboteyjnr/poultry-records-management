-- ─── Farm Settings (multi-tenant, one row per farm) ──────────────────────────
create table if not exists public.farm_settings (
  farm_id uuid primary key references public.farms(id) on delete cascade,
  -- profile & branding
  farm_name text,
  registration_number text,
  contact_email text,
  contact_phone text,
  physical_address text,
  logo_url text,
  -- operations & alerts
  mortality_warning_pct numeric(5,2) not null default 2,
  mortality_critical_pct numeric(5,2) not null default 5,
  broiler_target_fcr numeric(5,2) not null default 1.6,
  layer_target_fcr numeric(5,2) not null default 2.0,
  flock_strains text[] not null default array['Ross 308','Cobb 500','Isa Brown','Lohmann Brown'],
  -- units & localization
  currency text not null default 'NGN',
  weight_unit text not null default 'kg',
  feed_unit text not null default 'bags',
  crate_capacity integer not null default 30,
  timezone text not null default 'Africa/Lagos',
  date_format text not null default 'DD/MM/YYYY',
  -- roles & permissions
  allow_worker_financials boolean not null default false,
  require_expense_approval boolean not null default true,
  expense_approval_threshold numeric(14,2) not null default 50000,
  -- accounting categories
  revenue_categories text[] not null default array['Live Birds','Egg Crates','Manure','Cull Hens'],
  expense_categories text[] not null default array['Feed','Day-Old Chicks','Vaccines','Utilities','Labor','Housing','Bedding'],
  feed_unit_costs jsonb not null default '{"starter":2800,"grower":3200,"finisher":3400,"layer_mash":2500}'::jsonb,
  updated_at timestamptz not null default now()
);

-- keep updated_at fresh
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists farm_settings_touch_updated_at on public.farm_settings;
create trigger farm_settings_touch_updated_at
  before update on public.farm_settings
  for each row execute function public.touch_updated_at();

-- ─── Row Level Security ───────────────────────────────────────────────────────
alter table public.farm_settings enable row level security;

-- Authenticated users are scoped to their own farm (true multi-tenant isolation).
drop policy if exists farm_settings_auth_select on public.farm_settings;
create policy farm_settings_auth_select on public.farm_settings
  for select to authenticated using (
    farm_id = (select p.farm_id from public.profiles p where p.auth_user_id = auth.uid())
  );

drop policy if exists farm_settings_auth_insert on public.farm_settings;
create policy farm_settings_auth_insert on public.farm_settings
  for insert to authenticated with check (
    farm_id = (select p.farm_id from public.profiles p where p.auth_user_id = auth.uid())
  );

drop policy if exists farm_settings_auth_update on public.farm_settings;
create policy farm_settings_auth_update on public.farm_settings
  for update to authenticated using (
    farm_id = (select p.farm_id from public.profiles p where p.auth_user_id = auth.uid())
  ) with check (
    farm_id = (select p.farm_id from public.profiles p where p.auth_user_id = auth.uid())
  );

-- Demo / anon sessions: full read + write so the settings module persists
-- against the live project while exploring without an account.
drop policy if exists farm_settings_anon_select on public.farm_settings;
create policy farm_settings_anon_select on public.farm_settings
  for select to anon using (true);

drop policy if exists farm_settings_anon_insert on public.farm_settings;
create policy farm_settings_anon_insert on public.farm_settings
  for insert to anon with check (true);

drop policy if exists farm_settings_anon_update on public.farm_settings;
create policy farm_settings_anon_update on public.farm_settings
  for update to anon using (true) with check (true);

grant select, insert, update on public.farm_settings to anon, authenticated;
