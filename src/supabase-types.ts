// ── Typed Supabase database contract ────────────────────────────────────────
// Every table uses a UUID primary key and snake_case columns (Postgres
// convention). The mappers below convert rows → camelCase domain models
// (src/types.ts) and domain models → insert payloads.

import type {
  Batch,
  EggCollectionLog,
  ExpenseRecord,
  Farm,
  FeedLog,
  MedicationLog,
  MortalityLog,
  SalesRecord,
  User,
  WeightLog,
} from "./types";

export type UserRoleDb = "owner" | "manager" | "worker" | "staff";
export type BatchTypeDb = "broiler" | "layer";
export type BatchStatusDb = "active" | "completed" | "closed";
export type FeedTypeDb = "starter" | "grower" | "finisher" | "layer_mash";
export type SaleCategoryDb = "live_birds" | "dressed_meat" | "manure" | "cull_hens" | "egg_crates";
export type ExpenseCategoryDb =
  | "feed"
  | "day_old_chicks"
  | "vet_vaccines"
  | "utilities"
  | "labor"
  | "housing"
  | "bedding";

export type FarmRow = { id: string; name: string; location: string | null; created_at: string };
export type ProfileRow = {
  id: string;
  auth_user_id: string | null;
  full_name: string;
  email: string;
  role: UserRoleDb;
  farm_id: string | null;
  created_at: string;
};
export type ShedRow = {
  id: string;
  farm_id: string;
  name: string;
  capacity: number | null;
  created_at: string;
};
export type SupplierRow = {
  id: string;
  farm_id: string;
  name: string;
  contact: string | null;
  category: string | null;
  created_at: string;
};
export type CustomerRow = {
  id: string;
  farm_id: string;
  name: string;
  contact: string | null;
  location: string | null;
  created_at: string;
};
export type BatchRow = {
  id: string;
  farm_id: string;
  name: string;
  type: BatchTypeDb;
  start_date: string;
  initial_count: number;
  breed: string | null;
  initial_avg_weight: number | null;
  shed_id: string | null;
  point_of_lay_date: string | null;
  status: BatchStatusDb;
  created_at: string;
};
export type MortalityRow = {
  id: string;
  batch_id: string;
  farm_id: string;
  log_date: string;
  count: number;
  reason: string | null;
  culled: boolean;
  created_at: string;
};
export type FeedRow = {
  id: string;
  batch_id: string;
  farm_id: string;
  log_date: string;
  feed_type: FeedTypeDb;
  quantity_kg: number;
  bags_50kg: number;
  cost_per_bag: number;
  created_at: string;
};
export type MedicationRow = {
  id: string;
  batch_id: string;
  farm_id: string;
  log_date: string;
  name: string;
  dosage: string | null;
  method: string | null;
  withdrawal_days: number;
  cost: number;
  created_at: string;
};
export type EggRow = {
  id: string;
  batch_id: string;
  farm_id: string;
  log_date: string;
  total_eggs: number;
  damaged_eggs: number;
  crates: number;
  created_at: string;
};
export type WeightRow = {
  id: string;
  batch_id: string;
  farm_id: string;
  log_date: string;
  sample_size: number;
  avg_weight_kg: number;
  created_at: string;
};
export type SaleRow = {
  id: string;
  batch_id: string;
  farm_id: string;
  log_date: string;
  category: SaleCategoryDb;
  quantity: number;
  unit_price: number;
  total: number;
  created_at: string;
};
export type ExpenseRow = {
  id: string;
  batch_id: string;
  farm_id: string;
  log_date: string;
  category: ExpenseCategoryDb;
  description: string | null;
  amount: number;
  created_at: string;
};

/**
 * Shape required by postgrest-js `GenericTable`. `Relationships` must be
 * present or the client falls back to `never` for insert/update payloads.
 */
