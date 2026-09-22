// src/app/pages/admin/events/eventsedit/components/EventRequirementsCard.jsx
import { useState } from "react";
import CMSButton from "@cms/CMSButton";

function normalizeRequirements(requirements = []) {
  if (!Array.isArray(requirements)) return [];

  return requirements
    .map((requirement, index) => {
      const descriptor = typeof requirement?.descriptor === "string" ? requirement.descriptor.trim() : "";
      const legacyItem = typeof requirement?.item === "string" ? requirement.item.trim() : "";
      const items = Array.isArray(requirement?.items)
        ? requirement.items.map((item) => String(item ?? "").trim()).filter(Boolean)
        : legacyItem
          ? [legacyItem]
          : [];

      return {
        id: requirement?.id || `requirement-${index}`,
        descriptor,
        items,
      };
    })
    .filter((requirement) => requirement.descriptor || requirement.items.length > 0);
}

function parseItems(value = "") {
  return String(value)
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function EventRequirementsCard({ event = {}, onChange = () => {} }) {
  const requirements = normalizeRequirements(event.club_requirements);
  const [descriptor, setDescriptor] = useState("");
  const [itemsInput, setItemsInput] = useState("");

  const addRequirement = () => {
    const trimmedDescriptor = descriptor.trim();
    const parsedItems = parseItems(itemsInput);

    if (!trimmedDescriptor || parsedItems.length === 0) return;

    const existing = requirements.find(
      (requirement) => requirement.descriptor.toLowerCase() === trimmedDescriptor.toLowerCase()
    );

    const updated = existing
      ? requirements.map((requirement) =>
          requirement.id === existing.id
            ? { ...requirement, items: [...new Set([...requirement.items, ...parsedItems])] }
            : requirement
        )
      : [
          ...requirements,
          {
            id: crypto.randomUUID(),
            descriptor: trimmedDescriptor,
            items: parsedItems,
          },
        ];

    onChange("club_requirements", updated);
    setDescriptor("");
    setItemsInput("");
  };

  const removeRequirement = (id) => {
    onChange(
      "club_requirements",
      requirements.filter((requirement) => requirement.id !== id)
    );
  };

  const updateRequirement = (id, field, value) => {
    const updated = requirements.map((requirement) => {
      if (requirement.id !== id) return requirement;

      if (field === "descriptor") {
        return { ...requirement, descriptor: value };
      }

      if (field === "items") {
        return { ...requirement, items: parseItems(value) };
      }

      return requirement;
    });

    onChange("club_requirements", updated);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ fontWeight: 700 }}>Club Requirements</div>
      <div style={{ color: "#666", fontSize: 13 }}>
        Optional items a driver/household may need to supply (e.g. Table & Chairs, Marquee, Lunch / Dinner). Drivers tick these on the nomination form.
      </div>

      {requirements.length === 0 && (
        <div style={{ padding: "8px 0", color: "#666" }}>No requirements configured.</div>
      )}

      {requirements.map((requirement) => (
        <div
          key={requirement.id}
          style={{ display: "flex", gap: 8, alignItems: "center" }}
        >
          <input
            style={{ flex: 1, padding: "6px 8px" }}
            value={requirement.descriptor}
            placeholder="Descriptor (e.g. Pit gear required (Interstate Only))"
            onChange={(event) => updateRequirement(requirement.id, "descriptor", event.target.value)}
          />
          <textarea
            rows={2}
            style={{ flex: 2, padding: "6px 8px", resize: "vertical" }}
            value={requirement.items.join(", ")}
            placeholder="Items (e.g. Table & Chairs, Marquee, Lunch / Dinner)"
            onChange={(event) => updateRequirement(requirement.id, "items", event.target.value)}
          />
          <CMSButton variant="danger" onClick={() => removeRequirement(requirement.id)}>
            Remove
          </CMSButton>
        </div>
      ))}

      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          borderTop: "1px solid #eee",
          paddingTop: 12,
        }}
      >
        <input
          style={{ flex: 1, padding: "6px 8px" }}
          value={descriptor}
          placeholder="Descriptor"
          onChange={(event) => setDescriptor(event.target.value)}
        />
        <textarea
          rows={2}
          style={{ flex: 2, padding: "6px 8px", resize: "vertical" }}
          value={itemsInput}
          placeholder="Items (comma or newline separated)"
          onChange={(event) => setItemsInput(event.target.value)}
        />
        <CMSButton onClick={addRequirement}>Add Requirement</CMSButton>
      </div>
    </div>
  );
}

