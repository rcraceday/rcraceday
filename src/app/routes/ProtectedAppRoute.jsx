import { Navigate, useLocation, useParams } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider";
import { useClub } from "@/app/providers/ClubProvider";
import { useMembership } from "@/app/providers/MembershipProvider";
import { useProfile } from "@/app/providers/ProfileProvider";
import { useAdminAccess } from "@/app/providers/AdminAccessProvider";
import {
  appReturnPathFromLocation,
  isSafeClubAppReturnPath,
  publicCheckEmailPath,
  publicLoginPath,
} from "@/app/lib/publicAuthRedirect";

export default function ProtectedAppRoute({ children, admin = false }) {
  const { session, loadingUser } = useAuth();
  const { membership, loadingMembership } = useMembership();
  const { club, loadingClub } = useClub();
  const { profile, loadingProfile } = useProfile();
  const { hasAnyAdminAccess, loadingAdminAccess } = useAdminAccess();
  const { clubSlug } = useParams();
  const location = useLocation();
  const returnTo = appReturnPathFromLocation(location);
  const safeReturnTo = isSafeClubAppReturnPath(returnTo, clubSlug) ? returnTo : "";
  const loginTo = publicLoginPath(clubSlug, safeReturnTo);

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

  if (!membership) {
    return <Navigate to={loginTo} replace />;
  }

  if (!club?.id || membership.club_id !== club.id) {
    return <Navigate to={loginTo} replace />;
  }

  if (membership.status !== "active") {
    return <Navigate to={loginTo} replace />;
  }

  if (admin && !hasAnyAdminAccess) {
    return <Navigate to={`/${clubSlug}/app`} replace state={{ adminDenied: true }} />;
  }

  return children;
}
