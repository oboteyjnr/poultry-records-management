/**
 * Re-export of the single Purity Farms Supabase client.
 * The app wires auth (persisted session) in src/supabase.ts; importing the
 * client from here keeps a stable path for any integration helper.
 */
export { supabase, isSupabaseConfigured } from "../../supabase";