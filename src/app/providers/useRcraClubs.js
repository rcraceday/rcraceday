// src/app/hooks/useRcraClubs.js
import { useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";

export default function useRcraClubs() {
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadClubs() {
      const { data, error } = await supabase
      .from("rcra_clubs")
      .select("id, name")
        .order("name");

      if (!error) {
        setClubs(data || []);
      }

      setLoading(false);
    }

    loadClubs();
  }, []);

  return { clubs, loading };
}
