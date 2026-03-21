import { useEffect, useState } from "react";

const BOOLEAN_KEYS = [
  "membership_auto_expire",
  "driver_require_email",
  "system_maintenance_mode",
  "system_enable_racer_directory",
  "system_enable_event_previews",
];

const DEFAULT_SETTINGS = {
  club_name: "",
  club_email: "",
  club_phone: "",
  club_logo_url: "",
  club_address: "",

  membership_default_duration: "",
  membership_default_price: "",
  membership_renewal_rules: "",
  membership_auto_expire: false,

  event_default_nomination_days: "",
  event_default_member_price: "",
  event_default_non_member_price: "",
  event_default_junior_price: "",
  event_default_track: "",
  event_default_class_limit: "",

  driver_junior_age_cutoff: "",
  driver_allowed_types: "",
  driver_require_email: false,

  system_maintenance_mode: false,
  system_admin_contact_email: "",
  system_support_email: "",            // ⭐ NEW SETTING
  system_enable_racer_directory: false,
  system_enable_event_previews: true,
};

export default function AdminSettings() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);

    const { data, error } = await window.supabase
      .from("app_settings")
      .select("*");

    if (!error && Array.isArray(data)) {
      const map = { ...DEFAULT_SETTINGS };

      data.forEach((row) => {
        const key = row.key;
        let value = row.value;

        if (BOOLEAN_KEYS.includes(key)) {
          map[key] = value === "true";
        } else {
          map[key] = value ?? "";
        }
      });

      setSettings(map);
    }

    setLoading(false);
  }

  function updateField(key, value) {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function handleSave(e) {
    if (e?.preventDefault) e.preventDefault();
    setSaving(true);

    const rows = Object.entries(settings).map(([key, value]) => {
      let storedValue = value;

      if (BOOLEAN_KEYS.includes(key)) {
        storedValue = value ? "true" : "false";
      } else if (value === null || value === undefined) {
        storedValue = "";
      } else {
        storedValue = String(value);
      }

      return { key, value: storedValue };
    });

    await window.supabase.from("app_settings").upsert(rows, {
      onConflict: "key",
    });

    setSaving(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="h-6 w-6 rounded-full border-2 border-slate-700 border-t-emerald-400 animate-spin" />
          <p className="text-slate-300 text-sm">Loading settings…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 px-4 py-10">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* PAGE HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
            Settings
          </h1>

          <div className="flex gap-3">
            <button
              onClick={loadSettings}
              className="rounded-full bg-slate-800 text-slate-200 px-5 py-2.5 text-sm font-medium hover:bg-slate-700 transition-colors"
            >
              Reset
            </button>

            <button
              onClick={handleSave}
              disabled={saving}
              className={`rounded-full px-5 py-2.5 text-sm font-semibold transition-colors ${
                saving
                  ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                  : "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
              }`}
            >
              {saving ? "Saving…" : "Save Settings"}
            </button>
          </div>
        </div>

        {/* A — CLUB INFORMATION */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-4">
          <h2 className="text-xl font-semibold text-slate-50">
            Club Information
          </h2>

          <div className="space-y-4">
            <InputField
              label="Club Name"
              value={settings.club_name}
              onChange={(v) => updateField("club_name", v)}
            />

            <InputField
              label="Club Email"
              type="email"
              value={settings.club_email}
              onChange={(v) => updateField("club_email", v)}
            />

            <InputField
              label="Club Phone"
              value={settings.club_phone}
              onChange={(v) => updateField("club_phone", v)}
            />

            <InputField
              label="Club Logo URL"
              value={settings.club_logo_url}
              onChange={(v) => updateField("club_logo_url", v)}
            />

            <TextAreaField
              label="Club Address"
              value={settings.club_address}
              onChange={(v) => updateField("club_address", v)}
            />
          </div>
        </div>

        {/* B — MEMBERSHIP SETTINGS */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-4">
          <h2 className="text-xl font-semibold text-slate-50">
            Membership Settings
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField
              label="Default Membership Duration (e.g. 12 months)"
              value={settings.membership_default_duration}
              onChange={(v) =>
                updateField("membership_default_duration", v)
              }
            />

            <InputField
              label="Default Membership Price"
              type="number"
              value={settings.membership_default_price}
              onChange={(v) =>
                updateField("membership_default_price", v)
              }
            />
          </div>

          <TextAreaField
            label="Renewal Rules"
            value={settings.membership_renewal_rules}
            onChange={(v) =>
              updateField("membership_renewal_rules", v)
            }
          />

          <CheckboxField
            id="membership_auto_expire"
            label="Automatically expire memberships when duration ends"
            checked={settings.membership_auto_expire}
            onChange={(v) =>
              updateField("membership_auto_expire", v)
            }
          />
        </div>

        {/* C — EVENT SETTINGS */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-4">
          <h2 className="text-xl font-semibold text-slate-50">
            Event Settings
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField
              label="Default Nomination Window (days)"
              type="number"
              value={settings.event_default_nomination_days}
              onChange={(v) =>
                updateField("event_default_nomination_days", v)
              }
            />

            <InputField
              label="Default Class Limit"
              type="number"
              value={settings.event_default_class_limit}
              onChange={(v) =>
                updateField("event_default_class_limit", v)
              }
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <InputField
              label="Default Member Price"
              type="number"
              value={settings.event_default_member_price}
              onChange={(v) =>
                updateField("event_default_member_price", v)
              }
            />

            <InputField
              label="Default Non‑Member Price"
              type="number"
              value={settings.event_default_non_member_price}
              onChange={(v) =>
                updateField("event_default_non_member_price", v)
              }
            />

            <InputField
              label="Default Junior Price"
              type="number"
              value={settings.event_default_junior_price}
              onChange={(v) =>
                updateField("event_default_junior_price", v)
              }
            />
          </div>

          <InputField
            label="Default Track"
            value={settings.event_default_track}
            onChange={(v) =>
              updateField("event_default_track", v)
            }
            placeholder="e.g. Dirt Track"
          />
        </div>

        {/* D — DRIVER SETTINGS */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-4">
          <h2 className="text-xl font-semibold text-slate-50">
            Driver Settings
          </h2>

          <InputField
            label="Junior Age Cutoff (years)"
            type="number"
            value={settings.driver_junior_age_cutoff}
            onChange={(v) =>
              updateField("driver_junior_age_cutoff", v)
            }
          />

          <InputField
            label="Allowed Driver Types (comma‑separated)"
            value={settings.driver_allowed_types}
            onChange={(v) =>
              updateField("driver_allowed_types", v)
            }
            placeholder="e.g. 1/10 Buggy, 1/8 Nitro, SCT"
          />

          <CheckboxField
            id="driver_require_email"
            label="Require email address for drivers"
            checked={settings.driver_require_email}
            onChange={(v) =>
              updateField("driver_require_email", v)
            }
          />
        </div>

{/* E — SYSTEM SETTINGS */}
<div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-4">
  <h2 className="text-xl font-semibold text-slate-50">
    System Settings
  </h2>

  <InputField
    label="Admin Contact Email"
    type="email"
    value={settings.system_admin_contact_email}
    onChange={(v) =>
      updateField("system_admin_contact_email", v)
    }
  />

  {/* ⭐ NEW FIELD — SUPPORT EMAIL */}
  <InputField
    label="Support Email (Forgot Email Requests)"
    type="email"
    value={settings.system_support_email}
    onChange={(v) =>
      updateField("system_support_email", v)
    }
  />

  {/* ⭐ NEW BUTTON — TEST SUPPORT EMAIL */}
  <button
    onClick={async () => {
      if (!settings.system_support_email) {
        alert("Please enter a support email first.");
        return;
      }

      const { error } = await window.supabase.functions.invoke(
        "send-recovery-email",
        {
          body: {
            fullName: "System Test",
            message: "This is a test email from Admin Settings.",
            clubName: settings.club_name || "Your Club",
            clubLogo: settings.club_logo_url || null,
            supportEmail: settings.system_support_email,
            ip: "0.0.0.0",
            clubSlug: "system-test",
          },
        }
      );

      if (error) {
        alert("Failed to send test email. Check your Resend logs.");
      } else {
        alert("Test email sent successfully!");
      }
    }}
    className="rounded-full bg-slate-800 text-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-700 transition-colors"
  >
    Send Test Email
  </button>

  <div className="space-y-2">
    <CheckboxField
      id="system_maintenance_mode"
      label="Enable maintenance mode (limit public access)"
      checked={settings.system_maintenance_mode}
      onChange={(v) =>
        updateField("system_maintenance_mode", v)
      }
    />

    <CheckboxField
      id="system_enable_racer_directory"
      label="Enable public racer directory (for opted‑in drivers)"
      checked={settings.system_enable_racer_directory}
      onChange={(v) =>
        updateField("system_enable_racer_directory", v)
      }
    />

    <CheckboxField
      id="system_enable_event_previews"
      label="Enable event preview links"
      checked={settings.system_enable_event_previews}
      onChange={(v) =>
        updateField("system_enable_event_previews", v)
      }
    />
  </div>
</div>

      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   REUSABLE FIELD COMPONENTS
────────────────────────────────────────────── */

function InputField({
  label,
  type = "text",
  value,
  onChange,
  placeholder = "",
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-200 mb-1">
        {label}
      </label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:ring-2 focus:ring-emerald-500"
      />
    </div>
  );
}

function TextAreaField({ label, value, onChange }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-200 mb-1">
        {label}
      </label>
      <textarea
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:ring-2 focus:ring-emerald-500"
      />
    </div>
  );
}

function CheckboxField({ id, label, checked, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-emerald-500 focus:ring-emerald-500"
      />
      <label
        htmlFor={id}
        className="text-sm font-medium text-slate-200 select-none"
      >
        {label}
      </label>
    </div>
  );
}
