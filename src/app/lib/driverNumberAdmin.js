import { supabase } from "@/supabaseClient";

export async function unassignDriverNumber(clubId, driverId) {
  if (!clubId || !driverId) return { error: null };

  await supabase
    .from("numbers")
    .update({
      status: "available",
      assigned_to_driver: null,
      assigned_driver_name: null,
      assigned_driver_email: null,
    })
    .eq("club_id", clubId)
    .eq("assigned_to_driver", driverId);

  const { error } = await supabase
    .from("drivers")
    .update({ permanent_number: null })
    .eq("id", driverId);

  return { error };
}

export async function updateNumberPoolFlags(clubId, numberId, patch) {
  const { error } = await supabase
    .from("numbers")
    .update(patch)
    .eq("club_id", clubId)
    .eq("id", numberId);
  return { error };
}

export async function assignNumberToDriver(clubId, driverId, number) {
  if (!clubId || !driverId || number == null || number === "") {
    return { error: { message: "Missing club, driver, or number." } };
  }

  const { error } = await supabase.rpc("assign_number", {
    p_club_id: clubId,
    p_driver_id: driverId,
    p_number: Number(number),
  });

  return { error };
}

export async function removeNumberFromPool(clubId, numberRow) {
  if (!clubId || !numberRow?.id) {
    return { error: { message: "Invalid number." } };
  }

  if (numberRow.assigned_to_driver) {
    return { error: { message: "ASSIGNED" } };
  }

  const { error } = await supabase
    .from("numbers")
    .delete()
    .eq("club_id", clubId)
    .eq("id", numberRow.id);

  return { error };
}
