import { Navigate, useLocation, useParams } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider";
import { useClub } from "@/app/providers/ClubProvider";
import { useMembership } from "@/app/providers/MembershipProvider";
import { useProfile } from "@/app/providers/ProfileProvider";
import { useAdminAccess } from "@/app/providers/AdminAccessProvider";

export default function ProtectedAppRoute({ children, admin = false }) {
  const { session, loadingUser } = useAuth();
  const { membership, loadingMembership } = useMembership();
  const { club, loadingClub } = useClub();
  const { profile, loadingProfile } = useProfile();
  const { hasAnyAdminAccess, loadingAdminAccess } = useAdminAccess();
  const { clubSlug } = useParams();
  const location = useLocation();

  if (loadingUser) {
    return (
      <div style={{ padding: "24px", textAlign: "center" }}>
        Checking access…
      </div>
    );
  }

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

  if (
    loadingClub ||
    loadingMembership ||
    (admin && (loadingProfile || loadingAdminAccess))
  ) {
    return (
      <div style={{ padding: "24px", textAlign: "center" }}>
        Checking access…
      </div>
    );
  }

  if (!membership) {
    return <Navigate to={`/${clubSlug}/public/login`} replace />;
  }

  if (!club?.id || membership.club_id !== club.id) {
    return <Navigate to={`/${clubSlug}/public/login`} replace />;
  }

  if (membership.status !== "active") {
    return <Navigate to={`/${clubSlug}/public/login`} replace />;
  }

  if (admin && !hasAnyAdminAccess) {
    return <Navigate to={`/${clubSlug}/app`} replace state={{ adminDenied: true }} />;
  }

  return children;
}
