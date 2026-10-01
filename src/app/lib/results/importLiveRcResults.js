import { supabase } from "@/supabaseClient";
import { formatEdgeFunctionInvokeError } from "@/app/lib/edgeFunctionErrors";
import { buildParsedFromLiveRcResponse } from "./liveRcImport.js";

export async function importLiveRcResults(url, options = {}) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    throw new Error("Supabase is not configured (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).");
  }

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();
  if (sessionError) throw new Error(sessionError.message);
  if (!session?.access_token) {
    throw new Error("Sign in again to import LiveRC results.");
  }

  const endpoint = `${supabaseUrl.replace(/\/$/, "")}/functions/v1/import-liverc-results`;
  let response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: anonKey,
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        url,
        qualifyingOrder: options.qualifyingOrder || undefined,
        raceFormat: options.raceFormat || undefined,
      }),
    });
  } catch (err) {
    throw new Error(
      formatEdgeFunctionInvokeError(
        { message: err?.message || "Failed to send a request to the Edge Function" },
        "import-liverc-results"
      )
    );
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || `Edge Function returned ${response.status}`);
  }
  if (data?.error) throw new Error(data.error);

  const payload = {
    ...data,
    sourceUrl: data?.sourceUrl || url,
  };
  const parsed = buildParsedFromLiveRcResponse(payload, options);
  return {
    parsed,
    payload,
  };
}
