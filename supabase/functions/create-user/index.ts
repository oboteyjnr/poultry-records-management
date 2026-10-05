// ────────────────────────────────────────────────────────────────────────────────
// Purity Farms Online — owner-managed team provisioning.
//
// POST /functions/v1/create-user
//   Authorization: Bearer <owner session JWT>
//   body: { email, full_name, role: 'manager' | 'worker', password? }
//   → { ok: true, success: true, user: {...}, user_id, temp_password, email_status }
//
// Only callers whose profile row has role = 'owner' may provision teammates.
// A branded welcome email is attempted (Resend / Mailer) and gracefully degrades
// to a "manual hand-off" status when no provider is configured, so the owner
// still receives the temporary password in the UI and nothing hangs.
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
const APP_URL = Deno.env.get("APP_URL") ?? "https://purityfarmsonline.app/login";

type Role = "manager" | "worker";

interface Payload {
  email?: string;
  full_name?: string;
  role?: string;
  password?: string;
  farm_id?: string;
}

function randomPassword(length = 12): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$";
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

function normaliseRole(raw: unknown): Role {
  return raw === "manager" ? "manager" : "worker";
}

function welcomeEmailHtml(fullName: string, email: string, password: string, role: Role): string {
  return `<!doctype html>
<html><body style="margin:0;background:#f1f5f9;font-family:Segoe UI,Helvetica,Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0">
        <tr><td style="background:#059669;padding:24px 28px;color:#ffffff">
          <div style="font-size:13px;letter-spacing:.14em;text-transform:uppercase;opacity:.85">Purity Farms Online</div>
          <div style="font-size:22px;font-weight:700;margin-top:6px">Welcome to Purity Farms Online</div>
        </td></tr>
        <tr><td style="padding:28px">
          <p style="margin:0 0 14px;font-size:15px;color:#0f172a">Hi ${fullName},</p>
          <p style="margin:0 0 18px;font-size:15px;color:#334155;line-height:1.6">
            Your farm owner has created a <strong>${role}</strong> account for you.
            Use the credentials below to sign in for the first time.
          </p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px">
            <tr><td style="padding:16px 18px;font-size:14px;color:#0f172a">
              <div style="margin-bottom:8px"><strong>Email:</strong> ${email}</div>
              <div><strong>Temporary password:</strong>
                <code style="background:#ffffff;border:1px solid #e2e8f0;border-radius:6px;padding:2px 6px">${password}</code>
              </div>
            </td></tr>
          </table>
          <p style="margin:18px 0;font-size:14px;color:#b45309;background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:12px 14px;line-height:1.5">
            <strong>Action required:</strong> you must set your own password the first time you
            sign in. Until then, the dashboard stays locked.
          </p>
          <p style="margin:0 0 6px">
            <a href="${APP_URL}" style="display:inline-block;background:#059669;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 20px;border-radius:10px">
              Sign in to Purity Farms Online
            </a>
          </p>
          <p style="margin:18px 0 0;font-size:12px;color:#94a3b8">
            For security, never share this password. If you were not expecting this invite, contact your farm owner.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

interface EmailStatus {
  sent: boolean;
  provider: string;
  detail: string;
}

async function sendWelcomeEmail(
  to: string,
  fullName: string,
  password: string,
  role: Role,
): Promise<EmailStatus> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("MAIL_FROM") ?? "Purity Farms Online <team@purityfarmsonline.app>";
  if (!apiKey) {
    return {
      sent: false,
      provider: "manual",
      detail: "No email provider configured — share the temporary password manually.",
    };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [to],
        subject: "Welcome to Purity Farms Online — your login details",
        html: welcomeEmailHtml(fullName, to, password, role),
      }),
    });
    if (!res.ok) {
      const detail = await res.text();
      return { sent: false, provider: "resend", detail: detail.slice(0, 180) };
    }
    return { sent: true, provider: "resend", detail: `Welcome email delivered to ${to}.` };
  } catch (err) {
    return {
      sent: false,
      provider: "resend",
      detail: err instanceof Error ? err.message : "Email delivery failed.",
    };
  }
}

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

  let payload: Payload;
  try {
    payload = (await req.json()) as Payload;
  } catch {
    return json({ ok: false, error: "Invalid JSON body." }, 400);
  }

  const email = (payload.email ?? "").trim().toLowerCase();
  const fullName = (payload.full_name ?? "").trim();
  const role = normaliseRole(payload.role);

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ ok: false, error: "A valid email address is required." }, 400);
  }
  if (!fullName) {
    return json({ ok: false, error: "Full name is required." }, 400);
  }
  if (payload.password && payload.password.length < 6) {
    return json({ ok: false, error: "Password must be at least 6 characters." }, 400);
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
    .select("role, farm_id")
    .or(`id.eq.${caller.id},auth_user_id.eq.${caller.id}`)
    .maybeSingle();

  if (profileError) {
    return json({ ok: false, error: `Could not verify your profile: ${profileError.message}` }, 403);
  }
  if (!callerProfile || callerProfile.role !== "owner") {
    return json({ ok: false, error: "Only the farm owner can add team members." }, 403);
  }

  const farmId = payload.farm_id ?? callerProfile.farm_id ?? null;

  // ── 2) Create the auth user (email pre-confirmed). ───────────────────────────
  const tempPassword = payload.password ?? randomPassword();
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      role,
      farm_id: farmId,
      must_change_password: true,
    },
  });

  if (createError || !created?.user) {
    const message = createError?.message ?? "Could not create the account.";
    const friendly = message.toLowerCase().includes("already")
      ? `A user with the email ${email} already exists.`
      : message;
    return json({ ok: false, error: friendly }, 400);
  }

  const userId = created.user.id;

  // ── 3) Mirror the profile row (the auth.users trigger also runs). ────────────
  const { error: upsertError } = await admin
    .from("profiles")
    .upsert(
      {
        id: userId,
        auth_user_id: userId,
        email,
        full_name: fullName,
        role,
        farm_id: farmId,
        must_change_password: true,
      },
      { onConflict: "id" },
    );

  if (upsertError) {
    return json({ ok: false, error: `Account created but profile sync failed: ${upsertError.message}` }, 500);
  }

  // ── 4) Welcome email (non-fatal). ────────────────────────────────────────────
  const emailStatus = await sendWelcomeEmail(email, fullName, tempPassword, role);

  return json({
    ok: true,
    success: true,
    user: { id: userId, email, full_name: fullName, role },
    user_id: userId,
    temp_password: tempPassword,
    email_status: emailStatus,
  });
});