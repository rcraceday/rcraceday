import { supabase } from "@/supabaseClient";
import { formatEdgeFunctionInvokeError } from "@/app/lib/edgeFunctionErrors";

const FUNCTION_NAME = "send-recovery-email";

/**
 * Invoke send-recovery-email and normalize { error } for UI handlers.
 */
export async function invokeSupportEmail(body) {
  const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, { body });

  if (error) {
    return {
      data: null,
      error: {
        message: formatEdgeFunctionInvokeError(error, FUNCTION_NAME) || error.message,
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