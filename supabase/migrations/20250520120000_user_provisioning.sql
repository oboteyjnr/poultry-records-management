-- ─────────────────────────────────────────────────────────────────────────────
-- user_provisioning.sql — Owner-managed provisioning + forced first-login reset
--
-- Additive, non-destructive migration. The existing profiles table (001) keys
-- on auth_user_id and uses the public.user_role enum ('owner','manager','staff').
-- We keep that shape (the whole app depends on it) and only add what this
-- feature needs: a must_change_password mirror column and the auth.users
-- provisioning trigger.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) Mirror flag so the owner's Team view can show onboarding status without
--    joining auth.users (which anon/authenticated cannot read directly).
alter table public.profiles
  add column if not exists must_change_password boolean not null default false;

-- 2) Provision a profile row automatically whenever an auth user is created.
--    Reads the metadata the owner-registration flow and the create-user edge
--    function attach (full_name, role, farm_id, must_change_password).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := coalesce(nullif(new.raw_user_meta_data ->> 'role', ''), 'staff');
begin
  -- Backward-compat: map the plan's 'worker' label onto the existing enum.
  if v_role = 'worker' then v_role := 'staff'; end if;
  if v_role not in ('owner', 'manager', 'staff') then v_role := 'staff'; end if;

  insert into public.profiles (
    auth_user_id, email, full_name, role, farm_id, must_change_password
  )
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'email', ''), new.email),
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(split_part(new.email, '@', 1), ''),
      'Unnamed user'
    ),
    v_role::public.user_role,
    (new.raw_user_meta_data ->> 'farm_id')::uuid,
    coalesce((new.raw_user_meta_data ->> 'must_change_password')::boolean, false)
  )
  on conflict (auth_user_id) do update
    set full_name          = excluded.full_name,
        role               = excluded.role,
        farm_id            = coalesce(excluded.farm_id, public.profiles.farm_id),
        must_change_password = excluded.must_change_password;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3) Owner-scoped management. The base 002 policies already let authenticated
--    users read all profiles (single-tenant console). Add a policy so an owner
--    can update members of their own farm (role changes / status), while a
--    normal user can still only touch their own row (profiles_update_self).
drop policy if exists profiles_owner_manage on public.profiles;
create policy profiles_owner_manage on public.profiles
  for update to authenticated
  using (
    exists (
      select 1 from public.profiles me
      where me.auth_user_id = auth.uid()
        and me.role = 'owner'
        and me.farm_id is not null
        and me.farm_id = profiles.farm_id
    )
  )
  with check (
    exists (
      select 1 from public.profiles me
      where me.auth_user_id = auth.uid()
        and me.role = 'owner'
        and me.farm_id is not null
        and me.farm_id = profiles.farm_id
    )
  );
