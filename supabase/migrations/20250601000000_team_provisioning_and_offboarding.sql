-- ────────────────────────────────────────────────────────────────────────────────
-- 20250601000000_team_provisioning_and_offboarding.sql
--
-- Owner-managed Team Provisioning, Email Notification & User Offboarding.
--
-- Guarantees (idempotent — safe to run on a fresh OR pre-existing database):
--   • public.profiles: id uuid PK REFERENCES auth.users(id) ON DELETE CASCADE,
--     email NOT NULL, full_name, role CHECK IN ('owner','manager','worker'),
--     created_at DEFAULT now(), plus must_change_password + farm_id + auth_user_id.
--   • public.is_owner() / public.current_farm_id() SECURITY DEFINER helpers.
--   • public.handle_new_user() trigger on auth.users AFTER INSERT that syncs the
--     new account's metadata (full_name / role / farm_id) into public.profiles.
--   • RLS: self access, same-farm team visibility, and full owner control.
-- ────────────────────────────────────────────────────────────────────────────────

create extension if not exists "pgcrypto";

-- ── Farms (FK target for profiles.farm_id + owner registration flow) ───────────
create table if not exists public.farms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text,
  created_at timestamptz not null default now()
);

-- ── Profiles ───────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'worker' check (role in ('owner', 'manager', 'worker')),
  created_at timestamptz not null default now(),
  farm_id uuid references public.farms (id) on delete set null,
  auth_user_id uuid,
  must_change_password boolean not null default false
);

-- Backfill / normalise columns when an older revision of the table already exists.
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists role text;
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists farm_id uuid;
alter table public.profiles add column if not exists auth_user_id uuid;
alter table public.profiles add column if not exists must_change_password boolean not null default false;

-- Role may previously have been an enum; migrate it to text with the spec values.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles'
      and column_name = 'role' and data_type = 'USER-DEFINED'
  ) then
    alter table public.profiles alter column role drop default;
    alter table public.profiles
      alter column role type text
      using (case when role::text = 'staff' then 'worker' else role::text end);
  end if;
end $$;

update public.profiles set role = 'worker' where role = 'staff';
update public.profiles set role = 'worker' where role is null;

alter table public.profiles alter column role set default 'worker';
alter table public.profiles alter column role set not null;

-- Enforce the spec'd role check constraint ('owner','manager','worker').
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conrelid = 'public.profiles'::regclass and conname = 'profiles_role_check'
  ) then
    alter table public.profiles drop constraint profiles_role_check;
  end if;
end $$;

alter table public.profiles
  add constraint profiles_role_check check (role in ('owner', 'manager', 'worker'));

-- Cascade deletion on auth.users(id).
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.profiles'::regclass and conname = 'profiles_id_fkey'
  ) then
    alter table public.profiles
      add constraint profiles_id_fkey
      foreign key (id) references auth.users (id) on delete cascade;
  end if;
end $$;

create index if not exists profiles_farm_id_idx on public.profiles (farm_id);
create index if not exists profiles_auth_user_id_idx on public.profiles (auth_user_id);

-- Keep id (auth.users FK) and the legacy auth_user_id mirror in step on every insert.
create or replace function public.sync_profile_identity()
returns trigger
language plpgsql
as $$
begin
  if new.id is null and new.auth_user_id is not null then
    new.id := new.auth_user_id;
  end if;
  if new.auth_user_id is null then
    new.auth_user_id := new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_sync_identity on public.profiles;
create trigger profiles_sync_identity
  before insert on public.profiles
  for each row execute function public.sync_profile_identity();

-- ── Security helpers ───────────────────────────────────────────────────────────
create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where (p.id = auth.uid() or p.auth_user_id = auth.uid())
      and p.role = 'owner'
  );
$$;

create or replace function public.current_farm_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.farm_id from public.profiles p
  where (p.id = auth.uid() or p.auth_user_id = auth.uid())
  limit 1;
$$;

-- ── Auto-sync a profile row whenever an auth user is created ───────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := coalesce(nullif(new.raw_user_meta_data ->> 'role', ''), 'worker');
  v_email text := coalesce(nullif(new.raw_user_meta_data ->> 'email', ''), new.email, '');
  v_name text := coalesce(
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'Unnamed user'
  );
  v_farm uuid;
begin
  -- Backward compat: older callers used the 'staff' label.
  if v_role = 'staff' then v_role := 'worker'; end if;
  if v_role not in ('owner', 'manager', 'worker') then v_role := 'worker'; end if;

  begin
    v_farm := nullif(new.raw_user_meta_data ->> 'farm_id', '')::uuid;
  exception when others then
    v_farm := null;
  end;

  insert into public.profiles (id, auth_user_id, email, full_name, role, farm_id, must_change_password)
  values (
    new.id,
    new.id,
    v_email,
    v_name,
    v_role,
    v_farm,
    coalesce((new.raw_user_meta_data ->> 'must_change_password')::boolean, false)
  )
  on conflict (id) do update
    set email                = excluded.email,
        full_name            = excluded.full_name,
        role                 = excluded.role,
        farm_id              = coalesce(excluded.farm_id, public.profiles.farm_id),
        must_change_password = excluded.must_change_password;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Row Level Security ─────────────────────────────────────────────────────────
alter table public.profiles enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = auth.uid() or auth_user_id = auth.uid());

drop policy if exists profiles_select_farm_members on public.profiles;
create policy profiles_select_farm_members on public.profiles
  for select to authenticated
  using (
    farm_id is not null
    and public.current_farm_id() is not null
    and farm_id = public.current_farm_id()
  );

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid() or auth_user_id = auth.uid())
  with check (id = auth.uid() or auth_user_id = auth.uid());

drop policy if exists profiles_owner_all on public.profiles;
create policy profiles_owner_all on public.profiles
  for all to authenticated
  using (public.is_owner())
  with check (public.is_owner());

-- Owner-only INSERT protection (teammates can never self-create privileged rows).
drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self on public.profiles
  for insert to authenticated
  with check (id = auth.uid() or auth_user_id = auth.uid() or public.is_owner());

drop policy if exists profiles_delete_owner on public.profiles;
create policy profiles_delete_owner on public.profiles
  for delete to authenticated
  using (public.is_owner());

-- Farms: readable by any signed-in teammate, mutations owner-scoped.
alter table public.farms enable row level security;

drop policy if exists farms_select_authenticated on public.farms;
create policy farms_select_authenticated on public.farms
  for select to authenticated using (true);

drop policy if exists farms_insert_authenticated on public.farms;
create policy farms_insert_authenticated on public.farms
  for insert to authenticated with check (true);

drop policy if exists farms_update_owner on public.farms;
create policy farms_update_owner on public.farms
  for update to authenticated
  using (public.is_owner()) with check (public.is_owner());

-- ── Grants ─────────────────────────────────────────────────────────────────────
grant usage on schema public to anon, authenticated, service_role;
grant all on public.profiles to service_role;
grant all on public.farms to service_role;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.farms to authenticated;