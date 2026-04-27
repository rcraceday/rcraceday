import CMSInput from "@cms/CMSInput";
import CMSButton from "@cms/CMSButton";
import SortableClassItem from "./SortableClassItem";

export default function EventNominationsCard({
  event,
  onChange,
  onClassesChange,
}) {
  const addClass = () => {
    const updated = [...event.classes, ""];
    onClassesChange(updated);
  };

  const updateClass = (index, value) => {
    const updated = [...event.classes];
    updated[index] = value;
    onClassesChange(updated);
  };

  const removeClass = (index) => {
    const updated = event.classes.filter((_, i) => i !== index);
    onClassesChange(updated);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      
      {/* NOMINATIONS OPEN + CLOSE */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div style={{ flex: "1 1 200px" }}>
          <CMSInput
            label="Nominations Open"
            type="datetime-local"
            value={event.nominations_open || ""}
            onChange={(v) => onChange("nominations_open", v)}
          />
        </div>

        <div style={{ flex: "1 1 200px" }}>
          <CMSInput
            label="Nominations Close"
            type="datetime-local"
            value={event.nominations_close || ""}
            onChange={(v) => onChange("nominations_close", v)}
          />
        </div>
      </div>

      {/* CLASSES LIST */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <label
          style={{
            fontSize: "13px",
            fontWeight: 500,
          }}
        >
          Classes
        </label>

        {event.classes.map((cls, index) => (
          <SortableClassItem
            key={index}
            value={cls}
            onChange={(v) => updateClass(index, v)}
            onRemove={() => removeClass(index)}
          />
        ))}

        <CMSButton variant="secondary" onClick={addClass}>
          + Add Class
        </CMSButton>
      </div>

      {/* CLASS LIMIT */}
      <CMSInput
        label="Class Limit"
        type="number"
        value={event.class_limit}
        onChange={(v) => onChange("class_limit", v)}
      />
    </div>
  );
}
