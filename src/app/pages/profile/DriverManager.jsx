// src/app/pages/profile/DriverManager.jsx

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";

import { useAuth } from "@/app/providers/AuthProvider";
import { useDrivers } from "@/app/providers/DriverProvider";
import { useMembership } from "@/app/providers/MembershipProvider";
import useTheme from "@/app/providers/useTheme";

import DriverListCard from "@/components/driver/DriverListCard";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import PageTitle from "@/components/ui/PageTitle";
import { useTranslation } from "@/app/i18n/I18nContext";

import { supabase } from "@/supabaseClient";
import { UserPlusIcon, TrashIcon } from "@heroicons/react/24/solid";
import {
  canShowAddDriverButton,
  countHouseholdSlots,
} from "@/app/pages/profile/householdDriverLimits";
import { resolveHouseholdLimits } from "@/app/lib/membershipClubLimits";
import {
  applyNewDriverProfileDefaults,
  evaluateDriverProfileReadiness,
  resolveDriverNumberRules,
} from "@/app/lib/driverClubSettings";

export default function DriverManager() {
  const navigate = useNavigate();
  const { club } = useOutletContext();
  const { palette } = useTheme();
  const { t } = useTranslation();
  const brand = palette.primary;
  const clubSlug = club?.slug;

  const { drivers, loadingDrivers, refreshDrivers } = useDrivers();
  const { membership } = useMembership();
  const { user } = useAuth();

  const driverList = Array.isArray(drivers) ? drivers : [];
  const membershipType = membership?.membership_type;

  // CLUB MEMBERS
  const [clubMembers, setClubMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(true);

  // DELETE MEMBER MODAL
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // ------------------------------------------------------------
  // LOAD CLUB MEMBERS
  // ------------------------------------------------------------
  useEffect(() => {
    const loadMembers = async () => {
      if (!membership || membershipType !== "family") {
        setClubMembers([]);
        setLoadingMembers(false);
        return;
      }

      const { data, error } = await supabase
        .from("club_members")
        .select("*")
        .eq("membership_id", membership.id)
        .order("first_name", { ascending: true });

      if (!error && Array.isArray(data)) {
        setClubMembers(data);
      }

      setLoadingMembers(false);
    };

    loadMembers();
  }, [membership, membershipType]);

  // ------------------------------------------------------------
  // REDIRECT IF NO DRIVERS
  // ------------------------------------------------------------
  useEffect(() => {
    if (loadingDrivers || !clubSlug) return;
    if (driverList?.length > 0) return;
    const welcome = `/${clubSlug}/app/profile/drivers/welcome`;
    if (window.location.pathname.replace(/\/+$/, "") === welcome) return;
    navigate(welcome, { replace: true });
  }, [loadingDrivers, driverList?.length, navigate, clubSlug]);

  // ------------------------------------------------------------
  // ADD DRIVER BUTTON VISIBILITY
  // ------------------------------------------------------------
  const { maxAdults, maxJuniors } = resolveHouseholdLimits(club, membershipType);

  const canAddDriver = canShowAddDriverButton({
    membershipType,
    drivers: driverList,
    clubMembers,
    maxAdults,
    maxJuniors,
  });

  const householdSlotLimits =
    membershipType === "family" || membershipType === "non_member";

  const householdCounts = householdSlotLimits
    ? countHouseholdSlots(driverList, clubMembers)
    : null;

  const showClubMembers = membershipType === "family";

  const driversNeedingProfile = useMemo(
    () =>
      driverList.filter((driver) => !evaluateDriverProfileReadiness(club, driver).ready),
    [driverList, club]
  );

  async function reloadMembers() {
    if (!membership?.id || membershipType !== "family") return;
    const { data } = await supabase
      .from("club_members")
      .select("*")
      .eq("membership_id", membership.id)
      .order("first_name", { ascending: true });
    setClubMembers(data || []);
  }

  async function promoteMemberToDriver(member) {
    if (!member?.id || !membership?.id || !club?.id || !user?.id) return;

    const { data: driver, error: insertError } = await supabase
      .from("drivers")
      .insert({
        membership_id: membership.id,
        club_id: club.id,
        first_name: member.first_name,
        last_name: member.last_name,
        is_junior: !!member.is_junior,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (insertError || !driver?.id) {
      console.error("[DriverManager] promote member to driver", insertError);
      return;
    }

    await supabase
      .from("club_members")
      .update({ driver_id: driver.id })
      .eq("id", member.id);

    await applyNewDriverProfileDefaults(supabase, driver.id, club);

    const numberRules = resolveDriverNumberRules(club);
    if (numberRules.auto_reconcile_on_create) {
      await supabase.rpc("reconcile_driver_number", {
        p_club_id: club.id,
        p_driver_id: driver.id,
        p_first_name: member.first_name,
        p_last_name: member.last_name,
      });
    }

    await refreshDrivers();
    await reloadMembers();
  }

  // ------------------------------------------------------------
  // DELETE MEMBER
  // ------------------------------------------------------------
  const confirmDeleteMember = async () => {
    if (!memberToDelete) return;

    try {
      setDeleting(true);

      await supabase
        .from("club_members")
        .delete()
        .eq("id", memberToDelete.id);

      // Reload members
      const { data } = await supabase
        .from("club_members")
        .select("*")
        .eq("membership_id", membership.id)
        .order("first_name", { ascending: true });

      setClubMembers(data || []);
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
      setMemberToDelete(null);
    }
  };

  return (
    <div className="min-h-screen w-full bg-background text-text-base">

      <PageTitle
        icon={UserPlusIcon}
        title={t("drivers.managerTitle")}
        style={{ color: brand }}
      />

      {/* CENTERED CONTENT */}
      <div className="w-full flex justify-center">
        <main className="app-page-main flex flex-col gap-10">

          {driversNeedingProfile.length > 0 && (
            <Card className="p-4 text-sm bg-amber-50 border border-amber-200 text-amber-900">
              {t("driverRules.profileIncompleteBanner")}
            </Card>
          )}

          {/* DRIVERS */}
          <section className="space-y-4">
            <h2 className="text-base font-semibold">Drivers</h2>

            {loadingDrivers && (
              <p className="text-sm text-text-muted">Loading drivers…</p>
            )}

            {!loadingDrivers && driverList.length === 0 && (
              <Card
                className="p-4 text-sm text-text-muted"
              >
                No drivers yet.
              </Card>
            )}

            <div className="flex flex-col gap-4 items-center">
              {driverList.map((driver) => (
                <DriverListCard
                  key={driver.id}
                  driver={driver}
                  brand={brand}
                  onEditProfile={() =>
                    navigate(`/${clubSlug}/app/profile/drivers/${driver.id}/edit`)
                  }
                  onViewProfile={() =>
                    navigate(`/${clubSlug}/app/profile/drivers/${driver.id}`)
                  }
                />
              ))}
            </div>

            {householdSlotLimits && householdCounts && (
              <p className="text-xs text-text-muted">
                Household slots: {householdCounts.adults}/{maxAdults} adults,{" "}
                {householdCounts.juniors}/{maxJuniors} juniors
              </p>
            )}

            {canAddDriver && (
              <Button
                onClick={() =>
                  navigate(`/${clubSlug}/app/profile/drivers/add`)
                }
                className="w-full !py-2.5 !text-sm"
              >
                Add Driver
              </Button>
            )}

            {!canAddDriver && householdSlotLimits && (
              <p className="text-sm text-text-muted">
                Your club allows up to {maxAdults} adult and {maxJuniors} junior
                drivers for your household.
              </p>
            )}
          </section>

          {/* CLUB MEMBERS — FAMILY ONLY */}
          {showClubMembers && (
            <section className="space-y-4">
              <h2 className="text-lg font-semibold">Club Members</h2>

              {loadingMembers && (
                <p className="text-sm text-text-muted">Loading members…</p>
              )}

              {!loadingMembers &&
                clubMembers.filter((m) => m.driver_id === null).length === 0 && (
                  <Card
                    className="p-4 text-sm text-text-muted"
                  >
                    No club members yet.
                  </Card>
                )}

              {!loadingMembers &&
                clubMembers.filter((m) => m.driver_id === null).length > 0 && (
                  <Card
                    className="p-4 space-y-3"
                  >
                    {clubMembers
                      .filter((m) => m.driver_id === null)
                      .map((m) => {
                        const initials = `${m.first_name?.[0] || ""}${
                          m.last_name?.[0] || ""
                        }`.toUpperCase();

                        const bgColor = m.is_junior ? "#9CA3AF" : brand;

                        return (
                          <div
                            key={m.id}
                            className="text-sm flex items-center justify-between gap-3"
                          >
                            {/* LEFT: AVATAR + NAME */}
                            <div className="flex items-center gap-3">
                              <div
                                style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: "50%",
                                  backgroundColor: bgColor,
                                  color: "white",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: "0.8rem",
                                  fontWeight: 600,
                                }}
                              >
                                {initials}
                              </div>

                              <span>
                                {m.first_name} {m.last_name}
                                {m.is_junior && (
                                  <span className="ml-2 text-xs text-blue-600">
                                    (Junior)
                                  </span>
                                )}
                                <span className="ml-2 text-xs text-gray-500">
                                  (Member Only)
                                </span>
                              </span>
                            </div>

                            {/* RIGHT: PROMOTE / DELETE */}
                            <div className="flex items-center gap-2">
                              <Button
                                variant="secondary"
                                className="!py-1 !px-3 !text-xs"
                                onClick={() => promoteMemberToDriver(m)}
                              >
                                Add driver profile
                              </Button>
                              <Button
                                variant="danger"
                                className="!py-1 !px-3 !text-xs"
                                onClick={() => {
                                  setMemberToDelete(m);
                                  setShowDeleteModal(true);
                                }}
                              >
                                Delete
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                  </Card>
                )}
            </section>
          )}

        </main>
      </div>

      {/* DELETE MEMBER MODAL */}
      {showDeleteModal && memberToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <Card
            className="p-6 space-y-4 bg-white max-w-sm w-full"
          >
            <h3 className="text-lg font-semibold">Delete Member</h3>
            <p className="text-sm text-gray-700">
              Are you sure you want to delete this household member?
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => {
                  setShowDeleteModal(false);
                  setMemberToDelete(null);
                }}
                disabled={deleting}
              >
                Cancel
              </Button>

              <Button
                variant="danger"
                className="w-full"
                onClick={confirmDeleteMember}
                disabled={deleting}
              >
                {deleting ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
