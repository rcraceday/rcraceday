import { useEffect, useState } from "react";
import { useTranslation } from "@/app/i18n/I18nContext";
import PwaInstallInstructions from "@/components/PwaInstallInstructions";
import {
  PWA_INSTALL_SNOOZE_MS,
  dismissInstallPromptPermanently,
  isAndroid,
  isInstallSnoozed,
  isIos,
  isStandalone,
  snoozeInstallPrompt,
} from "@/app/lib/pwaInstall";

export default function PwaInstallPrompt() {
  const { t } = useTranslation();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [mode, setMode] = useState(null);

  useEffect(() => {
    if (isStandalone() || isInstallSnoozed()) return;

    if (isIos()) {
      const timer = setTimeout(() => setMode("ios"), 800);
      return () => clearTimeout(timer);
    }

    const capturePrompt = (event) => {
      event?.preventDefault?.();
      const promptEvent = event || window.__pwaDeferredPrompt;
      if (!promptEvent) return;
      setDeferredPrompt(promptEvent);
      setMode("android");
    };

    if (window.__pwaDeferredPrompt) {
      capturePrompt(window.__pwaDeferredPrompt);
    }

    const onPrompt = (event) => capturePrompt(event);
    const onInstalled = () => {
      snoozeInstallPrompt(PWA_INSTALL_SNOOZE_MS * 24);
      setMode(null);
      setDeferredPrompt(null);
      window.__pwaDeferredPrompt = null;
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    let fallbackTimer;
    if (isAndroid()) {
      fallbackTimer = setTimeout(() => {
        setMode((current) => current || "android-manual");
      }, 5000);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      if (fallbackTimer) clearTimeout(fallbackTimer);
    };
  }, []);

  const dismissSnooze = () => {
    snoozeInstallPrompt();
    setMode(null);
    setDeferredPrompt(null);
  };

  const dismissForever = () => {
    dismissInstallPromptPermanently();
    setMode(null);
    setDeferredPrompt(null);
  };

  const install = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    window.__pwaDeferredPrompt = null;
    dismissSnooze();
  };

  if (!mode) return null;

  if (mode === "ios") {
    return (
      <div
        style={styles.overlay}
        role="dialog"
        aria-label={t("pwa.iosInstallAria")}
        onClick={dismissSnooze}
      >
        <div style={styles.sheet} onClick={(event) => event.stopPropagation()}>
          <strong style={styles.title}>{t("pwa.iosTitle")}</strong>
          <PwaInstallInstructions variant="ios" />
          <div style={styles.actionRow}>
            <button type="button" onClick={dismissSnooze} style={styles.dismiss}>
              {t("pwa.notNow")}
            </button>
            <button type="button" onClick={dismissForever} style={styles.never}>
              {t("pwa.dontRemindAgain")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.banner} role="dialog" aria-label={t("pwa.installAria")}>
      <div style={styles.bannerRow}>
        <div style={styles.copy}>
          <strong style={styles.title}>{t("pwa.installTitle")}</strong>
          <span style={styles.text}>
            {mode === "android-manual" ? t("pwa.androidManual") : t("pwa.installBody")}
          </span>
        </div>
        <div style={styles.actions}>
          {mode === "android" && (
            <button type="button" onClick={install} style={styles.install}>
              {t("pwa.install")}
            </button>
          )}
          <button type="button" onClick={dismissSnooze} style={styles.dismiss}>
            {t("pwa.notNow")}
          </button>
        </div>
      </div>
      <button type="button" onClick={dismissForever} style={styles.neverBanner}>
        {t("pwa.dontRemindAgain")}
      </button>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 9200,
    background: "rgba(0,0,0,0.45)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-end",
    alignItems: "center",
    padding: "16px",
    paddingBottom: "max(16px, env(safe-area-inset-bottom))",
  },
  sheet: {
    width: "100%",
    maxWidth: "480px",
    background: "#ffffff",
    borderRadius: "16px",
    padding: "20px 18px 16px",
    boxShadow: "0 12px 32px rgba(0,0,0,0.24)",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    textAlign: "left",
  },
  title: {
    fontSize: "15px",
    color: "#111",
  },
  banner: {
    position: "fixed",
    left: "16px",
    right: "16px",
    bottom: "max(16px, env(safe-area-inset-bottom))",
    margin: "0 auto",
    maxWidth: "480px",
    zIndex: 9200,
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    gap: "8px",
    padding: "12px 14px",
    background: "#ffffff",
    border: "1px solid rgba(0,0,0,0.15)",
    borderRadius: "12px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
  },
  bannerRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
  },
  copy: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    textAlign: "left",
  },
  text: {
    fontSize: "12px",
    color: "#555",
  },
  actions: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexShrink: 0,
  },
  install: {
    background: "#ce0202",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    padding: "10px 14px",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
  },
  dismiss: {
    background: "transparent",
    color: "#555",
    border: "none",
    padding: "8px 4px",
    fontSize: "13px",
    cursor: "pointer",
  },
  actionRow: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    alignItems: "stretch",
  },
  never: {
    background: "transparent",
    color: "#777",
    border: "none",
    padding: "8px 4px",
    fontSize: "12px",
    cursor: "pointer",
    textAlign: "center",
  },
  neverBanner: {
    background: "transparent",
    color: "#777",
    border: "none",
    padding: "2px 0 0",
    fontSize: "12px",
    cursor: "pointer",
    textAlign: "center",
    width: "100%",
  },
};