import { supabase } from "../supabase";

/**
 * Owner-managed team provisioning, email notification and offboarding.
 * Every privileged operation runs through the `create-user` / `delete-user`
 * Edge Functions, which re-verify the caller's `owner` role server-side.
 */

export type TeamRole = "owner" | "manager" | "worker";
export type AssignableRole = "manager" | "worker";

export interface TeamMember {
  id: string;
  auth_user_id: string | null;
  full_name: string;
  email: string;
  role: TeamRole;
  must_change_password: boolean;
  created_at: string;
}

export interface ProvisionInput {
  email: string;
  full_name: string;
  role: AssignableRole;
  password?: string;
}

export interface ProvisionResult {
  user_id: string;
  temp_password: string;
  email_sent: boolean;
  email_detail: string;
}

export class TeamServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TeamServiceError";
  }
}

interface ProfileRowLite {
  id: string;
  auth_user_id: string | null;
  full_name: string | null;
  email: string | null;
  role: string | null;
  must_change_password: boolean | null;
  created_at: string | null;
}

interface FunctionPayload {
  ok?: boolean;
  success?: boolean;
  error?: string;
  user_id?: string;
  user?: { id?: string };
  temp_password?: string;
  email_status?: { sent?: boolean; detail?: string };
  deleted_user_id?: string;
}

function normaliseRole(raw: string | null | undefined): TeamRole {
  if (raw === "owner") return "owner";
  if (raw === "manager") return "manager";
  // 'worker' is the spec value; 'staff' is kept for legacy rows.
  return "worker";
}

export function roleLabel(role: TeamRole): string {
  if (role === "owner") return "Owner";
  if (role === "manager") return "Manager";
  return "Worker";
}

async function invokeFunction(name: string, body: Record<string, unknown>): Promise<FunctionPayload> {
  const { data, error } = await supabase.functions.invoke(name, { body });

  if (error) {
    let message = error.message || "The request could not be completed.";
    const context = (error as unknown as { context?: Response }).context;
    if (context && typeof context.json === "function") {
      try {
        const payload = (await context.json()) as { error?: string };
        if (payload && typeof payload.error === "string" && payload.error.length > 0) {
          message = payload.error;
        }
      } catch {
        // Response body was not JSON — keep the transport message.
      }
    }
    if (/failed to fetch|networkerror|load failed|fetch failed/i.test(message)) {
      message = "Cannot reach the team service. Check your connection and try again.";
    }
    throw new TeamServiceError(message);
  }

  return (data ?? {}) as FunctionPayload;
}

/** Every profile in the workspace, newest first. */
export async function listTeam(): Promise<TeamMember[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, auth_user_id, full_name, email, role, must_change_password, created_at")
    .order("created_at", { ascending: false });

  if (error) throw new TeamServiceError(error.message);

  const rows = (data ?? []) as unknown as ProfileRowLite[];
  return rows.map((row) => ({
    id: row.id,
    auth_user_id: row.auth_user_id ?? row.id,
    full_name: row.full_name ?? "",
    email: row.email ?? "",
    role: normaliseRole(row.role),
    must_change_password: Boolean(row.must_change_password),
    created_at: row.created_at ?? new Date().toISOString(),
  }));
}

/** Creates the auth account, syncs its profile row and emails the welcome note. */
export async function provisionUser(input: ProvisionInput): Promise<ProvisionResult> {
  const payload = await invokeFunction("create-user", {
    email: input.email.trim().toLowerCase(),
    full_name: input.full_name.trim(),
    role: input.role,
    password: input.password,
  });

  const userId = payload.user_id ?? payload.user?.id;
  if (!userId) {
    throw new TeamServiceError(payload.error ?? "The account could not be created.");
  }

  return {
    user_id: userId,
    temp_password: payload.temp_password ?? "",
    email_sent: Boolean(payload.email_status?.sent),
    email_detail:
      payload.email_status?.detail ??
      "No email provider is configured — hand the temporary password to your teammate directly.",
  };
}

/** Revokes a teammate's login. Deleting the auth user cascades to profiles. */
export async function offboardUser(targetUserId: string): Promise<void> {
  const payload = await invokeFunction("delete-user", { target_user_id: targetUserId });
  if (!payload.deleted_user_id && payload.ok !== true && payload.success !== true) {
    throw new TeamServiceError(payload.error ?? "The team member could not be removed.");
  }
}

/** Owner-scoped role change (RLS also enforces this on the database). */
export async function updateMemberRole(memberId: string, role: AssignableRole): Promise<void> {
  const { error } = await supabase.from("profiles").update({ role }).eq("id", memberId);
  if (error) throw new TeamServiceError(error.message);
}

export function canManageTeam(role: string | null | undefined): boolean {
  return role === "owner";
}