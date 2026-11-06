/* eslint-disable react-hooks/set-state-in-effect -- data load pattern matches UserTranspondersProvider */
/* eslint-disable react-hooks/preserve-manual-memoization -- callback deps match transponders provider */
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/app/providers/AuthProvider";
import { isMissingPlatformPeopleTable } from "@/app/lib/platformPeople";
import { PlatformPeopleContext } from "@/app/providers/PlatformPeopleContext";

export default function PlatformPeopleProvider({ children }) {
  const { user, loadingUser } = useAuth();
  const [people, setPeople] = useState([]);
  const [loadingPeople, setLoadingPeople] = useState(true);
  const [rosterAvailable, setRosterAvailable] = useState(true);

  const loadPeople = useCallback(async () => {
    if (loadingUser) return;
    if (!user?.id || !user.email_confirmed_at) {
      setPeople([]);
      setLoadingPeople(false);
      return;
    }

    setLoadingPeople(true);
    const { data, error } = await supabase
      .from("platform_people")
      .select("id, first_name, last_name, is_junior, created_at")
      .eq("user_id", user.id)
      .order("last_name", { ascending: true })
      .order("first_name", { ascending: true });

    if (error) {
      if (isMissingPlatformPeopleTable(error)) {
        setRosterAvailable(false);
        setPeople([]);
      } else {
        console.warn("[PlatformPeopleProvider] load", error.message);
      }
      setLoadingPeople(false);
      return;
    }

    setRosterAvailable(true);
    setPeople(data || []);
    setLoadingPeople(false);
  }, [loadingUser, user?.id, user?.email_confirmed_at]);

  useEffect(() => {
    loadPeople();
  }, [loadPeople]);

  const addPerson = useCallback(
    async ({ firstName, lastName, isJunior = false }) => {
      if (!user?.id) return { error: new Error("Not signed in") };
      const first = String(firstName || "").trim();
      const last = String(lastName || "").trim();
      if (!first || !last) return { error: new Error("Name required") };

      const { data, error } = await supabase
        .from("platform_people")
        .insert({
          user_id: user.id,
          first_name: first,
          last_name: last,
          is_junior: !!isJunior,
        })
        .select("id, first_name, last_name, is_junior, created_at")
        .single();

      if (error) {
        return { error };
      }

      setPeople((prev) =>
        [...prev, data].sort((a, b) =>
          a.last_name !== b.last_name
            ? a.last_name.localeCompare(b.last_name)
            : a.first_name.localeCompare(b.first_name)
        )
      );
      return { error: null, row: data };
    },
    [user]
  );

  const updatePerson = useCallback(async (id, { firstName, lastName, isJunior }) => {
    if (!user?.id) return { error: new Error("Not signed in") };
    const first = String(firstName ?? "").trim();
    const last = String(lastName ?? "").trim();
    if (!first || !last) return { error: new Error("Name required") };

    const { data, error } = await supabase
      .from("platform_people")
      .update({
        first_name: first,
        last_name: last,
        is_junior: !!isJunior,
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id, first_name, last_name, is_junior, created_at")
      .single();

    if (error) return { error };

    setPeople((prev) =>
      prev
        .map((row) => (row.id === id ? data : row))
        .sort((a, b) =>
          a.last_name !== b.last_name
            ? a.last_name.localeCompare(b.last_name)
            : a.first_name.localeCompare(b.first_name)
        )
    );
    return { error: null, row: data };
  }, [user]);

  const removePerson = useCallback(async (id) => {
    if (!user?.id) return { error: new Error("Not signed in") };
    const { error } = await supabase.from("platform_people").delete().eq("id", id).eq("user_id", user.id);
    if (error) return { error };
    setPeople((prev) => prev.filter((row) => row.id !== id));
    return { error: null };
  }, [user]);

  const value = useMemo(
    () => ({
      people,
      loadingPeople,
      rosterAvailable,
      refreshPeople: loadPeople,
      addPerson,
      updatePerson,
      removePerson,
    }),
    [people, loadingPeople, rosterAvailable, loadPeople, addPerson, updatePerson, removePerson]
  );

  return (
    <PlatformPeopleContext.Provider value={value}>{children}</PlatformPeopleContext.Provider>
  );
}
