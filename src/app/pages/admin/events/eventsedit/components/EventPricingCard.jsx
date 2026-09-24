import React, { useRef } from "react";
import CMSCard from "@cms/CMSCard";
import CMSInput from "@cms/CMSInput";
import CMSToggle from "@cms/CMSToggle";
import { cmsLayout } from "@cms/layout";

const MEMBERSHIP_KEYS = [
  { key: "member", label: "Member Price" },
  { key: "non_member", label: "Non‑Member Price" },
  { key: "junior", label: "Junior Price" },
];

function priceCellValue(value) {
  return value == null || value === "" ? "" : String(value);
}

function parsePriceInput(raw) {
  if (raw === "" || raw == null) return null;
  return Math.max(0, Number(raw));
}

export default function EventPricingCard({ event, onChange }) {
  const pricing = event.pricing || {};
  const stashedGlobalRef = useRef(null);

  const mode = pricing.mode || "per_entry";

  const setMode = (newMode) => {
    onChange("pricing", { ...pricing, mode: newMode });
  };

  const update = (field, value) => {
    onChange("pricing", { ...pricing, [field]: value });
  };

  const updateNested = (section, field, value) => {
    onChange("pricing", {
      ...pricing,
      [section]: {
        ...(pricing[section] || {}),
        [field]: value,
      },
    });
  };

  const updateClassPrice = (classId, field, value) => {
    const cp = pricing.class_prices || {};
    const updated = {
      ...cp,
      [classId]: {
        ...(cp[classId] || {}),
        [field]: value,
      },
    };
    update("class_prices", updated);
  };

  const availableClasses = event.available_classes || [];

  const tierPracticeValue = (tier) =>
    tier?.practice == null || tier?.practice === "" ? "" : String(tier.practice);

  const setTierPractice = (tierKey, raw) => {
    const tier = pricing.tiered?.[tierKey] || {};
    const practice = parsePriceInput(raw);
    onChange("pricing", {
      ...pricing,
      tiered: {
        ...(pricing.tiered || {}),
        [tierKey]: { ...tier, practice },
      },
    });
  };

  const updateGlobalRacing = (membershipKey, raw) => {
    const global = pricing.global || {};
    onChange("pricing", {
      ...pricing,
      global: { ...global, [membershipKey]: parsePriceInput(raw) },
    });
  };

  const updateGlobalPractice = (membershipKey, raw) => {
    const global = pricing.global || {};
    const practice = { ...(global.practice || {}) };
    practice[membershipKey] = parsePriceInput(raw);
    onChange("pricing", {
      ...pricing,
      global: { ...global, practice },
    });
  };

  const setFreeEntry = (free) => {
    const global = pricing.global || {};
    if (free) {
      stashedGlobalRef.current = {
        member: global.member,
        non_member: global.non_member,
        junior: global.junior,
        practice: { ...(global.practice || {}) },
      };
      onChange("pricing", {
        ...pricing,
        global: {
          ...global,
          free: true,
          member: null,
          non_member: null,
          junior: null,
          practice: { member: null, non_member: null, junior: null },
        },
      });
      return;
    }

    const stashed = stashedGlobalRef.current || {};
    onChange("pricing", {
      ...pricing,
      global: {
        ...global,
        free: false,
        member: stashed.member ?? global.member ?? null,
        non_member: stashed.non_member ?? global.non_member ?? null,
        junior: stashed.junior ?? global.junior ?? null,
        practice: {
          member: stashed.practice?.member ?? global.practice?.member ?? null,
          non_member:
            stashed.practice?.non_member ?? global.practice?.non_member ?? null,
          junior: stashed.practice?.junior ?? global.practice?.junior ?? null,
        },
      },
    });
  };

  const updateClassPractice = (classId, membershipKey, raw) => {
    const cp = pricing.class_prices?.[classId] || {};
    const practice = { ...(cp.practice || {}) };
    practice[membershipKey] = parsePriceInput(raw);
    updateClassPrice(classId, "practice", practice);
  };

  const renderMembershipRow = ({ values, onChangeForKey, cleared }) => (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        flexWrap: "nowrap",
        gap: 8,
        alignItems: "flex-end",
        width: "100%",
      }}
    >
      {MEMBERSHIP_KEYS.map(({ key, label }) => (
        <div
          key={key}
          style={{
            flex: "1 1 0",
            minWidth: 72,
          }}
        >
          <CMSInput
            label={label}
            type="number"
            value={cleared ? "" : priceCellValue(values?.[key])}
            onChange={(v) => {
              if (cleared) return;
              onChangeForKey(key, v);
            }}
          />
        </div>
      ))}
    </div>
  );

  return (
    <CMSCard title="Pricing">
      <div style={{ display: "flex", flexDirection: "column", gap: cmsLayout.spacing.lg }}>

        {/* PRICING MODE SELECTOR */}
        <CMSCard title="Pricing Mode">
          <CMSToggle
            label="Per Entry Pricing"
            checked={mode === "per_entry"}
            onChange={() => setMode("per_entry")}
          />
          <CMSToggle
            label="Tiered Pricing"
            checked={mode === "tiered"}
            onChange={() => setMode("tiered")}
          />
          <CMSToggle
            label="Per‑Class Pricing"
            checked={mode === "per_class"}
            onChange={() => setMode("per_class")}
          />
        </CMSCard>

        {/* PER ENTRY PRICING */}
        {mode === "per_entry" && (
          <CMSCard title="Per Entry Pricing">
            <CMSToggle
              label="Free Entry"
              checked={pricing.global?.free || false}
              onChange={setFreeEntry}
            />

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <strong>Racing</strong>
              {renderMembershipRow({
                values: pricing.global,
                onChangeForKey: updateGlobalRacing,
                cleared: !!pricing.global?.free,
              })}
              <strong>Practice</strong>
              <div style={{ color: "#6B7280", fontSize: 12, marginTop: -4 }}>
                Leave blank for free practice entry.
              </div>
              {renderMembershipRow({
                values: pricing.global?.practice,
                onChangeForKey: updateGlobalPractice,
                cleared: !!pricing.global?.free,
              })}
            </div>

            <CMSToggle
              label="Charge for Preferences"
              checked={pricing.charge_preferences || false}
              onChange={(v) => update("charge_preferences", v)}
            />
          </CMSCard>
        )}

        {/* TIERED PRICING */}
        {mode === "tiered" && (
          <CMSCard title="Tiered Pricing">
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <strong>Member</strong>
              <div style={{ display: "flex", gap: 12 }}>
                <CMSInput
                  label="First Class"
                  type="number"
                  value={pricing.tiered?.member?.first_class || ""}
                  onChange={(v) =>
                    updateNested("tiered", "member", {
                      ...(pricing.tiered?.member || {}),
                      first_class: Math.max(0, Number(v)),
                    })
                  }
                />
                <CMSInput
                  label="Additional Classes"
                  type="number"
                  value={pricing.tiered?.member?.additional_class || ""}
                  onChange={(v) =>
                    updateNested("tiered", "member", {
                      ...(pricing.tiered?.member || {}),
                      additional_class: Math.max(0, Number(v)),
                    })
                  }
                />
                <CMSInput
                  label="Practice"
                  type="number"
                  placeholder="Free if empty"
                  value={tierPracticeValue(pricing.tiered?.member)}
                  onChange={(v) => setTierPractice("member", v)}
                />
              </div>

              <strong>Non‑Member</strong>
              <div style={{ display: "flex", gap: 12 }}>
                <CMSInput
                  label="First Class"
                  type="number"
                  value={pricing.tiered?.non_member?.first_class || ""}
                  onChange={(v) =>
                    updateNested("tiered", "non_member", {
                      ...(pricing.tiered?.non_member || {}),
                      first_class: Math.max(0, Number(v)),
                    })
                  }
                />
                <CMSInput
                  label="Additional Classes"
                  type="number"
                  value={pricing.tiered?.non_member?.additional_class || ""}
                  onChange={(v) =>
                    updateNested("tiered", "non_member", {
                      ...(pricing.tiered?.non_member || {}),
                      additional_class: Math.max(0, Number(v)),
                    })
                  }
                />
                <CMSInput
                  label="Practice"
                  type="number"
                  placeholder="Free if empty"
                  value={tierPracticeValue(pricing.tiered?.non_member)}
                  onChange={(v) => setTierPractice("non_member", v)}
                />
              </div>

              <strong>Junior</strong>
              <div style={{ display: "flex", gap: 12 }}>
                <CMSInput
                  label="First Class"
                  type="number"
                  value={pricing.tiered?.junior?.first_class || ""}
                  onChange={(v) =>
                    updateNested("tiered", "junior", {
                      ...(pricing.tiered?.junior || {}),
                      first_class: Math.max(0, Number(v)),
                    })
                  }
                />
                <CMSInput
                  label="Additional Classes"
                  type="number"
                  value={pricing.tiered?.junior?.additional_class || ""}
                  onChange={(v) =>
                    updateNested("tiered", "junior", {
                      ...(pricing.tiered?.junior || {}),
                      additional_class: Math.max(0, Number(v)),
                    })
                  }
                />
                <CMSInput
                  label="Practice"
                  type="number"
                  placeholder="Free if empty"
                  value={tierPracticeValue(pricing.tiered?.junior)}
                  onChange={(v) => setTierPractice("junior", v)}
                />
              </div>
            </div>

            <CMSToggle
              label="Charge for Preferences"
              checked={pricing.charge_preferences || false}
              onChange={(v) => update("charge_preferences", v)}
            />
          </CMSCard>
        )}

        {/* PER CLASS PRICING */}
        {mode === "per_class" && (
          <CMSCard title="Per‑Class Pricing Overrides">
            {availableClasses.length === 0 && (
              <div>No classes available for this event.</div>
            )}

            {availableClasses.map((cls) => {
              const cp = pricing.class_prices?.[cls.id] || {};
              return (
                <CMSCard key={cls.id} title={cls.name}>
                  <CMSToggle
                    label="Free for this class"
                    checked={cp.free || false}
                    onChange={(v) => updateClassPrice(cls.id, "free", v)}
                  />

                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <strong>Racing</strong>
                    {!cp.free &&
                      renderMembershipRow({
                        values: cp,
                        onChangeForKey: (key, raw) =>
                          updateClassPrice(cls.id, key, parsePriceInput(raw)),
                      })}
                    {cp.free && (
                      <div style={{ color: "#6B7280", fontSize: 13 }}>
                        Racing is free for this class.
                      </div>
                    )}
                    <strong>Practice</strong>
                    <div style={{ color: "#6B7280", fontSize: 12, marginTop: -4 }}>
                      Leave blank for free practice in this class.
                    </div>
                    {renderMembershipRow({
                      values: cp.practice,
                      onChangeForKey: (key, raw) =>
                        updateClassPractice(cls.id, key, raw),
                    })}
                  </div>
                </CMSCard>
              );
            })}

            <CMSToggle
              label="Charge for Preferences"
              checked={pricing.charge_preferences || false}
              onChange={(v) => update("charge_preferences", v)}
            />
          </CMSCard>
        )}

        {/* LATE FEE */}
        {event.late_entries_enabled && (
          <CMSCard title="Late Fee">
            <CMSInput
              label="Late Fee"
              type="number"
              value={pricing.late_fee || ""}
              onChange={(v) => update("late_fee", Math.max(0, Number(v)))}
            />
          </CMSCard>
        )}
      </div>
    </CMSCard>
  );
}
