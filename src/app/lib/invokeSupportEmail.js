import { formatEdgeFunctionInvokeError } from "@/app/lib/edgeFunctionErrors";

const FUNCTION_NAME = "send-recovery-email";

/**
 * Invoke send-recovery-email and normalize { error } for UI handlers.
 * Uses raw fetch so the global Supabase client `Prefer` header does not break Edge Function CORS.
 */
export async function invokeSupportEmail(body) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    return {
      data: null,
      error: {
        message: "Supabase is not configured (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).",
      },
    };
  }

  const url = `${String(supabaseUrl).replace(/\/$/, "")}/functions/v1/${FUNCTION_NAME}`;

  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    return {
      data: null,
      error: {
        message: formatEdgeFunctionInvokeError(
          { message: err?.message || "Failed to send a request to the Edge Function" },
          FUNCTION_NAME
        ),
      },
    };
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return {
      data: null,
      error: {
        message:
          String(data?.error || "").trim() ||
          formatEdgeFunctionInvokeError(
            { message: `Edge Function returned ${response.status}` },
            FUNCTION_NAME
          ),
      },
    };
  }

  if (data?.error) {
    return {
      data: null,
      error: { message: String(data.error) },
    };
  }

  return { data, error: null };
}