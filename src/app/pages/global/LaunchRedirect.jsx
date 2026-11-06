import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider";
import { useTranslation } from "@/app/i18n/I18nContext";
import { supabase } from "@/supabaseClient";
import { resolvePrimaryClubSlug } from "@/app/lib/primaryClub";
import { getSkipClubSelection, markSkipRedirectPending } from "@/app/lib/platformHomePrefs";
import { reconcileClubAccess } from "@/app/lib/reconcileClubAccess";

export default function LaunchRedirect() {
  const navigate = useNavigate();
  const { user, loadingUser } = useAuth();
  const { t } = useTranslation();
  const launchGenRef = useRef(0);

  useEffect(() => {
    if (loadingUser) return;

    const gen = ++launchGenRef.current;

    (async () => {
      if (!user?.id) {
        if (launchGenRef.current === gen) navigate("/", { replace: true });
        return;
      }
      if (!getSkipClubSelection()) {
        if (launchGenRef.current === gen) navigate("/?choose=1", { replace: true });
        return;
      }
      markSkipRedirectPending();
      const slug = await resolvePrimaryClubSlug({ userId: user.id });
      if (launchGenRef.current !== gen) return;
      if (!slug) {
        navigate("/", { replace: true });
        return;
      }
      const { data: clubRow, error } = await supabase
        .from("clubs")
        .select("id, slug, name")
        .eq("slug", slug)
        .maybeSingle();
      if (launchGenRef.current !== gen) return;
      if (error || !clubRow?.id) {
        navigate("/", { replace: true });
        return;
      }
      await reconcileClubAccess({
        user,
        club: clubRow,
        clubSlug: slug,
        navigate,
        returnTo: "",
        skipMembershipClaim: true,
      });
    })();
  }, [loadingUser, user?.id, navigate]);

  return (
    <div style={{ padding: 40, textAlign: "center", fontSize: 16, color: "#555" }}>
      {t("clubSelect.launching")}
    </div>
  );
}
