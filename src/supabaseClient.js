// src/supabaseClient.js
// Purpose: create and export a Supabase client that reliably persists sessions in the browser.
// Keep this file as the single source of truth for client creation.

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    "Supabase env vars missing: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY"
  );
}

// Ensure a browser storage adapter when running in the browser.
const browserStorage =
  typeof window !== "undefined" && window.localStorage ? window.localStorage : undefined;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    storage: browserStorage,
  },
  global: {
    headers: {
      // ⭐ REQUIRED: ensures count=exact works for ALL tables
      Prefer: "count=exact",
    },
  },
});

// Debug exposure for diagnosis
if (typeof window !== "undefined") {
  window.__supabase = supabase;
  window.__SUPABASE_DEBUG = {
    url: SUPABASE_URL ? "[present]" : "[missing]",
    anonKeyPresent: !!SUPABASE_ANON_KEY,
    storageProvided: !!browserStorage,
    envDEV: !!import.meta.env.DEV,
  };
  console.log(">>> supabaseClient init", window.__SUPABASE_DEBUG);
}
