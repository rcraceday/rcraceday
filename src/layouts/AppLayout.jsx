// src/layouts/AppLayout.jsx

import { Outlet, Navigate, useParams, useLocation, useNavigate } from "react-router-dom";
import { useClub } from "@/app/providers/ClubProvider";
import { useAuth } from "@/app/providers/AuthProvider";
import { useProfile } from "@/app/providers/ProfileProvider";
import { useMembership } from "@/app/providers/MembershipProvider";
import useTheme from "@/app/providers/useTheme";
import {
  appReturnPathFromLocation,
  platformLoginPathForClub,
  welcomeDriversPath,
} from "@/app/lib/publicAuthRedirect";
import { useDrivers } from "@/app/providers/DriverProvider";

import Header from "@/components/ui/Header";
import Footer from "@/components/ui/Footer";
import MembershipBenefitsOverlay from "@/app/components/membership/MembershipBenefitsOverlay";
import {
  isMembershipAppRoute,
  isMembershipPitchDismissed,
} from "@/app/lib/membershipPitchDismissal";
import { useEffect, useRef, useState } from "react";

export default function AppLayout() {
  const { club } = useClub();
  const { user, loadingUser } = useAuth();
  const { loadingProfile } = useProfile();
  const { membership, loadingMembership } = useMembership();
  const { drivers, loadingDrivers } = useDrivers();
  const { clubSlug } = useParams();
  const { palette } = useTheme() || {};
  const location = useLocation();
  const navigate = useNavigate();

  const [membershipPitchOpen, setMembershipPitchOpen] = useState(false);
  const [membershipPitchReturnTo, setMembershipPitchReturnTo] = useState(null);
  const [membershipPitchMemberOnly, setMembershipPitchMemberOnly] = useState(false);

  const isAdminRoute = location.pathname.includes("/app/admin");
  const driverWelcomeRedirectRef = useRef("");

  useEffect(() => {
    if (isAdminRoute || loadingDrivers || !clubSlug) return;

    const slug = clubSlug.replace(/^\/+|\/+$/g, "");
    const path = location.pathname.replace(/\/+$/, "") || location.pathname;
    const driverOnboardingPrefix = `/${slug}/app/profile/drivers`;
    const welcomePath = welcomeDriversPath(slug, "");
    const isWelcomePath = path === welcomePath.replace(/\?.*$/, "");
    const allowWithoutDrivers =
      isWelcomePath ||
      path.startsWith(`${driverOnboardingPrefix}/setup`) ||
      path.startsWith(`${driverOnboardingPrefix}/add`) ||
      path === `/${slug}/app/settings/account` ||
      path === `/${slug}/app/settings/my-drivers`;

    if (allowWithoutDrivers) {
      driverWelcomeRedirectRef.current = "";
      return;
    }
    if (!Array.isArray(drivers) || drivers.length > 0) {
      driverWelcomeRedirectRef.current = "";
      return;
    }

    const returnTo = appReturnPathFromLocation(location, slug);
    const destination = welcomeDriversPath(slug, returnTo);
    if (driverWelcomeRedirectRef.current === destination) return;
    driverWelcomeRedirectRef.current = destination;
    navigate(destination, { replace: true });
  }, [
    isAdminRoute,
    loadingDrivers,
    clubSlug,
    location.pathname,
    location.search,
    drivers?.length,
    navigate,
    location,
  ]);

  useEffect(() => {
    if (loadingMembership || !membership || membership.isMember) {
      setMembershipPitchOpen(false);
      return;
    }
    if (isMembershipAppRoute(location.pathname)) {
      setMembershipPitchOpen(false);
      return;
    }

    const state = location.state || {};
    if (!state.membershipPitch) return;

    const dismissed = isMembershipPitchDismissed(club?.id, user?.id);
    if (dismissed && !state.memberOnlyAttempt) {
      navigate(location.pathname + location.search, { replace: true, state: {} });
      return;
    }

    setMembershipPitchReturnTo(state.membershipPitchReturnTo || null);
    setMembershipPitchMemberOnly(!!state.memberOnlyAttempt);
    setMembershipPitchOpen(true);
    navigate(location.pathname + location.search, { replace: true, state: {} });
  }, [
    loadingMembership,
    membership,
    club?.id,
    user?.id,
    location.pathname,
    location.search,
    location.state,
    navigate,
  ]);

  const loading =
    loadingUser ||
    loadingProfile ||
    loadingMembership ||
    !club;

  if (!loadingUser && club && !user) {
    const returnTo = appReturnPathFromLocation(location, clubSlug);
    return (
      <Navigate to={platformLoginPathForClub(clubSlug, returnTo)} replace />
    );
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

  // ⭐ WRAP ADMIN PAGES IN admin-root
  const Wrapper = isAdminRoute ? "div" : "div";
  const wrapperProps = isAdminRoute
    ? { className: "admin-root" }
    : {};

  return (
    <Wrapper
      {...wrapperProps}
      style={{
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: palette?.background || "#ffffff",
        color: palette?.text || "#111827",
      }}
    >
      <Header />

      <main
        style={{
          flex: 1,
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <div className="app-column">
          <Outlet context={{ club }} />
        </div>
      </main>

      <Footer club={club} />

      {!isAdminRoute && membership && !membership.isMember ? (
        <MembershipBenefitsOverlay
          open={membershipPitchOpen}
          onClose={() => setMembershipPitchOpen(false)}
          clubId={club?.id}
          userId={user?.id}
          brand={palette?.primary || "#00438a"}
          returnTo={membershipPitchReturnTo}
          memberOnlyAttempt={membershipPitchMemberOnly}
        />
      ) : null}
    </Wrapper>
  );
}
