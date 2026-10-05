import { createClient } from "@supabase/supabase-js";
import type { Database } from "./supabase-types";

/**
 * Supabase client for Purity Farms Online.
 * Credentials are pinned to the connected project (env vars, when present, win)
 * so the app boots with zero local setup.
 */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://gbnyhoczdirovfiqdpkt.supabase.co";

const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdibnlob2N6ZGlyb3ZmaXFkcGt0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA5MDIxNzIsImV4cCI6MjEwNjQ3ODE3Mn0.bZ-U2fJgc-4yqq-Km_m6PwHsyFe1jDjYPmNASAIxXpM";

/** True when a usable project URL + publishable key are present. */
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: "purity-farms-auth",
  },
});