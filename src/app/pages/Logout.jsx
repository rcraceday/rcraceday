// src/app/pages/Logout.jsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/supabaseClient";

export default function Logout() {
  const navigate = useNavigate();

  useEffect(() => {
    async function run() {
      await supabase.auth.signOut();
      navigate("/");
    }
    run();
  }, [navigate]);

  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      Logging out…
    </div>
  );
}
