// src/layouts/AppLayout.jsx
import { Outlet, Navigate, useParams } from "react-router-dom";
import { useEffect } from "react";

import { useClub } from "@/app/providers/ClubProvider";
import { useAuth } from "@/app/providers/AuthProvider";
import { useProfile } from "@/app/providers/ProfileProvider";
import { useMembership } from "@/app/providers/MembershipProvider";
import { useTheme } from "@/app/providers/ThemeProvider";

import Header from "@/components/ui/Header";
import Footer from "@/components/ui/Footer";

export default function AppLayout() {
  const { club } = useClub();
  const { user, loadingUser } = useAuth();
  const { profile, loadingProfile } = useProfile();
  const { membership, loadingMembership } = useMembership();
  const { clubSlug } = useParams();
  const { palette } = useTheme() || {};

  // keep the same loading gate logic
  const loading =
    loadingUser ||
    loadingProfile ||
    loadingMembership ||
    !club;

  // redirect once club + user loading is done
  if (!loadingUser && club && !user) {
    return <Navigate to={`/${clubSlug}/public/login`} replace />;
  }

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          backgroundColor: palette?.background || "#ffffff",
          color: palette?.text || "#111827",
        }}
      >
        <div style={{ padding: "24px", textAlign: "center" }}>Loading…</div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: palette?.background || "#ffffff",
        color: palette?.text || "#111827",
      }}
    >
      {/* global header (what ClubLayout used to wrap) */}
      <Header club={club} />

      <main
        style={{
          flex: 1,
          width: "100%",
          display: "flex",
          justifyContent: "center",
          paddingTop: "24px",
          paddingBottom: "32px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "720px",
            marginLeft: "auto",
            marginRight: "auto",
            boxSizing: "border-box",
          }}
        >
          {/* pass club down like ClubLayout used to */}
          <Outlet context={{ club }} />
        </div>
      </main>

      {/* global footer (if you had one in ClubLayout) */}
      <Footer club={club} />
    </div>
  );
}
