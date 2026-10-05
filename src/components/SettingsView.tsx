import { useCallback, useEffect, useMemo, useState } from "react";
import { useFarm } from "@/context/FarmContext";
import {
  DEFAULT_FARM_SETTINGS,
  type FarmSettings,
} from "@/types";
import { loadFarmSettings, saveFarmSettings } from "@/services/settingsService";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ProfileBrandingTab,
  OperationsAlertsTab,
  UnitsLocalizationTab,
} from "@/components/settings/SettingsTabsA";
import {
  RolesPermissionsTab,
  AccountingCategoriesTab,
} from "@/components/settings/SettingsTabsB";
import { TeamManagementTab } from "@/components/settings/TeamManagementTab";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import {
  Bell,
  Building2,
  Check,
  Globe,
  LoaderCircle,
  RotateCcw,
  Save,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";

export function SettingsView() {
  const { currentFarm, isLive, canManageFarm } = useFarm();
  const farmId = currentFarm?.id ?? "";

  const [settings, setSettings] = useState<FarmSettings>(DEFAULT_FARM_SETTINGS);
  const [baseline, setBaseline] = useState<FarmSettings>(DEFAULT_FARM_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadFarmSettings(farmId, isLive)
      .then((s) => {
        if (cancelled) return;
        // Seed the farm name from the active farm if no saved profile yet.
        const seeded: FarmSettings = s.farmName
          ? s
          : { ...s, farmName: currentFarm?.name ?? "" };
        setSettings(seeded);
        setBaseline(seeded);
      })
      .catch(() => {
        if (!cancelled) {
          setSettings(DEFAULT_FARM_SETTINGS);
          setBaseline(DEFAULT_FARM_SETTINGS);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [farmId, isLive, currentFarm?.name]);

  const update = useCallback((patch: Partial<FarmSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const dirty = useMemo(
    () => JSON.stringify(settings) !== JSON.stringify(baseline),
    [settings, baseline],
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveFarmSettings(farmId, settings, isLive);
      setBaseline(settings);
      toast.success("Settings saved", {
        description: isLive
          ? "Synced to Supabase for this farm."
          : "Saved locally for this farm.",
      });
    } catch (err) {
      const msg = (err as { message?: string })?.message ?? "Unknown error";
      toast.error("Could not save settings", { description: msg });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSettings(baseline);
    toast.info("Reverted unsaved changes");
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Fixed header */}
      <div className="sticky top-28 z-30 rounded-xl border border-slate-200/60 bg-white/90 p-4 backdrop-blur-sm dark:border-slate-700/50 dark:bg-slate-900/90">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Farm Settings
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-500 dark:text-slate-400">
                {currentFarm?.name || "Farm"}
              </span>
              <Badge variant="secondary" className="text-[10px]">
                {isLive ? "Live · Supabase" : "Demo · Local"}
              </Badge>
              {dirty ? (
                <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-900/40 dark:text-amber-300">
                  Unsaved changes
                </Badge>
              ) : (
                <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-300">
                  <Check className="size-3" /> Saved
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              disabled={!dirty || saving}
            >
              <RotateCcw className="size-4" /> Reset
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!dirty || saving || !canManageFarm || loading}
            >
              {saving ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Save changes
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-3 rounded-xl border border-slate-200/60 bg-white py-16 text-sm text-slate-500 dark:border-slate-700/50 dark:bg-slate-800/60 dark:text-slate-400">
          <LoaderCircle className="size-5 animate-spin" />
          Loading settings…
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
          <TabsList className="flex w-full flex-wrap lg:w-auto">
            <TabsTrigger value="profile" className="gap-1.5">
              <Building2 className="size-4" /> Profile
            </TabsTrigger>
            <TabsTrigger value="operations" className="gap-1.5">
              <Bell className="size-4" /> Operations
            </TabsTrigger>
            <TabsTrigger value="units" className="gap-1.5">
              <Globe className="size-4" /> Units
            </TabsTrigger>
            <TabsTrigger value="roles" className="gap-1.5">
              <ShieldCheck className="size-4" /> Roles
            </TabsTrigger>
            <TabsTrigger value="accounting" className="gap-1.5">
              <Wallet className="size-4" /> Accounting
            </TabsTrigger>
            <TabsTrigger value="team" className="gap-1.5">
              <Users className="size-4" /> Team
            </TabsTrigger>
          </TabsList>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
            >
              <TabsContent value="profile" className="mt-0">
                <ProfileBrandingTab settings={settings} update={update} />
              </TabsContent>
              <TabsContent value="operations" className="mt-0">
                <OperationsAlertsTab settings={settings} update={update} />
              </TabsContent>
              <TabsContent value="units" className="mt-0">
                <UnitsLocalizationTab settings={settings} update={update} />
              </TabsContent>
              <TabsContent value="roles" className="mt-0">
                <RolesPermissionsTab settings={settings} update={update} />
              </TabsContent>
              <TabsContent value="accounting" className="mt-0">
                <AccountingCategoriesTab settings={settings} update={update} />
              </TabsContent>
              <TabsContent value="team" className="mt-0">
                <TeamManagementTab />
              </TabsContent>
            </motion.div>
          </AnimatePresence>
        </Tabs>
      )}

      {!canManageFarm && !loading ? (
        <p className="text-center text-xs text-slate-400 dark:text-slate-500">
          Only the farm owner can save settings. You can review them here.
        </p>
      ) : null}
    </div>
  );
}