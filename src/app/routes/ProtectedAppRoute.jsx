// src/app/routes/ProtectedAppRoute.jsx
import { Navigate, useParams } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider";
import { useClub } from "@/app/providers/ClubProvider";
import { useMembership } from "@/app/providers/MembershipProvider";

export default function ProtectedAppRoute({ children }) {
  const { session, loadingUser } = useAuth();
  const { membership, loadingMembership } = useMembership();
  const { club, loadingClub } = useClub();
  const { clubSlug } = useParams();

  // ⭐ FIX: Wait for ALL providers to finish loading
  const loading = loadingUser || loadingMembership || loadingClub;

  if (loading) {
    return (
      <div style={{ padding: "24px", textAlign: "center" }}>
        Checking access…
      </div>
    );
  }

  // ⭐ FIX: Only redirect AFTER loading is complete
  if (!session?.user) {
    return <Navigate to={`/${clubSlug}/public/login`} replace />;
  }

  if (!membership) {
    return <Navigate to={`/${clubSlug}/public/login`} replace />;
  }

  if (membership.club_id !== club.id) {
    return <Navigate to={`/${clubSlug}/public/login`} replace />;
  }

  if (membership.status !== "active") {
    return <Navigate to={`/${clubSlug}/public/login`} replace />;
  }

  return children;
}
