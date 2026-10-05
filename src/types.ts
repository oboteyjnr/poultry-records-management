// ─── Domain Types ────────────────────────────────────────────────────────────
export type UserRole = "owner" | "manager" | "staff";
export type BatchType = "broiler" | "layer";
export type FeedType = "starter" | "grower" | "finisher" | "layer_mash";
export type SaleCategory = "live_birds" | "dressed_meat" | "manure" | "cull_hens" | "egg_crates";
export type ExpenseCategory = "feed" | "day_old_chicks" | "vet_vaccines" | "utilities" | "labor" | "housing" | "bedding";

export interface Farm {
  id: string;
  name: string;
  location: string;
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  farmId: string;
}

export interface Batch {
  id: string;
  farmId: string;
  name: string;
  type: BatchType;
  startDate: string;
  initialCount: number;
  breed: string;
  initialAvgWeight: number;
  shedId: string;
  pointOfLayDate?: string;
  status: "active" | "completed" | "closed";
}

export interface MortalityLog {
  id: string;
  batchId: string;
  farmId: string;
  date: string;
  count: number;
  reason: string;
  culled: boolean;
}

export interface FeedLog {
  id: string;
  batchId: string;
  farmId: string;
  date: string;
  feedType: FeedType;
  quantityKg: number;
  bags50kg: number;
  costPerBag: number;
}

export interface MedicationLog {
  id: string;
  batchId: string;
  farmId: string;
  date: string;
  name: string;
  dosage: string;
  method: string;
  withdrawalDays: number;
  cost: number;
}

export interface EggCollectionLog {
  id: string;
  batchId: string;
  farmId: string;
  date: string;
  totalEggs: number;
  damagedEggs: number;
  crates: number;
}

export interface WeightLog {
  id: string;
  batchId: string;
  farmId: string;
  date: string;
  sampleSize: number;
  avgWeightKg: number;
}

