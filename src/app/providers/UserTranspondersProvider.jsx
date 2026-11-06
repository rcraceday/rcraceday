import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/app/providers/AuthProvider";
import {
  isMissingUserTranspondersTable,
  isValidTransponderNumber,
  mergeTransponderSuggestions,
  sanitizeTransponderNumber,
} from "@/app/lib/userTransponders";

const UserTranspondersContext = createContext({
  transponders: [],
  loadingTransponders: true,
  transpondersAvailable: true,
  suggestionNumbers: [],
  refreshTransponders: async () => {},
  addTransponder: async () => ({ error: null }),
  updateTransponderLabel: async () => ({ error: null }),
  removeTransponder: async () => ({ error: null }),
  ensureTransponderNumber: async () => null,
  mergeSuggestions: () => [],
});

export function useUserTransponders() {
  return useContext(UserTranspondersContext);
}

export default function UserTranspondersProvider({ children }) {
  const { user, loadingUser } = useAuth();
  const [transponders, setTransponders] = useState([]);
  const [loadingTransponders, setLoadingTransponders] = useState(true);
  const [transpondersAvailable, setTranspondersAvailable] = useState(true);

  const loadTransponders = useCallback(async () => {
    if (loadingUser) return;
    if (!user?.id || !user.email_confirmed_at) {
      setTransponders([]);
      setLoadingTransponders(false);
      return;
    }

    setLoadingTransponders(true);
    const { data, error } = await supabase
      .from("user_transponders")
      .select("id, number, label, created_at")
      .eq("user_id", user.id)
      .order("number", { ascending: true });

    if (error) {
      if (isMissingUserTranspondersTable(error)) {
        setTranspondersAvailable(false);
        setTransponders([]);
      } else {
        console.warn("[UserTranspondersProvider] load", error.message);
      }
      setLoadingTransponders(false);
      return;
    }

    setTranspondersAvailable(true);
    setTransponders(data || []);
    setLoadingTransponders(false);
  }, [loadingUser, user?.id, user?.email_confirmed_at]);

  useEffect(() => {
    loadTransponders();
  }, [loadTransponders]);

  const suggestionNumbers = useMemo(
    () => transponders.map((row) => sanitizeTransponderNumber(row.number)).filter(Boolean),
    [transponders]
  );

  const mergeSuggestions = useCallback(
    (extraNumbers) => mergeTransponderSuggestions(suggestionNumbers, extraNumbers),
    [suggestionNumbers]
  );

  const addTransponder = useCallback(
    async ({ number, label = "" }) => {
      if (!user?.id) return { error: new Error("Not signed in") };
      const sanitized = sanitizeTransponderNumber(number);
      if (!isValidTransponderNumber(sanitized)) {
        return { error: new Error("Invalid transponder number") };
      }

      const { data, error } = await supabase
        .from("user_transponders")
        .insert({
          user_id: user.id,
          number: sanitized,
          label: String(label || "").trim().slice(0, 80),
        })
        .select("id, number, label, created_at")
        .single();

      if (error) {
        return { error };
      }

      setTransponders((prev) =>
        [...prev, data].sort((a, b) =>
          a.number.localeCompare(b.number, undefined, { numeric: true })
        )
      );
      return { error: null, row: data };
    },
    [user?.id]
  );

  const updateTransponderLabel = useCallback(async (id, label) => {
    const { data, error } = await supabase
      .from("user_transponders")
      .update({ label: String(label || "").trim().slice(0, 80) })
      .eq("id", id)
      .select("id, number, label, created_at")
      .single();

    if (error) return { error };
    setTransponders((prev) => prev.map((row) => (row.id === id ? data : row)));
    return { error: null, row: data };
  }, []);

  const removeTransponder = useCallback(async (id) => {
    const { error } = await supabase.from("user_transponders").delete().eq("id", id);
    if (error) return { error };
    setTransponders((prev) => prev.filter((row) => row.id !== id));
    return { error: null };
  }, []);

  const ensureTransponderNumber = useCallback(
    async (number) => {
      const sanitized = sanitizeTransponderNumber(number);
      if (!isValidTransponderNumber(sanitized) || !user?.id) return null;

      const existing = transponders.find(
        (row) => sanitizeTransponderNumber(row.number) === sanitized
      );
      if (existing) return existing.id;

      const { data, error } = await supabase
        .from("user_transponders")
        .insert({
          user_id: user.id,
          number: sanitized,
          label: "",
        })
        .select("id, number, label, created_at")
        .single();

      if (error) {
        if (error.code === "23505") {
          const { data: existing } = await supabase
            .from("user_transponders")
            .select("id, number, label, created_at")
            .eq("user_id", user.id)
            .eq("number", sanitized)
            .maybeSingle();
          if (existing) {
            setTransponders((prev) => {
              if (prev.some((r) => r.id === existing.id)) return prev;
              return [...prev, existing].sort((a, b) =>
                a.number.localeCompare(b.number, undefined, { numeric: true })
              );
            });
            return existing.id;
          }
        }
        if (!isMissingUserTranspondersTable(error)) {
          console.warn("[UserTranspondersProvider] ensure", error.message);
        }
        return null;
      }

      setTransponders((prev) =>
        [...prev, data].sort((a, b) =>
          a.number.localeCompare(b.number, undefined, { numeric: true })
        )
      );
      return data.id;
    },
    [loadTransponders, transponders, user?.id]
  );

  const value = useMemo(
    () => ({
      transponders,
      loadingTransponders,
      transpondersAvailable,
      suggestionNumbers,
      refreshTransponders: loadTransponders,
      addTransponder,
      updateTransponderLabel,
      removeTransponder,
      ensureTransponderNumber,
      mergeSuggestions,
    }),
    [
      transponders,
      loadingTransponders,
      transpondersAvailable,
      suggestionNumbers,
      loadTransponders,
      addTransponder,
      updateTransponderLabel,
      removeTransponder,
      ensureTransponderNumber,
      mergeSuggestions,
    ]
  );

  return (
    <UserTranspondersContext.Provider value={value}>
      {children}
    </UserTranspondersContext.Provider>
  );
}
