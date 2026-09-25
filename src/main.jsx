// src/main.jsx
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import "./index.css";

import AuthProvider from "@/app/providers/AuthProvider";
import AppProviders from "@/app/providers/AppProviders";
import RoutesFile from "@/app/routes";
import PwaInstallPrompt from "@/components/PwaInstallPrompt";
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
  import("virtual:pwa-register").then(({ registerSW }) => {
    registerSW({
      immediate: true,
      onRegisteredSW(_swUrl, registration) {
        registration?.update();
        caches.keys().then((keys) =>
          Promise.all(
            keys
              .filter((key) => key.startsWith("app-cache-"))
              .map((key) => caches.delete(key))
          )
        );
      },
    });
  });
}
