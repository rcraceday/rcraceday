// src/app/pages/global/ClubSelect.jsx

import { useNavigate } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider";

import rcracedayLogo from "@/assets/rcraceday_logo.png";
import chargersLogo from "@/assets/DriverPortalLogo_400x200.png";
import bgImage from "@/assets/ClubSelect_bg-01.jpg";

export default function ClubSelect() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleSelect = (clubSlug) => {
    if (!user) {
      navigate(`/${clubSlug}/public/login`);
      return;
    }

    navigate(`/${clubSlug}/app/`);
  };

  return (
    <div style={styles.page}>
      <div style={{ ...styles.bg, backgroundImage: `url(${bgImage})` }} />

      <div style={styles.content}>
        <img src={rcracedayLogo} alt="RC RaceDay" style={styles.brandLogo} />

        <h2 style={styles.welcome}>Welcome Driver</h2>
        <h1 style={styles.title}>Select Your Club</h1>

        <div style={styles.grid}>
          <div
            onClick={() => handleSelect("chargers-rc")}
            style={styles.card}
          >
            <img src={chargersLogo} alt="Chargers RC" style={styles.clubLogo} />
            <div style={styles.clubName}>Chargers RC</div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    position: "relative",
    width: "100%",
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    padding: "40px 0",
  },

  bg: {
    position: "absolute",
    top: 0,
    left: "50%",
    transform: "translateX(-50%)",
    width: "1024px",
    minHeight: "100vh",
    height: "100%",
    backgroundSize: "cover",
    backgroundPosition: "top center",
    backgroundRepeat: "no-repeat",
    zIndex: 1,
  },

  content: {
    position: "relative",
    zIndex: 2,
    width: "100%",
    maxWidth: "1024px",
    padding: "0 20px",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },

  brandLogo: {
    height: "90px",
    marginBottom: "40px",
  },

  welcome: {
    fontSize: "26px",
    fontWeight: "600",
    color: "#ad0000",
    marginBottom: "6px",
    textShadow: "none",
  },

  title: {
    fontSize: "22px",
    fontWeight: "600",
    marginBottom: "40px",
    color: "#333",
    textShadow: "none",
  },

  grid: {
    width: "100%",
    maxWidth: "320px",
    display: "flex",
    flexDirection: "column",
    gap: "24px",
  },

  card: {
    background: "rgba(255,255,255,0.55)",
    border: "1px solid rgba(255,255,255,0.35)",
    borderRadius: "12px",
    padding: "18px 16px",
    textDecoration: "none",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    boxShadow: "0 4px 12px rgba(0,0,0,0.20)",
    cursor: "pointer",
  },

  clubLogo: {
    height: "100px",
    marginBottom: "10px",
  },

  clubName: {
    fontSize: "18px",
    fontWeight: "500",
    color: "#333",
    textShadow: "none",
  },
};
