// src/app/pages/global/ClubSelect.jsx

import { useNavigate } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider";
import { useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";

import { userBelongsToClub } from "@/app/providers/ClubProvider";

import rcracedayLogo from "@/assets/rcraceday_logo.png";
import vehiclesImage from "@/assets/RCRaceday_Vehicles_Image.png";

export default function ClubSelect() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [clubs, setClubs] = useState([]);

  useEffect(() => {
    const loadClubs = async () => {
      const { data, error } = await supabase
        .from("clubs")
        .select("id, slug, name, logo_url")
        .order("name", { ascending: true });

      if (!error && data) {
        setClubs(data);
      }
    };

    loadClubs();
  }, []);

  const handleSelect = async (clubSlug) => {
    const club = clubs.find((c) => c.slug === clubSlug);

    if (!club) return;

    // 1️⃣ Not logged in → go to login
    if (!user) {
      navigate(`/${clubSlug}/public/login`);
      return;
    }

    // 2️⃣ Logged in → check if user belongs to this club
    const belongs = await userBelongsToClub(user.id, club.id);

    if (belongs) {
      // 3️⃣ User belongs → enter the club app
      navigate(`/${clubSlug}/app/`);
    } else {
      // 4️⃣ User does NOT belong → force login for this club
      navigate(`/${clubSlug}/public/login`);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.content}>

        {/* Logo */}
        <img src={rcracedayLogo} alt="RC RaceDay" style={styles.brandLogo} />

        {/* Welcome Driver */}
        <h2 style={styles.welcome}>Welcome to RCRaceday</h2>

        {/* Club selection area */}
        <div style={styles.clubSection}>
          <h1 style={styles.title}>Select Your Club</h1>

          <div style={styles.grid}>
            {clubs.map((club) => (
              <div
                key={club.slug}
                onClick={() => handleSelect(club.slug)}
                style={styles.card}
              >
                {club.logo_url && (
                  <img
                    src={club.logo_url}
                    alt={club.name}
                    style={styles.clubLogo}
                  />
                )}
                <div style={styles.clubName}>{club.name}</div>
              </div>
            ))}
          </div>
        </div>

        <img
          src={vehiclesImage}
          alt="RC RaceDay Vehicles"
          style={styles.vehicles}
        />

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
    alignItems: "flex-start",
    padding: "40px 0",
    background: "#ffffff",
  },

  content: {
    width: "100%",
    maxWidth: "720px",
    padding: "20px",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    margin: "0 auto",
    borderRadius: "12px",
    border: "0px solid black",
    
  },

  brandLogo: {
    height: "90px",
    marginTop: "0px",
    marginBottom: "10px",
  },

  welcome: {
    fontSize: "26px",
    fontWeight: "600",
    color: "#ce0202",
    marginBottom: "40px",
  },

  clubSection: {
    width: "100%",
    maxWidth: "720px",
    backgroundColor: "#f7f7f7",
    padding: "10px 10px",
    borderRadius: "12px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    marginBottom: "10px",
  },

  title: {
    fontSize: "22px",
    fontWeight: "600",
    color: "black",
    marginBottom: "30px",
  },

  grid: {
    width: "100%",
    display: "grid",
    gap: "20px",
    justifyItems: "center",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    marginBottom: "20px",
  },

  card: {
    background: "white",
    border: "1px solid rgba(0,0,0,0.15)",
    borderRadius: "12px",
    padding: "14px 10px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    cursor: "pointer",
    width: "100%",
    maxWidth: "160px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.20)",
  },

  clubLogo: {
    height: "70px",
    marginBottom: "8px",
    objectFit: "contain",
  },

  clubName: {
    fontSize: "16px",
    fontWeight: "500",
    color: "#333",
  },

  vehicles: {
    marginTop: "20px",
    width: "100%",
    maxWidth: "500px",
    opacity: 0.95,
  },
};
