import { useOutletContext } from "react-router-dom";
import Card from "@/components/ui/Card";
import { cmsStyles } from "../cms/styles";

export default function DriverSettings() {
  const { club } = useOutletContext();
  const brand = club?.theme?.hero?.backgroundColor || "#0A66C2";

  return (
    <div
      style={{
        width: "100%",
        backgroundColor: "#F5F5F5",
        color: "#111827",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
      }}
    >
      {/* PAGE CONTAINER — SAME AS AdminEvents */}
      <div
        style={{
          width: "100%",
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "20px 16px 32px",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          gap: "24px",
        }}
      >
        {/* HEADER */}
        <header
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "4px",
          }}
        >
          <h1
            style={{
              fontSize: "22px",
              fontWeight: 600,
              margin: 0,
            }}
          >
            Driver Settings
          </h1>

          <p
            style={{
              fontSize: "13px",
              color: "#6B7280",
              margin: 0,
            }}
          >
            Configure driver defaults, junior age rules, required fields, and visibility options.
          </p>
        </header>

        {/* CARD — USING cmsStyles + canonical Card */}
        <Card
          style={{
            ...cmsStyles.card,
            borderLeft: `4px solid ${brand}`,
          }}
        >
          <div style={cmsStyles.cardBody}>
            <DriverSettingsCard />
          </div>
        </Card>
      </div>
    </div>
  );
}
