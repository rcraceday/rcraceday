import { useState } from "react";
import { useTranslation } from "@/app/i18n/I18nContext";
import { parseDirectoryProfile } from "@/app/lib/primaryClub";
import {
  formatDirectoryLocationLine,
  formatDistanceKm,
} from "@/app/lib/clubDirectoryGeo";
import { resolveDisciplineLabels } from "@/app/lib/platformDisciplines";
import Button from "@/components/ui/Button";

const PLATFORM_BRAND = "#ce0202";
function ContactRow({ href, label, external }) {
  if (!label) return null;
  const content = (
    <span style={{ fontSize: 14, color: "#1e40af", fontWeight: 500 }}>{label}</span>
  );
  return (
    <div style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb" }}>
      {href ? (
        <a
          href={href}
          target={external ? "_blank" : undefined}
          rel={external ? "noreferrer" : undefined}
          style={{ textDecoration: "none" }}
        >
          {content}
        </a>
      ) : (
        <span style={{ fontSize: 14, color: "#334155" }}>{label}</span>
      )}
    </div>
  );
}

function normalizeText(value) {
  return String(value || "").trim();
}

function isDuplicateLine(line, ...others) {
  const key = line.toLowerCase();
  return others.some((other) => other && other.toLowerCase() === key);
}

