// Purity Farms Online — main application shell.
// Integrates FarmContext auth, navigation views, and toasts.
import { useEffect, useState } from "react";
import { FarmProvider, useFarm, type AuthUser } from "./context/FarmContext";
import { AuthScreen } from "./components/AuthModal";
import { ForcedPasswordResetModal } from "./components/ForcedPasswordResetModal";
import { supabase } from "./supabase";
import { Navbar } from "./components/Navbar";
import { DashboardView } from "./components/DashboardView";
import { BatchManagementView } from "./components/BatchManagementView";
import { DailyOperationsView } from "./components/DailyOperationsView";
import { FinancialManagementView } from "./components/FinancialManagementView";
import { SettingsView } from "./components/SettingsView";
import { BatchAnalyticsView } from "./components/BatchAnalyticsView";
import { motion, AnimatePresence } from "framer-motion";
import { Home, Layers, ClipboardList, DollarSign, TrendingUp, Settings, Shield } from "lucide-react";
import { Toaster } from "sonner";

type View = "dashboard" | "batches" | "operations" | "financials" | "analytics" | "settings";

function AppShell() {
  const [view, setView] = useState<View>("dashboard");
  const { currentRole, canViewFinancials, canViewAnalytics, canManageFarm, loading } = useFarm();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-slate-50 dark:bg-[#090d16]">
        <div className="w-9 h-9 rounded-full border-2 border-emerald-500/30 border-t-emerald-600 animate-spin" />
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading farm data from Supabase…</p>
      </div>
    );
  }

  const navItems: { id: View; label: string; icon: any; show: boolean }[] = [
    { id: "dashboard", label: "Dashboard", icon: Home, show: true },
    { id: "batches", label: "Batches", icon: Layers, show: true },
    { id: "operations", label: "Daily Ops", icon: ClipboardList, show: true },
    { id: "financials", label: "Financials", icon: DollarSign, show: canViewFinancials },
    { id: "analytics", label: "Batch Analytics", icon: TrendingUp, show: canViewAnalytics },
    { id: "settings", label: "Settings", icon: Settings, show: canManageFarm },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100">
      <Toaster position="top-right" richColors />
      <Navbar />

      {/* Navigation */}
      <div className="sticky top-16 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border-b border-slate-200/60 dark:border-slate-700/50">
        <div className="max-w-[1600px] mx-auto px-4">
          <nav className="flex gap-1 overflow-x-auto py-2">
            {navItems.filter(n => n.show).map(n => (
              <button
                key={n.id}
                onClick={() => setView(n.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  view === n.id
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 shadow-sm"
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                <n.icon className="w-3.5 h-3.5" />
                {n.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-[1600px] mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {view === "dashboard" && <DashboardView />}
            {view === "batches" && <BatchManagementView />}
            {view === "operations" && <DailyOperationsView />}
            {view === "financials" && <FinancialManagementView />}
            {view === "analytics" && <BatchAnalyticsView />}
            {view === "settings" && <SettingsView />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

/** Structural shape of a Supabase session (keeps supabase-js types out of the UI). */
type SessionLike = {
  user?: { id: string; email?: string | null; user_metadata?: Record<string, unknown> | null } | null;
} | null;

function toAuthUser(session: SessionLike): AuthUser | null {
  const user = session?.user;
  if (!user) return null;
  const meta = user.user_metadata ?? {};
  const name = typeof meta.full_name === "string" ? meta.full_name : null;
  const mustChangePassword = meta.must_change_password === true;
  return { id: user.id, email: user.email ?? "", name, mustChangePassword };
}

/** Keeps the reference stable so FarmProvider does not refetch on token refresh. */
function mergeUser(prev: AuthUser | null, next: AuthUser | null): AuthUser | null {
  if (!prev || !next) return next;
  if (
    prev.id === next.id &&
    prev.email === next.email &&
    prev.name === next.name &&
    prev.mustChangePassword === next.mustChangePassword
  )
    return prev;
  return next;
}

function BootScreen({ label }: { label: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-slate-50 dark:bg-[#090d16]">
      <div className="w-9 h-9 rounded-full border-2 border-emerald-500/30 border-t-emerald-600 animate-spin" />
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}

function Root() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [booting, setBooting] = useState(true);
  const [demoMode, setDemoMode] = useState(false);
  // Optimistic local gate: closes the forced-reset screen the moment the new
  // password is saved, even if the refreshed session metadata lags behind.
  const [passwordReset, setPasswordReset] = useState(false);

  useEffect(() => {
    let active = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return;
        setAuthUser((prev) => mergeUser(prev, toAuthUser(data.session)));
        setBooting(false);
      })
      .catch(() => {
        if (active) setBooting(false);
      });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser((prev) => mergeUser(prev, toAuthUser(session)));
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  if (booting) return <BootScreen label="Connecting to Supabase…" />;

  if (!authUser && !demoMode) {
    return (
      <>
        <Toaster position="top-right" richColors />
        <AuthScreen onDemo={() => setDemoMode(true)} />
      </>
    );
  }

  const refreshAuth = () => {
    setPasswordReset(true);
    supabase.auth
      .getSession()
      .then(({ data }) => setAuthUser((prev) => mergeUser(prev, toAuthUser(data.session))));
  };

  return (
    <>
      <FarmProvider
        key={authUser?.id ?? "demo"}
        authUser={authUser}
        demoMode={demoMode}
        onSignOut={() => {
          setDemoMode(false);
          setPasswordReset(false);
          setAuthUser(null);
        }}
      >
        <AppShell />
      </FarmProvider>
      <ForcedPasswordResetModal
        open={Boolean(authUser?.mustChangePassword) && !passwordReset}
        onSuccess={refreshAuth}
      />
    </>
  );
}

export default function App() {
  useEffect(() => {
    document.title = "Purity Farms Online";
  }, []);
  return <Root />;
}