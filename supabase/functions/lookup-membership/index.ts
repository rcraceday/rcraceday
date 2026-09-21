// supabase/functions/lookup-membership/index.ts
// Looks up a household membership by email + club using the service role,
// so anonymous signup users are not blocked by RLS (and never query the
// table directly, which would otherwise require exposing membership rows
// to anon clients).
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { email, club_id } = await req.json();

    if (!email || !club_id) {
      return new Response(
        JSON.stringify({ error: "Email and club_id are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const cleanEmail = String(email).trim().toLowerCase();

    const { data, error } = await supabase
      .from("household_memberships")
      .select(
        "id, primary_first_name, primary_last_name, status, membership_type, user_id"
      )
      .eq("club_id", club_id)
      .ilike("email", cleanEmail)
      .maybeSingle();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!data) {
      return new Response(JSON.stringify({ membership: null }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Do not leak whether the membership is already linked to another account.
    const { user_id, ...membership } = data;

    return new Response(
      JSON.stringify({
        membership: { ...membership, hasAccount: !!user_id },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
