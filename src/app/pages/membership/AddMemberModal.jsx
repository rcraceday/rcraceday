// src/app/pages/membership/AddMemberModal.jsx

import React, { useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

export default function AddMemberModal({
  driversNotMembers = [],
  onClose,
  onSubmit, // parent will handle the actual insert in Step 4.3
}) {
  const [tab, setTab] = useState("drivers"); // drivers | adult | junior

  // Adult form
  const [adultFirst, setAdultFirst] = useState("");
  const [adultLast, setAdultLast] = useState("");

  // Junior form
  const [juniorFirst, setJuniorFirst] = useState("");
  const [juniorLast, setJuniorLast] = useState("");

  // -----------------------------
  // Submit handlers
  // -----------------------------
  function handleAddDriver(driver) {
    onSubmit({
      type: "driver",
      driver,
    });
  }

  function handleAddAdult() {
    if (!adultFirst.trim() || !adultLast.trim()) return;

    onSubmit({
      type: "adult",
      first_name: adultFirst.trim(),
      last_name: adultLast.trim(),
    });
  }

  function handleAddJunior() {
    if (!juniorFirst.trim() || !juniorLast.trim()) return;

    onSubmit({
      type: "junior",
      first_name: juniorFirst.trim(),
      last_name: juniorLast.trim(),
    });
  }

  // -----------------------------
  // Render
  // -----------------------------
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <Card className="w-full max-w-md p-4 space-y-4">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Add Member</h2>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b pb-2">
          <button
            className={`px-3 py-1 rounded ${
              tab === "drivers" ? "bg-gray-200" : "text-gray-600"
            }`}
            onClick={() => setTab("drivers")}
          >
            Drivers
          </button>

          <button
            className={`px-3 py-1 rounded ${
              tab === "adult" ? "bg-gray-200" : "text-gray-600"
            }`}
            onClick={() => setTab("adult")}
          >
            Adult
          </button>

          <button
            className={`px-3 py-1 rounded ${
              tab === "junior" ? "bg-gray-200" : "text-gray-600"
            }`}
            onClick={() => setTab("junior")}
          >
            Junior
          </button>
        </div>

        {/* -----------------------------
            TAB: DRIVERS
        ----------------------------- */}
        {tab === "drivers" && (
          <div className="space-y-3">
            {driversNotMembers.length === 0 && (
              <p className="text-gray-600">No available drivers.</p>
            )}

            {driversNotMembers.map((d) => (
              <Card
                key={d.id}
                className="p-3 flex justify-between items-center"
              >
                <div>
                  <p className="font-medium">
                    {d.first_name} {d.last_name}
                  </p>
                  <p className="text-sm text-gray-600">
                    {d.is_junior ? "Junior" : "Adult"} Driver
                  </p>
                </div>

                <Button variant="primary" onClick={() => handleAddDriver(d)}>
                  Add
                </Button>
              </Card>
            ))}
          </div>
        )}

        {/* -----------------------------
            TAB: ADULT
        ----------------------------- */}
        {tab === "adult" && (
          <div className="space-y-3">
            <input
              type="text"
              placeholder="First name"
              className="w-full border rounded p-2"
              value={adultFirst}
              onChange={(e) => setAdultFirst(e.target.value)}
            />

            <input
              type="text"
              placeholder="Last name"
              className="w-full border rounded p-2"
              value={adultLast}
              onChange={(e) => setAdultLast(e.target.value)}
            />

            <Button
              variant="primary"
              className="w-full"
              onClick={handleAddAdult}
            >
              Add Adult
            </Button>
          </div>
        )}

        {/* -----------------------------
            TAB: JUNIOR
        ----------------------------- */}
        {tab === "junior" && (
          <div className="space-y-3">
            <input
              type="text"
              placeholder="First name"
              className="w-full border rounded p-2"
              value={juniorFirst}
              onChange={(e) => setJuniorFirst(e.target.value)}
            />

            <input
              type="text"
              placeholder="Last name"
              className="w-full border rounded p-2"
              value={juniorLast}
              onChange={(e) => setJuniorLast(e.target.value)}
            />

            <Button
              variant="primary"
              className="w-full"
              onClick={handleAddJunior}
            >
              Add Junior
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
