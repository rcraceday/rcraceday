// src/app/pages/admin/settings/SystemSettings.jsx

import { useState, useEffect } from "react";
import { useClub } from "@/app/providers/ClubProvider";
import { supabase } from "@/supabaseClient";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

import { AdjustmentsHorizontalIcon } from "@heroicons/react/24/solid";

export default function SystemSettings() {
  const { club, refreshClub } = useClub();
  const brand = club?.theme?.hero?.backgroundColor || "#0A66C2";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // SYSTEM SETTINGS STATE
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [adminContactEmail, setAdminContactEmail] = useState("");
  const [supportEmail, setSupportEmail] = useState("");

  /* ===========================
     LOAD SYSTEM SETTINGS
     =========================== */
  useEffect(() => {
    if (!club) return;

    setMaintenanceMode(club.system_maintenance_mode || false);
    setAdminContactEmail(club.system_admin_contact_email || "");
    setSupportEmail(club.system_support_email || "");

    setLoading(false);
  }, [club]);

  /* ===========================
     SAVE SYSTEM SETTINGS
     =========================== */
  async function handleSave() {
    if (!club?.id) return;

    setSaving(true);

    const { error } = await supabase
      .from("clubs")
      .update({
        system_maintenance_mode: maintenanceMode,
        system_admin_contact_email: adminContactEmail,
        system_support_email: supportEmail,
      })
      .eq("id", club.id);

    setSaving(false);

    if (!error) {
      refreshClub();
      alert("System settings updated.");
    } else {
      alert("Error saving system settings.");
    }
  }

  return (
    <div className="min-h-screen w-full bg-background text-text-base">

      {/* HEADER */}
      <section className="w-full border-b border-surfaceBorder bg-surface">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-2">
          <AdjustmentsHorizontalIcon className="h-5 w-5" style={{ color: brand }} />
          <h1 className="text-xl font-semibold tracking-tight">System Settings</h1>
        </div>
      </section>

      {/* MAIN */}
      <main className="max-w-4xl mx-auto px-4 py-10 space-y-10">

        <Card
          className="rounded-xl shadow-sm overflow-hidden !p-0"
          style={{ border: `2px solid ${brand}`, background: "white" }}
        >
          {/* BLUE HEADER BAR */}
          <div
            className="px-5 py-3"
            style={{ background: brand, color: "white" }}
          >
            <h2 className="text-base font-semibold">System Configuration</h2>
          </div>

          {/* BODY */}
          <div className="p-6 space-y-6">

            {loading && <p className="text-text-muted">Loading system settings…</p>}

            {!loading && (
              <>
                {/* Maintenance Mode */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Maintenance Mode</p>
                    <p className="text-sm text-text-muted">
                      When enabled, the public site is disabled for all users.
                    </p>
                  </div>

                  <input
                    type="checkbox"
                    className="h-5 w-5"
                    checked={maintenanceMode}
                    onChange={(e) => setMaintenanceMode(e.target.checked)}
                  />
                </div>

                {/* Admin Contact Email */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Admin Contact Email
                  </label>
                  <input
                    type="email"
                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                    value={adminContactEmail}
                    onChange={(e) => setAdminContactEmail(e.target.value)}
                  />
                </div>

                {/* Support Email */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Support Email
                  </label>
                  <input
                    type="email"
                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                    value={supportEmail}
                    onChange={(e) => setSupportEmail(e.target.value)}
                  />
                </div>

                {/* SAVE BUTTON */}
                <div className="pt-4">
                  <Button
                    className="!rounded-lg !py-3 px-6 text-white font-medium"
                    style={{ background: brand }}
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? "Saving…" : "Save Changes"}
                  </Button>
                </div>
              </>
            )}

          </div>
        </Card>

      </main>
    </div>
  );
}
