// src/main.jsx
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import "./index.css";

import AuthProvider from "@/app/providers/AuthProvider";
import AppProviders from "@/app/providers/AppProviders";
import RoutesFile from "@/app/routes";
import "uno.css";

function Root() {
  return (
    <BrowserRouter>
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

// ---------------------------------------------------------------------------
// SERVICE WORKER REGISTRATION
// ---------------------------------------------------------------------------
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").then((reg) => {
      reg.update(); // force update check on every load
    });
  });
}

// ---------------------------------------------------------------------------
// SERVICE WORKER UPDATE + AUTO-RELOAD
// ---------------------------------------------------------------------------
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistration().then((reg) => {
    if (!reg) return;

    reg.addEventListener("updatefound", () => {
      const newWorker = reg.installing;
      newWorker.addEventListener("statechange", () => {
        if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
          window.location.reload();
        }
      });
    });
  });
}
