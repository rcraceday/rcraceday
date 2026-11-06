import { useEffect, useId, useMemo, useRef, useState } from "react";
import { InformationCircleIcon } from "@heroicons/react/24/outline";
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
import { reconcileClubAccess } from "@/app/lib/reconcileClubAccess";
import { platformAuthEmailRegistered } from "@/app/lib/platformAuthEmail";
import {
  consumeSkipRedirectPending,
  getSkipClubSelection,
  markSkipRedirectPending,
  peekSkipRedirectPending,
  setSkipClubSelection as persistSkipClubSelection,
} from "@/app/lib/platformHomePrefs";

import rcracedayLogo from "@/assets/rcraceday_logo.png";
import Footer from "@/components/ui/Footer";

const PLATFORM_BRAND = "#ce0202";

/** Home club first; remaining order unchanged (favorites placed after home via Set Favorite). */
function orderClubsForDisplay(clubs, homeSlug) {
  if (!clubs?.length) return [];
  const home = String(homeSlug || "").trim();
  if (!home) return [...clubs];
  const homeClub = clubs.find((c) => c.slug === home);
  if (!homeClub) return [...clubs];
  const rest = clubs.filter((c) => c.slug !== home);
  return [homeClub, ...rest];
}

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
  const [authErrorPromptSignup, setAuthErrorPromptSignup] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const [openMenuSlug, setOpenMenuSlug] = useState("");
  const [menuBusy, setMenuBusy] = useState(false);
  const [primaryClubSlug, setPrimaryClubSlug] = useState("");
  const [primaryClubResolved, setPrimaryClubResolved] = useState(false);
  const [skipClubSelection, setSkipClubSelection] = useState(() => getSkipClubSelection());
  const [skipClubInfoOpen, setSkipClubInfoOpen] = useState(false);
  const skipClubInfoWrapRef = useRef(null);
  const skipReconcileGenRef = useRef(0);
  const skipClubInfoPanelId = useId();

  const returnToParam = useMemo(() => searchParams.get("returnTo") ?? "", [searchParams]);
  const chooseClubParam = searchParams.get("choose") === "1";

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
        const home = await resolvePrimaryClubSlug({ userId: user.id });
        setFavoriteClubs(orderClubsForDisplay(cards, home));
        setLoadingClubs(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || !primaryClubSlug || favoriteClubs.length < 2) return;
    setFavoriteClubs((prev) => {
      const next = orderClubsForDisplay(prev, primaryClubSlug);
      const prevKey = prev.map((c) => c.slug).join("|");
      const nextKey = next.map((c) => c.slug).join("|");
      return prevKey === nextKey ? prev : next;
    });
  }, [primaryClubSlug, user?.id, favoriteClubs.length]);

  useEffect(() => {
    if (!user?.id) {
      setPrimaryClubSlug("");
      setPrimaryClubResolved(false);
      return;
    }
    setPrimaryClubResolved(false);
    let cancelled = false;
    (async () => {
      const slug = await resolvePrimaryClubSlug({ userId: user.id });
      if (!cancelled) {
        setPrimaryClubSlug(slug || "");
        setPrimaryClubResolved(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    if (loadingUser || !user) return;
    if (!returnToParam) return;
    const destination = sanitizePlatformReturnPath(returnToParam);
    if (!destination) return;
    setSearchParams({}, { replace: true });
    navigate(destination, { replace: true });
  }, [loadingUser, user, returnToParam, navigate, setSearchParams]);

  useEffect(() => {
    if (loadingUser || !user?.id) return;
    if (returnToParam || chooseClubParam) return;
    if (!primaryClubResolved) return;
    if (!getSkipClubSelection()) return;
    if (!peekSkipRedirectPending()) return;
    const slug = String(primaryClubSlug || "").trim();
    if (!slug) return;
    consumeSkipRedirectPending();

    const gen = ++skipReconcileGenRef.current;
    (async () => {
      const { data: clubRow, error } = await supabase
        .from("clubs")
        .select("id, slug, name")
        .eq("slug", slug)
        .maybeSingle();
      if (skipReconcileGenRef.current !== gen) return;
      if (error || !clubRow?.id) {
        persistSkipClubSelection(false);
        setSkipClubSelection(false);
        return;
      }
      await reconcileClubAccess({
        user,
        club: clubRow,
        clubSlug: slug,
        navigate,
        returnTo: "",
        skipMembershipClaim: true,
      });
    })();
  }, [loadingUser, user, returnToParam, chooseClubParam, navigate, primaryClubResolved, primaryClubSlug]);

  useEffect(() => {
    if (!skipClubInfoOpen) return undefined;

    function handlePointerDown(e) {
      const root = skipClubInfoWrapRef.current;
      if (root && !root.contains(e.target)) {
        setSkipClubInfoOpen(false);
      }
    }

    function handleKeyDown(e) {
      if (e.key === "Escape") setSkipClubInfoOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [skipClubInfoOpen]);

  useEffect(() => {
    if (!user?.id || loadingClubs || !primaryClubResolved) return;
    if (primaryClubSlug) return;
    if (!getSkipClubSelection()) return;
    setSkipClubSelection(false);
    persistSkipClubSelection(false);
  }, [user?.id, loadingClubs, primaryClubSlug, primaryClubResolved]);

  function showLogin() {
    setAuthMode("login");
    setAuthError("");
    setAuthErrorPromptSignup(false);
    setSearchParams({}, { replace: true });
  }

  function showSignup() {
    setAuthMode("signup");
    setAuthError("");
    setAuthErrorPromptSignup(false);
    setSearchParams({ signup: "1" }, { replace: true });
  }

  async function handlePlatformLogin(e) {
    e.preventDefault();
    setAuthError("");
    setAuthErrorPromptSignup(false);
    setAuthLoading(true);
    const cleanEmail = email.trim().toLowerCase();
    const { error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });
    if (error) {
      if (error.message.toLowerCase().includes("email not confirmed")) {
        setAuthLoading(false);
        setPendingEmail(cleanEmail);
        setAuthMode("checkEmail");
        return;
      }
      if (error.message.includes("Invalid login credentials")) {
        const registered = await platformAuthEmailRegistered(cleanEmail);
        setAuthLoading(false);
        if (registered === false) {
          setAuthError(t("auth.noAccountForEmail"));
          setAuthErrorPromptSignup(true);
          return;
        }
        setAuthError(t("auth.invalidCredentials"));
        return;
      }
      setAuthLoading(false);
      setAuthError(error.message);
      return;
    }
    if (getSkipClubSelection()) markSkipRedirectPending();
    setAuthLoading(false);
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
      return;
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
    const normalized = orderClubsForDisplay(orderedClubs, primaryClubSlug);
    const slugs = normalized.map((c) => c.slug).filter(Boolean);
    const result = await persistFavoriteClubSlugs({ userId: user?.id, slugs });
    if (result.ok) {
      setFavoriteClubs(normalized);
    }
    return result.ok;
  }

  async function handleMakeHomeClub(club) {
    if (!club?.slug || menuBusy) return;
    setMenuBusy(true);
    const slugs = favoriteClubs.map((c) => c.slug).filter(Boolean);
    const nextSlugs = [club.slug, ...slugs.filter((s) => s !== club.slug)];
    const cards = await fetchFavoriteClubCards(nextSlugs);
    const ordered = orderClubsForDisplay(cards, club.slug);
    await persistFavoriteClubSlugs({
      userId: user?.id,
      slugs: ordered.map((c) => c.slug).filter(Boolean),
    });
    await persistPrimaryClub({
      userId: user?.id,
      clubId: club.id,
      clubSlug: club.slug,
    });
    setFavoriteClubs(ordered);
    setPrimaryClubSlug(club.slug);
    setOpenMenuSlug("");
    setMenuBusy(false);
  }

  async function handleSetFavoriteClub(club) {
    if (!club?.slug || menuBusy) return;
    const home = String(primaryClubSlug || "").trim();
    if (!home || club.slug === home) return;

    setMenuBusy(true);
    const slugs = favoriteClubs.map((c) => c.slug).filter(Boolean);
    const without = slugs.filter((s) => s !== club.slug);
    if (!without.includes(home)) {
      setMenuBusy(false);
      return;
    }
    const tail = without.filter((s) => s !== home);
    const nextSlugs = [home, club.slug, ...tail];
    const cards = await fetchFavoriteClubCards(nextSlugs);
    await persistOrderFromClubs(cards);
    setOpenMenuSlug("");
    setMenuBusy(false);
  }

  async function handleMoveClub(index, direction) {
    if (menuBusy) return;
    const home = String(primaryClubSlug || "").trim();
    const homeIndex = home ? favoriteClubs.findIndex((c) => c.slug === home) : -1;
    if (homeIndex >= 0 && (index === homeIndex || (direction === "left" ? index - 1 : index + 1) === homeIndex)) {
      return;
    }
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
      setFavoriteClubs(orderClubsForDisplay(remaining, primaryClubSlug === club.slug ? "" : primaryClubSlug));
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

  const authErrorMessage =
    authError ? (
      <p className="public-auth-error">
        {authError}{" "}
        {authErrorPromptSignup ? (
          <button
            type="button"
            className="public-auth-link"
            onClick={showSignup}
            style={styles.textLinkButton}
          >
            {t("auth.signUp")}
          </button>
        ) : null}
      </p>
    ) : null;

  return (
    <div className="platform-home-page">
      <div className="platform-home-content">
        <header className="platform-home-hero">
          <img src={rcracedayLogo} alt={t("clubSelect.brandAlt")} className="public-brand-logo" />
          {!user || loadingUser ? (
            <>
              <h1 className="platform-home-hero-title">{t("clubSelect.welcome")}</h1>
              {!user && !loadingUser ? (
                <p className="platform-home-hero-lead">{t("platformHome.guestLead")}</p>
              ) : null}
            </>
          ) : (
            <h1 className="platform-home-hero-title">{t("clubSelect.welcome")}</h1>
          )}
        </header>

        {loadingUser ? (
          <p className="platform-home-loading">{t("loading.loading")}</p>
        ) : user ? (
          <div
            className={`platform-surface-card platform-home-signed-in-card${
              favoriteClubs.length > 1 ? " platform-home-signed-in-card--expanded" : ""
            }`}
          >
            <div className="platform-home-signed-in">
              <h2 className="platform-home-section-title">{t("platformHome.yourClubs")}</h2>
              {loadingClubs ? (
                <p className="platform-home-muted">{t("loading.loading")}</p>
              ) : favoriteClubs.length === 0 ? (
                <p className="platform-home-muted">{t("platformHome.noFavorites")}</p>
              ) : (
                <div className="platform-home-club-grid">
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
                        homeClubSlug={primaryClubSlug}
                        homeIndex={
                          primaryClubSlug
                            ? favoriteClubs.findIndex((c) => c.slug === primaryClubSlug)
                            : -1
                        }
                        isHomeClub={primaryClubSlug === club.slug}
                        busy={menuBusy}
                        open={openMenuSlug === club.slug}
                        onToggleOpen={(next) => setOpenMenuSlug(next ? club.slug : "")}
                        onMakeHomeClub={() => handleMakeHomeClub(club)}
                        onSetFavoriteClub={() => handleSetFavoriteClub(club)}
                        onMoveLeft={() => handleMoveClub(index, "left")}
                        onMoveRight={() => handleMoveClub(index, "right")}
                        onRemove={() => handleRemoveFromHome(club)}
                      />
                    </div>
                  ))}
                </div>
              )}
              {!loadingClubs && primaryClubSlug ? (
                <div ref={skipClubInfoWrapRef} className="platform-home-skip-club platform-home-skip-club--signed-in">
                  <div className="platform-home-skip-club-row">
                    <label htmlFor="platform-home-skip-club-input" className="platform-home-skip-club-label">
                      <input
                        id="platform-home-skip-club-input"
                        type="checkbox"
                        checked={skipClubSelection}
                        onChange={(e) => {
                          const next = e.target.checked;
                          setSkipClubSelection(next);
                          persistSkipClubSelection(next);
                        }}
                        aria-describedby="platform-home-skip-club-desc"
                      />
                      <span>{t("platformHome.skipClubSelectionShort")}</span>
                    </label>
                    <button
                      type="button"
                      className="platform-home-skip-info-btn"
                      aria-expanded={skipClubInfoOpen}
                      aria-controls={skipClubInfoPanelId}
                      aria-label={t("platformHome.skipClubSelectionInfoAriaLabel")}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSkipClubInfoOpen((open) => !open);
                      }}
                    >
                      <InformationCircleIcon className="platform-home-skip-info-icon" aria-hidden />
                    </button>
                  </div>
                  {skipClubInfoOpen ? (
                    <div
                      id={skipClubInfoPanelId}
                      className="platform-home-skip-info-panel"
                      role="region"
                      aria-label={t("platformHome.skipClubSelectionInfoAriaLabel")}
                    >
                      <p className="platform-home-skip-info-panel-text">{t("platformHome.skipClubSelectionInfoBody")}</p>
                      <p className="platform-home-skip-info-panel-text">
                        {t("platformHome.skipClubSelectionSetHomeHow", {
                          setHomeAction: t("platformHome.setAsHomeClub"),
                        })}
                      </p>
                      <p className="platform-home-skip-info-panel-text">
                        {t("platformHome.skipClubSelectionReturnHow")}
                      </p>
                    </div>
                  ) : null}
                  <p id="platform-home-skip-club-desc" className="platform-home-sr-only">
                    {t("platformHome.skipClubSelectionInfoBody")}{" "}
                    {t("platformHome.skipClubSelectionSetHomeHow", {
                      setHomeAction: t("platformHome.setAsHomeClub"),
                    })}{" "}
                    {t("platformHome.skipClubSelectionReturnHow")}
                  </p>
                </div>
              ) : null}
              <div className="platform-home-section-links">
                <div className="platform-home-action-stack">
                  <Button
                    type="button"
                    size="sm"
                    className="platform-home-action-btn"
                    onClick={() => navigate("/find-club")}
                  >
                    {t("platformHome.searchForClubs")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="platform-home-action-btn"
                    onClick={handleLogOut}
                  >
                    {t("platformHome.logOut")}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <section className="public-auth platform-home-guest-auth platform-surface-card">
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
                <div className="platform-home-signup-leads">
                  <p className="public-auth-lead">{t("platformHome.signUpLeadLine1")}</p>
                  <p className="public-auth-lead">{t("platformHome.signUpLeadLine2")}</p>
                </div>
                {authErrorMessage}
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
                {authErrorMessage}
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
    background: "#fff",
  },
  textLinkButton: {
    border: "none",
    background: "none",
    padding: 0,
    font: "inherit",
    cursor: "pointer",
  },
};
