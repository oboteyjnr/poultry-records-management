import { supabase } from "../supabase";
import {
  DEFAULT_FARM_SETTINGS,
  type FarmSettings,
  type FeedCostKey,
} from "../types";

/**
 * Settings persistence layer.
 *
 * - Live mode (signed-in Supabase session with real farm rows): reads/writes the
 *   `farm_settings` table, which is protected by tenant-scoped RLS.
 * - Local/demo mode: persists to localStorage keyed by farm id so the module is
 *   fully functional without a backend.
 */

const LS_PREFIX = "purity-farm-settings-";

interface FarmSettingsRow {
  farm_id: string;
  farm_name: string | null;
  registration_number: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  physical_address: string | null;
  logo_url: string | null;
  mortality_warning_pct: number | null;
  mortality_critical_pct: number | null;
  broiler_target_fcr: number | null;
  layer_target_fcr: number | null;
  flock_strains: string[] | null;
  currency: string | null;
  weight_unit: string | null;
  feed_unit: string | null;
  crate_capacity: number | null;
  timezone: string | null;
  date_format: string | null;
  allow_worker_financials: boolean | null;
  allow_managers_view_financials: boolean | null;
  require_expense_approval: boolean | null;
  expense_approval_threshold: number | null;
  revenue_categories: string[] | null;
  expense_categories: string[] | null;
  feed_unit_costs: Record<FeedCostKey, number> | null;
}

// The typed client only knows the tables declared in supabase-types.ts; farm_settings
// is added by migration 003, so we widen the call surface locally instead of casting
// every query site.
const db = supabase as unknown as {
  from: (table: string) => any;
};

function rowToSettings(row: FarmSettingsRow): FarmSettings {
  return {
    farmName: row.farm_name ?? "",
    registrationNumber: row.registration_number ?? "",
    contactEmail: row.contact_email ?? "",
    contactPhone: row.contact_phone ?? "",
    physicalAddress: row.physical_address ?? "",
    logoUrl: row.logo_url ?? "",
    mortalityWarningPct: row.mortality_warning_pct ?? DEFAULT_FARM_SETTINGS.mortalityWarningPct,
    mortalityCriticalPct: row.mortality_critical_pct ?? DEFAULT_FARM_SETTINGS.mortalityCriticalPct,
    broilerTargetFcr: row.broiler_target_fcr ?? DEFAULT_FARM_SETTINGS.broilerTargetFcr,
    layerTargetFcr: row.layer_target_fcr ?? DEFAULT_FARM_SETTINGS.layerTargetFcr,
    flockStrains: row.flock_strains ?? [...DEFAULT_FARM_SETTINGS.flockStrains],
    currency: row.currency ?? DEFAULT_FARM_SETTINGS.currency,
    weightUnit: row.weight_unit ?? DEFAULT_FARM_SETTINGS.weightUnit,
    feedUnit: row.feed_unit ?? DEFAULT_FARM_SETTINGS.feedUnit,
    crateCapacity: row.crate_capacity ?? DEFAULT_FARM_SETTINGS.crateCapacity,
    timezone: row.timezone ?? DEFAULT_FARM_SETTINGS.timezone,
    dateFormat: row.date_format ?? DEFAULT_FARM_SETTINGS.dateFormat,
    allowWorkerFinancials:
      row.allow_worker_financials ?? DEFAULT_FARM_SETTINGS.allowWorkerFinancials,
    allowManagersViewFinancials:
      row.allow_managers_view_financials ??
      DEFAULT_FARM_SETTINGS.allowManagersViewFinancials,
    requireExpenseApproval:
      row.require_expense_approval ?? DEFAULT_FARM_SETTINGS.requireExpenseApproval,
    expenseApprovalThreshold:
      row.expense_approval_threshold ?? DEFAULT_FARM_SETTINGS.expenseApprovalThreshold,
    revenueCategories:
      row.revenue_categories ?? [...DEFAULT_FARM_SETTINGS.revenueCategories],
    expenseCategories:
      row.expense_categories ?? [...DEFAULT_FARM_SETTINGS.expenseCategories],
    feedUnitCosts: {
      ...DEFAULT_FARM_SETTINGS.feedUnitCosts,
      ...(row.feed_unit_costs ?? {}),
    },
  };
}

function settingsToRow(farmId: string, s: FarmSettings): FarmSettingsRow {
  return {
    farm_id: farmId,
    farm_name: s.farmName,
    registration_number: s.registrationNumber,
    contact_email: s.contactEmail,
    contact_phone: s.contactPhone,
    physical_address: s.physicalAddress,
    logo_url: s.logoUrl,
    mortality_warning_pct: s.mortalityWarningPct,
    mortality_critical_pct: s.mortalityCriticalPct,
    broiler_target_fcr: s.broilerTargetFcr,
    layer_target_fcr: s.layerTargetFcr,
    flock_strains: s.flockStrains,
    currency: s.currency,
    weight_unit: s.weightUnit,
    feed_unit: s.feedUnit,
    crate_capacity: s.crateCapacity,
    timezone: s.timezone,
    date_format: s.dateFormat,
    allow_worker_financials: s.allowWorkerFinancials,
    allow_managers_view_financials: s.allowManagersViewFinancials,
    require_expense_approval: s.requireExpenseApproval,
    expense_approval_threshold: s.expenseApprovalThreshold,
    revenue_categories: s.revenueCategories,
    expense_categories: s.expenseCategories,
    feed_unit_costs: s.feedUnitCosts,
  };
}

export async function loadFarmSettings(
  farmId: string,
  isLive: boolean,
): Promise<FarmSettings> {
  if (!farmId) return { ...DEFAULT_FARM_SETTINGS };

  if (isLive) {
    const { data, error } = await db
      .from("farm_settings")
      .select("*")
      .eq("farm_id", farmId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return { ...DEFAULT_FARM_SETTINGS };
    return rowToSettings(data as FarmSettingsRow);
  }

  try {
    const raw = localStorage.getItem(LS_PREFIX + farmId);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<FarmSettings>;
      return { ...DEFAULT_FARM_SETTINGS, ...parsed, feedUnitCosts: { ...DEFAULT_FARM_SETTINGS.feedUnitCosts, ...(parsed.feedUnitCosts ?? {}) } };
    }
  } catch {
    /* corrupt entry — fall back to defaults */
  }
  return { ...DEFAULT_FARM_SETTINGS };
}

export async function saveFarmSettings(
  farmId: string,
  settings: FarmSettings,
  isLive: boolean,
): Promise<void> {
  if (!farmId) throw new Error("No active farm to save settings for.");

  if (isLive) {
    const { error } = await db
      .from("farm_settings")
      .upsert(settingsToRow(farmId, settings), { onConflict: "farm_id" });
    if (error) throw error;
    return;
  }

  localStorage.setItem(LS_PREFIX + farmId, JSON.stringify(settings));
}

/** Reads a logo file as a base64 data URL so it persists in both live & demo modes. */
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}