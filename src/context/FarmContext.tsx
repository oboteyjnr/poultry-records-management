import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { toast } from "sonner";
import { supabase } from "../supabase";
import { loadFarmSettings } from "../services/settingsService";
import {
  batchInsert,
  batchUpdate,
  eggInsert,
  expenseInsert,
  feedInsert,
  mapBatch,
  mapEgg,
  mapExpense,
  mapFarm,
  mapFeed,
  mapMedication,
  mapMortality,
  mapProfile,
  mapSale,
  mapWeight,
  medicationInsert,
  mortalityInsert,
  profileInsert,
  saleInsert,
  weightInsert,
} from "../supabase-types";
import {
  SEED_DATA,
  DEFAULT_FARM_SETTINGS,
  type FarmData,
  type FarmSettings,
  type Batch,
  type MortalityLog,
  type FeedLog,
  type MedicationLog,
  type EggCollectionLog,
  type WeightLog,
  type SalesRecord,
  type ExpenseRecord,
  type UserRole,
  type User,
  type Farm,
} from "../types";

const STORAGE_KEY = "purity-farms-data";

/** Minimal session shape shared with App.tsx (avoids importing supabase-js types). */
export interface AuthUser {
  id: string;
  email: string;
  name?: string | null;
  mustChangePassword?: boolean;
}

interface AuthState {
  currentFarmId: string;
  currentUserId: string;
}

type Mode = "loading" | "local" | "live";

/** Per-batch financial roll-up used by the analytics module and dashboard. */
export interface BatchFinancials {
  revenue: number;
  feedCost: number;
  stockCost: number;
  vetMedCost: number;
  indirectCost: number;
  totalCost: number;
  net: number;
  margin: number;
  roi: number;
  birds: number;
  feedKg: number;
  mortalityCount: number;
  mortalityRate: number;
  mortalityLoss: number;
  revenuePerBird: number;
  costPerBird: number;
  feedCostPerKg: number;
}

const EMPTY_DATA: FarmData = {
  farms: [],
  users: [],
  batches: [],
  mortalityLogs: [],
  feedLogs: [],
  medicationLogs: [],
  eggLogs: [],
  weightLogs: [],
  sales: [],
  expenses: [],
};

interface FarmContextType {
  data: FarmData;
  auth: AuthState;
  currentFarm: Farm;
  currentRole: UserRole;
  settings: FarmSettings;
  // Integration state
  loading: boolean;
  isLive: boolean;
  authEmail: string | null;
  authUser: AuthUser | null;
  refetch: () => Promise<void>;
  signOut: () => Promise<void>;
  // Derived metrics
  activeFlockCount: (batchId: string) => number;
  layingRate: (batchId: string) => number;
  totalFeedConsumed: (batchId: string) => number;
  totalWeightGained: (batchId: string) => number;
  fcr: (batchId: string) => number;
  batchProfitLoss: (batchId: string) => { revenue: number; cogs: number; opex: number; net: number };
  costPerBird: (batchId: string) => number;
  costPerEggCrate: (batchId: string) => number;
  batchFinancials: (batchId: string) => BatchFinancials;
  // Actions
  switchFarm: (farmId: string) => void;
  switchUser: (userId: string) => void;
  addBatch: (batch: Omit<Batch, "id">) => Promise<void>;
  updateBatch: (id: string, updates: Partial<Batch>) => Promise<void>;
  deleteBatch: (id: string) => Promise<void>;
  addMortality: (log: Omit<MortalityLog, "id">) => Promise<void>;
  addFeed: (log: Omit<FeedLog, "id">) => Promise<void>;
  addMedication: (log: Omit<MedicationLog, "id">) => Promise<void>;
  addEggCollection: (log: Omit<EggCollectionLog, "id">) => Promise<void>;
  addWeight: (log: Omit<WeightLog, "id">) => Promise<void>;
  addSale: (rec: Omit<SalesRecord, "id">) => Promise<void>;
  addExpense: (rec: Omit<ExpenseRecord, "id">) => Promise<void>;
  // Permissions
  canEditBatch: boolean;
  canViewFinancials: boolean;
  canViewAnalytics: boolean;
  canManageFarm: boolean;
}

