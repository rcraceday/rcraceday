import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeftIcon } from "@heroicons/react/24/solid";
import Button from "@/components/ui/Button";
import { useTranslation } from "@/app/i18n/I18nContext";
import { settingsStyles as s } from "./settingsStyles";

export default function SettingsPage({ title, subtitle, showBack = true, children }) {
  const navigate = useNavigate();
  const { clubSlug } = useParams();
  const { t } = useTranslation();

  return (
    <div style={s.pageContainer}>
      <div style={s.pageContent}>
        <div style={showBack ? s.sectionHeaderWithActions : undefined}>
          <div style={s.sectionHeader}>
            <h1 style={s.sectionHeaderTitle}>{title}</h1>
            {subtitle ? <p style={s.sectionHeaderSubtitle}>{subtitle}</p> : null}
          </div>
          {showBack ? (
            <Button
              type="button"
              variant="primary"
              size="sm"
              className="!py-1 !px-3 !text-xs !rounded-sm flex items-center gap-1 shrink-0"
              onClick={() => navigate(`/${clubSlug}/app/settings`)}
            >
              <ArrowLeftIcon className="h-3 w-3" />
              {t("common.back")}
            </Button>
          ) : null}
        </div>
        {children}
      </div>
    </div>
  );
}
