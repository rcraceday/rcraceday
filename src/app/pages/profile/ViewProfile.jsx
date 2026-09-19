// src/app/pages/profile/ViewProfile.jsx

import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useOutletContext } from "react-router-dom";
import { supabase } from "@/supabaseClient";

import DriverProfileCard from "@/components/driver/DriverProfileCard";
import PageTitle from "@/components/ui/PageTitle";

import { IdentificationIcon } from "@heroicons/react/24/solid";

export default function ViewProfile() {
  const navigate = useNavigate();
  const { driverId } = useParams();
  const { club } = useOutletContext();
  const brand = club?.theme?.hero?.backgroundColor || "#0A66C2";
  const clubSlug = club?.slug;

  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load driver
  useEffect(() => {
    const loadDriver = async () => {
      const { data, error } = await supabase
        .from("drivers")
        .select("*")
        .eq("id", driverId)
        .single();

      if (error) {
        console.error("Load driver error:", error);
        return;
      }

      setDriver(data);
      setLoading(false);
    };

    loadDriver();
  }, [driverId]);

  if (loading || !driver) {
    return (
      <div className="min-h-screen w-full bg-background text-text-base flex justify-center items-center">
        <p className="text-sm text-text-muted">Loading profile…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-background text-text-base">

      <PageTitle
        icon={IdentificationIcon}
        title="Driver Profile"
        style={{ color: brand }}
      />

      {/* CENTERED CONTENT */}
      <div className="w-full flex justify-center">
        <main className="max-w-[720px] w-full px-4 py-10 flex flex-col gap-8">

          {/* FULL DRIVER PROFILE CARD */}
          <DriverProfileCard
            driver={driver}
            brand={brand}
            isMember={true}
            onEdit={() =>
              navigate(
                `/${clubSlug}/app/profile/drivers/${driver.id}/edit`
              )
            }
            onDelete={() => {}} // not used here
          />

          {/* BACK BUTTON */}
          <button
            onClick={() => navigate(`/${clubSlug}/app/profile/drivers`)}
            className="text-sm text-blue-600 hover:underline"
          >
            Back to Driver Manager
          </button>

        </main>
      </div>
    </div>
  );
}
