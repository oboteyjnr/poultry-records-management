-- ─────────────────────────────────────────────────────────────────────────────
-- seed.sql — demo data for Purity Farms (idempotent, safe to re-run).
-- Load with:  supabase db reset   (runs this file automatically)
--         or: psql "$DATABASE_URL" -f supabase/seed.sql
-- ─────────────────────────────────────────────────────────────────────────────

insert into public.farms (id, name, location) values
  ('11111111-1111-4111-8111-111111111111', 'GreenPasture Poultry', 'Nakuru, Kenya'),
  ('22222222-2222-4222-8222-222222222222', 'Sunrise Broiler Complex', 'Eldoret, Kenya')
on conflict (id) do nothing;

insert into public.profiles (id, full_name, email, role, farm_id) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'James Mwangi', 'james@greenpasture.co.ke', 'owner', '11111111-1111-4111-8111-111111111111'),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'Grace Wanjiru', 'grace@greenpasture.co.ke', 'manager', '11111111-1111-4111-8111-111111111111'),
  ('aaaaaaaa-0000-4000-8000-000000000003', 'Peter Otieno', 'peter@greenpasture.co.ke', 'staff', '11111111-1111-4111-8111-111111111111'),
  ('aaaaaaaa-0000-4000-8000-000000000004', 'Mary Chebet', 'mary@sunrisebroilers.co.ke', 'owner', '22222222-2222-4222-8222-222222222222')
on conflict (id) do nothing;

insert into public.sheds (id, farm_id, name, capacity) values
  ('33333333-3333-4333-8333-000000000001', '11111111-1111-4111-8111-111111111111', 'Shed-1', 6000),
  ('33333333-3333-4333-8333-000000000002', '11111111-1111-4111-8111-111111111111', 'Shed-3', 3500),
  ('33333333-3333-4333-8333-000000000003', '22222222-2222-4222-8222-222222222222', 'Shed-A', 9000),
  ('33333333-3333-4333-8333-000000000004', '22222222-2222-4222-8222-222222222222', 'Shed-B', 5000)
on conflict (id) do nothing;

