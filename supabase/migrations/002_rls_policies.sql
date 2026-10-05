-- ─────────────────────────────────────────────────────────────────────────────
-- 002_rls_policies.sql — Row Level Security for Purity Farms
--
-- Model (documented trade-off): the operations console is a single-tenant
-- dashboard, so authenticated users get full CRUD and anonymous visitors keep
-- read-only access (used by the demo dataset explorer). Every table still has
-- RLS enforced, so when you introduce multi-tenant stricter rules you only need
-- to replace the `using (true)` predicates below with farm scoping, e.g.
-- `using (farm_id = (select farm_id from public.profiles where auth_user_id = auth.uid()))`.
-- ─────────────────────────────────────────────────────────────────────────────

grant usage on schema public to anon, authenticated;
grant select on all tables in schema public to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
alter default privileges in schema public grant select on tables to anon;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;

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
    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists %I on public.%I', t || '_read_public', t);
    execute format('drop policy if exists %I on public.%I', t || '_insert_authenticated', t);
    execute format('drop policy if exists %I on public.%I', t || '_update_authenticated', t);
    execute format('drop policy if exists %I on public.%I', t || '_delete_authenticated', t);

    -- Any visitor may read operational data (demo dashboard + reporting).
    execute format(
      'create policy %I on public.%I for select to anon, authenticated using (true)',
      t || '_read_public', t
    );

    -- Only signed-in team members may mutate data.
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (true)',
      t || '_insert_authenticated', t
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using (true) with check (true)',
      t || '_update_authenticated', t
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using (true)',
      t || '_delete_authenticated', t
    );
  end loop;
end $$;

-- Self-service profile handling ------------------------------------------------
-- A freshly signed-up user may create their own profile row during
-- auto-provisioning, and may only update/delete their own row afterwards.
drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self on public.profiles
  for insert to authenticated, anon
  with check (auth_user_id is null or auth_user_id = auth.uid());

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (auth_user_id = auth.uid() or auth_user_id is null)
  with check (auth_user_id = auth.uid() or auth_user_id is null);