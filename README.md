# Purity Farms — Poultry Operations Console

A React + Vite + TypeScript console for running poultry farms: batches, daily operations
(mortality, feed, medication, egg collection, weighing), financials (sales, expenses,
per-batch P&L) and analytics — backed by **Supabase** (Postgres + Auth + Row Level Security).

---

## Stack

| Layer | Choice |
| --- | --- |
| UI | React 18, Vite, Tailwind CSS, Framer Motion, lucide-react |
| State | React Context (`src/context/FarmContext.tsx`) |
| Backend | Supabase Postgres, Supabase Auth, Row Level Security |

## Quick start

```bash
# 1. Install dependencies
bun install        # or: npm install

# 2. Configure environment
cp .env.example .env.local
#   → paste your project URL + publishable/anon key

# 3. Run the app
bun run dev        # or: npm run dev
```

Open the printed URL. You will land on the authentication screen: **sign in**, **create an
account**, or **Explore the demo dataset** (the bundled dataset runs entirely in the browser
with `localStorage` persistence — no backend calls).

## Environment

| Variable | Where to find it | Required |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Supabase Dashboard → Project Settings → API → Project URL | yes |
| `VITE_SUPABASE_ANON_KEY` | Supabase Dashboard → Project Settings → API → `anon` / publishable key | yes |

See `.env.example`. Keys are safe to expose in the browser **only** because every table is
protected by Row Level Security — never put a `service_role` key in a `VITE_*` variable.

## Database setup

Migration and seed files live in `supabase/`:

```
supabase/
├── migrations/001_initial_schema.sql   # UUID tables, enums, indexes, triggers
├── migrations/002_rls_policies.sql     # Row Level Security policies
└── seed.sql                            # demo farm, users, batches and logs
```

### Option A — Supabase CLI (recommended)

```bash
supabase link --project-ref <your-project-ref>
supabase db push                        # applies supabase/migrations/*
psql "$DATABASE_URL" -f supabase/seed.sql   # optional demo data
```

### Option B — Dashboard SQL editor

Run the files **in order** in the Supabase SQL editor:

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_rls_policies.sql`
3. `supabase/seed.sql` (optional — loads the demo farm)

Both scripts are idempotent (`create table if not exists`, `drop policy if exists`), so they
can be re-run safely.

### Auth settings

In **Authentication → Providers → Email**, for local development it is convenient to turn
*Confirm email* off. With confirmation enabled, sign-up returns no session until the user
clicks the emailed link (the UI reports this and asks them to sign in afterwards).

## Data model

| Table | Purpose |
| --- | --- |
| `farms` | Farms / sites (tenant root) |
| `profiles` | App users mapped to `auth.users` with `owner` / `manager` / `staff` roles |
| `sheds`, `suppliers`, `customers` | Farm reference data |
| `batches` | Flocks (broiler / layer), counts, breed, start date, status |
| `mortality_logs` | Mortality and culling per batch |
| `feed_logs` | Feed drawn per batch (kg, bags, cost) |
| `medication_logs` | Treatments and withdrawal periods |
| `egg_collection_logs` | Eggs collected, damaged, crates |
| `weight_logs` | Sample weigh-ins (avg weight) |
| `sales_records` | Revenue by category |
| `expense_records` | Costs by category |

All primary keys are `uuid` (`gen_random_uuid()`), every child table carries both `farm_id`
and its parent FK, and `log_date` columns are indexed for range queries.

## Architecture

```
src/
├── supabase.ts               # createClient<Database> + isSupabaseConfigured flag
├── supabase-types.ts         # typed Database contract, snake_case ↔ camelCase mappers,
│                             #   insert/update payload builders
├── context/FarmContext.tsx   # data loading, optimistic CRUD, session helpers, derived metrics
├── components/AuthModal.tsx  # sign in / sign up screen
├── components/Navbar.tsx     # farm switcher, user menu, sign-out button, live/demo badge
└── App.tsx                   # session bootstrap, auth gate, view routing
```

### How data flows

1. `App.tsx` restores the session (`supabase.auth.getSession()`) and subscribes to
   `onAuthStateChange`.
2. Without a session the app renders `AuthScreen`; the demo button mounts `FarmProvider`
   in `demoMode`, which reads the bundled dataset from `localStorage`.
3. With a session, `FarmProvider` loads every table through
   `supabase.from("<table>").select(...)` in parallel (`Promise.all`), maps rows to the
   domain models in `src/types.ts`, and stores them in one `FarmData` object.
4. Writes (batch create/update/delete, mortality, feed, medication, eggs, weights, sales,
   expenses) update local state immediately, then insert/update/delete in Supabase. On
   failure the user gets a `toast.error` with the Postgres message and the state is refetched.
5. `signOut()` clears the Supabase session from the Navbar menu; the app returns to the
   auth screen.
6. A brand-new account with no `profiles` row gets one auto-provisioned on first load
   (owner of the first farm).

### Security model

- **RLS is enabled on every table**; there are no anonymous read policies.
- A user sees a farm only when their `profiles` row (matched by `auth.uid()` on
  `auth_user_id` or email) points at that farm.
- `owner` and `manager` roles may write batches and operational logs; `staff` is read-only;
  only an `owner` can manage the farm itself.
- Financial tables (`sales_records`, `expense_records`) are restricted to `owner` / `manager`.

## Scripts

| Command | Description |
| --- | --- |
| `bun run dev` | Vite dev server |
| `bun run build` | Type-check + production build |
| `bun run typecheck` | TypeScript only |

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| "Supabase has no farm records yet" toast | Migrations applied but `seed.sql` was not run — run it, or create a farm row. |
| Auth errors on sign-up | Enable the email provider and (for local dev) disable email confirmation. |
| Empty dashboard after login | The signed-in email has no matching `profiles` row on a farm — a profile is auto-created, then reload. |
| Data changes not sticking | RLS blocked the write; check the policy for that table and the user's role. |