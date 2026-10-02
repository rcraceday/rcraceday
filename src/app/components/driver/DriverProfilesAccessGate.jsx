import { Navigate, useParams } from "react-router-dom";
import useDriverProfilesAccess from "@/app/hooks/useDriverProfilesAccess";

export default function DriverProfilesAccessGate({ children }) {
  const { clubSlug } = useParams();
  const { allowed, loading } = useDriverProfilesAccess();

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-600" aria-live="polite">
        Loading…
      </div>
    );
  }

  if (!allowed) {
    return <Navigate to={`/${clubSlug}/app/membership`} replace />;
  }

  return children;
}
