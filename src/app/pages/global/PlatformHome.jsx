import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  platformConfirmEmailRedirectUrl,
  platformLoginPathForClub,
  publicClubAccessPath,
  sanitizePlatformReturnPath,
} from "@/app/lib/publicAuthRedirect";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/app/providers/AuthProvider";
import { useTranslation } from "@/app/i18n/I18nContext";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import FavoriteClubTileMenu from "@/app/components/clubs/FavoriteClubTileMenu";
import {
  fetchFavoriteClubCards,
  persistFavoriteClubSlugs,
  resolveFavoriteClubSlugs,
  toggleFavoriteClub,
} from "@/app/lib/favoriteClubs";
import {
  persistPrimaryClub,
  resolvePrimaryClubSlug,
  setPrimaryClubSlugInStorage,
} from "@/app/lib/primaryClub";
import { userBelongsToClub } from "@/app/providers/ClubProvider";

import rcracedayLogo from "@/assets/rcraceday_logo.png";
import vehiclesImage from "@/assets/RCRaceday_Vehicles_Image.png";
import Footer from "@/components/ui/Footer";

const PLATFORM_BRAND = "#ce0202";

export default function PlatformHome() {
  const { user, loadingUser } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [favoriteClubs, setFavoriteClubs] = useState([]);
  const [loadingClubs, setLoadingClubs] = useState(false);
  const [authMode, setAuthMode] = useState(
    searchParams.get("signup") === "1" ? "signup" : "login"
  );
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const [openMenuSlug, setOpenMenuSlug] = useState("");
  const [menuBusy, setMenuBusy] = useState(false);
  const [primaryClubSlug, setPrimaryClubSlug] = useState("");

  useEffect(() => {
    if (!user?.id) {
      setFavoriteClubs([]);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoadingClubs(true);
      const slugs = await resolveFavoriteClubSlugs({ userId: user.id });
      const cards = await fetchFavoriteClubCards(slugs);
      if (!cancelled) {
        setFavoriteClubs(cards);
        setLoadingClubs(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setPrimaryClubSlug("");
      return;
    }
    let cancelled = false;
    (async () => {
      const slug = await resolvePrimaryClubSlug({ userId: user.id });
      if (!cancelled) setPrimaryClubSlug(slug || "");
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    if (loadingUser || !user) return;
    const raw = searchParams.get("returnTo");
    if (!raw) return;
    const destination = sanitizePlatformReturnPath(raw);
    if (!destination) return;
    setSearchParams({}, { replace: true });
    navigate(destination, { replace: true });
  }, [loadingUser, user, searchParams, navigate, setSearchParams]);

  function showLogin() {
    setAuthMode("login");
    setAuthError("");
    setSearchParams({}, { replace: true });
  }

  function showSignup() {
    setAuthMode("signup");
    setAuthError("");
    setSearchParams({ signup: "1" }, { replace: true });
  }

  async function handlePlatformLogin(e) {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    setAuthLoading(false);
    if (error) {
      if (error.message.toLowerCase().includes("email not confirmed")) {
        setPendingEmail(email.trim().toLowerCase());
        setAuthMode("checkEmail");
        return;
      }
      if (error.message.includes("Invalid login credentials")) {
        setAuthError(t("auth.invalidCredentials"));
        return;
      }
      setAuthError(error.message);
    }
  }

  async function handlePlatformSignup(e) {
    e.preventDefault();
    setAuthError("");

    const name = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();
    if (!name) {
      setAuthError(t("signup.nameRequired"));
      return;
    }
    if (password.length < 6) {
      setAuthError(t("signup.passwordMinLength"));
      return;
    }
    if (password !== confirmPassword) {
      setAuthError(t("signup.passwordsMismatch"));
      return;
    }

    const parts = name.split(/\s+/);
    const firstName = parts[0];
    const lastName = parts.length > 1 ? parts.slice(1).join(" ") : firstName;

    setAuthLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        emailRedirectTo: platformConfirmEmailRedirectUrl(),
        data: {
          full_name: name,
          first_name: firstName,
          last_name: lastName,
          signup_type: "platform_signup",
        },
      },
    });
    setAuthLoading(false);

    if (error) {
      setAuthError(error.message);
      return;
    }

    if (!data.session) {
      setPendingEmail(cleanEmail);
      setAuthMode("checkEmail");
    }
  }

  async function openClub(club) {
    if (!club?.slug) return;
    if (!user) {
      navigate(platformLoginPathForClub(club.slug));
      return;
    }
    const belongs = await userBelongsToClub(user.id, club.id);
    navigate(
      belongs ? `/${club.slug}/app` : publicClubAccessPath(club.slug)
    );
  }

  async function persistOrderFromClubs(orderedClubs) {
    const slugs = orderedClubs.map((c) => c.slug).filter(Boolean);
    const result = await persistFavoriteClubSlugs({ userId: user?.id, slugs });
    if (result.ok) {
      setFavoriteClubs(orderedClubs);
    }
    return result.ok;
  }

  async function handleMakeHomeClub(club) {
    if (!club?.slug || menuBusy) return;
    setMenuBusy(true);
    const slugs = favoriteClubs.map((c) => c.slug).filter(Boolean);
    const nextSlugs = [club.slug, ...slugs.filter((s) => s !== club.slug)];
    const cards = await fetchFavoriteClubCards(nextSlugs);
    await persistFavoriteClubSlugs({ userId: user?.id, slugs: nextSlugs });
    await persistPrimaryClub({
      userId: user?.id,
      clubId: club.id,
      clubSlug: club.slug,
    });
    setFavoriteClubs(cards);
    setPrimaryClubSlug(club.slug);
    setOpenMenuSlug("");
    setMenuBusy(false);
  }

  async function handleMoveClub(index, direction) {
    if (menuBusy) return;
    const target = direction === "left" ? index - 1 : index + 1;
    if (target < 0 || target >= favoriteClubs.length) return;
    setMenuBusy(true);
    const next = [...favoriteClubs];
    [next[index], next[target]] = [next[target], next[index]];
    await persistOrderFromClubs(next);
    setOpenMenuSlug("");
    setMenuBusy(false);
  }

  async function handleRemoveFromHome(club) {
    if (!club?.slug || menuBusy) return;
    const ok = window.confirm(
      t("platformHome.confirmRemove", { name: club.name })
    );
    if (!ok) return;

    setMenuBusy(true);
    const slugs = favoriteClubs.map((c) => c.slug).filter(Boolean);
    const result = await toggleFavoriteClub({
      userId: user?.id,
      clubSlug: club.slug,
      currentSlugs: slugs,
    });
    if (result.ok) {
      const remaining = favoriteClubs.filter((c) => c.slug !== club.slug);
      setFavoriteClubs(remaining);
      if (primaryClubSlug === club.slug) {
        if (remaining[0]) {
          await persistPrimaryClub({
            userId: user?.id,
            clubId: remaining[0].id,
            clubSlug: remaining[0].slug,
          });
          setPrimaryClubSlug(remaining[0].slug);
        } else if (user?.id) {
          setPrimaryClubSlugInStorage("");
          setPrimaryClubSlug("");
          await supabase
            .from("profiles")
            .update({ primary_club_id: null })
            .eq("id", user.id);
        }
      }
    }
    setOpenMenuSlug("");
    setMenuBusy(false);
  }

  async function handleLogOut() {
    await supabase.auth.signOut();
  }

  return (
    <div style={styles.page}>
      <div style={styles.content}>
        <header style={styles.hero}>
          <img src={rcracedayLogo} alt={t("clubSelect.brandAlt")} style={styles.brandLogo} />
          <img src={vehiclesImage} alt="" style={styles.vehicles} />
          <h1 style={styles.welcome}>{t("clubSelect.welcome")}</h1>
          {!user ? <p style={styles.heroLead}>{t("platformHome.guestLead")}</p> : null}
        </header>

        {loadingUser ? (
          <p style={styles.muted}>{t("loading.loading")}</p>
        ) : user ? (
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>{t("platformHome.yourClubs")}</h2>
            {loadingClubs ? (
              <p style={styles.muted}>{t("loading.loading")}</p>
            ) : favoriteClubs.length === 0 ? (
              <p style={styles.muted}>{t("platformHome.noFavorites")}</p>
            ) : (
              <div style={styles.clubGrid}>
                {favoriteClubs.map((club, index) => (
                  <div key={club.id} style={styles.clubTileWrap}>
                    {primaryClubSlug === club.slug ? (
                      <span style={styles.homeClubBadge}>{t("platformHome.homeClubBadge")}</span>
                    ) : null}
                    <button
                      type="button"
                      style={styles.clubTile}
                      onClick={() => openClub(club)}
                      aria-label={club.name}
                    >
                      {club.logo_url ? (
                        <img src={club.logo_url} alt="" style={styles.clubLogoFull} />
                      ) : (
                        <span style={styles.clubNameInBorder}>{club.name}</span>
                      )}
                    </button>
                    <FavoriteClubTileMenu
                      club={club}
                      index={index}
                      total={favoriteClubs.length}
                      isHomeClub={primaryClubSlug === club.slug}
                      busy={menuBusy}
                      open={openMenuSlug === club.slug}
                      onToggleOpen={(next) => setOpenMenuSlug(next ? club.slug : "")}
                      onMakeHomeClub={() => handleMakeHomeClub(club)}
                      onMoveLeft={() => handleMoveClub(index, "left")}
                      onMoveRight={() => handleMoveClub(index, "right")}
                      onRemove={() => handleRemoveFromHome(club)}
                    />
                  </div>
                ))}
              </div>
            )}
            <div style={styles.sectionLinks}>
              <Button type="button" size="sm" onClick={() => navigate("/find-club")}>
                {t("platformHome.findClub")}
              </Button>
              <Button type="button" size="sm" variant="secondary" onClick={handleLogOut}>
                {t("platformHome.logOut")}
              </Button>
            </div>
          </section>
        ) : (
          <section className="public-auth" style={{ paddingTop: 0 }}>
            {authMode === "checkEmail" ? (
              <>
                <h2 className="public-auth-title">{t("auth.checkEmailTitle")}</h2>
                <p className="public-auth-lead">
                  {t("signup.checkEmailSentTo")}
                  <br />
                  <strong>{pendingEmail}</strong>
                </p>
                <p className="public-auth-lead">{t("platformHome.checkEmailLead")}</p>
                <p className="public-auth-footer">
                  {t("signup.alreadyConfirmed")}{" "}
                  <button type="button" className="public-auth-link" onClick={showLogin} style={styles.textLinkButton}>
                    {t("auth.logIn")}
                  </button>
                </p>
              </>
            ) : authMode === "signup" ? (
              <>
                <h2 className="public-auth-title">{t("auth.createAccount")}</h2>
                <p className="public-auth-lead">{t("platformHome.signUpLead")}</p>
                {authError ? <p className="public-auth-error">{authError}</p> : null}
                <form onSubmit={handlePlatformSignup} className="public-auth-form">
                  <Input
                    label={t("signup.fullName")}
                    name="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                  <Input
                    label={t("auth.email")}
                    name="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <Input
                    label={t("auth.password")}
                    name="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <Input
                    label={t("signup.confirmPassword")}
                    name="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                  <Button type="submit" variant="primary" disabled={authLoading}>
                    {authLoading ? t("auth.creatingAccount") : t("auth.signUp")}
                  </Button>
                </form>
                <p className="public-auth-footer">
                  {t("auth.alreadyHaveAccount")}{" "}
                  <button type="button" className="public-auth-link" onClick={showLogin} style={styles.textLinkButton}>
                    {t("auth.logIn")}
                  </button>
                </p>
              </>
            ) : (
              <>
                <h2 className="public-auth-title">{t("auth.logIn")}</h2>
                {authError ? <p className="public-auth-error">{authError}</p> : null}
                <form onSubmit={handlePlatformLogin} className="public-auth-form">
                  <Input
                    label={t("auth.email")}
                    name="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <Input
                    label={t("auth.password")}
                    name="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <Button type="submit" variant="primary" disabled={authLoading}>
                    {authLoading ? t("auth.loggingIn") : t("auth.logIn")}
                  </Button>
                </form>
                <p className="public-auth-footer">
                  {t("auth.noAccount")}{" "}
                  <button type="button" className="public-auth-link" onClick={showSignup} style={styles.textLinkButton}>
                    {t("auth.signUp")}
                  </button>
                </p>
                <div className="public-auth-aux">
                  <Link to="/forgot-email" className="public-auth-link">
                    {t("auth.forgotEmail")}
                  </Link>
                  <Link to="/forgot-password" className="public-auth-link">
                    {t("auth.forgotPassword")}
                  </Link>
                </div>
              </>
            )}
          </section>
        )}
      </div>
      <Footer />
    </div>
  );
}

const styles = {
  page: {
    width: "100%",
    minHeight: "100vh",
    background: "#ffffff",
    overflowX: "hidden",
    display: "flex",
    flexDirection: "column",
  },
  content: {
    flex: 1,
    width: "100%",
    maxWidth: 720,
    margin: "0 auto",
    padding: "20px 20px 24px",
    boxSizing: "border-box",
  },
  hero: {
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    marginBottom: 16,
  },
  brandLogo: {
    maxWidth: 96,
    width: "100%",
    height: "auto",
    marginBottom: 8,
  },
  vehicles: {
    width: "100%",
    maxWidth: 280,
    height: "auto",
    marginBottom: 10,
    opacity: 0.92,
  },
  welcome: {
    fontSize: "clamp(1.35rem, 3.5vw, 1.625rem)",
    fontWeight: 700,
    color: "#111827",
    margin: "0 0 8px",
    letterSpacing: "-0.02em",
  },
  heroLead: {
    margin: 0,
    fontSize: 15,
    color: "#64748b",
    lineHeight: 1.5,
    maxWidth: 400,
  },
  section: { textAlign: "center" },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: "#111827",
    margin: "0 0 16px",
  },
  clubGrid: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 20,
    width: "100%",
    margin: "0 auto 20px",
  },
  clubTileWrap: {
    position: "relative",
    width: 168,
    height: 168,
    maxWidth: "100%",
    flexShrink: 0,
  },
  homeClubBadge: {
    position: "absolute",
    left: "50%",
    bottom: 6,
    transform: "translateX(-50%)",
    zIndex: 1,
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    color: "#fff",
    background: PLATFORM_BRAND,
    padding: "2px 8px",
    borderRadius: 999,
    lineHeight: 1.2,
    pointerEvents: "none",
    whiteSpace: "nowrap",
  },
  clubTile: {
    width: "100%",
    height: "100%",
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
    border: "none",
    borderRadius: 12,
    background: "transparent",
    cursor: "pointer",
  },
  clubLogoFull: {
    boxSizing: "border-box",
    width: "100%",
    height: "100%",
    objectFit: "contain",
    display: "block",
    borderRadius: 12,
    border: "2px solid #d1d5db",
    padding: 8,
    background: "#fff",
  },
  clubNameInBorder: {
    boxSizing: "border-box",
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 12,
    border: "2px solid #d1d5db",
    fontSize: 14,
    fontWeight: 600,
    color: "#111827",
    lineHeight: 1.3,
    textAlign: "center",
    wordBreak: "break-word",
  },
  sectionLinks: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
  },
  muted: { fontSize: 14, color: "#64748b", textAlign: "center" },
  textLinkButton: {
    border: "none",
    background: "none",
    padding: 0,
    font: "inherit",
    cursor: "pointer",
  },
};