insert into public.batches (id, farm_id, name, type, start_date, initial_count, breed, initial_avg_weight, shed_id, point_of_lay_date, status) values
  ('bbbbbbbb-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'Batch A-24', 'broiler', current_date - 28, 5000, 'Ross 308', 0.042, 'Shed-1', null, 'active'),
  ('bbbbbbbb-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', 'Batch L-12', 'layer', current_date - 190, 3200, 'ISA Brown', 0.038, 'Shed-3', current_date - 12, 'active'),
  ('bbbbbbbb-0000-4000-8000-000000000003', '22222222-2222-4222-8222-222222222222', 'Batch B-07', 'broiler', current_date - 41, 8000, 'Cobb 500', 0.040, 'Shed-A', null, 'active'),
  ('bbbbbbbb-0000-4000-8000-000000000004', '22222222-2222-4222-8222-222222222222', 'Batch L-05', 'layer', current_date - 240, 4500, 'Lohmann Brown', 0.037, 'Shed-B', current_date - 60, 'active')
on conflict (id) do nothing;

insert into public.mortality_logs (batch_id, farm_id, log_date, count, reason, culled) values
  ('bbbbbbbb-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', current_date - 22, 12, 'Heat stress', false),
  ('bbbbbbbb-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', current_date - 15, 8, 'Weak chicks', true),
  ('bbbbbbbb-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', current_date - 20, 5, 'Predator injury', false),
  ('bbbbbbbb-0000-4000-8000-000000000003', '22222222-2222-4222-8222-222222222222', current_date - 30, 24, 'Ascites', false),
  ('bbbbbbbb-0000-4000-8000-000000000003', '22222222-2222-4222-8222-222222222222', current_date - 9, 17, 'Respiratory distress', false),
  ('bbbbbbbb-0000-4000-8000-000000000004', '22222222-2222-4222-8222-222222222222', current_date - 11, 9, 'Cannibalism', true)
on conflict do nothing;

insert into public.feed_logs (batch_id, farm_id, log_date, feed_type, quantity_kg, bags_50kg, cost_per_bag) values
  ('bbbbbbbb-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', current_date - 25, 'starter', 500, 10, 3400),
  ('bbbbbbbb-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', current_date - 18, 'grower', 1000, 20, 3200),
  ('bbbbbbbb-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', current_date - 5, 'finisher', 1250, 25, 3100),
  ('bbbbbbbb-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', current_date - 12, 'layer_mash', 1500, 30, 2950),
  ('bbbbbbbb-0000-4000-8000-000000000003', '22222222-2222-4222-8222-222222222222', current_date - 35, 'starter', 900, 18, 3350),
  ('bbbbbbbb-0000-4000-8000-000000000003', '22222222-2222-4222-8222-222222222222', current_date - 14, 'grower', 2000, 40, 3180),
  ('bbbbbbbb-0000-4000-8000-000000000004', '22222222-2222-4222-8222-222222222222', current_date - 8, 'layer_mash', 2100, 42, 2900)
on conflict do nothing;

insert into public.medication_logs (batch_id, farm_id, log_date, name, dosage, method, withdrawal_days, cost) values
  ('bbbbbbbb-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', current_date - 24, 'Newcastle vaccine', '1 dose/bird', 'Drinking water', 0, 4500),
  ('bbbbbbbb-0000-4000-8000-000000000003', '22222222-2222-4222-8222-222222222222', current_date - 28, 'Amprolium', '1 g/L', 'Drinking water', 5, 3200),
  ('bbbbbbbb-0000-4000-8000-000000000004', '22222222-2222-4222-8222-222222222222', current_date - 10, 'Oxytetracycline', '0.5 g/L', 'Drinking water', 7, 2800)
on conflict do nothing;

insert into public.egg_collection_logs (batch_id, farm_id, log_date, total_eggs, damaged_eggs, crates) values
  ('bbbbbbbb-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', current_date - 6, 2780, 34, 93),
  ('bbbbbbbb-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', current_date - 2, 2845, 21, 95),
  ('bbbbbbbb-0000-4000-8000-000000000004', '22222222-2222-4222-8222-222222222222', current_date - 5, 3860, 48, 129),
  ('bbbbbbbb-0000-4000-8000-000000000004', '22222222-2222-4222-8222-222222222222', current_date - 1, 3920, 30, 131)
on conflict do nothing;

insert into public.weight_logs (batch_id, farm_id, log_date, sample_size, avg_weight_kg) values
  ('bbbbbbbb-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', current_date - 20, 100, 0.62),
  ('bbbbbbbb-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', current_date - 4, 120, 1.68),
  ('bbbbbbbb-0000-4000-8000-000000000003', '22222222-2222-4222-8222-222222222222', current_date - 24, 150, 0.95),
  ('bbbbbbbb-0000-4000-8000-000000000003', '22222222-2222-4222-8222-222222222222', current_date - 3, 150, 2.24),
  ('bbbbbbbb-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', current_date - 7, 80, 1.94)
on conflict do nothing;

insert into public.sales_records (batch_id, farm_id, log_date, category, quantity, unit_price, total) values
  ('bbbbbbbb-0000-4000-8000-000000000003', '22222222-2222-4222-8222-222222222222', current_date - 6, 'live_birds', 1500, 480, 720000),
  ('bbbbbbbb-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', current_date - 3, 'live_birds', 900, 520, 468000),
  ('bbbbbbbb-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', current_date - 2, 'egg_crates', 95, 320, 30400),
  ('bbbbbbbb-0000-4000-8000-000000000004', '22222222-2222-4222-8222-222222222222', current_date - 1, 'egg_crates', 131, 330, 43230),
  ('bbbbbbbb-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', current_date - 1, 'manure', 200, 60, 12000)
on conflict do nothing;

insert into public.expense_records (batch_id, farm_id, log_date, category, description, amount) values
  ('bbbbbbbb-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', current_date - 28, 'day_old_chicks', '5000 Ross 308 day-old chicks', 210000),
  ('bbbbbbbb-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', current_date - 10, 'bedding', 'Wood shavings bales', 18000),
  ('bbbbbbbb-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', current_date - 9, 'labor', 'Crew wages for the week', 42000),
  ('bbbbbbbb-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', current_date - 7, 'utilities', 'Water and electricity', 26500),
  ('bbbbbbbb-0000-4000-8000-000000000003', '22222222-2222-4222-8222-222222222222', current_date - 41, 'day_old_chicks', '8000 Cobb 500 day-old chicks', 328000),
  ('bbbbbbbb-0000-4000-8000-000000000003', '22222222-2222-4222-8222-222222222222', current_date - 12, 'housing', 'Brooder repairs and partitions', 61000),
  ('bbbbbbbb-0000-4000-8000-000000000004', '22222222-2222-4222-8222-222222222222', current_date - 3, 'labor', 'Egg collection crew wages', 38000)
on conflict do nothing;