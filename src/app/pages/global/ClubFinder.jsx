// src/app/pages/global/ClubFinder.jsx

import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/supabaseClient";

import { userBelongsToClub } from "@/app/providers/ClubProvider";
import {
  platformLoginPathForClub,
  publicClubAccessPath,
} from "@/app/lib/publicAuthRedirect";
import SearchableClubSelect from "@/components/SearchableClubSelect";
import ClubDirectoryDetail from "@/app/components/clubs/ClubDirectoryDetail";
import {
  getPrimaryClubSlugFromStorage,
  persistPrimaryClub,
  resolvePrimaryClubSlug,
  CLUB_ENVIRONMENT_IDS,
} from "@/app/lib/primaryClub";
import {
  DIRECTORY_RADIUS_OPTIONS_KM,
  filterClubsForDirectory,
  requestUserLocation,
} from "@/app/lib/clubDirectoryGeo";
import DirectoryDisciplineFilters from "@/app/components/clubs/DirectoryDisciplineFilters";
import {
  buildDisciplineTagLookup,
  clubMatchesDisciplineSlugs,
  fetchPlatformDisciplineTags,
} from "@/app/lib/platformDisciplines";
import FilterDropdown from "@/components/ui/FilterDropdown";
import {
  ensureClubInFavorites,
  resolveFavoriteClubSlugs,
  toggleFavoriteClub,
} from "@/app/lib/favoriteClubs";

import rcracedayLogo from "@/assets/rcraceday_logo.png";
import Footer from "@/components/ui/Footer";
import { useTranslation } from "@/app/i18n/I18nContext";

const CLUB_DIRECTORY_SELECT =
  "id, name, slug, logo_url, short_name, description, contact_email, website, phone, facebook, instagram, directory_profile, platform_subscribed";

const PLATFORM_BRAND = "#ce0202";
const FINDER_PANEL = "#43464c";
const FINDER_BORDER = "#64748b";