const FarmContext = createContext<FarmContextType | null>(null);

function loadLocal(): FarmData {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as FarmData;
      if (parsed && Array.isArray(parsed.farms) && parsed.farms.length > 0) return parsed;
    }
  } catch {
    /* storage unavailable or corrupt — fall through to seed data */
  }
  return SEED_DATA;
}

function saveData(data: FarmData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* ignore quota / private-mode failures */
  }
}

function uid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function notify(label: string, err: unknown) {
  const e = (err ?? {}) as { message?: string; details?: string | null; hint?: string | null };
  const extra = [e.details, e.hint].filter(Boolean).join(" · ");
  toast.error(e.message ? `${label}: ${e.message}` : label, extra ? { description: extra } : undefined);
}

interface FarmProviderProps {
  children: ReactNode;
  /** Signed-in Supabase user, or null while exploring the demo dataset. */
  authUser?: AuthUser | null;
  /** Force the bundled dataset (no Supabase reads or writes). */
  demoMode?: boolean;
  /** Called after Supabase sign-out completes. */
  onSignOut?: () => void;
}

export function FarmProvider({ children, authUser = null, demoMode = false, onSignOut }: FarmProviderProps) {
  const [data, setData] = useState<FarmData>(() => (demoMode ? loadLocal() : EMPTY_DATA));
  const [auth, setAuth] = useState<AuthState>(() => {
    const base = demoMode ? loadLocal() : SEED_DATA;
    return { currentFarmId: base.farms[0]?.id ?? "", currentUserId: base.users[0]?.id ?? "" };
  });
  const [mode, setMode] = useState<Mode>(demoMode ? "local" : "loading");
  const [settings, setSettings] = useState<FarmSettings>(DEFAULT_FARM_SETTINGS);

  const applyLocal = useCallback(() => {
    const local = loadLocal();
    setData(local);
    setMode("local");
    setAuth({ currentFarmId: local.farms[0]?.id ?? "", currentUserId: local.users[0]?.id ?? "" });
  }, []);

  // ── Supabase reads ────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    const [farmsR, profilesR, batchesR, mortalityR, feedR, medR, eggR, weightR, salesR, expenseR] = await Promise.all([
      supabase.from("farms").select("*").order("created_at", { ascending: true }),
      supabase.from("profiles").select("*").order("created_at", { ascending: true }),
      supabase.from("batches").select("*").order("start_date", { ascending: true }),
      supabase.from("mortality_logs").select("*").order("log_date", { ascending: false }),
      supabase.from("feed_logs").select("*").order("log_date", { ascending: false }),
      supabase.from("medication_logs").select("*").order("log_date", { ascending: false }),
      supabase.from("egg_collection_logs").select("*").order("log_date", { ascending: false }),
      supabase.from("weight_logs").select("*").order("log_date", { ascending: false }),
      supabase.from("sales_records").select("*").order("log_date", { ascending: false }),
      supabase.from("expense_records").select("*").order("log_date", { ascending: false }),
    ]);

    const failure = [farmsR, profilesR, batchesR, mortalityR, feedR, medR, eggR, weightR, salesR, expenseR].find((r) => r.error);
    if (failure && failure.error) throw failure.error;

    const farms = (farmsR.data ?? []).map(mapFarm);
    if (farms.length === 0) {
      applyLocal();
      toast.info("Supabase has no farm records yet", {
        description: "Run supabase/seed.sql to populate demo data. Using the bundled dataset meanwhile.",
      });
      return;
    }

    let users: User[] = (profilesR.data ?? []).map(mapProfile);
    const email = authUser?.email ?? "";
    const matchedBefore = email ? users.find((u) => u.email.toLowerCase() === email.toLowerCase()) : undefined;

    // Auto-provision a profile row for a brand-new signed-in account.
    if (authUser && !matchedBefore) {
      const { data: created, error } = await supabase
        .from("profiles")
        .insert(profileInsert(authUser.id, authUser.email, authUser.name || authUser.email, farms[0].id))
        .select()
        .single();
      if (error) notify("Could not create your profile", error);
      else if (created) users = [...users, mapProfile(created)];
    }

    const matched = email ? users.find((u) => u.email.toLowerCase() === email.toLowerCase()) : undefined;
    const farmId = matched && farms.some((f) => f.id === matched.farmId) ? matched.farmId : farms[0].id;
    const userId = matched?.id ?? users.find((u) => u.farmId === farmId)?.id ?? "";

    setData({
      farms,
      users,
      batches: (batchesR.data ?? []).map(mapBatch),
      mortalityLogs: (mortalityR.data ?? []).map(mapMortality),
      feedLogs: (feedR.data ?? []).map(mapFeed),
      medicationLogs: (medR.data ?? []).map(mapMedication),
      eggLogs: (eggR.data ?? []).map(mapEgg),
      weightLogs: (weightR.data ?? []).map(mapWeight),
      sales: (salesR.data ?? []).map(mapSale),
      expenses: (expenseR.data ?? []).map(mapExpense),
    });
    setMode("live");
    setAuth({ currentFarmId: farmId, currentUserId: userId });
  }, [applyLocal, authUser?.id, authUser?.email, authUser?.name]);

  // Load on mount / when the signed-in account changes.
  useEffect(() => {
    if (demoMode || !authUser) {
      applyLocal();
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        await fetchAll();
      } catch (err) {
        if (cancelled) return;
        notify("Could not load farm data from Supabase", err);
        applyLocal();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [demoMode, authUser?.id, authUser?.email, fetchAll, applyLocal]);

  // Mirror data to localStorage only while running on the bundled dataset.
  useEffect(() => {
    if (mode !== "local") return;
    saveData(data);
  }, [data, mode]);

  // ── Farm settings: drives role permissions (e.g. manager analytics) ──────
  useEffect(() => {
    if (mode === "loading") return;
    const farmId = auth.currentFarmId || data.farms[0]?.id || "";
    if (!farmId) return;
    let cancelled = false;
    loadFarmSettings(farmId, mode === "live")
      .then((s) => {
        if (!cancelled) setSettings(s);
      })
      .catch(() => {
        if (!cancelled) setSettings(DEFAULT_FARM_SETTINGS);
      });
    return () => {
      cancelled = true;
    };
  }, [mode, auth.currentFarmId, data.farms]);

  // ── Supabase writes (optimistic local state, rolled back on failure) ──────
  const runWrite = useCallback(
    async (label: string, apply: () => void, request: () => PromiseLike<{ error: unknown }>) => {
      apply();
      if (mode !== "live") return;
      try {
        const { error } = await request();
        if (error) throw error;
      } catch (err) {
        notify(label, err);
        try {
          await fetchAll();
        } catch {
          /* leave optimistic state in place until the next successful fetch */
        }
      }
    },
    [mode, fetchAll],
  );

  const farmIdForWrite = auth.currentFarmId || data.farms[0]?.id || "";
  const batchDefaults: Omit<Batch, "id"> = {
    farmId: farmIdForWrite,
    name: "",
    type: "broiler",
    startDate: new Date().toISOString().slice(0, 10),
    initialCount: 0,
    breed: "",
    initialAvgWeight: 0.042,
    shedId: "",
    status: "active",
  };

  const addBatch = async (batch: Omit<Batch, "id">) => {
    const record: Batch = { ...batchDefaults, ...batch, id: uid(), farmId: batch.farmId || farmIdForWrite };
    await runWrite(
      "Could not save batch",
      () => setData((d) => ({ ...d, batches: [...d.batches, record] })),
      () => supabase.from("batches").insert(batchInsert(record)),
    );
  };

  const updateBatch = async (id: string, updates: Partial<Batch>) => {
    await runWrite(
      "Could not update batch",
      () => setData((d) => ({ ...d, batches: d.batches.map((b) => (b.id === id ? { ...b, ...updates } : b)) })),
      () => supabase.from("batches").update(batchUpdate(updates)).eq("id", id),
    );
  };

  const deleteBatch = async (id: string) => {
    await runWrite(
      "Could not delete batch",
      () => setData((d) => ({ ...d, batches: d.batches.filter((b) => b.id !== id) })),
      () => supabase.from("batches").delete().eq("id", id),
    );
  };

  const addMortality = async (log: Omit<MortalityLog, "id">) => {
    const record: MortalityLog = { ...log, id: uid(), farmId: log.farmId || farmIdForWrite };
    await runWrite(
      "Could not save mortality log",
      () => setData((d) => ({ ...d, mortalityLogs: [...d.mortalityLogs, record] })),
      () => supabase.from("mortality_logs").insert(mortalityInsert(record)),
    );
  };

  const addFeed = async (log: Omit<FeedLog, "id">) => {
    const record: FeedLog = { ...log, id: uid(), farmId: log.farmId || farmIdForWrite };
    await runWrite(
      "Could not save feed log",
      () => setData((d) => ({ ...d, feedLogs: [...d.feedLogs, record] })),
      () => supabase.from("feed_logs").insert(feedInsert(record)),
    );
  };

  const addMedication = async (log: Omit<MedicationLog, "id">) => {
    const record: MedicationLog = { ...log, id: uid(), farmId: log.farmId || farmIdForWrite };
    await runWrite(
      "Could not save medication log",
      () => setData((d) => ({ ...d, medicationLogs: [...d.medicationLogs, record] })),
      () => supabase.from("medication_logs").insert(medicationInsert(record)),
    );
  };

  const addEggCollection = async (log: Omit<EggCollectionLog, "id">) => {
    const record: EggCollectionLog = { ...log, id: uid(), farmId: log.farmId || farmIdForWrite };
    await runWrite(
      "Could not save egg collection",
      () => setData((d) => ({ ...d, eggLogs: [...d.eggLogs, record] })),
      () => supabase.from("egg_collection_logs").insert(eggInsert(record)),
    );
  };

  const addWeight = async (log: Omit<WeightLog, "id">) => {
    const record: WeightLog = { ...log, id: uid(), farmId: log.farmId || farmIdForWrite };
    await runWrite(
      "Could not save weight log",
      () => setData((d) => ({ ...d, weightLogs: [...d.weightLogs, record] })),
      () => supabase.from("weight_logs").insert(weightInsert(record)),
    );
  };

  const addSale = async (rec: Omit<SalesRecord, "id">) => {
    const record: SalesRecord = { ...rec, id: uid(), farmId: rec.farmId || farmIdForWrite };
    await runWrite(
      "Could not save sale",
      () => setData((d) => ({ ...d, sales: [...d.sales, record] })),
      () => supabase.from("sales_records").insert(saleInsert(record)),
    );
  };

  const addExpense = async (rec: Omit<ExpenseRecord, "id">) => {
    const record: ExpenseRecord = { ...rec, id: uid(), farmId: rec.farmId || farmIdForWrite };
    await runWrite(
      "Could not save expense",
      () => setData((d) => ({ ...d, expenses: [...d.expenses, record] })),
      () => supabase.from("expense_records").insert(expenseInsert(record)),
    );
  };

  // ── Session helpers ──────────────────────────────────────────────────────
  const refetch = useCallback(async () => {
    if (mode !== "live") {
      applyLocal();
      return;
    }
    try {
      await fetchAll();
    } catch (err) {
      notify("Could not refresh data", err);
    }
  }, [mode, fetchAll, applyLocal]);

  const signOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error && !/session/i.test(error.message)) notify("Sign out failed", error);
    } catch (err) {
      notify("Sign out failed", err);
    }
    onSignOut?.();
  }, [onSignOut]);

  // ── Derived state ────────────────────────────────────────────────────────
  const currentFarm = (data.farms.find((f) => f.id === auth.currentFarmId) || data.farms[0] || SEED_DATA.farms[0]) as Farm;
  const currentUser = data.users.find((u) => u.id === auth.currentUserId) || data.users[0];
  const currentRole = (currentUser?.role ?? "owner") as UserRole;

  const activeFlockCount = useCallback((batchId: string) => {
    const batch = data.batches.find((b) => b.id === batchId);
    if (!batch) return 0;
    const totalMort = data.mortalityLogs.filter((m) => m.batchId === batchId).reduce((s, m) => s + m.count, 0);
    const sold = data.sales.filter((s) => s.batchId === batchId && s.category === "live_birds").reduce((s, r) => s + r.quantity, 0);
    return Math.max(0, batch.initialCount - totalMort - sold);
  }, [data]);

  const layingRate = useCallback((batchId: string) => {
    const batch = data.batches.find((b) => b.id === batchId);
    if (!batch || batch.type !== "layer") return 0;
    const hens = activeFlockCount(batchId);
    if (hens === 0) return 0;
    const lastEgg = data.eggLogs.filter((e) => e.batchId === batchId).sort((a, b) => b.date.localeCompare(a.date))[0];
    if (!lastEgg) return 0;
    return (lastEgg.totalEggs / hens) * 100;
  }, [data, activeFlockCount]);

  const totalFeedConsumed = useCallback((batchId: string) => {
    return data.feedLogs.filter((f) => f.batchId === batchId).reduce((s, f) => s + f.quantityKg, 0);
  }, [data]);

  const totalWeightGained = useCallback((batchId: string) => {
    const batch = data.batches.find((b) => b.id === batchId);
    if (!batch) return 0;
    const weights = data.weightLogs.filter((w) => w.batchId === batchId).sort((a, b) => b.date.localeCompare(a.date));
    if (weights.length === 0) return 0;
    const currentAvg = weights[0].avgWeightKg;
    return Math.max(0, (currentAvg - batch.initialAvgWeight) * activeFlockCount(batchId));
  }, [data, activeFlockCount]);

  const fcr = useCallback((batchId: string) => {
    const gained = totalWeightGained(batchId);
    if (gained === 0) return 0;
    return totalFeedConsumed(batchId) / gained;
  }, [totalWeightGained, totalFeedConsumed]);

  const batchProfitLoss = useCallback((batchId: string) => {
    const revenue = data.sales.filter((s) => s.batchId === batchId).reduce((s, r) => s + r.total, 0);
    const batchExpenses = data.expenses.filter((e) => e.batchId === batchId);
    const cogs = batchExpenses.filter((e) => ["day_old_chicks", "feed", "vet_vaccines"].includes(e.category)).reduce((s, e) => s + e.amount, 0);
    const feedCost = data.feedLogs.filter((f) => f.batchId === batchId).reduce((s, f) => s + f.bags50kg * f.costPerBag, 0);
    const medCost = data.medicationLogs.filter((m) => m.batchId === batchId).reduce((s, m) => s + m.cost, 0);
    const totalCogs = cogs + feedCost + medCost;
    const opex = batchExpenses.filter((e) => ["utilities", "labor", "housing", "bedding"].includes(e.category)).reduce((s, e) => s + e.amount, 0);
    return { revenue, cogs: totalCogs, opex, net: revenue - totalCogs - opex };
  }, [data]);

  const costPerBird = useCallback((batchId: string) => {
    const pl = batchProfitLoss(batchId);
    const birds = activeFlockCount(batchId);
    if (birds === 0) return 0;
    return (pl.cogs + pl.opex) / birds;
  }, [batchProfitLoss, activeFlockCount]);

  const costPerEggCrate = useCallback((batchId: string) => {
    const pl = batchProfitLoss(batchId);
    const crates = data.eggLogs.filter((e) => e.batchId === batchId).reduce((s, e) => s + e.crates, 0);
    if (crates === 0) return 0;
    return (pl.cogs + pl.opex) / crates;
  }, [batchProfitLoss, data]);

  const batchFinancials = useCallback((batchId: string): BatchFinancials => {
    const batch = data.batches.find((b) => b.id === batchId);
    const revenue = data.sales.filter((s) => s.batchId === batchId).reduce((s, r) => s + r.total, 0);
    const feedLogs = data.feedLogs.filter((f) => f.batchId === batchId);
    const feedKg = feedLogs.reduce((s, f) => s + f.quantityKg, 0);
    const feedCost = feedLogs.reduce((s, f) => s + f.bags50kg * f.costPerBag, 0);
    const batchExpenses = data.expenses.filter((e) => e.batchId === batchId);
    const stockCost = batchExpenses
      .filter((e) => ["day_old_chicks", "feed"].includes(e.category))
      .reduce((s, e) => s + e.amount, 0);
    const vetMedCost =
      batchExpenses.filter((e) => e.category === "vet_vaccines").reduce((s, e) => s + e.amount, 0) +
      data.medicationLogs.filter((m) => m.batchId === batchId).reduce((s, m) => s + m.cost, 0);
    const indirectCost = batchExpenses
      .filter((e) => ["utilities", "labor", "housing", "bedding"].includes(e.category))
      .reduce((s, e) => s + e.amount, 0);
    const totalCost = feedCost + stockCost + vetMedCost + indirectCost;
    const net = revenue - totalCost;
    const margin = revenue > 0 ? (net / revenue) * 100 : 0;
    const roi = totalCost > 0 ? (net / totalCost) * 100 : 0;
    const birds = activeFlockCount(batchId);
    const mortalityCount = data.mortalityLogs
      .filter((m) => m.batchId === batchId)
      .reduce((s, m) => s + m.count, 0);
    const mortalityRate =
      batch && batch.initialCount > 0 ? (mortalityCount / batch.initialCount) * 100 : 0;
    const mortalityLoss = mortalityCount * (birds > 0 ? totalCost / (birds + mortalityCount) : 0);
    return {
      revenue,
      feedCost,
      stockCost,
      vetMedCost,
      indirectCost,
      totalCost,
      net,
      margin,
      roi,
      birds,
      feedKg,
      mortalityCount,
      mortalityRate,
      mortalityLoss,
      revenuePerBird: birds > 0 ? revenue / birds : 0,
      costPerBird: birds > 0 ? totalCost / birds : 0,
      feedCostPerKg: feedKg > 0 ? feedCost / feedKg : 0,
    };
  }, [data, activeFlockCount]);

  const switchFarm = (farmId: string) => {
    const user = data.users.find((u) => u.farmId === farmId);
    setAuth({ currentFarmId: farmId, currentUserId: user?.id || auth.currentUserId });
  };

  const switchUser = (userId: string) => {
    const user = data.users.find((u) => u.id === userId);
    if (user) setAuth({ currentFarmId: user.farmId, currentUserId: userId });
  };

  const canEditBatch = currentRole === "owner" || currentRole === "manager";
  // Owners always have full access. Managers are gated by the Owner-enabled
  // allow_managers_view_financials setting; staff by allow_worker_financials.
  const canViewFinancials =
    currentRole === "owner" ||
    (currentRole === "manager" && settings.allowManagersViewFinancials) ||
    (currentRole === "staff" && settings.allowWorkerFinancials);
  const canViewAnalytics = canViewFinancials;
  const canManageFarm = currentRole === "owner";

  return (
    <FarmContext.Provider value={{
      data,
      auth,
      currentFarm,
      currentRole,
      settings,
      loading: mode === "loading",
      isLive: mode === "live",
      authEmail: authUser?.email ?? null,
      authUser,
      refetch,
      signOut,
      activeFlockCount, layingRate, totalFeedConsumed, totalWeightGained, fcr, batchProfitLoss, costPerBird, costPerEggCrate, batchFinancials,
      switchFarm, switchUser, addBatch, updateBatch, deleteBatch,
      addMortality, addFeed, addMedication, addEggCollection, addWeight, addSale, addExpense,
      canEditBatch, canViewFinancials, canViewAnalytics, canManageFarm,
    }}>
      {children}
    </FarmContext.Provider>
  );
}

export function useFarm() {
  const ctx = useContext(FarmContext);
  if (!ctx) throw new Error("useFarm must be used within FarmProvider");
  return ctx;
}