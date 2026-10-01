import CMSButton from "@cms/CMSButton";
import { cmsStyles } from "@cms/styles";
import { useTranslation } from "@/app/i18n/I18nContext";

export default function AssignmentsCard({
  tracks,
  classes,
  assignments,
  toggleAssignment,
}) {
  const { t } = useTranslation();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {tracks.length === 0 && (
        <div style={{ color: "#666", fontSize: "14px", textAlign: "center" }}>
          No tracks available.
        </div>
      )}

      {tracks.map((track) => (
        <div
          key={track.id}
          style={{
            paddingTop: "12px",
            borderTop: "1px solid #E5E7EB",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <div style={{ fontWeight: 600 }}>{track.name}</div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "8px",
              marginTop: "8px",
            }}
          >
            {classes.map((cls) => {
              const assigned =
                assignments[track.id]?.includes(cls.id) || false;

              return (
                <button
                  key={cls.id}
                  type="button"
                  onClick={() => toggleAssignment(track.id, cls.id)}
                  style={{
                    padding: "6px 10px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    cursor: "pointer",
                    backgroundColor: assigned ? "#2563EB" : "#E5E7EB",
                    color: assigned ? "#fff" : "#333",
                    border: "none",
                  }}
                >
                  {cls.name}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
