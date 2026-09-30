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
import { useAuth } from "@/app/providers/AuthProvider";
import { useClub } from "@/app/providers/ClubProvider";
import { useMembership } from "@/app/providers/MembershipProvider";
import { normalizeNotificationPreferences } from "@/app/lib/notificationPreferences";
import { isWebPushConfigured, isWebPushSupported, syncWebPushIfPermitted } from "@/app/lib/webPushClient";
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
  const { user } = useAuth();
  const { club } = useClub();
  const { membership } = useMembership();

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
    if (!user?.id) {
      setNotifications([]);
      setLoadingNotifications(false);
      return;
    }

    setLoadingNotifications(true);

    try {
      let query = supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (club?.id) {
        query = query.eq("club_id", club.id);
      }

      const result = await query;

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
  }, [user?.id, club?.id]);

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
    if (!user?.id || !membership) return undefined;
    const prefs = normalizeNotificationPreferences(membership.notification_preferences);
    if (!prefs.push_enabled) return undefined;
    if (!isWebPushConfigured() || !isWebPushSupported()) return undefined;

    let cancelled = false;
    const sync = () => {
      if (cancelled) return;
      syncWebPushIfPermitted(supabase, {
        userId: user.id,
        clubId: club?.id ?? null,
      }).catch(() => {});
    };

    sync();
    const retrySoon = setTimeout(sync, 2000);
    const retryLater = setTimeout(sync, 8000);
    document.addEventListener("visibilitychange", sync);
    navigator.serviceWorker?.ready?.then(() => sync());

    return () => {
      cancelled = true;
      clearTimeout(retrySoon);
      clearTimeout(retryLater);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [user?.id, membership, club?.id]);

  useEffect(() => {
    if (!user?.id) return undefined;

    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
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
  }, [loadNotifications, user?.id]);

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
