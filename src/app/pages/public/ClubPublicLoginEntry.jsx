import { Navigate, useParams, useSearchParams } from "react-router-dom";
import Login from "@/app/pages/public/Login";
import {
  hasAuthCallbackInUrl,
  platformLoginPathForClub,
  returnToFromSearch,
  sanitizeClubAppReturnPath,
} from "@/app/lib/publicAuthRedirect";

/** Auth email callbacks use /:slug/public/login; everyone else signs in at /. */
export default function ClubPublicLoginEntry() {
  const { clubSlug } = useParams();
  const [searchParams] = useSearchParams();
  const safeReturnTo = sanitizeClubAppReturnPath(
    returnToFromSearch(searchParams),
    clubSlug
  );

  if (hasAuthCallbackInUrl()) {
    return <Login />;
  }

  return (
    <Navigate
      to={platformLoginPathForClub(clubSlug, safeReturnTo)}
      replace
    />
  );
}
