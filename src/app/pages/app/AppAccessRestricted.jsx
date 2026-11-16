import { Link, useParams } from "react-router-dom";
import Card from "@/components/ui/Card";
import { useMembership } from "@/app/providers/MembershipProvider";
import { useTranslation } from "@/app/i18n/I18nContext";

export default function AppAccessRestricted() {
  const { clubSlug } = useParams();
  const { membership } = useMembership();
  const { t } = useTranslation();
  const note = (membership?.app_access_suspend_note || "").trim();

  return (
    <main className="app-page-main flex flex-col gap-6 max-w-lg mx-auto w-full">
      <Card className="p-6 sm:p-8 flex flex-col gap-4 text-center">
        <h1 className="text-lg font-semibold text-text m-0">
          {t("membershipUi.appAccessSuspendedTitle")}
        </h1>
        <p className="text-sm text-text-muted m-0">
          {t("membershipUi.appAccessSuspendedBody")}
        </p>
        {note ? (
          <p className="text-sm text-text m-0 border border-slate-200 rounded-lg p-3 bg-slate-50">
            {note}
          </p>
        ) : null}
        <Link
          to={`/${clubSlug}/public`}
          className="text-sm font-medium text-primary hover:underline"
        >
          {t("membershipUi.appAccessSuspendedPublicLink")}
        </Link>
      </Card>
    </main>
  );
}