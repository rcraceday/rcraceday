// src/app/pages/public/Welcome.jsx
import { useOutletContext, useParams, useNavigate } from "react-router-dom";
import Button from "@/components/ui/Button";

export default function Welcome() {
  const { club, loadingClub } = useOutletContext();
  const { clubSlug } = useParams();
  const navigate = useNavigate();

  const logoSrc =
    club?.logoUrl ||
    club?.logo ||
    club?.logo_url ||
    club?.theme?.hero?.logo ||
    club?.branding?.logo ||
    club?.assets?.logo ||
    null;

  if (loadingClub || !club) {
    return <div className="p-6 text-center">Loading…</div>;
  }

  return (
    <div className="px-6 py-4 max-w-sm mx-auto flex flex-col items-center text-center">
      {logoSrc && (
        <img
          src={logoSrc}
          alt={club.name}
          className="w-3/4 max-w-[300px] object-contain mb-6"
        />
      )}

      <div className="flex flex-col gap-4 w-full">
        <Button
          variant="primary"
          className="w-full py-3"
          onClick={() => navigate(`/${clubSlug}/public/login`)}
        >
          Log In
        </Button>

        <Button
          variant="secondary"
          className="w-full py-3"
          onClick={() => navigate(`/${clubSlug}/public/signup`)}
        >
          Create Account
        </Button>
      </div>
    </div>
  );
}