export default function ClubFinder() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();

  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedClubId, setSelectedClubId] = useState("");
  const [primaryClubSlug, setPrimaryClubSlug] = useState(() => getPrimaryClubSlugFromStorage());
  const [opening, setOpening] = useState(false);
  const [environmentFilter, setEnvironmentFilter] = useState("");
  const [nearMeEnabled, setNearMeEnabled] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoErrorKey, setGeoErrorKey] = useState("");
  const [radiusKm, setRadiusKm] = useState(50);
  const [disciplineTags, setDisciplineTags] = useState([]);
  const [disciplineFilterSlugs, setDisciplineFilterSlugs] = useState([]);
  const [favoriteSlugs, setFavoriteSlugs] = useState([]);
  const [favoriteBusy, setFavoriteBusy] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const environmentOptions = useMemo(
    () => [
      { value: "", label: t("clubSelect.environmentAll") },
      ...CLUB_ENVIRONMENT_IDS.map((id) => ({
        value: id,
        label: t(`clubSelect.environment.${id}`),
      })),
    ],
    [t]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const tags = await fetchPlatformDisciplineTags(supabase);
      if (!cancelled) setDisciplineTags(tags);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const disciplineTagLookup = useMemo(
    () => buildDisciplineTagLookup(disciplineTags),
    [disciplineTags]
  );

  useEffect(() => {
    async function loadClubs() {
      setLoading(true);
      setLoadError("");

      const { data, error } = await supabase
        .from("clubs")
        .select(CLUB_DIRECTORY_SELECT)
        .eq("platform_subscribed", true)
        .order("name");

      if (error) {
        console.warn("[ClubFinder] load clubs", error);
        setLoadError(error.message);
        setClubs([]);
      } else {
        setClubs(data || []);
      }

      setLoading(false);
    }

    loadClubs();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const slug = await resolvePrimaryClubSlug({ userId: user?.id });
      if (!cancelled && slug) {
        setPrimaryClubSlug(slug);
        const match = clubs.find((c) => c.slug === slug);
        if (match) setSelectedClubId(match.id);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, clubs]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const slugs = await resolveFavoriteClubSlugs({ userId: user?.id });
      if (!cancelled) setFavoriteSlugs(slugs);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const filteredClubs = useMemo(() => {
    let list = filterClubsForDirectory(clubs, {
      environmentId: environmentFilter,
      origin: nearMeEnabled ? userLocation : null,
      radiusKm: nearMeEnabled ? radiusKm : null,
    });
    if (disciplineFilterSlugs.length) {
      list = list.filter((club) => clubMatchesDisciplineSlugs(club, disciplineFilterSlugs));
    }
    return list;
  }, [
    clubs,
    environmentFilter,
    nearMeEnabled,
    userLocation,
    radiusKm,
    disciplineFilterSlugs,
  ]);

  useEffect(() => {
    if (!selectedClubId) return;
    if (filteredClubs.some((c) => c.id === selectedClubId)) return;
    setSelectedClubId("");
  }, [filteredClubs, selectedClubId]);

  const selectedClub = useMemo(
    () => filteredClubs.find((club) => club.id === selectedClubId) || null,
    [filteredClubs, selectedClubId]
  );

  async function handleUseMyLocation() {
    setGeoErrorKey("");
    setGeoLoading(true);
    try {
      const origin = await requestUserLocation();
      setUserLocation(origin);
      setNearMeEnabled(true);
    } catch (err) {
      setNearMeEnabled(false);
      setUserLocation(null);
      const code = err?.code;
      if (code === 1) setGeoErrorKey("clubSelect.geoDenied");
      else if (String(err?.message) === "unsupported") setGeoErrorKey("clubSelect.geoUnsupported");
      else setGeoErrorKey("clubSelect.geoFailed");
    } finally {
      setGeoLoading(false);
    }
  }

  function handleClearNearMe() {
    setNearMeEnabled(false);
    setUserLocation(null);
    setGeoErrorKey("");
  }

  const showGeoEmpty =
    !loading &&
    !loadError &&
    clubs.length > 0 &&
    nearMeEnabled &&
    userLocation &&
    filteredClubs.length === 0;

  const filtersHideAllClubs =
    !loading &&
    !loadError &&
    clubs.length > 0 &&
    filteredClubs.length === 0 &&
    (nearMeEnabled || environmentFilter || disciplineFilterSlugs.length);

  function resetFinderFilters() {
    setEnvironmentFilter("");
    setDisciplineFilterSlugs([]);
    handleClearNearMe();
  }

  const activeFilterCount =
    (environmentFilter ? 1 : 0) +
    disciplineFilterSlugs.length +
    (nearMeEnabled ? 1 : 0);

  async function navigateToClub(club) {
    if (!club?.slug) return;

    if (!user) {
      navigate(platformLoginPathForClub(club.slug));
      return;
    }

    const belongs = await userBelongsToClub(user.id, club.id);
    if (belongs) {
      navigate(`/${club.slug}/app/`);
      return;
    }

    navigate(publicClubAccessPath(club.slug));
  }

  async function handleOpenClub(club) {
    if (!club) return;
    setOpening(true);

    const result = await persistPrimaryClub({
      userId: user?.id,
      clubId: club.id,
      clubSlug: club.slug,
    });
    if (result.ok) {
      setPrimaryClubSlug(club.slug);
      const fav = await ensureClubInFavorites({
        userId: user?.id,
        clubSlug: club.slug,
        currentSlugs: favoriteSlugs,
      });
      if (fav.ok) setFavoriteSlugs(fav.slugs);
    }

    await navigateToClub(club);
    setOpening(false);
  }

  async function handleToggleFavorite(club) {
    if (!club?.slug) return;
    setFavoriteBusy(true);
    const result = await toggleFavoriteClub({
      userId: user?.id,
      clubSlug: club.slug,
      currentSlugs: favoriteSlugs,
    });
    if (result.ok) setFavoriteSlugs(result.slugs);
    setFavoriteBusy(false);
  }

  return (
    <div style={styles.page}>
      <div style={styles.content}>
        <header style={styles.topBar}>
          <Link to="/" style={styles.backLink}>
            ← {t("platformHome.backHome")}
          </Link>
          <img src={rcracedayLogo} alt={t("clubSelect.brandAlt")} className="public-brand-logo" />
        </header>

        <section style={styles.finderCard}>
          <div style={styles.finderHeader}>
            <h1 style={styles.title}>{t("clubSelect.title")}</h1>
            <p style={styles.subtitle}>{t("clubSelect.subtitle")}</p>
          </div>

          {loading ? (
            <p style={styles.status}>{t("loading.loading")}</p>
          ) : loadError ? (
            <p style={styles.error}>{t("clubSelect.loadError")}</p>
          ) : clubs.length === 0 ? (
            <p style={styles.status}>{t("clubSelect.noSubscribedClubs")}</p>
          ) : (
            <>
              <div style={styles.searchWrap}>
                <label style={styles.searchLabel} htmlFor="club-directory-search">
                  {t("clubSelect.searchLabel")}
                </label>
                <div id="club-directory-search">
                  <SearchableClubSelect
                    clubs={filteredClubs}
                    selectedClubId={selectedClubId}
                    onSelectClub={setSelectedClubId}
                    onSelectClubRecord={(club) => setSelectedClubId(club.id)}
                    contained
                    showDistance
                  />
                </div>
              </div>

              <div style={styles.filtersToggleRow}>
                <button
                  type="button"
                  style={styles.filtersToggle}
                  aria-expanded={filtersOpen}
                  onClick={() => setFiltersOpen((open) => !open)}
                >
                  {filtersOpen ? t("clubSelect.hideFilters") : t("clubSelect.showFilters")}
                  {!filtersOpen && activeFilterCount ? (
                    <span style={styles.filtersBadge}>
                      {t("clubSelect.filtersOn", { count: activeFilterCount })}
                    </span>
                  ) : null}
                </button>
              </div>

              {filtersOpen ? (
                <div style={styles.filtersPanel}>
                  <div style={styles.filterBlock}>
                    <span style={styles.filterLabel}>{t("clubSelect.environmentFilter")}</span>
                    <FilterDropdown
                      value={environmentFilter}
                      onChange={setEnvironmentFilter}
                      options={environmentOptions}
                      ariaLabel={t("clubSelect.environmentFilter")}
                      fullWidth
                    />
                  </div>

                  <DirectoryDisciplineFilters
                    tags={disciplineTags}
                    selectedSlugs={disciplineFilterSlugs}
                    onChangeSelectedSlugs={setDisciplineFilterSlugs}
                  />

                  <div style={styles.filterBlockLast}>
                    <span style={styles.filterLabel}>{t("clubSelect.geoFilter")}</span>
                    <div style={styles.geoRow}>
                      {!nearMeEnabled ? (
                        <button
                          type="button"
                          style={styles.geoButton}
                          disabled={geoLoading}
                          onClick={handleUseMyLocation}
                        >
                          {geoLoading ? t("clubSelect.geoLocating") : t("clubSelect.geoUseMyLocation")}
                        </button>
                      ) : (
                        <>
                          <label style={styles.radiusLabel}>
                            <span>{t("clubSelect.geoWithin")}</span>
                            <select
                              value={radiusKm}
                              onChange={(e) => setRadiusKm(Number(e.target.value))}
                              style={styles.radiusSelect}
                            >
                              {DIRECTORY_RADIUS_OPTIONS_KM.map((km) => (
                                <option key={km} value={km}>
                                  {t("clubSelect.geoRadiusKm", { km })}
                                </option>
                              ))}
                            </select>
                          </label>
                          <button type="button" style={styles.geoClear} onClick={handleClearNearMe}>
                            {t("clubSelect.geoClear")}
                          </button>
                        </>
                      )}
                    </div>
                    {geoErrorKey ? <p style={styles.geoError}>{t(geoErrorKey)}</p> : null}
                    {nearMeEnabled && userLocation ? (
                      <p style={styles.geoHint}>{t("clubSelect.geoActiveHint")}</p>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {showGeoEmpty ? (
                <p style={styles.status}>{t("clubSelect.geoNoClubsInRadius")}</p>
              ) : null}

              {filtersHideAllClubs ? (
                <button type="button" style={styles.resetFilters} onClick={resetFinderFilters}>
                  {t("clubSelect.resetFilters")}
                </button>
              ) : null}

              {!showGeoEmpty ? (
              <ClubDirectoryDetail
                key={selectedClub?.id || "no-club"}
                club={selectedClub}
                primaryClubSlug={primaryClubSlug}
                opening={opening}
                onOpenClub={handleOpenClub}
                disciplineTagLookup={disciplineTagLookup}
                isFavorite={selectedClub ? favoriteSlugs.includes(selectedClub.slug) : false}
                favoriteBusy={favoriteBusy}
                onToggleFavorite={() => selectedClub && handleToggleFavorite(selectedClub)}
              />
              ) : null}
            </>
          )}
        </section>

        <p style={styles.clubSignup}>{t("clubSelect.clubSignupPitch")}</p>
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
    maxWidth: 640,
    margin: "0 auto",
    padding: "20px 20px 24px",
    boxSizing: "border-box",
  },
  topBar: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 96,
    marginBottom: 16,
  },
  backLink: {
    position: "absolute",
    left: 0,
    top: "50%",
    transform: "translateY(-50%)",
    fontSize: 14,
    fontWeight: 600,
    color: "#475569",
    textDecoration: "none",
  },
  finderCard: {
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box",
    overflow: "hidden",
    background: "#2f3237",
    borderRadius: 16,
    border: "1px solid #43464c",
    padding: "24px 20px 20px",
  },
  finderHeader: {
    marginBottom: 20,
    textAlign: "center",
  },
  title: {
    fontSize: "clamp(1.5rem, 4vw, 1.875rem)",
    fontWeight: 700,
    color: "#f9fafb",
    margin: "0 0 8px",
    letterSpacing: "-0.02em",
  },
  subtitle: {
    fontSize: 13,
    color: "#cbd5e1",
    margin: 0,
    lineHeight: 1.5,
  },
  searchWrap: {
    width: "100%",
    minWidth: 0,
    maxWidth: "100%",
    marginBottom: 12,
  },
  filtersToggleRow: {
    display: "flex",
    justifyContent: "flex-start",
    marginBottom: 4,
  },
  filtersToggle: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    fontSize: 13,
    fontWeight: 600,
    padding: "6px 0",
    border: "none",
    background: "transparent",
    color: "#cbd5e1",
    cursor: "pointer",
    textDecoration: "underline",
  },
  filtersBadge: {
    textDecoration: "none",
    fontSize: 11,
    fontWeight: 700,
    padding: "2px 7px",
    borderRadius: 999,
    background: FINDER_PANEL,
    border: `1px solid ${FINDER_BORDER}`,
    color: "#f9fafb",
  },
  filtersPanel: {
    marginTop: 8,
    marginBottom: 8,
  },
  filterBlockLast: {
    marginBottom: 8,
    textAlign: "left",
  },
  searchLabel: {
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    color: "#e2e8f0",
    marginBottom: 6,
    textAlign: "left",
  },
  filterBlock: {
    marginBottom: 16,
    textAlign: "left",
  },
  filterLabel: {
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    color: "#e2e8f0",
    marginBottom: 8,
  },
  geoRow: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 10,
    width: "100%",
  },
  geoButton: {
    width: "100%",
    boxSizing: "border-box",
    fontSize: 14,
    fontWeight: 600,
    padding: "9px 14px",
    borderRadius: 8,
    border: `1px solid ${FINDER_BORDER}`,
    background: FINDER_PANEL,
    color: "#f9fafb",
    cursor: "pointer",
  },
  geoClear: {
    fontSize: 13,
    fontWeight: 600,
    padding: "6px 10px",
    borderRadius: 8,
    border: "none",
    background: "transparent",
    color: "#94a3b8",
    cursor: "pointer",
    textDecoration: "underline",
  },
  radiusLabel: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 13,
    color: "#e2e8f0",
  },
  radiusSelect: {
    fontSize: 13,
    padding: "6px 8px",
    borderRadius: 6,
    border: "1px solid #64748b",
    background: "#43464c",
    color: "#f9fafb",
  },
  geoHint: {
    margin: "8px 0 0",
    fontSize: 12,
    color: "#94a3b8",
    lineHeight: 1.45,
  },
  geoError: {
    margin: "8px 0 0",
    fontSize: 12,
    color: "#fca5a5",
    lineHeight: 1.45,
  },
  status: {
    fontSize: 14,
    color: "#94a3b8",
    textAlign: "center",
    padding: "12px 0",
  },
  error: {
    fontSize: 14,
    color: "#fca5a5",
    textAlign: "center",
  },
  clubSignup: {
    marginTop: 20,
    fontSize: 13,
    lineHeight: 1.55,
    color: "#64748b",
    textAlign: "center",
  },
  resetFilters: {
    display: "block",
    width: "100%",
    marginTop: 8,
    marginBottom: 4,
    boxSizing: "border-box",
    fontSize: 14,
    fontWeight: 600,
    padding: "9px 14px",
    borderRadius: 8,
    border: `1px solid ${FINDER_BORDER}`,
    background: FINDER_PANEL,
    color: "#f9fafb",
    cursor: "pointer",
  },
};
