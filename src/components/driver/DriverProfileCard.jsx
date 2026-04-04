// src/components/driver/DriverProfileCard.jsx

import Input from "@/components/ui/Input";
import {
  UserCircleIcon,
  PhotoIcon,
} from "@heroicons/react/24/solid";

export default function DriverProfileCard(props) {
  const {
    driver,
    update,
    isMember,
    brand,
    navigate,
    club,
    primaryColor,
    secondaryColor,
    previewNumber,
    handleAvatarSelect,
    handleRemoveAvatar,
  } = props;

  if (!driver) return null;

  return (
    <div
      style={{
        border: `2px solid ${brand}`,
        borderRadius: "14px",
        overflow: "hidden",
        backgroundColor: "white",
      }}
    >
      {/* HEADER */}
      <div
        style={{
          backgroundColor: brand,
          color: "white",
          padding: "20px 24px",
          fontWeight: 600,
          fontSize: "1.1rem",
        }}
      >
        Full Driver Profile
      </div>

      {/* CONTENT */}
      <div style={{ padding: "24px" }}>

        {/* ------------------------------------------------------------
           AVATAR
        ------------------------------------------------------------ */}
        <div style={{ marginBottom: "32px" }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "16px",
            }}
          >
            {driver.avatar_url ? (
              <img
                src={driver.avatar_url}
                alt="Avatar"
                style={{
                  height: "128px",
                  width: "128px",
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: "2px solid #ddd",
                }}
              />
            ) : (
              <UserCircleIcon style={{ height: "128px", width: "128px", color: "#ccc" }} />
            )}

            {isMember && (
              <>
                <label
                  style={{
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontWeight: 500,
                    color: brand,
                  }}
                >
                  <PhotoIcon style={{ height: "20px", width: "20px" }} />
                  Change Photo
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={handleAvatarSelect}
                  />
                </label>

                {driver.avatar_url && (
                  <button
                    onClick={handleRemoveAvatar}
                    style={{
                      color: "red",
                      fontSize: "14px",
                      fontWeight: 500,
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    Remove Photo
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* ------------------------------------------------------------
           IDENTITY
        ------------------------------------------------------------ */}
        <div style={{ marginBottom: "32px" }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full min-w-0">

            <div className="min-w-0">
              <Input
                label="Nickname"
                value={driver.nickname || ""}
                onChange={(e) => update("nickname", e.target.value)}
              />
            </div>

            <div className="min-w-0">
              <Input
                label="Team Name"
                value={driver.team_name || ""}
                onChange={(e) => update("team_name", e.target.value)}
              />
            </div>

            <div className="min-w-0">
              <Input
                label="Home Track"
                value={driver.home_track || ""}
                onChange={(e) => update("home_track", e.target.value)}
              />
            </div>
          </div>

          {/* Permanent Number */}
          <div style={{ marginTop: "24px" }}>
            <label style={{ fontSize: "14px", fontWeight: 600 }}>Permanent Number</label>

            <div
              style={{
                marginTop: "8px",
                padding: "16px",
                border: "1px solid #ddd",
                borderRadius: "8px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "12px",
                minWidth: 0,
              }}
            >
              <span style={{ fontSize: "20px", fontWeight: 600 }}>
                {previewNumber || "None"}
              </span>

              {isMember && (
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      `/${club.slug}/app/profile/drivers/${driver.id}/choose-number`
                    )
                  }
                  style={{
                    backgroundColor: brand,
                    color: "white",
                    padding: "8px 16px",
                    borderRadius: "6px",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: 500,
                  }}
                >
                  Change Number
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------
           CAR COLOURS
        ------------------------------------------------------------ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 w-full min-w-0">

          {/* COLOUR PICKERS */}
          <div className="min-w-0" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: 600 }}>Car Colours</h3>

            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <label style={{ width: "120px", fontSize: "14px", fontWeight: 500 }}>
                Primary Colour
              </label>
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => update("primary_color", e.target.value)}
                disabled={!isMember}
                style={{
                  width: "48px",
                  height: "32px",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                }}
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <label style={{ width: "120px", fontSize: "14px", fontWeight: 500 }}>
                Secondary Colour
              </label>
              <input
                type="color"
                value={secondaryColor}
                onChange={(e) => update("secondary_color", e.target.value)}
                disabled={!isMember}
                style={{
                  width: "48px",
                  height: "32px",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                }}
              />
            </div>
          </div>

          {/* PREVIEW */}
          <div className="min-w-0" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: 600 }}>LiveTime Preview</h3>

            <div
              style={{
                width: "100px",
                height: "100px",
                backgroundColor: primaryColor,
                border: `4px solid ${secondaryColor}`,
                borderRadius: "12px",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  color: secondaryColor,
                  fontWeight: "bold",
                  fontSize: "36px",
                  lineHeight: 1,
                }}
              >
                {previewNumber}
              </span>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------
           ABOUT & SPONSORS
        ------------------------------------------------------------ */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: 600 }}>About</h3>

          <textarea
            value={driver.about || ""}
            onChange={(e) => update("about", e.target.value)}
            rows={4}
            disabled={!isMember}
            style={{
              width: "100%",
              boxSizing: "border-box",
              border: "1px solid #ccc",
              borderRadius: "6px",
              padding: "12px",
              fontSize: "14px",
              resize: "vertical",
            }}
          />

          <h3 style={{ fontSize: "14px", fontWeight: 600 }}>Sponsors</h3>

          <Input
            label="Sponsors (comma separated)"
            value={(driver.sponsors || []).join(", ")}
            onChange={(e) =>
              update(
                "sponsors",
                e.target.value.split(",").map((s) => s.trim())
              )
            }
            disabled={!isMember}
          />
        </div>
      </div>
    </div>
  );
}
