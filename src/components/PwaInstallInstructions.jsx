import { useTranslation } from "@/app/i18n/I18nContext";
import Button from "@/components/ui/Button";

export function IosShareIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3v12" />
      <path d="M8 7l4-4 4 4" />
      <rect x="4" y="11" width="16" height="10" rx="2" />
    </svg>
  );
}

const stepListStyle = {
  margin: 0,
  padding: 0,
  listStyle: "none",
  display: "flex",
  flexDirection: "column",
  gap: "10px",
};

const stepStyle = {
  display: "flex",
  alignItems: "flex-start",
  gap: "12px",
  fontSize: "14px",
  color: "#222",
  lineHeight: 1.4,
};

const iconWrapStyle = {
  width: "36px",
  height: "36px",
  borderRadius: "10px",
  background: "#f3f4f6",
  color: "#111",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

export default function PwaInstallInstructions({
  variant,
  onInstall,
  installing = false,
  compact = false,
}) {
  const { t } = useTranslation();

  if (variant === "ios") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: compact ? 10 : 12 }}>
        {!compact && <p style={{ margin: 0, fontSize: 13, color: "#555", lineHeight: 1.45 }}>{t("pwa.iosLead")}</p>}
        <ol style={stepListStyle}>
          <li style={stepStyle}>
            <span style={iconWrapStyle}>
              <IosShareIcon />
            </span>
            <span>{t("pwa.iosStepShare")}</span>
          </li>
          <li style={stepStyle}>
            <span style={iconWrapStyle}>
              <strong style={{ fontSize: 18, lineHeight: 1 }}>+</strong>
            </span>
            <span>{t("pwa.iosStepAddHome")}</span>
          </li>
          <li style={stepStyle}>
            <span style={iconWrapStyle}>
              <strong style={{ fontSize: 18, lineHeight: 1 }}>✓</strong>
            </span>
            <span>{t("pwa.iosStepConfirm")}</span>
          </li>
        </ol>
      </div>
    );
  }

  if (variant === "android" || variant === "android-manual") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "flex-start" }}>
        <p style={{ margin: 0, fontSize: 14, color: "#374151", lineHeight: 1.5 }}>
          {variant === "android-manual" ? t("pwa.androidManual") : t("pwa.installBody")}
        </p>
        {variant === "android" && onInstall ? (
          <Button type="button" className="!text-sm" disabled={installing} onClick={onInstall}>
            {t("pwa.install")}
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <p style={{ margin: 0, fontSize: 14, color: "#374151", lineHeight: 1.5 }}>
      {t("settings.installApp.desktopHint")}
    </p>
  );
}