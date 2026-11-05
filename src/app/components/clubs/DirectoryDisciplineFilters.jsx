import { useMemo } from "react";
import { useTranslation } from "@/app/i18n/I18nContext";
import FilterMultiDropdown from "@/components/ui/FilterMultiDropdown";
import { DISCIPLINE_TAG_GROUPS, groupDisciplineTags } from "@/app/lib/platformDisciplines";

export default function DirectoryDisciplineFilters({
  tags,
  selectedSlugs,
  onChangeSelectedSlugs,
}) {
  const { t } = useTranslation();
  const grouped = useMemo(() => groupDisciplineTags(tags), [tags]);

  if (!tags?.length) return null;

  function slugsForGroup(group) {
    const groupTags = grouped[group] || [];
    return selectedSlugs.filter((slug) => groupTags.some((tag) => tag.slug === slug));
  }

  function updateGroup(group, nextGroupSlugs) {
    const groupTagSet = new Set((grouped[group] || []).map((tag) => tag.slug));
    const kept = selectedSlugs.filter((slug) => !groupTagSet.has(slug));
    onChangeSelectedSlugs([...kept, ...nextGroupSlugs]);
  }

  return (
    <div style={styles.block}>
      <div style={styles.headerRow}>
        <span style={styles.label}>{t("clubSelect.disciplineFilter")}</span>
        {selectedSlugs?.length ? (
          <button
            type="button"
            style={styles.clearLink}
            onClick={() => onChangeSelectedSlugs([])}
          >
            {t("clubSelect.disciplineClear")}
          </button>
        ) : null}
      </div>

      {DISCIPLINE_TAG_GROUPS.map((group) => {
        const groupTags = grouped[group] || [];
        if (!groupTags.length) return null;
        const options = groupTags.map((tag) => ({ value: tag.slug, label: tag.label }));
        return (
          <div key={group} style={styles.row}>
            <span style={styles.groupLabel}>{t(`clubSelect.disciplineGroup.${group}`)}</span>
            <FilterMultiDropdown
              values={slugsForGroup(group)}
              onChange={(next) => updateGroup(group, next)}
              options={options}
              placeholder={t("clubSelect.disciplineAny")}
              ariaLabel={t(`clubSelect.disciplineGroup.${group}`)}
            />
          </div>
        );
      })}
    </div>
  );
}

const styles = {
  block: {
    marginBottom: 16,
    textAlign: "left",
    width: "100%",
  },
  headerRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 10,
  },
  label: {
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    color: "#e2e8f0",
  },
  clearLink: {
    fontSize: 12,
    fontWeight: 600,
    color: "#94a3b8",
    background: "none",
    border: "none",
    cursor: "pointer",
    textDecoration: "underline",
    padding: 0,
  },
  row: {
    marginBottom: 10,
  },
  groupLabel: {
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    color: "#e2e8f0",
    marginBottom: 6,
  },
};
