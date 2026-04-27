// src/app/routes/ProtectedAppRoute.jsx
import { Navigate, useParams } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider";
import { useClub } from "@/app/providers/ClubProvider";
import { userBelongsToClub } from "@/app/providers/ClubProvider";
import { useEffect, useState } from "react";

export default function ProtectedAppRoute({ children }) {
  const { user, loadingUser } = useAuth();
  const { club, loadingClub } = useClub();
  const { clubSlug } = useParams();

  const [allowed, setAllowed] = useState(null);

  useEffect(() => {
    async function checkAccess() {
      // Still loading user or club → wait
      if (loadingUser || loadingClub) return;

      // No user → not allowed
      if (!user) {
        setAllowed(false);
        return;
      }

      // Platform admin override
      const isPlatformAdmin =
        user?.user_metadata?.role === "platform_admin" ||
        user?.user_metadata?.roles?.includes("platform_admin") ||
        user?.user_metadata?.is_platform_admin === true;

      if (isPlatformAdmin) {
        setAllowed(true);
        return;
      }

      // Must belong to this club
      const belongs = await userBelongsToClub(user.id, club.id);

      setAllowed(belongs);
    }

    checkAccess();
  }, [user, club, loadingUser, loadingClub]);

  // Still checking
  if (allowed === null) {
    return (
      <div style={{ padding: "24px", textAlign: "center" }}>
        Checking access…
      </div>
    );
  }

  // Not allowed → redirect to login
  if (!allowed) {
    return <Navigate to={`/${clubSlug}/public/login`} replace />;
  }

  // Allowed → render app
  return children;
}
