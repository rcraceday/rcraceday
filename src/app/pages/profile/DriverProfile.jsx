// src/app/pages/profile/DriverProfile.jsx

import { useEffect, useState } from "react";
import { useParams, useNavigate, useOutletContext } from "react-router-dom";
import { supabase } from "@/supabaseClient";

import DriverProfileCard from "@/components/driver/DriverProfileCard";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import BackNavButton from "@/components/ui/BackNavButton";

import { IdentificationIcon } from "@heroicons/react/24/solid";
import { useMembership } from "@/app/providers/MembershipProvider";
import useTheme from "@/app/providers/useTheme";
import PageTitle from "@/components/ui/PageTitle";
import { useTranslation } from "@/app/i18n/I18nContext";

export default function DriverProfile() {
  const { id, clubSlug } = useParams();
  const navigate = useNavigate();

  const { club } = useOutletContext();
  const { palette } = useTheme();
  const { t } = useTranslation();
  const brand = palette.primary;

  const { membership } = useMembership();
  const isMember =
    membership &&
    membership.membership_type &&
    membership.membership_type !== "non_member";

  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("drivers")
        .select("*")
        .eq("id", id)
        .single();

      setDriver(data);
      setLoading(false);
    }

    load();
  }, [id]);

  if (loading) {
    return (
      <div className="p-4 w-full">
        <p className="text-gray-600">Loading driver…</p>
      </div>
    );
  }

  if (!driver) {
    return (
      <div className="p-4 w-full">
        <Card
          className="p-6 text-center space-y-4"
        >
          <h2 className="text-xl font-semibold">Driver Not Found</h2>
          <Button onClick={() => navigate(`/${clubSlug}/app/profile/drivers`)}>
            Back to Drivers
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-background text-text-base">

      <PageTitle
        icon={IdentificationIcon}
        title={t("drivers.profileTitle")}
        style={{ color: brand }}
        actions={<BackNavButton />}
      />

      {/* MAIN CONTENT */}
      <main className="app-page-main flex flex-col items-center">
        <DriverProfileCard
          driver={driver}
          club={club}
          isMember={isMember}
          navigate={navigate}
        />
      </main>
    </div>
  );
}
