import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { Check, Eye, EyeOff, KeyRound, LoaderCircle, Lock, ShieldCheck } from "lucide-react";
import { supabase } from "../supabase";

interface ForcedPasswordResetModalProps {
  open: boolean;
  /** Called after a successful reset so the host can refresh session state. */
  onSuccess: () => void;
}

const inputClass =
  "w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500";

const MIN_LENGTH = 8;

const STRENGTH_LEVELS = [
  { label: "Too short", bar: "bg-slate-300 dark:bg-slate-600", text: "text-slate-500 dark:text-slate-400" },
  { label: "Weak", bar: "bg-rose-500", text: "text-rose-600 dark:text-rose-400" },
  { label: "Fair", bar: "bg-amber-500", text: "text-amber-600 dark:text-amber-400" },
  { label: "Good", bar: "bg-sky-500", text: "text-sky-600 dark:text-sky-400" },
  { label: "Strong", bar: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" },
];

function scorePassword(value: string): number {
  if (value.length < MIN_LENGTH) return 0;
  let score = 1;
  if (value.length >= 12) score += 1;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
  if (/\d/.test(value) && /[^A-Za-z0-9]/.test(value)) score += 1;
  return Math.min(score, 4);
}

/**
 * Blocks the app until a freshly provisioned user sets their own password.
 * Triggered when the session metadata flag `must_change_password` is true.
 */
export function ForcedPasswordResetModal({ open, onSuccess }: ForcedPasswordResetModalProps) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  const strength = scorePassword(password);
  const strengthLevel = STRENGTH_LEVELS[strength];
  const rules = [
    { ok: password.length >= MIN_LENGTH, label: `At least ${MIN_LENGTH} characters` },
    { ok: /[a-z]/.test(password) && /[A-Z]/.test(password), label: "Upper and lower case letters" },
    { ok: /\d/.test(password), label: "At least one number" },
    { ok: /[^A-Za-z0-9]/.test(password), label: "At least one symbol" },
  ];
  const ready = rules.every((rule) => rule.ok) && password === confirm;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (password.length < MIN_LENGTH) {
      toast.error("Password too short", { description: `Use at least ${MIN_LENGTH} characters.` });
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      const userId = data.user?.id;
      if (userId) {
        // Clear the onboarding flag in auth metadata and mirror it on the profile.
        await supabase.auth.updateUser({ data: { must_change_password: false } });
        await (supabase as unknown as { from: (table: string) => any })
          .from("profiles")
          .update({ must_change_password: false })
          .or(`id.eq.${userId},auth_user_id.eq.${userId}`);
      }
      toast.success("Password updated", { description: "Your workspace is ready." });
      setPassword("");
      setConfirm("");
      onSuccess();
    } catch (err) {
      toast.error("Could not update password", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-6"
          >
            <div className="flex flex-col items-center gap-3 mb-5 text-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <KeyRound className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Set your password</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  You were added by your farm owner. Choose a new password to finish onboarding.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                  New password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={show ? "text" : "password"}
                    required
                    minLength={MIN_LENGTH}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={`At least ${MIN_LENGTH} characters`}
                    className={`${inputClass} pr-11`}
                  />
                  <button
                    type="button"
                    onClick={() => setShow((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    aria-label={show ? "Hide password" : "Show password"}
                  >
                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Strength meter + live requirements checklist */}
                <div className="mt-2.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                      Password strength
                    </span>
                    <span className={`text-[11px] font-semibold ${strengthLevel.text}`}>
                      {strengthLevel.label}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5" role="presentation">
                    {[0, 1, 2, 3].map((index) => (
                      <span
                        key={index}
                        className={`h-1.5 rounded-full transition-colors ${
                          index < strength ? strengthLevel.bar : "bg-slate-200 dark:bg-slate-700"
                        }`}
                      />
                    ))}
                  </div>
                  <ul className="mt-3 grid gap-1.5">
                    {rules.map((rule) => (
                      <li key={rule.label} className="flex items-center gap-2 text-xs">
                        <span
                          className={`flex items-center justify-center w-4 h-4 rounded-full ${
                            rule.ok
                              ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400"
                              : "bg-slate-100 text-slate-300 dark:bg-slate-800 dark:text-slate-600"
                          }`}
                        >
                          <Check className="w-3 h-3" />
                        </span>
                        <span
                          className={rule.ok ? "text-slate-600 dark:text-slate-300" : "text-slate-400"}
                        >
                          {rule.label}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                  Confirm password
                </label>
                <div className="relative">
                  <Check className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={show ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Re-enter your password"
                    className={inputClass}
                  />
                </div>
                {confirm.length > 0 && password !== confirm && (
                  <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400">
                    Passwords do not match yet.
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={busy || !ready}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
              >
                {busy ? (
                  <LoaderCircle className="w-4 h-4 animate-spin" />
                ) : (
                  <ShieldCheck className="w-4 h-4" />
                )}
                Save password &amp; continue
              </button>
            </form>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}