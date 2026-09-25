import { useEffect, useState } from "react";

const DISMISS_KEY = "pwa-install-dismissed";

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

function isIos() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (isStandalone() || localStorage.getItem(DISMISS_KEY) === "1") return;

    if (isIos()) {
      setIosHint(true);
      setVisible(true);
      return;
    }

    const onPrompt = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
      setVisible(true);
    };

    const onInstalled = () => {
      localStorage.setItem(DISMISS_KEY, "1");
      setVisible(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
    setDeferredPrompt(null);
  };

  const install = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    dismiss();
  };

  if (!visible) return null;

  return (
    <div style={styles.banner} role="dialog" aria-label="Install RC RaceDay">
      <div style={styles.copy}>
        <strong style={styles.title}>Install RC RaceDay</strong>
        <span style={styles.text}>
          {iosHint
            ? "Tap Share, then Add to Home Screen."
            : "Add the app to your home screen for quicker access."}
        </span>
      </div>
      <div style={styles.actions}>
        {!iosHint && (
          <button type="button" onClick={install} style={styles.install}>
            Install
          </button>
        )}
        <button type="button" onClick={dismiss} style={styles.dismiss}>
          Not now
        </button>
      </div>
    </div>
  );
}

const styles = {
  banner: {
    position: "fixed",
    left: "16px",
    right: "16px",
    bottom: "16px",
    margin: "0 auto",
    maxWidth: "480px",
    zIndex: 80,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    padding: "12px 14px",
    background: "#ffffff",
    border: "1px solid rgba(0,0,0,0.15)",
    borderRadius: "12px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
  },
  copy: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    textAlign: "left",
  },
  title: {
    fontSize: "14px",
    color: "#111",
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
    padding: "8px 12px",
    fontSize: "13px",
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
};
