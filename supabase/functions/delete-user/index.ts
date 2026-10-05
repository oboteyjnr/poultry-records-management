// ────────────────────────────────────────────────────────────────────────────────
// Purity Farms Online — user offboarding.
//
// POST /functions/v1/delete-user
//   Authorization: Bearer <owner session JWT>
//   body: { target_user_id: uuid }
//   → { ok: true, success: true, deleted_user_id }
//
// Owner-only. Owners cannot delete their own account from this endpoint.
// Deleting the auth user cascades to public.profiles (ON DELETE CASCADE).
// ────────────────────────────────────────────────────────────────────────────────
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ ok: false, error: "Method not allowed" }, 405);
  }
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return json({ ok: false, error: "Server is missing Supabase service credentials." }, 500);
  }

  let body: { target_user_id?: string };
  try {
    body = (await req.json()) as { target_user_id?: string };
  } catch {
    return json({ ok: false, error: "Invalid JSON body." }, 400);
  }

  const targetUserId = (body.target_user_id ?? "").trim();
  if (!targetUserId) {
    return json({ ok: false, error: "target_user_id is required." }, 400);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // ── 1) Verify the caller is an authenticated owner. ──────────────────────────
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) {
    return json({ ok: false, error: "Missing Authorization bearer token." }, 401);
  }

  const { data: callerData, error: callerError } = await admin.auth.getUser(token);
  const caller = callerData?.user;
  if (callerError || !caller) {
    return json({ ok: false, error: "Your session has expired. Please sign in again." }, 401);
  }

  const { data: callerProfile, error: profileError } = await admin
    .from("profiles")
    .select("role")
    .or(`id.eq.${caller.id},auth_user_id.eq.${caller.id}`)
    .maybeSingle();

  if (profileError) {
    return json({ ok: false, error: `Could not verify your profile: ${profileError.message}` }, 403);
  }
  if (!callerProfile || callerProfile.role !== "owner") {
    return json({ ok: false, error: "Only the farm owner can remove team members." }, 403);
  }

  // ── 2) Never allow an owner to delete themselves through this endpoint. ──────
  if (targetUserId === caller.id) {
    return json({ ok: false, error: "You cannot offboard your own owner account." }, 400);
  }

  // ── 3) Guard against removing another owner. ─────────────────────────────────
  const { data: targetProfile } = await admin
    .from("profiles")
    .select("role, full_name, email")
    .or(`id.eq.${targetUserId},auth_user_id.eq.${targetUserId}`)
    .maybeSingle();

  if (targetProfile?.role === "owner") {
    return json({ ok: false, error: "Owner accounts cannot be offboarded from here." }, 400);
  }

  // ── 4) Delete the auth user (cascades to public.profiles). ───────────────────
  const { error: deleteError } = await admin.auth.admin.deleteUser(targetUserId);
  if (deleteError) {
    return json({ ok: false, error: deleteError.message }, 400);
  }

  // Defensive: clear a lingering profile row if the cascade did not run.
  await admin.from("profiles").delete().or(`id.eq.${targetUserId},auth_user_id.eq.${targetUserId}`);

  return json({
    ok: true,
    success: true,
    deleted_user_id: targetUserId,
    removed: targetProfile?.full_name ?? targetProfile?.email ?? targetUserId,
  });
});