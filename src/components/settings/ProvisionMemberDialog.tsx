import { useState } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";
import {
  CircleUserRound,
  KeyRound,
  LoaderCircle,
  Mail,
  Sparkles,
  UserPlus,
} from "lucide-react";
import { provisionUser, type AssignableRole } from "../../services/teamService";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";

export interface CreatedCredential {
  name: string;
  email: string;
  temp_password: string;
  email_sent: boolean;
  email_detail: string;
}

interface ProvisionMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (credential: CreatedCredential) => void;
}

const inputClass =
  "w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500";

/** Owner-only: creates a login, syncs its profile row and reports email delivery. */
export function ProvisionMemberDialog({ open, onOpenChange, onCreated }: ProvisionMemberDialogProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AssignableRole>("worker");
  const [autoGenerate, setAutoGenerate] = useState(true);
  const [manualPassword, setManualPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setFullName("");
    setEmail("");
    setRole("worker");
    setAutoGenerate(true);
    setManualPassword("");
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    if (!autoGenerate && manualPassword.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    const name = fullName.trim();
    const address = email.trim();
    setSubmitting(true);
    try {
      const result = await provisionUser({
        email: address,
        full_name: name,
        role,
        password: autoGenerate ? undefined : manualPassword,
      });
      onCreated({
        name,
        email: address,
        temp_password: result.temp_password,
        email_sent: result.email_sent,
        email_detail: result.email_detail,
      });
      resetForm();
      onOpenChange(false);
      toast.success("Team member added", {
        description: result.email_sent
          ? "A welcome email with the temporary password was sent."
          : "Share the temporary password securely.",
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add the team member.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) resetForm();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-emerald-600" /> Add Team Member
          </DialogTitle>
          <DialogDescription>
            Creates a login for a manager or worker. They set their own password on first sign-in.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-1">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
              Full name
            </label>
            <div className="relative">
              <CircleUserRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Doe"
                className={`${inputClass} pl-10`}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                required
                autoComplete="off"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@purityfarms.com"
                className={`${inputClass} pl-10`}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as AssignableRole)}
              className={inputClass}
            >
              <option value="worker">Worker — day-to-day logs</option>
              <option value="manager">Manager — broad access</option>
            </select>
          </div>

          <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoGenerate}
                onChange={(e) => setAutoGenerate(e.target.checked)}
                className="w-4 h-4 rounded accent-emerald-600"
              />
              <span className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
                <Sparkles className="w-4 h-4 text-emerald-600" /> Auto-generate a temporary password
              </span>
            </label>
            {!autoGenerate && (
              <div className="relative mt-3">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={manualPassword}
                  onChange={(e) => setManualPassword(e.target.value)}
                  placeholder="Enter a password (min 6 chars)"
                  className={`${inputClass} pl-10`}
                />
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-semibold transition-colors"
          >
            {submitting ? (
              <LoaderCircle className="w-4 h-4 animate-spin" />
            ) : (
              <UserPlus className="w-4 h-4" />
            )}
            {submitting ? "Creating account…" : "Create member"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}