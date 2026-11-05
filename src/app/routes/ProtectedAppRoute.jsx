import { Navigate, useLocation, useParams } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider";
import { useClub } from "@/app/providers/ClubProvider";
import { useMembership } from "@/app/providers/MembershipProvider";
import { useProfile } from "@/app/providers/ProfileProvider";
import { useAdminAccess } from "@/app/providers/AdminAccessProvider";
import {
  appReturnPathFromLocation,
  platformLoginPathForClub,
  publicCheckEmailPath,
  publicClaimMembershipPath,
} from "@/app/lib/publicAuthRedirect";

export default function ProtectedAppRoute({ children, admin = false }) {
  const { session, loadingUser } = useAuth();
  const { membership, loadingMembership } = useMembership();
  const { club, loadingClub } = useClub();
  const { profile, loadingProfile } = useProfile();
  const { hasAnyAdminAccess, loadingAdminAccess } = useAdminAccess();
  const { clubSlug } = useParams();
  const location = useLocation();
  const safeReturnTo = appReturnPathFromLocation(location, clubSlug);
  const loginTo = platformLoginPathForClub(clubSlug, safeReturnTo);

  if (loadingUser) {
    return (
      <div style={{ padding: "24px", textAlign: "center" }}>
        Checking access…
      </div>
    );
  }

  if (!session?.user) {
    return <Navigate to={loginTo} replace />;
  }

  if (!session.user.email_confirmed_at) {
    return (
      <Navigate
        to={publicCheckEmailPath(clubSlug, session.user.email || "", safeReturnTo)}
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

  if (
    !membership ||
    !club?.id ||
    membership.club_id !== club.id ||
    membership.status !== "active"
  ) {
    return (
      <Navigate to={publicClaimMembershipPath(clubSlug, safeReturnTo)} replace />
    );
  }

  if (admin && !hasAnyAdminAccess) {
    return <Navigate to={`/${clubSlug}/app`} replace state={{ adminDenied: true }} />;
  }

  return children;
}
