import React, { useState } from "react";
import CMSCard from "@cms/CMSCard";
import CMSInput from "@cms/CMSInput";
import CMSToggle from "@cms/CMSToggle";
import { cmsLayout } from "@cms/layout";

export default function EventPricingCard({ event, onChange }) {
  const pricing = event.pricing || {};

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
              onChange={(v) => updateNested("global", "free", v)}
            />

            {!pricing.global?.free && (
              <div style={{ display: "flex", gap: 12 }}>
                <CMSInput
                  label="Member Price"
                  type="number"
                  value={pricing.global?.member || ""}
                  onChange={(v) =>
                    updateNested("global", "member", Math.max(0, Number(v)))
                  }
                />
                <CMSInput
                  label="Non‑Member Price"
                  type="number"
                  value={pricing.global?.non_member || ""}
                  onChange={(v) =>
                    updateNested("global", "non_member", Math.max(0, Number(v)))
                  }
                />
                <CMSInput
                  label="Junior Price"
                  type="number"
                  value={pricing.global?.junior || ""}
                  onChange={(v) =>
                    updateNested("global", "junior", Math.max(0, Number(v)))
                  }
                />
              </div>
            )}

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

                  {!cp.free && (
                    <div style={{ display: "flex", gap: 12 }}>
                      <CMSInput
                        label="Member Price"
                        type="number"
                        value={cp.member || ""}
                        onChange={(v) =>
                          updateClassPrice(cls.id, "member", Math.max(0, Number(v)))
                        }
                      />
                      <CMSInput
                        label="Non‑Member Price"
                        type="number"
                        value={cp.non_member || ""}
                        onChange={(v) =>
                          updateClassPrice(cls.id, "non_member", Math.max(0, Number(v)))
                        }
                      />
                      <CMSInput
                        label="Junior Price"
                        type="number"
                        value={cp.junior || ""}
                        onChange={(v) =>
                          updateClassPrice(cls.id, "junior", Math.max(0, Number(v)))
                        }
                      />
                    </div>
                  )}
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
