import React from "react";

export default function CalendarEventCard({ event, brand, onNavigate }) {
  const logoSrc = event.logo_preview_url ||
    (event.logourl?.startsWith("http")
      ? event.logourl
      : event.logourl
        ? `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/club-assets/${event.logourl}`
        : null);

  const handleClick = () => {
    if (onNavigate) onNavigate();
  };

  return (
    <div
      onClick={handleClick}
      style={{
        width: "100%",
        boxSizing: "border-box",
        padding: "3px",
        borderRadius: "12px",
        background: "white",
        border: `2px solid ${brand}`,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.06)",
        transition: "transform 0.15s ease",
      }}
    >
      {logoSrc ? (
        <div
          style={{
            width: "72px",
            height: "72px",
            padding: 0,
            borderRadius: "10px",
            background: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxSizing: "border-box",
            overflow: "hidden",
          }}
        >
          <img
            src={logoSrc}
            alt={event.name}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              borderRadius: "8px",
            }}
          />
        </div>
      ) : (
        <div
          style={{
            width: "72px",
            height: "72px",
            borderRadius: "10px",
            background: brand,
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: "13px",
            textAlign: "center",
            padding: 0,
            flexShrink: 0,
            boxSizing: "border-box",
            overflow: "hidden",
          }}
        >
          {event.name}
        </div>
      )}

      <div
        style={{
          fontSize: "14px",
          fontWeight: 700,
          color: "#222",
          lineHeight: 1.3,
        }}
      >
        {event.name}
      </div>
    </div>
  );
}
