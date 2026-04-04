// src/components/HouseholdMembersCard.jsx

import { useState, useMemo } from "react";
import { supabase } from "@/supabaseClient";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";

export function HouseholdMembersCard({
  membership,
  members,
  drivers,
  club,
  brand,
  onMembersChanged,
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add"); // "add" | "edit"
  const [modalIsJunior, setModalIsJunior] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const maxAdults = club?.max_adults || 0;
  const maxJuniors = club?.max_juniors || 0;

  /* ------------------------------------------------------------
     MERGE DRIVERS + MEMBERS INTO UNIFIED STRUCTURE
     ------------------------------------------------------------ */
  const unifiedMembers = useMemo(() => {
    const driverObjects = (drivers || []).map((d) => ({
      id: d.id,
      first_name: d.first_name,
      last_name: d.last_name,
      is_junior: d.is_junior,
      isDriver: true,
    }));

    const memberObjects = (members || []).map((m) => ({
      ...m,
      isDriver: false,
    }));

    return [...driverObjects, ...memberObjects];
  }, [drivers, members]);

  /* ------------------------------------------------------------
     SORT + SPLIT INTO ADULTS / JUNIORS
     ------------------------------------------------------------ */
  function asciiSort(a, b) {
    const nameA = `${a.first_name}${a.last_name}`;
    const nameB = `${b.first_name}${b.last_name}`;
    return nameA < nameB ? -1 : nameA > nameB ? 1 : 0;
  }

  const adultDrivers = unifiedMembers
    .filter((m) => m.isDriver && !m.is_junior)
    .sort(asciiSort);

  const adultNonDrivers = unifiedMembers
    .filter((m) => !m.isDriver && !m.is_junior)
    .sort(asciiSort);

  const juniorDrivers = unifiedMembers
    .filter((m) => m.isDriver && m.is_junior)
    .sort(asciiSort);

  const juniorNonDrivers = unifiedMembers
    .filter((m) => !m.isDriver && m.is_junior)
    .sort(asciiSort);

  const adultCount = adultNonDrivers.length;
  const juniorCount = juniorNonDrivers.length;

  const canAddAdult = adultCount < maxAdults;
  const canAddJunior = juniorCount < maxJuniors;

  /* ------------------------------------------------------------
     MODAL HANDLERS
     ------------------------------------------------------------ */
  function openAddModal(isJunior) {
    setModalMode("add");
    setModalIsJunior(isJunior);
    setEditingMember(null);
    setFirstName("");
    setLastName("");
    setModalOpen(true);
  }

  function openEditModal(member) {
    if (member.isDriver) return; // read-only
    setModalMode("edit");
    setModalIsJunior(member.is_junior);
    setEditingMember(member);
    setFirstName(member.first_name);
    setLastName(member.last_name);
    setModalOpen(true);
  }

  async function handleSave() {
    if (!firstName.trim() || !lastName.trim()) return;

    if (modalMode === "add") {
      await supabase.from("club_members").insert({
        membership_id: membership.id,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        is_junior: modalIsJunior,
      });
    } else if (modalMode === "edit" && editingMember) {
      await supabase
        .from("club_members")
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
        })
        .eq("id", editingMember.id);
    }

    setModalOpen(false);
    setEditingMember(null);
    setFirstName("");
    setLastName("");

    onMembersChanged?.();
  }

  async function handleRemove(member) {
    if (member.isDriver) return; // read-only
    await supabase.from("club_members").delete().eq("id", member.id);
    onMembersChanged?.();
  }

  /* ------------------------------------------------------------
     RENDER MEMBER ROW
     ------------------------------------------------------------ */
  function renderMemberRow(member) {
    const isDriver = member.isDriver;

    return (
      <div
        key={member.id}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 12px",
          borderRadius: "6px",
          border: `1px solid ${brand}`,
          marginBottom: "6px",
        }}
      >
        <div>
          <div style={{ fontWeight: 500 }}>
            {member.first_name} {member.last_name}
          </div>
        </div>

        {!isDriver && (
          <div style={{ display: "flex", gap: "8px" }}>
            <Button
              variant="secondary"
              onClick={() => openEditModal(member)}
              style={{ fontSize: "12px", padding: "4px 8px" }}
            >
              Edit
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleRemove(member)}
              style={{ fontSize: "12px", padding: "4px 8px" }}
            >
              Remove
            </Button>
          </div>
        )}
      </div>
    );
  }

  /* ------------------------------------------------------------
     MAIN RENDER
     ------------------------------------------------------------ */
  return (
    <>
      <Card
        className="household-members-card"
        style={{ border: `2px solid ${brand}`, padding: "10px", width: "100%" }}
      >
        <h2 style={{ fontSize: "20px", fontWeight: 600, marginBottom: "16px" }}>
          Household Members
        </h2>

        {/* Adults */}
        <div style={{ marginTop: "16px" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "8px" }}>
            Adults
          </h3>

          {adultDrivers.length === 0 && adultNonDrivers.length === 0 && (
            <p style={{ fontSize: "14px", opacity: 0.7, marginBottom: "8px" }}>
              No adult members yet.
            </p>
          )}

          {adultDrivers.map(renderMemberRow)}
          {adultNonDrivers.map(renderMemberRow)}

          {canAddAdult && (
            <Button
              variant="primary"
              onClick={() => openAddModal(false)}
              style={{ fontSize: "14px", padding: "6px 12px", marginTop: "4px" }}
            >
              Add Adult Member
            </Button>
          )}
        </div>

        {/* Juniors */}
        <div style={{ marginTop: "24px" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "8px" }}>
            Juniors
          </h3>

          {juniorDrivers.length === 0 && juniorNonDrivers.length === 0 && (
            <p style={{ fontSize: "14px", opacity: 0.7, marginBottom: "8px" }}>
              No junior members yet.
            </p>
          )}

          {juniorDrivers.map(renderMemberRow)}
          {juniorNonDrivers.map(renderMemberRow)}

          {canAddJunior && (
            <Button
              variant="primary"
              onClick={() => openAddModal(true)}
              style={{ fontSize: "14px", padding: "6px 12px", marginTop: "4px" }}
            >
              Add Junior Member
            </Button>
          )}
        </div>
      </Card>

      {/* Modal */}
      {modalOpen && (
        <Modal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setEditingMember(null);
            setFirstName("");
            setLastName("");
          }}
          title={
            modalMode === "add"
              ? modalIsJunior
                ? "Add Junior Member"
                : "Add Adult Member"
              : "Edit Member"
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label style={{ fontSize: "14px" }}>
              First Name
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                style={{
                  width: "100%",
                  marginTop: "4px",
                  padding: "6px 8px",
                  borderRadius: "4px",
                  border: "1px solid #ccc",
                }}
              />
            </label>

            <label style={{ fontSize: "14px" }}>
              Last Name
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                style={{
                  width: "100%",
                  marginTop: "4px",
                  padding: "6px 8px",
                  borderRadius: "4px",
                  border: "1px solid #ccc",
                }}
              />
            </label>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "8px",
                marginTop: "12px",
              }}
            >
              <Button
                variant="secondary"
                onClick={() => {
                  setModalOpen(false);
                  setEditingMember(null);
                  setFirstName("");
                  setLastName("");
                }}
                style={{ padding: "6px 12px", fontSize: "14px" }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
                style={{ padding: "6px 12px", fontSize: "14px" }}
              >
                Save
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
