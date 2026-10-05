import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CircleUserRound,
  Clock,
  KeyRound,
  MailCheck,
  RefreshCw,
  Search,
  ShieldCheck,
  TriangleAlert,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useFarm } from "../../context/FarmContext";
import {
  listTeam,
  offboardUser,
  roleLabel,
  updateMemberRole,
  type AssignableRole,
  type TeamMember,
  type TeamRole,
} from "../../services/teamService";
import { Button } from "../ui/button";
import { TeamMemberTable } from "./TeamMemberTable";
import { ProvisionMemberDialog, type CreatedCredential } from "./ProvisionMemberDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";

const chipClass = (active: boolean) =>
  `px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
    active
      ? "bg-emerald-600 text-white"
      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
  }`;

export function TeamManagementTab() {
  const { isLive, canManageFarm, currentFarm, authUser } = useFarm();
  const isOwner = canManageFarm;

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | TeamRole>("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [lastCreated, setLastCreated] = useState<CreatedCredential | null>(null);
  const [offboardTarget, setOffboardTarget] = useState<TeamMember | null>(null);
  const [offboarding, setOffboarding] = useState(false);

  const fetchMembers = useCallback(async () => {
    if (!isLive) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setMembers(await listTeam());
      setLoadError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not load your team.";
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [isLive]);

  useEffect(() => {
    void fetchMembers();
  }, [fetchMembers]);

  // Filter chips derive from the data on screen — never a hardcoded list.
  const roleFilters = useMemo(() => {
    const present = new Set(members.map((m) => m.role));
    const order: TeamRole[] = ["owner", "manager", "worker"];
    return order.filter((candidate) => present.has(candidate));
  }, [members]);

  useEffect(() => {
    if (roleFilter !== "all" && !roleFilters.includes(roleFilter)) setRoleFilter("all");
  }, [roleFilter, roleFilters]);

  const visibleMembers = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return members.filter((member) => {
      if (roleFilter !== "all" && member.role !== roleFilter) return false;
      if (!needle) return true;
      return (
        member.full_name.toLowerCase().includes(needle) ||
        member.email.toLowerCase().includes(needle) ||
        roleLabel(member.role).toLowerCase().includes(needle)
      );
    });
  }, [members, query, roleFilter]);

  const pendingCount = members.filter((m) => m.must_change_password).length;
  const ownerCount = members.filter((m) => m.role === "owner").length;

  const copy = async (text: string, label = "Copied to clipboard") => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(label);
    } catch {
      toast.error("Could not copy — select the text manually.");
    }
  };

  const handleRoleChange = async (member: TeamMember, next: AssignableRole) => {
    const snapshot = members;
    setMembers((prev) => prev.map((m) => (m.id === member.id ? { ...m, role: next } : m)));
    try {
      await updateMemberRole(member.id, next);
      toast.success(
        `${member.full_name || member.email} is now a ${roleLabel(next).toLowerCase()}.`,
      );
    } catch (err) {
      setMembers(snapshot);
      toast.error(err instanceof Error ? err.message : "Could not update the role.");
    }
  };

  const confirmOffboard = async () => {
    if (!offboardTarget || offboarding) return;
    const target = offboardTarget;
    const targetId = target.auth_user_id ?? target.id;
    const snapshot = members;

    // Optimistic removal — the row disappears instantly, then reconciles.
    setMembers((prev) => prev.filter((m) => m.id !== target.id));
    setOffboarding(true);
    try {
      await offboardUser(targetId);
      toast.success("Team member offboarded", {
        description: `${target.full_name || target.email} no longer has access.`,
      });
    } catch (err) {
      setMembers(snapshot);
      toast.error(err instanceof Error ? err.message : "Could not remove the team member.");
    } finally {
      setOffboarding(false);
      setOffboardTarget(null);
      void fetchMembers();
    }
  };

  if (!isLive) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
        <div className="flex items-center gap-2 mb-1">
          <Users className="w-5 h-5 text-emerald-600" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Team Members</h3>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          You are exploring the demo dataset. Connect a Supabase project to invite managers and
          workers, email their credentials and offboard departing staff.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-600" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Team Members</h3>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {currentFarm?.name ?? "Your farm"} · {members.length} account
              {members.length === 1 ? "" : "s"}
              {!isOwner && " · only the owner can invite, retitle or offboard members"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void fetchMembers()}
              className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-emerald-600 hover:border-emerald-300 transition-colors"
              aria-label="Refresh team list"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            {isOwner && (
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors"
              >
                <UserPlus className="w-4 h-4" /> Add member
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <ShieldCheck className="w-3.5 h-3.5" /> {ownerCount} owner
            {ownerCount === 1 ? "" : "s"}
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
            <Clock className="w-3.5 h-3.5" /> {pendingCount} pending first login
          </div>
        </div>

        {members.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, email or role"
                className="w-full pl-10 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <button type="button" onClick={() => setRoleFilter("all")} className={chipClass(roleFilter === "all")}>
                All
              </button>
              {roleFilters.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setRoleFilter(option)}
                  className={chipClass(roleFilter === option)}
                >
                  {roleLabel(option)}s
                </button>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <div className="space-y-2 py-2" aria-busy="true">
            {[0, 1, 2].map((row) => (
              <div key={row} className="flex items-center gap-4 py-3">
                <div className="h-9 w-9 rounded-full bg-slate-100 dark:bg-slate-800 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-40 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
                  <div className="h-3 w-56 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
                </div>
                <div className="h-5 w-16 rounded-full bg-slate-100 dark:bg-slate-800 animate-pulse" />
              </div>
            ))}
          </div>
        ) : loadError ? (
          <div className="text-center py-8">
            <TriangleAlert className="w-8 h-8 mx-auto mb-2 text-amber-500" />
            <p className="text-sm text-slate-600 dark:text-slate-300">{loadError}</p>
            <Button size="sm" variant="outline" className="mt-3" onClick={() => void fetchMembers()}>
              Try again
            </Button>
          </div>
        ) : members.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <CircleUserRound className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">No teammates yet. Add your first manager or worker.</p>
          </div>
        ) : visibleMembers.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <Search className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">No team members match your filters.</p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setRoleFilter("all");
              }}
              className="mt-2 text-sm font-medium text-emerald-600 hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <TeamMemberTable
            members={visibleMembers}
            isOwner={isOwner}
            selfUserId={authUser?.id ?? null}
            onCopy={(text, label) => void copy(text, label)}
            onRoleChange={(member, next) => void handleRoleChange(member, next)}
            onOffboard={(member) => setOffboardTarget(member)}
          />
        )}
      </div>

      {lastCreated && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <KeyRound className="w-5 h-5 text-emerald-600" />
            <h4 className="font-semibold text-emerald-800 dark:text-emerald-300">
              Share these credentials securely
            </h4>
          </div>
          <p className="text-sm text-emerald-700/80 dark:text-emerald-400/80 mb-3">
            {lastCreated.name} ({lastCreated.email}) must set a new password on first login.
          </p>
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <code className="px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900 font-mono text-sm text-slate-900 dark:text-white">
              {lastCreated.temp_password || "—"}
            </code>
            {lastCreated.temp_password && (
              <button
                type="button"
                onClick={() => void copy(lastCreated.temp_password, "Password copied")}
                className="text-sm font-medium text-emerald-700 dark:text-emerald-400 hover:underline"
              >
                Copy password
              </button>
            )}
            <button
              type="button"
              onClick={() => setLastCreated(null)}
              className="ml-auto inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              aria-label="Dismiss credentials"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p
            className={`inline-flex items-center gap-2 text-xs font-medium px-2.5 py-1 rounded-full ${
              lastCreated.email_sent
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
            }`}
          >
            {lastCreated.email_sent ? (
              <MailCheck className="w-3.5 h-3.5" />
            ) : (
              <TriangleAlert className="w-3.5 h-3.5" />
            )}
            {lastCreated.email_detail}
          </p>
        </div>
      )}

      <ProvisionMemberDialog
        open={modalOpen}
        onOpenChange={setModalOpen}
        onCreated={(credential) => setLastCreated(credential)}
      />

      <AlertDialog
        open={Boolean(offboardTarget)}
        onOpenChange={(open) => {
          if (!open) setOffboardTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Offboard {offboardTarget?.full_name || offboardTarget?.email}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes their login, deletes their profile and revokes all access to{" "}
              {currentFarm?.name ?? "your farm"}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={offboarding}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void confirmOffboard();
              }}
              disabled={offboarding}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {offboarding ? "Removing…" : "Offboard member"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}