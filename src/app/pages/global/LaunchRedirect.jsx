import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider";
import { useTranslation } from "@/app/i18n/I18nContext";
import { resolvePrimaryClubSlug } from "@/app/lib/primaryClub";

export default function LaunchRedirect() {
  const navigate = useNavigate();
  const { user, loadingUser } = useAuth();
  const { t } = useTranslation();

  useEffect(() => {
    if (loadingUser) return;

    let cancelled = false;

    (async () => {
      const slug = await resolvePrimaryClubSlug({ userId: user?.id });
      if (cancelled) return;
      navigate(slug ? `/${slug}/app` : "/", { replace: true });
    })();

    return () => {
      cancelled = true;
    };
  }, [loadingUser, user?.id, navigate]);

  return (
    <div style={{ padding: 40, textAlign: "center", fontSize: 16, color: "#555" }}>
      {t("clubSelect.launching")}
    </div>
  );
}
