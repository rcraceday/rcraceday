// src/app/pages/profile/ChooseNumber.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useOutletContext } from "react-router-dom";
import { supabase } from "@/supabaseClient";

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import useTheme from "@/app/providers/useTheme";

import { HashtagIcon, ArrowLeftIcon } from "@heroicons/react/24/solid";
import PageTitle from "@/components/ui/PageTitle";

export default function ChooseNumber() {
  const navigate = useNavigate();
  const { id: driverId, clubSlug } = useParams();
  const { club } = useOutletContext();
  const { palette } = useTheme();
  const brand = palette?.primary || "#0A66C2";
  const slug = clubSlug || club?.slug;

  const [driver, setDriver] = useState(null);
  const [numbers, setNumbers] = useState([]);
  const [driversMap, setDriversMap] = useState({});
  const [search, setSearch] = useState("");
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");

  // LOAD DRIVER
  useEffect(() => {
    async function loadDriver() {
      const { data } = await supabase
        .from("drivers")
        .select("*")
        .eq("id", driverId)
        .single();

      setDriver(data);
    }
    loadDriver();
  }, [driverId]);

  // LOAD ALL DRIVERS (UUID → name)
  useEffect(() => {
    async function loadDrivers() {
      const { data } = await supabase
        .from("drivers")
        .select("id, first_name, last_name")
        .eq("club_id", club.id);

      const map = {};
      data?.forEach((d) => {
        map[d.id] = `${d.first_name} ${d.last_name}`;
      });
      setDriversMap(map);
    }
    loadDrivers();
  }, [club.id]);

  // LOAD NUMBERS
  useEffect(() => {
    async function loadNumbers() {
      const { data } = await supabase
        .from("numbers")
        .select("*")
        .eq("club_id", club.id)
        .order("number", { ascending: true });

      setNumbers(data || []);
      setLoading(false);
    }
    loadNumbers();
  }, [club.id]);

  // FILTER + TOGGLE
  const filtered = numbers.filter((n) => {
    const matchesSearch =
      search.trim() === "" ||
      n.number.toString().includes(search.trim());

    if (!matchesSearch) return false;

    if (showAvailableOnly) {
      const isAssigned =
        n.assigned_to_driver ||
        n.assigned_driver_name ||
        n.reserved_for_membership ||
        n.is_admin_only;

      return !isAssigned;
    }

    return true;
  });

  // SAVE NUMBER
  async function saveNumber() {
    if (!selected) return;

    setAssigning(true);
    setError("");

    const { error: rpcError } = await supabase.rpc("assign_number", {
      p_club_id: club.id,
      p_driver_id: driver.id,
      p_number: selected,
    });

    if (rpcError) {
      setError("There was a problem saving this number.");
      setAssigning(false);
      return;
    }

    window.location.reload();
  }

  if (loading || !driver) {
    return <div className="p-6 text-center text-gray-600">Loading…</div>;
  }

  return (
    <div className="min-h-screen w-full bg-background text-text-base">

      <PageTitle
        icon={HashtagIcon}
        title="Choose Race Number"
        style={{ color: brand }}
        actions={
          <Button
            className="!py-1 !px-3 !text-xs !rounded-sm flex items-center gap-1"
            onClick={() =>
              navigate(`/${slug}/app/profile/drivers/${driverId}/edit`)
            }
          >
            <ArrowLeftIcon className="h-3 w-3" />
            Back
          </Button>
        }
      />

      <main className="max-w-[720px] mx-auto px-4 py-8 space-y-8">

        {error && (
          <div className="p-3 bg-red-100 text-red-700 rounded text-sm">
            {error}
          </div>
        )}

        {/* SEARCH */}
        <Input
          label="Search Numbers"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {/* AVAILABLE ONLY TOGGLE */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="availableToggle"
            checked={showAvailableOnly}
            onChange={(e) => setShowAvailableOnly(e.target.checked)}
            className="h-4 w-4"
          />
          <label htmlFor="availableToggle" className="text-sm text-gray-700">
            Show only available numbers
          </label>
        </div>

        {/* CARD */}
        <Card
          noPadding={true}
          style={{
            border: `2px solid ${brand}`,
            borderRadius: "14px",
            overflow: "hidden",
            background: palette?.surface || "#ffffff",
          }}
        >
          <div
            style={{
              backgroundColor: brand,
              color: palette?.buttonText || "white",
              padding: "16px 20px",
              fontWeight: 600,
              fontSize: "1.1rem",
            }}
          >
            All Numbers
          </div>

          <div
            style={{
              backgroundColor: palette?.surface || "white",
              maxHeight: "420px",
              overflowY: "auto",
              padding: "16px",
            }}
          >
            <div className="space-y-2">
              {filtered.map((n) => {
                const isCurrent =
                  driver.permanent_number === n.number;

                // Determine assigned name
                let assignedName = null;

                if (n.assigned_to_driver) {
                  assignedName = driversMap[n.assigned_to_driver];
                }

                if (!assignedName && n.assigned_driver_name) {
                  assignedName = n.assigned_driver_name;
                }

                // CURRENT DRIVER
                if (isCurrent) {
                  return (
                    <div
                      key={n.id}
                      className="w-full px-4 py-3 rounded"
                      style={{
                        backgroundColor: brand,
                        color: "white",
                        fontWeight: 600,
                      }}
                    >
                      {n.number}
                      {assignedName && (
                        <span className="ml-2 text-white/90">
                          — {assignedName}
                        </span>
                      )}
                      <span className="ml-2 text-white/90 text-sm">
                        (Current)
                      </span>
                    </div>
                  );
                }

                // NORMAL ROWS
                return (
                  <button
                    key={n.id}
                    onClick={() => setSelected(n.number)}
                    className={`w-full text-left px-4 py-3 rounded border ${
                      selected === n.number
                        ? "bg-blue-100 border-blue-500"
                        : "bg-white border-gray-300 hover:bg-gray-100"
                    }`}
                  >
                    <span className="font-semibold">{n.number}</span>

                    {assignedName && (
                      <span className="ml-2 text-gray-600">
                        — {assignedName}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </Card>

        {/* SAVE */}
        <Button
          onClick={saveNumber}
          disabled={!selected || assigning}
          className="w-full py-3 disabled:opacity-50"
        >
          {assigning ? "Saving…" : "Save Number"}
        </Button>

        {/* CANCEL */}
        <Button
          variant="secondary"
          onClick={() =>
            navigate(`/${slug}/app/profile/drivers/${driverId}/edit`)
          }
          className="w-full py-3"
        >
          Cancel
        </Button>
      </main>
    </div>
  );
}
