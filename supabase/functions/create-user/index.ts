// supabase/functions/create-user/index.ts
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
    const supabasePublic = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );

    const { email, password, metadata } = await req.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: "Email and password are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: signupData, error: signupError } =
      await supabasePublic.auth.signUp({
        email,
        password,
        options: {
          data: metadata || {},
          emailRedirectTo: metadata?.email_redirect_to,
        },
      });

    if (signupError) {
      return new Response(JSON.stringify({ error: signupError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!signupData.user) {
      return new Response(JSON.stringify({ error: "Unable to create the user account" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (signupData.user.email_confirmed_at) {
      return new Response(
        JSON.stringify({
          error:
            "Email confirmation is disabled for this Supabase project. Enable email confirmations before allowing signup.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (signupData.user.identities?.length === 0) {
      const { data: existingAuth } = await supabase.auth.admin.getUserById(
        signupData.user.id
      );

      if (existingAuth.user?.email_confirmed_at) {
        return new Response(
          JSON.stringify({ error: "A user with this email address has already been registered" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const { error: resendError } = await supabasePublic.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: metadata?.email_redirect_to },
      });

      if (resendError) {
        return new Response(JSON.stringify({ error: resendError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .upsert(
        {
          id: signupData.user.id,
          email,
          first_name: metadata?.first_name || "",
          last_name: metadata?.last_name || "",
          full_name: metadata?.full_name || "",
        },
        { onConflict: "id" }
      );

    if (profileError) {
      return new Response(JSON.stringify({ error: profileError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        type: metadata?.signup_type || "signup",
        user: signupData.user,
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
