// src/components/driver/DriverListCard.jsx

import useTheme from "@/app/providers/useTheme";
import { useClub } from "@/app/providers/ClubProvider";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import FilterDropdown from "@/components/ui/FilterDropdown";
import TransponderCombobox from "@/components/ui/TransponderCombobox";
import { UserCircleIcon, ChevronDownIcon, ChevronUpIcon, XMarkIcon } from "@heroicons/react/24/solid";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/supabaseClient";

export default function DriverListCard({
  driver,
  brand: brandProp,
  onEditProfile,
  onViewProfile,
}) {
  const { club } = useClub();
  const { palette } = useTheme();
  const brand = brandProp || palette?.primary || "#0A66C2";
  if (!driver) return null;

  const isJunior = !!driver.is_junior;
  const number =
    driver.permanent_number ||
    driver.number ||
    driver.driver_number ||
    null;

  const [isManageClassesExpanded, setIsManageClassesExpanded] = useState(false);
  const [assignedClasses, setAssignedClasses] = useState([]);
  const [availableClubClasses, setAvailableClubClasses] = useState([]);
  const [clubTrackTypes, setClubTrackTypes] = useState([]);
  const [trackClassLinks, setTrackClassLinks] = useState([]);
  const [classActionError, setClassActionError] = useState("");
  const [pendingAddByTrack, setPendingAddByTrack] = useState({});
  const [cardMenuPad, setCardMenuPad] = useState(0);
  const cardRef = useRef(null);

  const loadClassData = useCallback(async () => {
    if (!club?.id || !driver?.id) return;

    const { data: trackTypesData, error: trackTypesError } = await supabase
      .from("club_tracks")
      .select("id, name")
      .eq("club_id", club.id)
      .order("name", { ascending: true });

    if (trackTypesError) {
      console.error("Error fetching club track types:", trackTypesError);
    } else {
      setClubTrackTypes(trackTypesData || []);
    }

    const { data: clubClassesData, error: clubClassesError } = await supabase
      .from("club_classes")
      .select("id, name, description")
      .eq("club_id", club.id)
      .order("name", { ascending: true });

    if (clubClassesError) {
      console.error("Error fetching club classes:", clubClassesError);
    } else {
      setAvailableClubClasses(clubClassesData || []);
    }

    const trackIds = (trackTypesData || []).map((track) => track.id);
    if (trackIds.length) {
      const { data: linkData, error: linkError } = await supabase
        .from("club_track_classes")
        .select("track_id, class_id")
        .in("track_id", trackIds);

      if (linkError) {
        console.error("Error fetching track class assignments:", linkError);
        setTrackClassLinks([]);
      } else {
        setTrackClassLinks(linkData || []);
      }
    } else {
      setTrackClassLinks([]);
    }

    const { data: driverClassesData, error: driverClassesError } = await supabase
      .from("driver_classes")
      .select("*, club_classes(name)")
      .eq("driver_id", driver.id)
      .eq("club_id", club.id);

    if (driverClassesError) {
      console.error("Error fetching driver classes:", driverClassesError);
    } else {
      setAssignedClasses(driverClassesData || []);
    }
  }, [club?.id, driver?.id]);

  useEffect(() => {
    loadClassData();
  }, [loadClassData]);

  useEffect(() => {
    if (isManageClassesExpanded) {
      loadClassData();
    }
  }, [isManageClassesExpanded, loadClassData]);

  const handleAddClass = async (classId, trackId) => {
    if (!club?.id || !driver?.id || !classId) return;
    setClassActionError("");
    const { data, error } = await supabase
      .from("driver_classes")
      .insert({ driver_id: driver.id, club_id: club.id, class_id: classId, track_id: trackId, transponder_number: "" })
      .select("*, club_classes(name)")
      .single();

    if (error) {
      console.error("Error adding class:", error);
      setClassActionError(error.message || "Unable to add class. Check that driver_classes exists in the database.");
      return;
    }
    setAssignedClasses((prev) => [...prev, data]);
    setPendingAddByTrack((prev) => ({ ...prev, [trackId]: false }));
  };

  const handleChangeClass = async (driverClassId, newClassId, trackId) => {
    if (!driverClassId || !newClassId) return;
    const existing = assignedClasses.find((dc) => dc.id === driverClassId);
    if (!existing || existing.class_id === newClassId) return;

    setClassActionError("");
    const { data, error } = await supabase
      .from("driver_classes")
      .update({ class_id: newClassId, track_id: trackId })
      .eq("id", driverClassId)
      .select("*, club_classes(name)")
      .single();

    if (error) {
      console.error("Error changing class:", error);
      setClassActionError(error.message || "Unable to change class.");
      return;
    }
    setAssignedClasses((prev) => prev.map((dc) => (dc.id === driverClassId ? data : dc)));
  };

  const handleRemoveClass = async (driverClassId) => {
    if (!driverClassId) return;
    const { error } = await supabase.from("driver_classes").delete().eq("id", driverClassId);
    if (error) {
      console.error("Error removing class:", error);
      return;
    }
    setAssignedClasses((prev) => prev.filter((dc) => dc.id !== driverClassId));
  };

  const handleTransponderChange = async (driverClassId, value) => {
    if (!driverClassId) return;
    const { error } = await supabase
      .from("driver_classes")
      .update({ transponder_number: value })
      .eq("id", driverClassId);

    if (error) {
      console.error("Error updating transponder number:", error);
      return;
    }
    setAssignedClasses((prev) =>
      prev.map((dc) =>
        dc.id === driverClassId ? { ...dc, transponder_number: value } : dc
      )
    );
  };

  const savedTransponders = useMemo(() => {
    const values = new Set();
    assignedClasses.forEach((row) => {
      const trimmed = (row.transponder_number || "").trim();
      if (trimmed) values.add(trimmed);
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [assignedClasses]);

  const classesById = useMemo(
    () => Object.fromEntries(availableClubClasses.map((clubClass) => [clubClass.id, clubClass])),
    [availableClubClasses]
  );

  const assignedClassIds = useMemo(
    () => new Set(assignedClasses.map((row) => row.class_id)),
    [assignedClasses]
  );

  const sortClassesByName = useCallback(
    (classes) =>
      [...classes].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base", numeric: true })
      ),
    []
  );

  const classesForTrack = useCallback(
    (trackId) => {
      const classIdsForTrack = trackClassLinks
        .filter((link) => link.track_id === trackId)
        .map((link) => link.class_id);
      return sortClassesByName(
        classIdsForTrack.map((classId) => classesById[classId]).filter(Boolean)
      );
    },
    [trackClassLinks, classesById, sortClassesByName]
  );

  const handleMenuToggle = useCallback((open, menuEl) => {
    if (!open || !menuEl || !cardRef.current) {
      setCardMenuPad(0);
      return;
    }
    const cardRect = cardRef.current.getBoundingClientRect();
    const menuRect = menuEl.getBoundingClientRect();
    const overflow = menuRect.bottom - cardRect.bottom;
    setCardMenuPad(Math.max(0, Math.ceil(overflow + 8)));
  }, []);

  const groupedClasses = useMemo(() => {
    return clubTrackTypes.reduce((acc, trackType) => {
      const trackClasses = classesForTrack(trackType.id);
      const trackClassIdSet = new Set(trackClasses.map((clubClass) => clubClass.id));

      acc[trackType.name] = {
        trackId: trackType.id,
        trackClasses,
        assigned: assignedClasses.filter((row) => trackClassIdSet.has(row.class_id)),
        available: trackClasses.filter((clubClass) => !assignedClassIds.has(clubClass.id)),
      };
      return acc;
    }, {});
  }, [clubTrackTypes, classesForTrack, assignedClasses, assignedClassIds]);

  return (
    <div ref={cardRef} className="w-full">
    <Card
      className="p-4 w-full rounded-xl shadow-sm overflow-visible"
      style={{
        borderColor: brand,
        background: palette?.surface || "#ffffff",
        paddingBottom: cardMenuPad ? `calc(1rem + ${cardMenuPad}px)` : undefined,
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">

        {/* LEFT SIDE — Avatar + Info */}
        <div className="flex items-center gap-4 min-w-0">
          {/* Avatar */}
          <div className="h-14 w-14 rounded-full overflow-hidden border border-gray-300 bg-gray-100 flex items-center justify-center">
            {driver.avatar_url ? (
              <img
                src={driver.avatar_url}
                alt="Avatar"
                className="h-full w-full object-cover"
              />
            ) : (
              <UserCircleIcon className="h-8 w-8 text-gray-400" />
            )}
          </div>

          {/* Name + Type + Number */}
          <div className="flex flex-col gap-0.5 min-w-0">
            <div className="text-sm font-semibold truncate">
              {driver.first_name} {driver.last_name}
            </div>

            <div className="text-xs text-text-muted">
              {isJunior ? "Junior Driver" : "Adult Driver"}
            </div>

            {number && (
              <div className="text-xs font-medium">
                Number: <span className="font-semibold">{number}</span>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT SIDE — Buttons */}
        <div className="flex flex-wrap gap-2 justify-end">
          <Button onClick={onEditProfile} className="!py-1.5 !text-xs">
            Edit Profile
          </Button>

          <Button
            variant="secondary"
            onClick={onViewProfile}
            className="!py-1.5 !text-xs"
          >
            View Profile
          </Button>
        </div>
</div>
      {/* Manage Classes Section */}
      <div className="mt-4 border-t border-surfaceBorder pt-4">
        <Button
          variant="ghost"
          onClick={() => setIsManageClassesExpanded(!isManageClassesExpanded)}
          className="w-full justify-between !pl-3 !pr-2 !py-2 text-sm font-semibold"
        >
          Manage Classes & Transponders {isManageClassesExpanded ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
        </Button>

        {isManageClassesExpanded && (
          <div className="manage-classes-panel mt-3 space-y-4 pl-3 min-w-0 overflow-visible">
            {classActionError && (
              <p className="text-xs text-red-600 rounded-md border border-red-200 bg-red-50 px-2 py-1.5">
                {classActionError}
              </p>
            )}
            <p className="text-xs text-text-muted leading-snug pr-1">
              Manage your classes and transponders. These details are used to automatically populate nominations and can be updated at any time.
            </p>
            {Object.keys(groupedClasses).length === 0 ? (
              <p className="text-sm text-text-muted">No classes or track types configured for this club.</p>
            ) : (
              Object.entries(groupedClasses).map(([trackTypeName, data]) => (
                <div key={trackTypeName} className="space-y-2">
                  <h4 className="text-sm font-semibold">{trackTypeName}</h4>
                  <div className="ml-0 sm:ml-2 space-y-2 min-w-0">
                    {data.assigned.length > 0 ? (
                      data.assigned.map((dc) => (
                        <div
                          key={dc.id}
                          className="flex w-full min-w-0 items-center gap-1.5 sm:gap-2"
                        >
                          <div style={{ "--dropdown-primary": brand }} className="min-w-0 flex-1">
                            <FilterDropdown
                              variant="cms"
                              compact
                              fullWidth
                              hideSelectedOption
                              menuScroll={false}
                              onMenuToggle={handleMenuToggle}
                              className="w-full"
                              ariaLabel={`Class for ${trackTypeName}`}
                              value={dc.class_id}
                              onChange={(classId) => handleChangeClass(dc.id, classId, data.trackId)}
                              options={data.trackClasses.map((clubClass) => ({
                                value: clubClass.id,
                                label: clubClass.name,
                              }))}
                            />
                          </div>
                          <TransponderCombobox
                            variant="cms"
                            menuScroll={false}
                            onMenuToggle={handleMenuToggle}
                            value={dc.transponder_number || ""}
                            suggestions={savedTransponders}
                            onChange={(value) => handleTransponderChange(dc.id, value)}
                            ariaLabel={`Transponder for ${dc.club_classes?.name || "class"}`}
                          />
                          <Button
                            variant="danger"
                            size="sm"
                            className="!p-0 !w-7 !h-7 !min-w-7 shrink-0"
                            aria-label="Remove class"
                            onClick={() => handleRemoveClass(dc.id)}
                          >
                            <XMarkIcon className="h-3.5 w-3.5" aria-hidden="true" />
                          </Button>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-text-muted">No classes assigned yet.</p>
                    )}

                    {pendingAddByTrack[data.trackId] && data.available.length > 0 && (
                      <div className="flex w-full min-w-0 items-center gap-1.5 sm:gap-2 pt-1">
                        <div style={{ "--dropdown-primary": brand }} className="min-w-0 flex-1">
                          <FilterDropdown
                            variant="cms"
                            compact
                            fullWidth
                            hideSelectedOption
                            menuScroll={false}
                            onMenuToggle={handleMenuToggle}
                            className="w-full"
                            ariaLabel={`Select class for ${trackTypeName}`}
                            value=""
                            onChange={(classId) => {
                              if (classId) handleAddClass(classId, data.trackId);
                            }}
                            options={[
                              { value: "", label: "Select class..." },
                              ...data.available.map((cc) => ({ value: cc.id, label: cc.name })),
                            ]}
                          />
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="!p-0 !w-7 !h-7 !min-w-7 shrink-0"
                          aria-label="Cancel add class"
                          onClick={() =>
                            setPendingAddByTrack((prev) => ({ ...prev, [data.trackId]: false }))
                          }
                        >
                          <XMarkIcon className="h-3.5 w-3.5" aria-hidden="true" />
                        </Button>
                      </div>
                    )}

                    {data.available.length > 0 && !pendingAddByTrack[data.trackId] && (
                      <div className="pt-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="!py-1.5 !text-xs"
                          onClick={() =>
                            setPendingAddByTrack((prev) => ({ ...prev, [data.trackId]: true }))
                          }
                        >
                          Add Class
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

      </div>
    </Card>
    </div>
  );
}
