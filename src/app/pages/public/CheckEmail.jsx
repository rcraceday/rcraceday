// src/app/pages/public/CheckEmail.jsx
import { useOutletContext, useParams, Link } from "react-router-dom";
import { useState } from "react";
import { supabase } from "@/supabaseClient";
import Button from "@/components/ui/Button";

export default function CheckEmail() {
  const { club } = useOutletContext();
  const { clubSlug } = useParams();

  // Read email from URL
  const params = new URLSearchParams(window.location.search);
  const email = params.get("email");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  if (!club) return <div className="p-6 text-center">Loading…</div>;

  // Clean, safe logo resolution
  const logoSrc = club?.logo_url || club?.logo || null;

  async function resendEmail() {
    setLoading(true);
    setMessage("");

    const redirectUrl = `${window.location.origin}/${clubSlug}/public/login`;

    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: redirectUrl,
      }
    });

    setMessage(error ? error.message : "A new confirmation email has been sent.");
    setLoading(false);
  }

  return (
    <div className="px-6 py-10 max-w-sm mx-auto flex flex-col items-center">

      {logoSrc && (
        <img
          src={logoSrc}
          alt={club?.name}
          className="h-16 w-auto object-contain mb-4"
        />
      )}

      <h1 className="text-2xl font-bold mb-4 text-center">Check your email</h1>

      <p className="text-center text-gray-700 mb-6">
        We sent a confirmation link to:
        <br />
        <span className="font-semibold">{email}</span>
      </p>

      <Button onClick={resendEmail} disabled={loading} variant="primary">
        {loading ? "Resending…" : "Resend Email"}
      </Button>

      {message && (
        <p className="text-center text-sm mt-4 text-gray-600">{message}</p>
      )}

      <p className="text-center mt-8 text-gray-600">
        Already confirmed?{" "}
        <Link
          to={`/${clubSlug}/public/login`}
          className="text-blue-600 underline"
        >
          Log in
        </Link>
      </p>
    </div>
  );
}
