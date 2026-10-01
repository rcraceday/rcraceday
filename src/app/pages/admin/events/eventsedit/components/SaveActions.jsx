import CMSButton from "@cms/CMSButton";
import { DeleteEventButton } from "@cms/CMSButtonSet";
import { cmsLayout } from "@cms/layout";
import { useTranslation } from "@/app/i18n/I18nContext";

export default function SaveActions({
  isNew,
  saving,
  onSave,
  onCancel,
  onDelete,
  saveLabel,
  deleteLabel,
}) {
  const { t } = useTranslation();
  const resolvedSaveLabel = saveLabel ?? t("cms.saveEvent");
  const resolvedDeleteLabel = deleteLabel ?? t("cms.deleteEvent");
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: cmsLayout.spacing.md,
        marginTop: cmsLayout.spacing.lg,
      }}
    >
      <div style={{ display: "flex", gap: cmsLayout.spacing.sm }}>
        {!isNew && (
          <DeleteEventButton onClick={onDelete} disabled={saving}>
            {resolvedDeleteLabel}
          </DeleteEventButton>
        )}
      </div>

      <div style={{ display: "flex", gap: cmsLayout.spacing.sm }}>
        <CMSButton variant="secondary" onClick={onCancel} disabled={saving}>
          {t("cms.cancel")}
        </CMSButton>
        <CMSButton variant="primary" onClick={onSave} disabled={saving}>
          {saving ? t("cms.saving") : resolvedSaveLabel}
        </CMSButton>
      </div>
    </div>
  );
}
