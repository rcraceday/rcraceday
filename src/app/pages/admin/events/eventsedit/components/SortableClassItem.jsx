import CMSInput from "@cms/CMSInput";
import CMSButton from "@cms/CMSButton";

export default function SortableClassItem({ value, onChange, onRemove }) {
  return (
    <div
      style={{
        display: "flex",
        gap: "12px",
        alignItems: "center",
        flexWrap: "wrap",
      }}
    >
      <div style={{ flex: "1 1 200px" }}>
        <CMSInput
          label="Class Name"
          value={value}
          onChange={onChange}
        />
      </div>

      <CMSButton
        variant="danger"
        onClick={onRemove}
      >
        Remove
      </CMSButton>
    </div>
  );
}
