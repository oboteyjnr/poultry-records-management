-- ─── Manager financial-analytics permission ──────────────────────────────
-- App Settings toggle: allow_managers_view_financials.
-- Owners always retain full access to the Batch Financial Analytics module.
-- Managers gain access only when this flag is enabled by the Owner.
alter table public.farm_settings
  add column if not exists allow_managers_view_financials boolean not null default false;

comment on column public.farm_settings.allow_managers_view_financials is
  'When true, farm managers may open the Batch Financial Analytics module. Owners always have access.';