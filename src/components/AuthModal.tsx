import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Bird,
  Building2,
  Cloud,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  LogIn,
  Mail,
  Shield,
  Sparkles,
  User,
  UserPlus,
} from "lucide-react";
import { isSupabaseConfigured, supabase } from "../supabase";

interface AuthScreenProps {
  /** Enter the app with the bundled demo dataset (no Supabase account needed). */
  onDemo: () => void;
}

/**
 * Supabase authentication gate: sign in, create an account, or explore the
 * bundled demo dataset. Rendered by Root before any farm data is loaded.
 */
export function AuthScreen({ onDemo }: AuthScreenProps) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [farmName, setFarmName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back", { description: "Loading your farm data…" });
      } else {
        const resolvedName = fullName || email.split("@")[0];
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: resolvedName,
              role: "owner",
              must_change_password: false,
            },
          },
        });
        if (error) throw error;
        if (data.session && data.user) {
          // Provision the owner's farm and attach it to their profile row.
          const farmLabel = farmName.trim() || `${resolvedName}’s Farm`;
          const { data: farm } = await supabase
            .from("farms")
            .insert({ name: farmLabel, location: "" })
            .select()
            .single();
          if (farm) {
            await supabase
              .from("profiles")
              .update({ farm_id: farm.id, role: "owner" })
              .eq("auth_user_id", data.user.id);
          }
          toast.success("Farm created", {
            description: "You are the owner. Invite teammates from Settings → Team.",
          });
        } else {
          toast.success("Confirm your email", {
            description: "Check your inbox for the confirmation link, then sign in.",
          });
          setMode("signin");
        }
      }
    } catch (err) {
      toast.error("Authentication failed", {
        description: err instanceof Error ? err.message : "Please check your details and retry.",
      });
    } finally {
      setBusy(false);
    }
  };

  const inputClass =
    "w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950 p-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <div className="flex flex-col items-center gap-3 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <Bird className="w-7 h-7 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Purity Farms</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Poultry operations console — secure, cloud-backed
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-900/5 p-6">
          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 mb-5">
            {(["signin", "signup"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setMode(tab)}
                className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                  mode === tab
                    ? "bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                }`}
              >
                {tab === "signin" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                  Full name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Grace Wanjiru"
                    className={inputClass}
                  />
                </div>
              </div>
            )}

            {mode === "signup" && (
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                  Farm name
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={farmName}
                    onChange={(e) => setFarmName(e.target.value)}
                    placeholder="Purity Farms"
                    className={inputClass}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@farm.co.ke"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`${inputClass} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
            >
              {busy ? (
                <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
              ) : mode === "signin" ? (
                <LogIn className="w-4 h-4" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
              {mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
            <span className="text-[11px] uppercase tracking-wide text-slate-400">or</span>
            <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
          </div>

          <button
            type="button"
            onClick={onDemo}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-medium transition-colors"
          >
            <Sparkles className="w-4 h-4 text-emerald-600" />
            Explore the demo dataset
          </button>

          <div className="mt-5 space-y-2 text-[11px] text-slate-500 dark:text-slate-400">
            <p className="flex items-center gap-2">
              {isSupabaseConfigured ? (
                <Cloud className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <KeyRound className="w-3.5 h-3.5 text-amber-500" />
              )}
              {isSupabaseConfigured
                ? "Supabase project connected — data is stored in Postgres."
                : "No Supabase credentials found — add them in .env.local."}
            </p>
            <p className="flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-emerald-600" />
              Row Level Security is enabled on every table.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}