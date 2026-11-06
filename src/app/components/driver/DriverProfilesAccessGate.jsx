import { Navigate, useLocation, useParams } from "react-router-dom";
import { useMembership } from "@/app/providers/MembershipProvider";
import useDriverProfilesAccess from "@/app/hooks/useDriverProfilesAccess";

export default function DriverProfilesAccessGate({ children }) {
  const { clubSlug } = useParams();
  const location = useLocation();
  const { membership } = useMembership();
  const { allowed, loading } = useDriverProfilesAccess();

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-600" aria-live="polite">
        Loading…
      </div>
    );
  }

  if (!allowed) {
    const isVisitor = membership?.membership_type === "non_member";
    if (isVisitor) {
      const returnTo = `${location.pathname}${location.search || ""}`;
      return (
        <Navigate
          to={`/${clubSlug}/app`}
          replace
          state={{
            membershipPitch: true,
            memberOnlyAttempt: true,
            membershipPitchReturnTo: returnTo,
          }}
        />
      );
    }
    return <Navigate to={`/${clubSlug}/app/membership`} replace />;
  }

  return children;
}
