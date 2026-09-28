import { useEffect, useState } from "react";

const SNOOZE_KEY = "pwa-install-snooze-until";
const SNOOZE_MS = 14 * 24 * 60 * 60 * 1000;

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

function isIos() {
  const ua = window.navigator.userAgent || "";
  const iPhone = /iphone|ipod/i.test(ua);
  const iPad =
    /ipad/i.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  return iPhone || iPad;
}

function isAndroid() {
  return /android/i.test(window.navigator.userAgent || "");
}

function isSnoozed() {
  const until = Number(localStorage.getItem(SNOOZE_KEY) || 0);
  return Date.now() < until;
}

function IosShareIcon() {
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

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [mode, setMode] = useState(null);

  useEffect(() => {
    if (isStandalone() || isSnoozed()) return;

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
      localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_MS * 24));
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

  const dismiss = () => {
    localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_MS));
    setMode(null);
    setDeferredPrompt(null);
  };

  const install = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    window.__pwaDeferredPrompt = null;
    dismiss();
  };

  if (!mode) return null;

  if (mode === "ios") {
    return (
      <div
        style={styles.overlay}
        role="dialog"
        aria-label="Add RC RaceDay to Home Screen"
        onClick={dismiss}
      >
        <div style={styles.sheet} onClick={(event) => event.stopPropagation()}>
          <strong style={styles.title}>Add RC RaceDay to your Home Screen</strong>
          <p style={styles.lead}>
            Safari does not show an Install button. Follow these steps:
          </p>
          <ol style={styles.steps}>
            <li style={styles.step}>
              <span style={styles.iconWrap}>
                <IosShareIcon />
              </span>
              <span>
                Tap the <strong>Share</strong> button (square with an arrow).
              </span>
            </li>
            <li style={styles.step}>
              <span style={styles.iconWrap}>
                <strong style={styles.plus}>+</strong>
              </span>
              <span>
                Scroll down and tap <strong>Add to Home Screen</strong>.
              </span>
            </li>
            <li style={styles.step}>
              <span style={styles.iconWrap}>
                <strong style={styles.plus}>✓</strong>
              </span>
              <span>
                Tap <strong>Add</strong> in the top-right corner.
              </span>
            </li>
          </ol>
          <button type="button" onClick={dismiss} style={styles.install}>
            Got it
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.banner} role="dialog" aria-label="Install RC RaceDay">
      <div style={styles.copy}>
        <strong style={styles.title}>Install RC RaceDay</strong>
        <span style={styles.text}>
          {mode === "android-manual"
            ? "Tap the browser menu (⋮), then Install app or Add to Home screen."
            : "Add the app to your home screen for quicker access."}
        </span>
      </div>
      <div style={styles.actions}>
        {mode === "android" && (
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
  lead: {
    margin: 0,
    fontSize: "13px",
    color: "#555",
    lineHeight: 1.45,
  },
  steps: {
    margin: 0,
    padding: 0,
    listStyle: "none",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  step: {
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
    fontSize: "14px",
    color: "#222",
    lineHeight: 1.4,
  },
  iconWrap: {
    width: "36px",
    height: "36px",
    borderRadius: "10px",
    background: "#f3f4f6",
    color: "#111",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  plus: {
    fontSize: "18px",
    lineHeight: 1,
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
    fontSize: "15px",
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
};
