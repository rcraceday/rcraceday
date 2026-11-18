// src/layouts/PublicLayout.jsx
import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { useClub } from "@/app/providers/ClubProvider";
import { normalizeResetPasswordLocation } from "@/app/lib/publicAuthRedirect";
import Footer from "@/components/ui/Footer";

export default function PublicLayout() {
  const { club } = useClub();

  useEffect(() => {
    if (/\/public\/reset-password\/+$/i.test(window.location.pathname)) {
      normalizeResetPasswordLocation();
    }
  }, []);

  return (
    <div
      className="app-layout"
      style={{
        width: "100%",
        minHeight: "100dvh",
        background: "white",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <main
        style={{
          width: "100%",
          flex: "1 1 auto",
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            width: "100%",
            flex: "1 1 auto",
            display: "flex",
            justifyContent: "center",
            paddingTop: "24px",
            paddingBottom: "24px",
            boxSizing: "border-box",
          }}
        >
          <div
            className="public-column"
            style={{
              width: "100%",
              maxWidth: "720px",
              marginLeft: "auto",
              marginRight: "auto",
              boxSizing: "border-box",
            }}
          >
            <Outlet context={{ club }} />
          </div>
        </div>
      </main>
      <Footer club={club} />
    </div>
  );
}