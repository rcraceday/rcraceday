// src/app/pages/profile/DriverManager.jsx

import React, { useState, useEffect } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { supabase } from "@/supabaseClient";

import { useDrivers } from "@/app/providers/DriverProvider";
import { useMembership } from "@/app/providers/MembershipProvider";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

import {
  UserCircleIcon,
  UserPlusIcon,
  PencilSquareIcon,
  TrashIcon,
} from "@heroicons/react/24/solid";

export default function DriverManager() {
  const navigate = useNavigate();
  const { club } = useOutletContext();
  const brand = club?.theme?.hero?.backgroundColor || "#0A66C2";

  const { drivers, loadingDrivers, refreshDrivers } = useDrivers();
  const { membership } = useMembership();

  const [driverToDelete, setDriverToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const clubSlug = club?.slug;

  // ------------------------------------------------------------
  // FIRST-TIME ONBOARDING REDIRECT
  // ------------------------------------------------------------
  useEffect(() => {
    if (loadingDrivers) return;
    if (!drivers) return;

    // If user has zero drivers → onboarding page
    if (drivers.length === 0) {
      navigate(`/${clubSlug}/app/profile/drivers/welcome`);
    }
  }, [loadingDrivers, drivers, clubSlug, navigate]);

  // ------------------------------------------------------------
  // MEMBERSHIP-BASED DRIVER LIMIT
  // ------------------------------------------------------------
  const canAddDriver = (() => {
    if (!membership) return true;

    const type = membership.membership_type;

    if (type === "global_admin") return true;
    if (type === "single") return drivers.length < 1;
    if (type === "family") return drivers.length < 99;

    return true;
  })();

  const handleDeleteDriver = async (driverId) => {
    setDeleting(true);

    const { error } = await supabase
      .from("drivers")
      .delete()
      .eq("id", driverId);

    setDeleting(false);

    if (error) {
      console.error("Delete driver error:", error);
      alert("Failed to delete driver.");
      return;
    }

    setDriverToDelete(null);
    await refreshDrivers();
  };

  const handleAddDriver = () => {
    navigate(`/${clubSlug}/app/profile/drivers/add`);
  };

  const handleEditDriver = (driverId) => {
    navigate(`/${clubSlug}/app/profile/drivers/${driverId}/edit`);
  };

  return (
    <div className="min-h-screen w-full bg-background text-text-base">

      {/* HEADER */}
      <section className="w-full border-b border-surfaceBorder bg-surface">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-2">
          <UserPlusIcon className="h-5 w-5" style={{ color: brand }} />
          <h1 className="text-xl font-semibold tracking-tight">Driver Manager</h1>
        </div>
      </section>

      {/* MAIN */}
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-10">

        {/* DRIVER LIST */}
        <div className="space-y-4">
          {loadingDrivers && (
            <p className="text-gray-600">Loading drivers…</p>
          )}

          {/* DRIVER CARDS */}
          {drivers.map((driver) => (
            <Card
              key={driver.id}
              className="
                p-4 
                flex flex-col 
                sm:flex-row sm:items-center sm:justify-between 
                gap-4
              "
              style={{ border: `2px solid ${brand}` }}
            >
              <div className="flex items-center gap-4 w-full sm:w-auto">
                {driver.profile?.avatar_url ? (
                  <img
                    src={driver.profile.avatar_url}
                    alt="Driver Avatar"
                    className="h-12 w-12 rounded-full object-cover border"
                  />
                ) : (
                  <UserCircleIcon className="h-12 w-12 text-gray-400" />
                )}

                <div className="flex flex-col">
                  <p className="font-semibold">
                    {driver.first_name} {driver.last_name}
                  </p>

                  {driver.is_junior && (
                    <p className="text-xs text-blue-600 font-medium">
                      Junior Driver
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-3 w-full sm:w-auto">
                <Button
                  variant="secondary"
                  onClick={() => handleEditDriver(driver.id)}
                  className="flex items-center gap-1 w-full sm:w-auto justify-center"
                >
                  <PencilSquareIcon className="h-4 w-4" />
                  Edit
                </Button>

                <Button
                  variant="danger"
                  onClick={() => setDriverToDelete(driver)}
                  className="flex items-center gap-1 bg-red-600 text-white hover:bg-red-700 w-full sm:w-auto justify-center"
                >
                  <TrashIcon className="h-4 w-4" />
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {/* ADD DRIVER BUTTON (BOTTOM) */}
        {drivers.length > 0 && canAddDriver && (
          <Button
            onClick={handleAddDriver}
            className="w-full py-3 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Add Driver
          </Button>
        )}

        {/* DELETE MODAL */}
        {driverToDelete && (
          <Card
            className="p-6 space-y-4 bg-red-50"
            style={{ border: `2px solid ${brand}` }}
          >
            <h2 className="text-lg font-semibold text-red-700">Delete Driver</h2>

            <p>
              Are you sure you want to delete{" "}
              <strong>
                {driverToDelete.first_name} {driverToDelete.last_name}
              </strong>
              ?
            </p>

            <div className="flex gap-3">
              <Button
                className="bg-red-600 text-white hover:bg-red-700"
                onClick={() => handleDeleteDriver(driverToDelete.id)}
              >
                {deleting ? "Deleting…" : "Delete"}
              </Button>

              <Button
                variant="secondary"
                onClick={() => setDriverToDelete(null)}
              >
                Cancel
              </Button>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}
