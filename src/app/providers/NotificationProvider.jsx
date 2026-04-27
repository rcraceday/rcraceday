// src/app/providers/NotificationProvider.jsx

import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  createContext,
  useContext,
} from "react";

import NotificationContext from "@/app/providers/NotificationContext";
import { supabase } from "@/supabaseClient";

// Local toast context
const ToastContext = createContext(null);

export function useNotifications() {
  return useContext(ToastContext);
}

/**
 * NotificationProvider
 * - Keeps your existing DB-backed notifications
 * - Adds a toast system for UI messages (success/error)
 * - No breaking changes
 */

export default function NotificationProvider({ children }) {
  /* ============================================================
     EXISTING NOTIFICATION LOGIC (unchanged)
     ============================================================ */
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(true);

  const mountedRef = useRef(false);
  const lastDataRef = useRef(null);
  const refreshTimerRef = useRef(null);

  const loadNotifications = useCallback(async () => {
    if (!mountedRef.current) return;
    setLoadingNotifications(true);

    try {
      const result = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (result?.error) {
        console.warn("NotificationProvider loadNotifications error", result.error);
        if (mountedRef.current) {
          setNotifications([]);
          setLoadingNotifications(false);
        }
        return;
      }

      const data = result?.data || [];

      const last = lastDataRef.current;
      const changed =
        !last ||
        last.length !== data.length ||
        data.some((r, i) => r.id !== last[i]?.id);

      if (changed && mountedRef.current) {
        setNotifications(data);
        lastDataRef.current = data;
      }

      if (mountedRef.current) setLoadingNotifications(false);
      console.debug("NotificationProvider loadNotifications success", { count: data.length });
    } catch (err) {
      console.error("NotificationProvider loadNotifications caught", err);
      if (mountedRef.current) {
        setNotifications([]);
        setLoadingNotifications(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    loadNotifications();

    return () => {
      mountedRef.current = false;
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [loadNotifications]);

  useEffect(() => {
    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
        },
        (payload) => {
          console.debug("NotificationProvider realtime event", {
            event: payload?.eventType ?? payload?.event,
            id: payload?.record?.id,
          });

          if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
          refreshTimerRef.current = setTimeout(() => {
            if (mountedRef.current) loadNotifications();
            refreshTimerRef.current = null;
          }, 150);
        }
      )
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
        channel?.unsubscribe?.();
      } catch (err) {
        console.warn("NotificationProvider cleanup error", err);
      }
    };
  }, [loadNotifications]);

  /* ============================================================
     NEW TOAST SYSTEM (added)
     ============================================================ */
  const [toasts, setToasts] = useState([]);

  const pushToast = useCallback((type, message) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, message }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const notifySuccess = useCallback(
    (msg) => pushToast("success", msg),
    [pushToast]
  );

  const notifyError = useCallback(
    (msg) => pushToast("error", msg),
    [pushToast]
  );

  /* ============================================================
     PROVIDER OUTPUT
     ============================================================ */
  return (
    <NotificationContext.Provider
      value={{
        notifications,
        loadingNotifications,
        refreshNotifications: loadNotifications,
      }}
    >
      <ToastContext.Provider
        value={{
          notifySuccess,
          notifyError,
        }}
      >
        {children}

        {/* Toast UI */}
        <div className="fixed top-4 right-4 space-y-2 z-50">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`px-4 py-2 rounded shadow text-white ${
                t.type === "success" ? "bg-green-600" : "bg-red-600"
              }`}
            >
              {t.message}
            </div>
          ))}
        </div>
      </ToastContext.Provider>
    </NotificationContext.Provider>
  );
}
