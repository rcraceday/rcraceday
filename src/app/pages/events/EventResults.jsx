import { useParams } from "react-router-dom";
import { FlagIcon } from "@heroicons/react/24/solid";
import PageTitle from "@/components/ui/PageTitle";
import BackNavButton from "@/components/ui/BackNavButton";
import useTheme from "@/app/providers/useTheme";
import { useTranslation } from "@/app/i18n/I18nContext";
import EventResultsPanel from "@/app/pages/events/EventResultsPanel";

export default function EventResults({ previewUnpublished = false, adminBack = false }) {
  const { clubSlug, id } = useParams();
  const { palette } = useTheme();
  const { t } = useTranslation();

  return (
    <div className="space-y-4 pb-8">
      <PageTitle
        icon={FlagIcon}
        title={t("results.title")}
        style={{ color: palette.primary }}
        actions={
          adminBack ? (
            <BackNavButton
              to={`/${clubSlug}/app/admin/events/${id}/results`}
              label={t("results.backToImport")}
            />
          ) : (
            <BackNavButton />
          )
        }
      />

      <EventResultsPanel
        eventId={id}
        previewUnpublished={previewUnpublished}
        eventName={undefined}
      />
    </div>
  );
}