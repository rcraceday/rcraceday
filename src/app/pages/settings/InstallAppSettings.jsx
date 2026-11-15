import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "@/app/i18n/I18nContext";
import PwaInstallInstructions from "@/components/PwaInstallInstructions";
import {
  detectInstallPlatform,
  isAndroid,
  isStandalone,
  snoozeInstallPrompt,
} from "@/app/lib/pwaInstall";
import SettingsPage from "./SettingsPage";
import SettingsCard from "./SettingsCard";

export default function InstallAppSettings() {
  const { t } = useTranslation();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installing, setInstalling] = useState(false);
  const [installedNotice, setInstalledNotice] = useState(false);

  const platform = useMemo(() => detectInstallPlatform(), []);
  const standalone = useMemo(() => isStandalone(), []);

  const capturePrompt = useCallback((event) => {
    event?.preventDefault?.();
    const promptEvent = event || window.__pwaDeferredPrompt;
    if (!promptEvent) return;
    setDeferredPrompt(promptEvent);
    window.__pwaDeferredPrompt = promptEvent;
  }, []);

  useEffect(() => {
    if (window.__pwaDeferredPrompt) {
      capturePrompt(window.__pwaDeferredPrompt);
    }

    const onPrompt = (event) => capturePrompt(event);
    const onInstalled = () => {
      setDeferredPrompt(null);
      window.__pwaDeferredPrompt = null;
      setInstalledNotice(true);
      snoozeInstallPrompt();
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [capturePrompt]);

  const thisDeviceVariant = useMemo(() => {
    if (standalone || installedNotice) return "installed";
    if (platform === "ios") return "ios";
    if (platform === "android" && deferredPrompt) return "android";
    if (platform === "android") return "android-manual";
    return "other";
  }, [standalone, installedNotice, platform, deferredPrompt]);

  async function handleInstall() {
    if (!deferredPrompt) return;
    setInstalling(true);
    try {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
    } finally {
      window.__pwaDeferredPrompt = null;
      setDeferredPrompt(null);
      setInstalling(false);
      snoozeInstallPrompt();
    }
  }

  return (
    <SettingsPage
      title={t("settings.installApp.title")}
      subtitle={t("settings.installApp.subtitle")}
    >
      <SettingsCard
        title={t("settings.installApp.thisDeviceTitle")}
        hint={
          standalone || installedNotice
            ? t("settings.installApp.installedHint")
            : t("settings.installApp.thisDeviceHint")
        }
      >
        {thisDeviceVariant === "installed" ? (
          <p style={{ margin: 0, fontSize: 14, color: "#166534", fontWeight: 500 }}>
            {t("settings.installApp.installedBody")}
          </p>
        ) : (
          <PwaInstallInstructions
            variant={thisDeviceVariant}
            onInstall={deferredPrompt ? handleInstall : undefined}
            installing={installing}
          />
        )}
      </SettingsCard>

      <SettingsCard title={t("settings.installApp.iphoneTitle")} hint={t("settings.installApp.iphoneHint")}>
        <PwaInstallInstructions variant="ios" compact />
      </SettingsCard>

      <SettingsCard title={t("settings.installApp.androidTitle")} hint={t("settings.installApp.androidHint")}>
        <PwaInstallInstructions
          variant={isAndroid() && deferredPrompt ? "android" : "android-manual"}
          onInstall={isAndroid() && deferredPrompt ? handleInstall : undefined}
          installing={installing}
        />
        {isAndroid() && !deferredPrompt && !standalone ? (
          <p style={{ margin: "12px 0 0", fontSize: 13, color: "#6B7280" }}>
            {t("settings.installApp.androidNoPrompt")}
          </p>
        ) : null}
      </SettingsCard>

      {thisDeviceVariant !== "installed" && platform === "ios" ? (
        <p style={{ margin: 0, fontSize: 13, color: "#6B7280", lineHeight: 1.45 }}>
          {t("settings.installApp.iosSafariNote")}
        </p>
      ) : null}
    </SettingsPage>
  );
}