export interface SalesRecord {
  id: string;
  batchId: string;
  farmId: string;
  date: string;
  category: SaleCategory;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface ExpenseRecord {
  id: string;
  batchId: string;
  farmId: string;
  date: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
}

export interface FarmData {
  farms: Farm[];
  users: User[];
  batches: Batch[];
  mortalityLogs: MortalityLog[];
  feedLogs: FeedLog[];
  medicationLogs: MedicationLog[];
  eggLogs: EggCollectionLog[];
  weightLogs: WeightLog[];
  sales: SalesRecord[];
  expenses: ExpenseRecord[];
}

// ─── Ross 308 Standard Growth Curve (Day, Target Weight g, Cumulative FCR) ───
export const ROSS_308_CURVE: { day: number; weight: number; fcr: number }[] = [
  { day: 1, weight: 42, fcr: 1.0 },
  { day: 3, weight: 62, fcr: 1.1 },
  { day: 5, weight: 84, fcr: 1.2 },
  { day: 7, weight: 110, fcr: 1.3 },
  { day: 10, weight: 170, fcr: 1.4 },
  { day: 14, weight: 255, fcr: 1.5 },
  { day: 17, weight: 340, fcr: 1.55 },
  { day: 21, weight: 460, fcr: 1.6 },
  { day: 24, weight: 560, fcr: 1.65 },
  { day: 28, weight: 700, fcr: 1.7 },
  { day: 31, weight: 820, fcr: 1.75 },
  { day: 35, weight: 1000, fcr: 1.8 },
  { day: 38, weight: 1150, fcr: 1.85 },
  { day: 42, weight: 1350, fcr: 1.9 },
];

// ─── Seed Data ───────────────────────────────────────────────────────────────
export const SEED_DATA: FarmData = {
  farms: [
    { id: "farm-1", name: "GreenPasture Poultry", location: "Nakuru, Kenya", createdAt: "2024-01-15" },
    { id: "farm-2", name: "Sunrise Broiler Complex", location: "Eldoret, Kenya", createdAt: "2024-03-20" },
  ],
  users: [
    { id: "user-1", name: "James Mwangi", email: "james@greenpasture.co.ke", role: "owner", farmId: "farm-1" },
    { id: "user-2", name: "Grace Wanjiku", email: "grace@greenpasture.co.ke", role: "manager", farmId: "farm-1" },
    { id: "user-3", name: "Peter Otieno", email: "peter@greenpasture.co.ke", role: "staff", farmId: "farm-1" },
    { id: "user-4", name: "Sarah Kimani", email: "sarah@sunrise.co.ke", role: "owner", farmId: "farm-2" },
    { id: "user-5", name: "David Kiprop", email: "david@sunrise.co.ke", role: "manager", farmId: "farm-2" },
  ],
  batches: [
    { id: "batch-1", farmId: "farm-1", name: "Broiler Batch A-24", type: "broiler", startDate: "2024-09-01", initialCount: 5000, breed: "Ross 308", initialAvgWeight: 0.042, shedId: "Shed-1", status: "active" },
    { id: "batch-2", farmId: "farm-1", name: "Layer Batch L-12", type: "layer", startDate: "2024-06-15", initialCount: 3000, breed: "ISA Brown", initialAvgWeight: 0.035, shedId: "Shed-3", pointOfLayDate: "2024-09-20", status: "active" },
    { id: "batch-3", farmId: "farm-2", name: "Broiler Batch B-07", type: "broiler", startDate: "2024-10-01", initialCount: 8000, breed: "Cobb 500", initialAvgWeight: 0.045, shedId: "Shed-A", status: "active" },
    { id: "batch-4", farmId: "farm-2", name: "Layer Batch L-05", type: "layer", startDate: "2024-04-10", initialCount: 4500, breed: "Hy-Line Brown", initialAvgWeight: 0.038, shedId: "Shed-B", pointOfLayDate: "2024-07-15", status: "active" },
  ],
  mortalityLogs: [
    { id: "mort-1", batchId: "batch-1", farmId: "farm-1", date: "2024-09-05", count: 12, reason: "Heat stress", culled: false },
    { id: "mort-2", batchId: "batch-1", farmId: "farm-1", date: "2024-09-10", count: 8, reason: "Coccidiosis", culled: false },
    { id: "mort-3", batchId: "batch-1", farmId: "farm-1", date: "2024-09-15", count: 5, reason: "Normal", culled: false },
    { id: "mort-4", batchId: "batch-2", farmId: "farm-1", date: "2024-07-01", count: 15, reason: "Predator", culled: false },
    { id: "mort-5", batchId: "batch-2", farmId: "farm-1", date: "2024-08-15", count: 10, reason: "Disease", culled: false },
    { id: "mort-6", batchId: "batch-3", farmId: "farm-2", date: "2024-10-05", count: 20, reason: "Transport stress", culled: false },
    { id: "mort-7", batchId: "batch-4", farmId: "farm-2", date: "2024-05-01", count: 18, reason: "Newcastle", culled: false },
  ],
  feedLogs: [
    { id: "feed-1", batchId: "batch-1", farmId: "farm-1", date: "2024-09-03", feedType: "starter", quantityKg: 100, bags50kg: 2, costPerBag: 2800 },
    { id: "feed-2", batchId: "batch-1", farmId: "farm-1", date: "2024-09-10", feedType: "starter", quantityKg: 150, bags50kg: 3, costPerBag: 2800 },
    { id: "feed-3", batchId: "batch-1", farmId: "farm-1", date: "2024-09-20", feedType: "grower", quantityKg: 200, bags50kg: 4, costPerBag: 3200 },
    { id: "feed-4", batchId: "batch-1", farmId: "farm-1", date: "2024-10-01", feedType: "grower", quantityKg: 250, bags50kg: 5, costPerBag: 3200 },
    { id: "feed-5", batchId: "batch-2", farmId: "farm-1", date: "2024-07-01", feedType: "layer_mash", quantityKg: 300, bags50kg: 6, costPerBag: 2500 },
    { id: "feed-6", batchId: "batch-2", farmId: "farm-1", date: "2024-08-01", feedType: "layer_mash", quantityKg: 350, bags50kg: 7, costPerBag: 2500 },
    { id: "feed-7", batchId: "batch-3", farmId: "farm-2", date: "2024-10-05", feedType: "starter", quantityKg: 200, bags50kg: 4, costPerBag: 2900 },
    { id: "feed-8", batchId: "batch-4", farmId: "farm-2", date: "2024-05-01", feedType: "layer_mash", quantityKg: 400, bags50kg: 8, costPerBag: 2600 },
  ],
  medicationLogs: [
    { id: "med-1", batchId: "batch-1", farmId: "farm-1", date: "2024-09-07", name: "Newcastle Vaccine", dosage: "1ml/bird", method: "Eye drop", withdrawalDays: 0, cost: 15000 },
    { id: "med-2", batchId: "batch-1", farmId: "farm-1", date: "2024-09-14", name: "Amoxicillin", dosage: "500mg/L water", method: "Drinking water", withdrawalDays: 3, cost: 8000 },
    { id: "med-3", batchId: "batch-2", farmId: "farm-1", date: "2024-07-15", name: "Dewormer", dosage: "Per label", method: "Feed mixing", withdrawalDays: 7, cost: 12000 },
  ],
  eggLogs: [
    { id: "egg-1", batchId: "batch-2", farmId: "farm-1", date: "2024-09-25", totalEggs: 2400, damagedEggs: 45, crates: 78 },
    { id: "egg-2", batchId: "batch-2", farmId: "farm-1", date: "2024-09-26", totalEggs: 2450, damagedEggs: 38, crates: 80 },
    { id: "egg-3", batchId: "batch-2", farmId: "farm-1", date: "2024-09-27", totalEggs: 2380, damagedEggs: 52, crates: 77 },
    { id: "egg-4", batchId: "batch-4", farmId: "farm-2", date: "2024-08-01", totalEggs: 3600, damagedEggs: 60, crates: 118 },
    { id: "egg-5", batchId: "batch-4", farmId: "farm-2", date: "2024-08-02", totalEggs: 3750, damagedEggs: 48, crates: 123 },
  ],
  weightLogs: [
    { id: "wt-1", batchId: "batch-1", farmId: "farm-1", date: "2024-09-08", sampleSize: 50, avgWeightKg: 0.11 },
    { id: "wt-2", batchId: "batch-1", farmId: "farm-1", date: "2024-09-15", sampleSize: 50, avgWeightKg: 0.26 },
    { id: "wt-3", batchId: "batch-1", farmId: "farm-1", date: "2024-09-22", sampleSize: 50, avgWeightKg: 0.47 },
    { id: "wt-4", batchId: "batch-1", farmId: "farm-1", date: "2024-09-29", sampleSize: 50, avgWeightKg: 0.72 },
    { id: "wt-5", batchId: "batch-3", farmId: "farm-2", date: "2024-10-08", sampleSize: 60, avgWeightKg: 0.12 },
    { id: "wt-6", batchId: "batch-3", farmId: "farm-2", date: "2024-10-15", sampleSize: 60, avgWeightKg: 0.28 },
  ],
  sales: [
    { id: "sale-1", batchId: "batch-1", farmId: "farm-1", date: "2024-10-10", category: "live_birds", quantity: 1200, unitPrice: 450, total: 540000 },
    { id: "sale-2", batchId: "batch-2", farmId: "farm-1", date: "2024-09-30", category: "egg_crates", quantity: 235, unitPrice: 480, total: 112800 },
    { id: "sale-3", batchId: "batch-3", farmId: "farm-2", date: "2024-10-20", category: "live_birds", quantity: 2000, unitPrice: 420, total: 840000 },
    { id: "sale-4", batchId: "batch-4", farmId: "farm-2", date: "2024-08-15", category: "egg_crates", quantity: 241, unitPrice: 500, total: 120500 },
  ],
  expenses: [
    { id: "exp-1", batchId: "batch-1", farmId: "farm-1", date: "2024-09-01", category: "day_old_chicks", description: "5000 DOC Ross 308", amount: 750000 },
    { id: "exp-2", batchId: "batch-1", farmId: "farm-1", date: "2024-09-10", category: "feed", description: "Starter feed 50 bags", amount: 140000 },
    { id: "exp-3", batchId: "batch-1", farmId: "farm-1", date: "2024-10-01", category: "utilities", description: "Electricity + Water", amount: 25000 },
    { id: "exp-4", batchId: "batch-2", farmId: "farm-1", date: "2024-06-15", category: "day_old_chicks", description: "3000 Pullets ISA Brown", amount: 900000 },
    { id: "exp-5", batchId: "batch-2", farmId: "farm-1", date: "2024-07-01", category: "labor", description: "Monthly wages", amount: 60000 },
    { id: "exp-6", batchId: "batch-3", farmId: "farm-2", date: "2024-10-01", category: "day_old_chicks", description: "8000 DOC Cobb 500", amount: 1120000 },
    { id: "exp-7", batchId: "batch-4", farmId: "farm-2", date: "2024-04-10", category: "day_old_chicks", description: "4500 Pullets Hy-Line", amount: 1350000 },
  ],
};

// ─── Farm Settings ───────────────────────────────────────────────────────────
export type FeedCostKey = "starter" | "grower" | "finisher" | "layer_mash";

export interface FarmSettings {
  // Profile & Branding
  farmName: string;
  registrationNumber: string;
  contactEmail: string;
  contactPhone: string;
  physicalAddress: string;
  logoUrl: string;
  // Operations & Alerts
  mortalityWarningPct: number;
  mortalityCriticalPct: number;
  broilerTargetFcr: number;
  layerTargetFcr: number;
  flockStrains: string[];
  // Units & Localization
  currency: string;
  weightUnit: string;
  feedUnit: string;
  crateCapacity: number;
  timezone: string;
  dateFormat: string;
  // Roles & Permissions
  allowWorkerFinancials: boolean;
  allowManagersViewFinancials: boolean;
  requireExpenseApproval: boolean;
  expenseApprovalThreshold: number;
  // Accounting Categories
  revenueCategories: string[];
  expenseCategories: string[];
  feedUnitCosts: Record<FeedCostKey, number>;
}

export const CURRENCY_OPTIONS = ["NGN", "USD", "EUR", "GBP", "KES", "GHS", "ZAR"];
export const WEIGHT_UNIT_OPTIONS = ["kg", "g", "lb", "oz"];
export const FEED_UNIT_OPTIONS = ["bags", "kg", "tonnes"];
export const TIMEZONE_OPTIONS = [
  "Africa/Lagos",
  "Africa/Nairobi",
  "Africa/Accra",
  "UTC",
  "Europe/London",
  "America/New_York",
];
export const DATE_FORMAT_OPTIONS = ["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"];
export const DEFAULT_STRAINS = ["Ross 308", "Cobb 500", "Isa Brown", "Lohmann Brown"];
export const DEFAULT_REVENUE_CATEGORIES = ["Live Birds", "Egg Crates", "Manure", "Cull Hens"];
export const DEFAULT_EXPENSE_CATEGORIES = [
  "Feed",
  "Day-Old Chicks",
  "Vaccines",
  "Utilities",
  "Labor",
  "Housing",
  "Bedding",
];
export const FEED_COST_LABELS: { key: FeedCostKey; label: string }[] = [
  { key: "starter", label: "Starter" },
  { key: "grower", label: "Grower" },
  { key: "finisher", label: "Finisher" },
  { key: "layer_mash", label: "Layer Mash" },
];

export const DEFAULT_FEED_COSTS: Record<FeedCostKey, number> = {
  starter: 2800,
  grower: 3200,
  finisher: 3400,
  layer_mash: 2500,
};

export const DEFAULT_FARM_SETTINGS: FarmSettings = {
  farmName: "",
  registrationNumber: "",
  contactEmail: "",
  contactPhone: "",
  physicalAddress: "",
  logoUrl: "",
  mortalityWarningPct: 2,
  mortalityCriticalPct: 5,
  broilerTargetFcr: 1.6,
  layerTargetFcr: 2.0,
  flockStrains: [...DEFAULT_STRAINS],
  currency: "NGN",
  weightUnit: "kg",
  feedUnit: "bags",
  crateCapacity: 30,
  timezone: "Africa/Lagos",
  dateFormat: "DD/MM/YYYY",
  allowWorkerFinancials: false,
  allowManagersViewFinancials: false,
  requireExpenseApproval: true,
  expenseApprovalThreshold: 50000,
  revenueCategories: [...DEFAULT_REVENUE_CATEGORIES],
  expenseCategories: [...DEFAULT_EXPENSE_CATEGORIES],
  feedUnitCosts: { ...DEFAULT_FEED_COSTS },
};