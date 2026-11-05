import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import CMSButton from "@cms/CMSButton";
import { cmsLayout } from "@cms/layout";
import { useTranslation } from "@/app/i18n/I18nContext";
import { useClub } from "@/app/providers/ClubProvider";
import {
  buildEventNominationShareContent,
  copyRichShareToClipboard,
  copyTextToClipboard,
  normalizeEventDisplayName,
} from "@/app/lib/eventShareCopy";

export default function EventShareLinkActions({
  event,
  compact = false,
  showHelp = true,
}) {
  const { t } = useTranslation();
  const { clubSlug } = useParams();
  const { club } = useClub();
  const [notice, setNotice] = useState("");

  const eventId = event?.id;
  const eventName = normalizeEventDisplayName(event);
  const share = useMemo(
    () =>
      eventId && clubSlug
        ? buildEventNominationShareContent({
            clubSlug,
            eventId,
            eventName,
            clubName: club?.name,
          })
        : null,
    [club?.name, clubSlug, eventId, eventName]
  );

  function flashNotice(messageKey) {
    setNotice(t(messageKey));
    window.setTimeout(() => setNotice(""), 2500);
  }

  async function handleCopyLink() {
    if (!share?.url) return;
    setNotice("");
    try {
      await copyTextToClipboard(share.url);
      flashNotice("admin.events.copiedShareLink");
    } catch {
      flashNotice("admin.events.copyShareLinkFailed");
    }
  }

  async function handleCopyMessage() {
    if (!share) return;
    setNotice("");
    try {
      await copyRichShareToClipboard({
        plain: share.plain,
        html: share.html,
      });
      flashNotice("admin.events.copiedShareMessage");
    } catch {
      flashNotice("admin.events.copyShareLinkFailed");
    }
  }

  if (!eventId) {
    return showHelp ? (
      <p style={{ margin: 0, fontSize: 12, color: "#6b7280" }}>
        {t("admin.events.saveEventForShareLink")}
      </p>
    ) : null;
  }

  if (!share?.url) return null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: cmsLayout.spacing.sm,
        width: compact ? "auto" : "100%",
      }}
    >
      {!compact && (
        <>
          <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>
            {t("admin.events.shareLinkTitle")}
          </p>
          {showHelp && (
            <p style={{ margin: 0, fontSize: 12, color: "#4b5563", lineHeight: 1.5 }}>
              {t("admin.events.shareLinkHelp")}
            </p>
          )}
          <div
            style={{
              padding: "10px 12px",
              borderRadius: 6,
              border: "1px solid #e5e7eb",
              background: "#f9fafb",
              fontSize: 13,
              color: "#111827",
              lineHeight: 1.45,
            }}
          >
            <div style={{ fontWeight: 600 }}>{share.headline}</div>
            <div
              style={{
                marginTop: 4,
                fontSize: 12,
                color: "#2563eb",
                wordBreak: "break-all",
              }}
            >
              {share.url}
            </div>
          </div>
        </>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <CMSButton type="button" onClick={handleCopyLink}>
          {t("admin.events.copyShareLink")}
        </CMSButton>
        <CMSButton type="button" onClick={handleCopyMessage}>
          {t("admin.events.copyShareMessage")}
        </CMSButton>
        {notice && (
          <span style={{ fontSize: 12, color: "#059669" }}>{notice}</span>
        )}
      </div>
    </div>
  );
}
