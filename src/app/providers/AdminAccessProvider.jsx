import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/app/providers/AuthProvider";
import { useClub } from "@/app/providers/ClubProvider";
import { useProfile } from "@/app/providers/ProfileProvider";
import {
  canManageAdminUsers,
  fetchClubAdminGrant,
  hasAdminPermission,
  hasAnyAdminAccess,
  isFullProfileAdmin,
  normalizeAdminPermissions,
} from "@/app/lib/adminPermissions";

const AdminAccessContext = createContext({
  loadingAdminAccess: true,
  permissions: null,
  isFullAdmin: false,
  hasAnyAdminAccess: false,
  canManageAdminUsers: false,
  hasPermission: () => false,
  refreshAdminAccess: async () => {},
});

export function useAdminAccess() {
  return useContext(AdminAccessContext);
}

export default function AdminAccessProvider({ children }) {
  const { user } = useAuth();
  const { club } = useClub();
  const { profile } = useProfile();
  const [permissions, setPermissions] = useState(null);
  const [loadingAdminAccess, setLoadingAdminAccess] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id || !club?.id || !profile) {
      setPermissions(null);
      setLoadingAdminAccess(false);
      return;
    }

    setLoadingAdminAccess(true);
    try {
      const grant = await fetchClubAdminGrant(supabase, club.id, user.id);
      setPermissions(normalizeAdminPermissions(grant?.permissions));
    } catch (err) {
      console.warn("AdminAccessProvider", err);
      setPermissions(normalizeAdminPermissions(null));
    } finally {
      setLoadingAdminAccess(false);
    }
  }, [user?.id, club?.id, profile]);

  useEffect(() => {
    load();
  }, [load]);

  const value = useMemo(() => {
    const isFullAdmin = isFullProfileAdmin(profile);
    const hasAccess = hasAnyAdminAccess(profile, permissions);
    return {
      loadingAdminAccess,
      permissions,
      isFullAdmin,
      hasAnyAdminAccess: hasAccess,
      canManageAdminUsers: canManageAdminUsers(profile, permissions),
      hasPermission: (key) => hasAdminPermission(profile, permissions, key),
      refreshAdminAccess: load,
    };
  }, [loadingAdminAccess, permissions, profile, load]);

  return (
    <AdminAccessContext.Provider value={value}>
      {children}
    </AdminAccessContext.Provider>
  );
}
