import { useMemo, useState } from "react";
import { useTranslation } from "@/app/i18n/I18nContext";
import CMSInput from "@cms/CMSInput";
import {
  DISCIPLINE_TAG_GROUPS,
  filterDisciplineTagsBySearch,
  groupDisciplineTags,
  toggleSlugInList,
} from "@/app/lib/platformDisciplines";

export default function DirectoryDisciplinePicker({
  tags,
  selectedSlugs,
  onChangeSelectedSlugs,
  suggestion,
  onChangeSuggestion,
}) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");

  const filteredTags = useMemo(
    () => filterDisciplineTagsBySearch(tags, search),
    [tags, search]
  );
  const grouped = useMemo(() => groupDisciplineTags(filteredTags), [filteredTags]);

  function toggle(slug) {
    onChangeSelectedSlugs(toggleSlugInList(selectedSlugs, slug));
  }

  if (!tags?.length) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#374151" }}>
        {t("admin.clubInfo.directoryDisciplinesTitle")}
      </p>
      <p style={{ margin: 0, fontSize: 12, color: "#6b7280", lineHeight: 1.45 }}>
        {t("admin.clubInfo.directoryDisciplinesHint")}
      </p>

      <CMSInput
        label={t("admin.clubInfo.directoryDisciplinesSearch")}
        name="directory_discipline_search"
        value={search}
        onChange={setSearch}
      />

      {DISCIPLINE_TAG_GROUPS.map((group) => {
        const groupTags = grouped[group] || [];
        if (!groupTags.length) return null;
        return (
          <div key={group}>
            <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 700, color: "#6b7280" }}>
              {t(`clubSelect.disciplineGroup.${group}`)}
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                gap: 8,
              }}
            >
              {groupTags.map((tag) => (
                <label
                  key={tag.slug}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 13,
                    padding: "6px 8px",
                    border: "1px solid #e5e7eb",
                    borderRadius: 6,
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedSlugs.includes(tag.slug)}
                    onChange={() => toggle(tag.slug)}
                  />
                  {tag.label}
                </label>
              ))}
            </div>
          </div>
        );
      })}

      <CMSInput
        label={t("admin.clubInfo.directoryDisciplineSuggestion")}
        name="directory_discipline_suggestion"
        type="textarea"
        value={suggestion}
        onChange={onChangeSuggestion}
      />
      <p style={{ margin: "-8px 0 0", fontSize: 12, color: "#6b7280" }}>
        {t("admin.clubInfo.directoryDisciplineSuggestionHint")}
      </p>
    </div>
  );
}