export default function ClubDirectoryDetail({
  club,
  primaryClubSlug,
  opening,
  onOpenClub,
  disciplineTagLookup,
  isFavorite = false,
  favoriteBusy = false,
  onToggleFavorite,
}) {
  const { t } = useTranslation();
  const [detailsOpen, setDetailsOpen] = useState(false);

  if (!club) {
    return <p style={styles.emptyHint}>{t("clubSelect.selectHint")}</p>;
  }

  const directory = parseDirectoryProfile(club.directory_profile);
  const description = normalizeText(club.description);
  const displayName = normalizeText(club.name);
  const acronym = normalizeText(club.short_name);
  const formalName = normalizeText(directory.formal_name);
  const isPrimary = primaryClubSlug && club.slug === primaryClubSlug;

  const showAcronym = acronym && !isDuplicateLine(acronym, displayName);
  const showFormalName =
    formalName && !isDuplicateLine(formalName, displayName, acronym);

  const locationLine = formatDirectoryLocationLine(directory.location);
  const distanceLine =
    club.directoryDistanceKm != null ? formatDistanceKm(club.directoryDistanceKm) : "";

  const disciplineLabels = resolveDisciplineLabels(
    directory.discipline_slugs,
    disciplineTagLookup || new Map()
  );

  const hasDetails =
    description ||
    directory.scales_offered.length > 0 ||
    directory.classes_offered ||
    disciplineLabels.length > 0 ||
    club.website ||
    club.contact_email ||
    club.phone;

  return (
    <div style={styles.panel}>
      <div
        style={{
          ...styles.header,
          paddingTop: isPrimary ? 18 : 16,
        }}
      >
        <div style={styles.headerMain}>
          {club.logo_url ? (
            <div style={styles.logoFrame}>
              <img src={club.logo_url} alt="" style={styles.logo} />
            </div>
          ) : (
            <div style={{ ...styles.logoFrame, background: "#fafafa" }} />
          )}
          <div style={styles.headerText}>
            <div
              style={{
                ...styles.titleRow,
                paddingRight: isPrimary ? 104 : 0,
              }}
            >
              <h2 style={styles.clubName}>{displayName}</h2>
              {isPrimary ? (
                <span style={styles.primaryBadge}>{t("clubSelect.primaryClubBadge")}</span>
              ) : null}
            </div>
            {showAcronym ? <p style={styles.acronym}>{acronym}</p> : null}
            {showFormalName ? <p style={styles.formalName}>{formalName}</p> : null}
            {directory.environments.length > 0 ? (
              <div style={styles.metaRow}>
                {directory.environments.map((env) => (
                  <span key={env} style={styles.envChip}>
                    {t(`clubSelect.environment.${env}`)}
                  </span>
                ))}
              </div>
            ) : null}
            {locationLine || distanceLine ? (
              <p style={styles.locationLine}>
                {[locationLine, distanceLine].filter(Boolean).join(" · ")}
              </p>
            ) : null}
            {disciplineLabels.length > 0 ? (
              <div style={{ ...styles.metaRow, marginTop: 10 }}>
                {disciplineLabels.map((label) => (
                  <span key={label} style={styles.discChip}>
                    {label}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {hasDetails ? (
          <button
            type="button"
            style={styles.detailsButton}
            aria-expanded={detailsOpen}
            onClick={() => setDetailsOpen((open) => !open)}
          >
            <span>{t("clubSelect.moreInformation")}</span>
          </button>
        ) : null}
      </div>

      {detailsOpen && hasDetails ? (
        <div style={styles.body}>
          {description ? (
            <section style={styles.section}>
              <h3 style={styles.sectionTitle}>{t("clubSelect.aboutClub")}</h3>
              <p style={styles.description}>{description}</p>
            </section>
          ) : null}

          {directory.scales_offered.length > 0 ? (
            <section style={styles.section}>
              <h3 style={styles.sectionTitle}>{t("clubSelect.scalesOffered")}</h3>
              <div style={styles.tagRow}>
                {directory.scales_offered.map((scale) => (
                  <span key={scale} style={styles.chip}>
                    {scale}
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          {directory.classes_offered ? (
            <section style={styles.section}>
              <h3 style={styles.sectionTitle}>{t("clubSelect.classesOffered")}</h3>
              <p style={styles.classesText}>{directory.classes_offered}</p>
            </section>
          ) : null}

          {disciplineLabels.length > 0 ? (
            <section style={styles.section}>
              <h3 style={styles.sectionTitle}>{t("clubSelect.disciplinesTagged")}</h3>
              <div style={styles.tagRow}>
                {disciplineLabels.map((label) => (
                  <span key={label} style={styles.chip}>
                    {label}
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          {(club.website || club.contact_email || club.phone) && (
            <section style={styles.section}>
              <h3 style={styles.sectionTitle}>{t("clubSelect.contact")}</h3>
              <div style={styles.contactGrid}>
                {club.website ? (
                  <ContactRow href={club.website} label={t("clubSelect.website")} external />
                ) : null}
                {club.contact_email ? (
                  <ContactRow href={`mailto:${club.contact_email}`} label={club.contact_email} />
                ) : null}
                {club.phone ? <ContactRow label={club.phone} /> : null}
              </div>
            </section>
          )}
        </div>
      ) : null}

      <div style={styles.actions}>
        {onToggleFavorite && !isFavorite ? (
          <Button
            type="button"
            variant="secondary"
            disabled={favoriteBusy}
            onClick={onToggleFavorite}
            style={{
              fontSize: "14px",
              padding: "8px 14px",
              borderRadius: "6px",
              color: "#111827",
              backgroundColor: "#f3f4f6",
              borderColor: "#d1d5db",
            }}
          >
            {t("clubSelect.addToHome")}
          </Button>
        ) : null}
        <Button
          type="button"
          disabled={opening}
          onClick={() => onOpenClub(club)}
          style={{
            backgroundColor: PLATFORM_BRAND,
            borderColor: PLATFORM_BRAND,
            color: "#ffffff",
            fontSize: "15px",
            padding: "8px 14px",
            borderRadius: "6px",
          }}
        >
          {opening ? t("clubSelect.opening") : t("clubSelect.openClub")}
        </Button>
      </div>
    </div>
  );
}

const styles = {
  emptyHint: {
    margin: "16px 0 0",
    fontSize: 13,
    lineHeight: 1.5,
    color: "#94a3b8",
    textAlign: "center",
  },
  panel: {
    marginTop: 20,
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box",
    borderRadius: 14,
    border: "1px solid #e5e7eb",
    background: "#ffffff",
    overflow: "hidden",
  },
  header: {
    padding: "16px 18px",
    background: "#ffffff",
  },
  headerMain: {
    display: "flex",
    gap: 14,
    alignItems: "flex-start",
  },
  logoFrame: {
    width: 64,
    height: 64,
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    background: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  logo: {
    width: 52,
    height: 52,
    objectFit: "contain",
  },
  headerText: {
    position: "relative",
    flex: 1,
    minWidth: 0,
    paddingTop: 2,
  },
  titleRow: {
    position: "relative",
    minHeight: 23,
  },
  clubName: {
    margin: 0,
    fontSize: 18,
    fontWeight: 700,
    color: "#111827",
    lineHeight: 1.25,
  },
  acronym: {
    margin: "6px 0 0",
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: "0.06em",
    color: "#64748b",
    textTransform: "uppercase",
  },
  formalName: {
    margin: "8px 0 0",
    fontSize: 14,
    color: "#475569",
    lineHeight: 1.45,
  },
  metaRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  envChip: {
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    padding: "3px 8px",
    borderRadius: 6,
    background: "#f3f4f6",
    color: "#475569",
    border: "1px solid #e5e7eb",
  },
  discChip: {
    fontSize: 12,
    fontWeight: 500,
    padding: "4px 10px",
    borderRadius: 6,
    background: "#f3f4f6",
    color: "#334155",
    border: "1px solid #e5e7eb",
  },
  locationLine: {
    margin: "8px 0 0",
    fontSize: 13,
    color: "#64748b",
    lineHeight: 1.4,
  },
  primaryBadge: {
    position: "absolute",
    right: 0,
    top: 2,
    fontSize: 9,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    color: "#fff",
    background: PLATFORM_BRAND,
    padding: "2px 6px",
    borderRadius: 6,
    lineHeight: 1.2,
    whiteSpace: "nowrap",
  },
  detailsButton: {
    marginTop: 14,
    width: "100%",
    padding: "9px 14px",
    fontSize: 14,
    fontWeight: 600,
    color: PLATFORM_BRAND,
    background: "#ffffff",
    border: `2px solid ${PLATFORM_BRAND}`,
    borderRadius: 8,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  body: {
    padding: "0 18px 8px",
    borderTop: "1px solid #e5e7eb",
  },
  section: {
    paddingTop: 16,
    paddingBottom: 4,
  },
  sectionTitle: {
    margin: "0 0 8px",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#64748b",
  },
  description: {
    margin: 0,
    fontSize: 14,
    lineHeight: 1.65,
    color: "#334155",
    whiteSpace: "pre-wrap",
  },
  tagRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    fontSize: 13,
    fontWeight: 500,
    padding: "6px 12px",
    borderRadius: 6,
    background: "#f3f4f6",
    color: "#111827",
    border: "1px solid #e5e7eb",
  },
  classesText: {
    margin: 0,
    fontSize: 14,
    lineHeight: 1.6,
    color: "#334155",
    whiteSpace: "pre-wrap",
  },
  contactGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 8,
  },
  actions: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "center",
    padding: "14px 18px 16px",
    borderTop: "1px solid #e5e7eb",
    background: "#ffffff",
  },
};
