// src/app/pages/profile/DriverManager.jsx

import React, { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";

import { useDrivers } from "@/app/providers/DriverProvider";
import { useMembership } from "@/app/providers/MembershipProvider";

import DriverListCard from "@/components/driver/DriverListCard";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

import { supabase } from "@/supabaseClient";
import { UserPlusIcon, TrashIcon } from "@heroicons/react/24/solid";

export default function DriverManager() {
  const navigate = useNavigate();
  const { club } = useOutletContext();
  const brand = club?.theme?.hero?.backgroundColor || "#0A66C2";
  const clubSlug = club?.slug;

  const { drivers, loadingDrivers } = useDrivers();
  const { membership } = useMembership();

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
    if (!loadingDrivers) {
      if (!driverList || driverList.length === 0) {
        navigate(`/${clubSlug}/app/profile/drivers/welcome`, { replace: true });
      }
    }
  }, [loadingDrivers, driverList, navigate, clubSlug]);

  // ------------------------------------------------------------
  // ADD DRIVER BUTTON VISIBILITY
  // ------------------------------------------------------------
  const canAddDriver = (() => {
    if (!membershipType) return true;
    if (membershipType === "family") return driverList.length < 99;
    return driverList.length === 0;
  })();

  const showClubMembers = membershipType === "family";

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

      {/* HEADER */}
      <section className="w-full border-b border-surfaceBorder bg-surface">
        <div className="w-full mx-auto px-4 py-4 flex items-center gap-2">
          <UserPlusIcon className="w-5 h-5" style={{ color: brand }} />
          <h1 className="text-xl font-semibold tracking-tight">Driver Manager</h1>
        </div>
      </section>

      {/* CENTERED CONTENT */}
      <div className="w-full flex justify-center">
        <main className="max-w-[720px] w-full px-4 flex flex-col gap-10">

          {/* DRIVERS */}
          <section className="space-y-4">
            <h2 className="text-base font-semibold">Drivers</h2>

            {loadingDrivers && (
              <p className="text-sm text-text-muted">Loading drivers…</p>
            )}

            {!loadingDrivers && driverList.length === 0 && (
              <Card
                className="p-4 text-sm text-text-muted"
                style={{ border: `2px solid ${brand}` }}
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
                    style={{ border: `2px solid ${brand}` }}
                  >
                    No club members yet.
                  </Card>
                )}

              {!loadingMembers &&
                clubMembers.filter((m) => m.driver_id === null).length > 0 && (
                  <Card
                    className="p-4 space-y-3"
                    style={{ border: `2px solid ${brand}` }}
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

                            {/* RIGHT: DELETE BUTTON */}
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
            style={{ border: `2px solid ${brand}` }}
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