type Table<R> = {
  Row: R;
  Insert: Omit<R, "id" | "created_at"> & { id?: string };
  Update: Partial<R>;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      farms: Table<FarmRow>;
      profiles: Table<ProfileRow>;
      sheds: Table<ShedRow>;
      suppliers: Table<SupplierRow>;
      customers: Table<CustomerRow>;
      batches: Table<BatchRow>;
      mortality_logs: Table<MortalityRow>;
      feed_logs: Table<FeedRow>;
      medication_logs: Table<MedicationRow>;
      egg_collection_logs: Table<EggRow>;
      weight_logs: Table<WeightRow>;
      sales_records: Table<SaleRow>;
      expense_records: Table<ExpenseRow>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: UserRoleDb;
      batch_type: BatchTypeDb;
      batch_status: BatchStatusDb;
      feed_type: FeedTypeDb;
      sale_category: SaleCategoryDb;
      expense_category: ExpenseCategoryDb;
    };
    CompositeTypes: Record<string, never>;
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type TableInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type TableUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

// ── Row → domain mappers ────────────────────────────────────────────────────
const num = (v: unknown, fallback = 0): number => {
  const x = typeof v === "string" ? Number(v) : (v as number);
  return Number.isFinite(x) ? (x as number) : fallback;
};
const str = (v: unknown, fallback = ""): string => (typeof v === "string" ? v : fallback);

const asDate = (v: unknown): string => str(v);

export const mapFarm = (r: FarmRow): Farm => ({
  id: r.id,
  name: str(r.name, "Unnamed farm"),
  location: str(r.location),
  createdAt: asDate(r.created_at),
});

export const mapProfile = (r: ProfileRow): User => ({
  id: r.id,
  name: str(r.full_name, "Unnamed user"),
  email: str(r.email),
  // The farm module speaks "staff"; the database constraint speaks "worker".
  role: r.role === "worker" ? "staff" : (r.role ?? "staff"),
  farmId: str(r.farm_id),
});

export const mapBatch = (r: BatchRow): Batch => ({
  id: r.id,
  farmId: r.farm_id,
  name: str(r.name),
  type: r.type ?? "broiler",
  startDate: asDate(r.start_date),
  initialCount: num(r.initial_count),
  breed: str(r.breed),
  initialAvgWeight: num(r.initial_avg_weight, 0.042),
  shedId: str(r.shed_id),
  pointOfLayDate: r.point_of_lay_date ? asDate(r.point_of_lay_date) : undefined,
  status: r.status ?? "active",
});

export const mapMortality = (r: MortalityRow): MortalityLog => ({
  id: r.id,
  batchId: r.batch_id,
  farmId: r.farm_id,
  date: asDate(r.log_date),
  count: num(r.count),
  reason: str(r.reason, "Unspecified"),
  culled: Boolean(r.culled),
});

export const mapFeed = (r: FeedRow): FeedLog => ({
  id: r.id,
  batchId: r.batch_id,
  farmId: r.farm_id,
  date: asDate(r.log_date),
  feedType: r.feed_type ?? "starter",
  quantityKg: num(r.quantity_kg),
  bags50kg: num(r.bags_50kg),
  costPerBag: num(r.cost_per_bag),
});

export const mapMedication = (r: MedicationRow): MedicationLog => ({
  id: r.id,
  batchId: r.batch_id,
  farmId: r.farm_id,
  date: asDate(r.log_date),
  name: str(r.name),
  dosage: str(r.dosage),
  method: str(r.method),
  withdrawalDays: num(r.withdrawal_days),
  cost: num(r.cost),
});

export const mapEgg = (r: EggRow): EggCollectionLog => ({
  id: r.id,
  batchId: r.batch_id,
  farmId: r.farm_id,
  date: asDate(r.log_date),
  totalEggs: num(r.total_eggs),
  damagedEggs: num(r.damaged_eggs),
  crates: num(r.crates),
});

export const mapWeight = (r: WeightRow): WeightLog => ({
  id: r.id,
  batchId: r.batch_id,
  farmId: r.farm_id,
  date: asDate(r.log_date),
  sampleSize: num(r.sample_size),
  avgWeightKg: num(r.avg_weight_kg),
});

