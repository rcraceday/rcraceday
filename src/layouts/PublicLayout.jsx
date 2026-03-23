// src/layouts/PublicLayout.jsx
import { Outlet } from "react-router-dom";
import { useClub } from "@/app/providers/ClubProvider";

export default function PublicLayout() {
  const { club } = useClub();

  return (
    <main
      style={{
        width: "100%",
        minHeight: "100vh",
        background: "white",
        display: "flex",
        flexDirection: "column",
        flex: 1,
      }}
    >
      <div
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",        // ⭐ FIX: ensures proper centering on mobile
          paddingTop: "24px",
          paddingBottom: "24px",
          boxSizing: "border-box",
        }}
      >
        <div
          className="public-column"
          style={{
            width: "100%",
            maxWidth: "320px",
            marginLeft: "auto",
            marginRight: "auto",
            boxSizing: "border-box",
          }}
        >
          <Outlet context={{ club }} />
        </div>
      </div>
    </main>
  );
}
