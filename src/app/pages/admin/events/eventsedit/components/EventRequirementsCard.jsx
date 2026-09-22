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
  const [newDescriptor, setNewDescriptor] = useState("");

  const addRequirement = () => {
    const trimmedDescriptor = newDescriptor.trim();
    if (!trimmedDescriptor) return;

    onChange("club_requirements", [
      ...requirements,
      {
        id: crypto.randomUUID(),
        descriptor: trimmedDescriptor,
        items: [],
      },
    ]);

    setNewDescriptor("");
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

  const addItem = (id, itemValue) => {
    const item = itemValue.trim();
    if (!item) return;

    const updated = requirements.map((requirement) => {
      if (requirement.id !== id) return requirement;

      return {
        ...requirement,
        items: [...new Set([...(requirement.items || []), item])],
      };
    });

    onChange("club_requirements", updated);
  };

  const removeItem = (id, itemIndex) => {
    const updated = requirements.map((requirement) => {
      if (requirement.id !== id) return requirement;

      return {
        ...requirement,
        items: requirement.items.filter((_, index) => index !== itemIndex),
      };
    });

    onChange("club_requirements", updated);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ fontWeight: 700 }}>Club Requirements</div>

      {requirements.length === 0 && (
        <div style={{ padding: "8px 0", color: "#666" }}>No requirements configured.</div>
      )}

      {requirements.map((requirement) => (
        <RequirementRow
          key={requirement.id}
          requirement={requirement}
          onDescriptorChange={(value) => updateRequirement(requirement.id, "descriptor", value)}
          onAddItem={(value) => addItem(requirement.id, value)}
          onRemoveItem={(index) => removeItem(requirement.id, index)}
          onRemoveRequirement={() => removeRequirement(requirement.id)}
        />
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
          value={newDescriptor}
          placeholder="New requirement description"
          onChange={(event) => setNewDescriptor(event.target.value)}
        />
        <CMSButton onClick={addRequirement}>Add Requirements</CMSButton>
      </div>
    </div>
  );
}

function RequirementRow({
  requirement,
  onDescriptorChange,
  onAddItem,
  onRemoveItem,
  onRemoveRequirement,
}) {
  const [itemInput, setItemInput] = useState("");

  return (
    <div style={{ border: "1px solid #eee", borderRadius: 8, padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          style={{ flex: 1, padding: "6px 8px" }}
          value={requirement.descriptor}
          placeholder="Description"
          onChange={(event) => onDescriptorChange(event.target.value)}
        />
        <input
          style={{ flex: 1, padding: "6px 8px" }}
          value={itemInput}
          placeholder="Add item"
          onChange={(event) => setItemInput(event.target.value)}
        />
        <CMSButton
          onClick={() => {
            onAddItem(itemInput);
            setItemInput("");
          }}
        >
          Add Item
        </CMSButton>
        <CMSButton variant="danger" onClick={onRemoveRequirement}>
          Remove
        </CMSButton>
      </div>

      {requirement.items.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingLeft: 4 }}>
          {requirement.items.map((item, index) => (
            <div key={`${requirement.id}-${index}`} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ flex: 1 }}>{item}</span>
              <CMSButton variant="danger" onClick={() => onRemoveItem(index)}>
                Remove Item
              </CMSButton>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

