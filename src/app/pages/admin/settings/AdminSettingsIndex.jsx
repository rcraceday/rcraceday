import { Link } from "react-router-dom";
import { ChevronRightIcon } from "@heroicons/react/24/solid";
import { cmsStyles } from "../cms/styles";

export default function AdminSettingsIndex() {
  const items = [
    { path: "club-info", title: "Club Info", desc: "General club details and identity" },
    { path: "branding", title: "Branding", desc: "Logos, colours, and visual identity" },
    { path: "system", title: "System Settings", desc: "Platform behaviour and defaults" },
    { path: "cms", title: "CMS Settings", desc: "Content and public site configuration" },
    { path: "users", title: "Users", desc: "Admins, roles, and permissions" },
    { path: "membership", title: "Membership", desc: "Plans, pricing, and renewals" },
    { path: "event-defaults", title: "Event Defaults", desc: "Default event configuration" },
    { path: "driver", title: "Driver Settings", desc: "Driver rules and configuration" },
    { path: "tracks-classes", title: "Tracks & Classes", desc: "Track layouts and race classes" },
  ];

  return (
    <div style={cmsStyles.pageContainer}>
      <div style={cmsStyles.pageContent}>

        {/* Inject responsive CSS */}
        <style>
          {`
            .settings-grid {
              display: grid;
              grid-template-columns: 1fr;
              row-gap: 12px;
              column-gap: 24px;
            }

            @media (min-width: 600px) {
              .settings-grid {
                grid-template-columns: 1fr 1fr;
              }
            }
          `}
        </style>

        {/* PAGE HEADER */}
        <div style={cmsStyles.sectionHeader}>
          <h1 style={cmsStyles.sectionHeaderTitle}>Admin Settings</h1>
          <p style={cmsStyles.sectionHeaderSubtitle}>
            Configure your club and platform behaviour.
          </p>
        </div>

        {/* RESPONSIVE GRID */}
        <div className="settings-grid">
          {items.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div
                style={{
                  backgroundColor: "#FFFFFF",
                  border: "1px solid #E5E7EB",
                  borderRadius: "6px",
                  padding: "14px 16px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "12px",
                  cursor: "pointer",
                }}
              >
                {/* TEXT BLOCK — FULL WIDTH */}
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: "16px",
                      fontWeight: 600,
                      color: "#111827",
                      lineHeight: "20px",
                    }}
                  >
                    {item.title}
                  </div>
                  <div
                    style={{
                      marginTop: "4px",
                      fontSize: "13px",
                      color: "#6B7280",
                      lineHeight: "18px",
                    }}
                  >
                    {item.desc}
                  </div>
                </div>

                {/* CHEVRON — ALIGNED WITH DESCRIPTION */}
                <ChevronRightIcon
                  style={{
                    width: "20px",
                    height: "20px",
                    color: "#DC2626",
                    flexShrink: 0,
                  }}
                />
              </div>
            </Link>
          ))}
        </div>

      </div>
    </div>
  );
}
