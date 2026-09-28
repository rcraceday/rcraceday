// src/main.jsx
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import "./index.css";

import AuthProvider from "@/app/providers/AuthProvider";
import AppProviders from "@/app/providers/AppProviders";
import RoutesFile from "@/app/routes";
import PwaInstallPrompt from "@/components/PwaInstallPrompt";
import { registerSW } from "virtual:pwa-register";
import "uno.css";

function Root() {
  return (
    <BrowserRouter>
      <PwaInstallPrompt />
      <AuthProvider>
        <Routes>
          <Route element={<AppProviders />}>
            <Route path="/*" element={<RoutesFile />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<Root />);

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      updateSW?.(true);
    },
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;

      if (registration.waiting) {
        registration.waiting.postMessage({ type: "SKIP_WAITING" });
      }

      const checkForUpdate = () => registration.update();
      checkForUpdate();
      setInterval(checkForUpdate, 15 * 60 * 1000);

      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") checkForUpdate();
      });
      window.addEventListener("pageshow", checkForUpdate);

      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                key.startsWith("app-cache-") ||
                key === "html-pages"
            )
            .map((key) => caches.delete(key))
        )
      );
    },
  });
}
