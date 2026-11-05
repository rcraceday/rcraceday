import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    detectSessionInUrl: true,
    // Implicit flow: recovery/confirm email links work in any browser (PKCE needs same-tab storage).
    flowType: "implicit",
  },
  global: {
    headers: {
      Prefer: "count=exact",
    },
  },
});

export default supabase;