export const mapSale = (r: SaleRow): SalesRecord => ({
  id: r.id,
  batchId: r.batch_id,
  farmId: r.farm_id,
  date: asDate(r.log_date),
  category: r.category ?? "live_birds",
  quantity: num(r.quantity),
  unitPrice: num(r.unit_price),
  total: num(r.total),
});

export const mapExpense = (r: ExpenseRow): ExpenseRecord => ({
  id: r.id,
  batchId: r.batch_id,
  farmId: r.farm_id,
  date: asDate(r.log_date),
  category: r.category ?? "feed",
  description: str(r.description),
  amount: num(r.amount),
});

// ── Domain → insert/update payload builders ─────────────────────────────────
export const batchInsert = (b: Batch): TableInsert<"batches"> => ({
  id: b.id,
  farm_id: b.farmId,
  name: b.name,
  type: b.type,
  start_date: b.startDate,
  initial_count: b.initialCount,
  breed: b.breed || null,
  initial_avg_weight: b.initialAvgWeight,
  shed_id: b.shedId || null,
  point_of_lay_date: b.pointOfLayDate || null,
  status: b.status,
});

export const batchUpdate = (u: Partial<Batch>): TableUpdate<"batches"> => ({
  name: u.name,
  type: u.type,
  start_date: u.startDate,
  initial_count: u.initialCount,
  breed: u.breed,
  initial_avg_weight: u.initialAvgWeight,
  shed_id: u.shedId,
  point_of_lay_date: u.pointOfLayDate ?? null,
  status: u.status,
});

export const profileInsert = (
  authUserId: string,
  email: string,
  fullName: string,
  farmId: string,
): TableInsert<"profiles"> => ({
  auth_user_id: authUserId,
  email,
  full_name: fullName,
  role: "owner",
  farm_id: farmId,
});

export const mortalityInsert = (l: MortalityLog): TableInsert<"mortality_logs"> => ({
  batch_id: l.batchId,
  farm_id: l.farmId,
  log_date: l.date,
  count: l.count,
  reason: l.reason || null,
  culled: l.culled,
});

export const feedInsert = (l: FeedLog): TableInsert<"feed_logs"> => ({
  batch_id: l.batchId,
  farm_id: l.farmId,
  log_date: l.date,
  feed_type: l.feedType,
  quantity_kg: l.quantityKg,
  bags_50kg: l.bags50kg,
  cost_per_bag: l.costPerBag,
});

export const medicationInsert = (l: MedicationLog): TableInsert<"medication_logs"> => ({
  batch_id: l.batchId,
  farm_id: l.farmId,
  log_date: l.date,
  name: l.name,
  dosage: l.dosage || null,
  method: l.method || null,
  withdrawal_days: l.withdrawalDays,
  cost: l.cost,
});

export const eggInsert = (l: EggCollectionLog): TableInsert<"egg_collection_logs"> => ({
  batch_id: l.batchId,
  farm_id: l.farmId,
  log_date: l.date,
  total_eggs: l.totalEggs,
  damaged_eggs: l.damagedEggs,
  crates: l.crates,
});

export const weightInsert = (l: WeightLog): TableInsert<"weight_logs"> => ({
  batch_id: l.batchId,
  farm_id: l.farmId,
  log_date: l.date,
  sample_size: l.sampleSize,
  avg_weight_kg: l.avgWeightKg,
});

export const saleInsert = (r: SalesRecord): TableInsert<"sales_records"> => ({
  batch_id: r.batchId,
  farm_id: r.farmId,
  log_date: r.date,
  category: r.category,
  quantity: r.quantity,
  unit_price: r.unitPrice,
  total: r.total,
});

export const expenseInsert = (r: ExpenseRecord): TableInsert<"expense_records"> => ({
  batch_id: r.batchId,
  farm_id: r.farmId,
  log_date: r.date,
  category: r.category,
  description: r.description || null,
  amount: r.amount,
});