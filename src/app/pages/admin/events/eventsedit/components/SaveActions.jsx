import CMSCard from "@cms/CMSCard";
import CMSButton from "@cms/CMSButton";

export default function SaveActions({
  isNew,
  saving,
  onSave,
  onCancel,
  onDelete,
}) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "12px",
        justifyContent: "flex-end",
      }}
    >
      {!isNew && (
        <CMSButton
          variant="danger"
          onClick={onDelete}
          disabled={saving}
        >
          Delete Event
        </CMSButton>
      )}

      <div style={{ flex: "1 1 auto" }} />

      <CMSButton
        variant="secondary"
        onClick={onCancel}
        disabled={saving}
      >
        Cancel
      </CMSButton>

      <CMSButton
        variant="primary"
        onClick={onSave}
        disabled={saving}
      >
        {saving ? "Saving…" : "Save Event"}
      </CMSButton>
    </div>
  );
}
