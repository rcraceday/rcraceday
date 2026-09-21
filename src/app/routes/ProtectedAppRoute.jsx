import { Navigate, useLocation, useParams } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider";
import { useClub } from "@/app/providers/ClubProvider";
import { useMembership } from "@/app/providers/MembershipProvider";

export default function ProtectedAppRoute({ children }) {
  const { session, loadingUser } = useAuth();
  const { membership, loadingMembership } = useMembership();
  const { club, loadingClub } = useClub();
  const { clubSlug } = useParams();
  const location = useLocation();

  console.log("[ProtectedAppRoute]", {
    session,
    loadingUser,
    membership,
    loadingMembership,
    club,
    loadingClub,
    clubSlug,
  });

  // Wait for auth first
  if (loadingUser) {
    return (
      <div style={{ padding: "24px", textAlign: "center" }}>
        Checking access…
      </div>
    );
  }

  // No session -> login immediately
  if (!session?.user) {
    return <Navigate to={`/${clubSlug}/public/login`} replace />;
  }

  if (!session.user.email_confirmed_at) {
    return (
      <Navigate
        to={`/${clubSlug}/public/check-email?email=${encodeURIComponent(session.user.email || "")}`}
        state={{ from: location.pathname }}
        replace
      />
    );
  }

  // User is logged in, now wait for club/membership
  if (loadingClub || loadingMembership) {
    return (
      <div style={{ padding: "24px", textAlign: "center" }}>
        Checking access…
      </div>
    );
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