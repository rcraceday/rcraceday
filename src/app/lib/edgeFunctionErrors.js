/** Turn Supabase functions.invoke errors into something actionable in the UI. */
export function formatEdgeFunctionInvokeError(error, functionName) {
  if (!error) return "";
  const parts = [error.message, error.context?.message, error.details].filter(Boolean);
  const text = parts.join(" — ") || "Unknown error";

  if (text.includes("Failed to send a request")) {
    return (
      `${text} (${functionName}). ` +
      "The browser could not reach Supabase Functions. Confirm VITE_SUPABASE_URL is your project URL, " +
      "the function is deployed, you are online, and nothing is blocking requests (ad blocker, VPN). " +
      "Open DevTools → Network and look for a failed call to /functions/v1/" +
      functionName +
      "."
    );
  }

  return text;
}
