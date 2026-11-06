import { supabase } from "@/supabaseClient";
import { findDuplicateDriverNameInClub } from "@/app/lib/driverNameUniqueness";
import { canAddHouseholdDriver } from "@/app/pages/profile/householdDriverLimits";
import { linkDriverToPlatformPerson, linkDriverToPlatformPersonId } from "@/app/lib/platformPeople";

export function driverAtClubMatchesPerson(driverList, person) {
  if (!person || !Array.isArray(driverList)) return false;
  const fn = String(person.first_name || "").trim().toLowerCase();
  const ln = String(person.last_name || "").trim().toLowerCase();
  return driverList.some(
    (d) =>
      (d.platform_person_id && d.platform_person_id === person.id) ||
      (String(d.first_name || "").trim().toLowerCase() === fn &&
        String(d.last_name || "").trim().toLowerCase() === ln &&
        !!d.is_junior === !!person.is_junior)
  );
}

/**
 * Create or link a club driver from account roster / manual name (welcome + club access).
 * @param {object} ctx
 * @param {string} ctx.userId
 * @param {object} ctx.club
 * @param {object|null} ctx.membership - household_memberships row (required unless non-member flow uses null membership_id)
 * @param {string} ctx.membershipType
 * @param {boolean} ctx.isNonMember
 * @param {Array} ctx.clubMembers
 * @param {Array} ctx.driversAtClub
 * @param {number} ctx.maxAdults
 * @param {number} ctx.maxJuniors
 * @param {function} ctx.t - i18n t()
 * @param {string} trimmedFirst
 * @param {string} trimmedLast
 * @param {boolean} isJun
 * @param {string|null} platformPersonId
 */
export async function addClubDriverForPlatformPerson(
  ctx,
  { trimmedFirst, trimmedLast, isJun, platformPersonId = null }
) {
  const {
    userId,
    club,
    membership,
    membershipType,
    isNonMember,
    clubMembers,
    driversAtClub,
    maxAdults,
    maxJuniors,
    t,
  } = ctx;

  const duplicateMessage = () => t("drivers.importError.duplicate_name");
  const membershipId = membership?.id ?? null;

  if (isNonMember) {
    if (
      !canAddHouseholdDriver({
        membershipType,
        isJunior: isJun,
        drivers: driversAtClub,
        clubMembers,
        maxAdults,
        maxJuniors,
      })
    ) {
      return {
        ok: false,
        error:
          isJun
            ? t("drivers.welcomeHouseholdLimitJunior", { max: maxJuniors })
            : t("drivers.welcomeHouseholdLimitAdult", { max: maxAdults }),
      };
    }

    const { duplicate, existing, error: dupErr } = await findDuplicateDriverNameInClub({
      clubId: club.id,
      firstName: trimmedFirst,
      lastName: trimmedLast,
      club,
    });
    if (dupErr) return { ok: false, error: t("drivers.importError.duplicate_check_failed") };
    if (duplicate && existing?.id) {
      if (platformPersonId) {
        await linkDriverToPlatformPersonId(supabase, {
          driverId: existing.id,
          platformPersonId,
        });
        return { ok: true, skipped: true };
      }
      return { ok: false, error: duplicateMessage() };
    }

    const { data: guestDriver, error: insertError } = await supabase
      .from("drivers")
      .insert({
        membership_id: null,
        club_id: club.id,
        first_name: trimmedFirst,
        last_name: trimmedLast,
        is_junior: isJun,
        created_by: userId,
        ...(platformPersonId ? { platform_person_id: platformPersonId } : {}),
      })
      .select("id")
      .single();

    if (insertError) return { ok: false, error: insertError.message };

    if (!platformPersonId) {
      await linkDriverToPlatformPerson(supabase, {
        driverId: guestDriver?.id,
        userId,
        firstName: trimmedFirst,
        lastName: trimmedLast,
        isJunior: isJun,
      });
    } else if (guestDriver?.id) {
      await linkDriverToPlatformPersonId(supabase, {
        driverId: guestDriver.id,
        platformPersonId,
      });
    }

    return { ok: true };
  }

  if (!membershipId) {
    return { ok: false, error: t("drivers.welcomeMembershipInactive") };
  }

  if (membershipType === "family") {
    if (
      !canAddHouseholdDriver({
        membershipType,
        isJunior: isJun,
        drivers: driversAtClub,
        clubMembers,
        maxAdults,
        maxJuniors,
      })
    ) {
      return {
        ok: false,
        error:
          isJun
            ? t("drivers.welcomeFamilyLimitJunior", { max: maxJuniors })
            : t("drivers.welcomeFamilyLimitAdult", { max: maxAdults }),
      };
    }
  }

  const { duplicate, existing, error: dupErr } = await findDuplicateDriverNameInClub({
    clubId: club.id,
    firstName: trimmedFirst,
    lastName: trimmedLast,
    club,
  });
  if (dupErr) return { ok: false, error: t("drivers.importError.duplicate_check_failed") };
  if (duplicate && existing?.id) {
    if (platformPersonId) {
      await linkDriverToPlatformPersonId(supabase, {
        driverId: existing.id,
        platformPersonId,
      });
      return { ok: true, skipped: true };
    }
    return { ok: false, error: duplicateMessage() };
  }

  const { data: existingMembers } = await supabase
    .from("club_members")
    .select("*")
    .eq("membership_id", membershipId)
    .eq("first_name", trimmedFirst)
    .eq("last_name", trimmedLast);

  let memberRow =
    existingMembers && existingMembers.length > 0 ? existingMembers[0] : null;

  let driver = null;

  const createDriverIfNeeded = async () => {
    if (memberRow?.driver_id) {
      const { data: existingDriver } = await supabase
        .from("drivers")
        .select("*")
        .eq("id", memberRow.driver_id)
        .single();

      if (existingDriver) {
        if (platformPersonId && existingDriver.id) {
          await linkDriverToPlatformPersonId(supabase, {
            driverId: existingDriver.id,
            platformPersonId,
          });
        }
        return existingDriver;
      }
    }

    const { data: newDriver, error: newDriverError } = await supabase
      .from("drivers")
      .insert({
        membership_id: membershipId,
        club_id: club.id,
        first_name: trimmedFirst,
        last_name: trimmedLast,
        is_junior: isJun,
        created_by: userId,
        ...(platformPersonId ? { platform_person_id: platformPersonId } : {}),
      })
      .select()
      .single();

    if (newDriverError) return null;

    if (!platformPersonId) {
      await linkDriverToPlatformPerson(supabase, {
        driverId: newDriver?.id,
        userId,
        firstName: trimmedFirst,
        lastName: trimmedLast,
        isJunior: isJun,
      });
    } else if (newDriver?.id) {
      await linkDriverToPlatformPersonId(supabase, {
        driverId: newDriver.id,
        platformPersonId,
      });
    }

    await supabase.rpc("reconcile_driver_number", {
      p_club_id: club.id,
      p_driver_id: newDriver.id,
      p_first_name: trimmedFirst,
      p_last_name: trimmedLast,
    });

    return newDriver;
  };

  if (memberRow) {
    if (memberRow.is_junior !== isJun) {
      await supabase.from("club_members").update({ is_junior: isJun }).eq("id", memberRow.id);
    }

    driver = await createDriverIfNeeded();

    if (!driver) {
      return { ok: false, error: t("drivers.welcomeCreateDriverFailed") };
    }

    if (memberRow.driver_id !== driver.id) {
      await supabase.from("club_members").update({ driver_id: driver.id }).eq("id", memberRow.id);
    }
  } else {
    const { data: newMember, error: newMemberError } = await supabase
      .from("club_members")
      .insert({
        membership_id: membershipId,
        club_id: club.id,
        first_name: trimmedFirst,
        last_name: trimmedLast,
        is_junior: isJun,
        slot_index: null,
      })
      .select()
      .single();

    if (newMemberError) {
      return { ok: false, error: t("drivers.welcomeAddMemberFailed") };
    }

    memberRow = newMember;
    driver = await createDriverIfNeeded();

    if (!driver) {
      return { ok: false, error: t("drivers.welcomeCreateDriverFailed") };
    }

    await supabase.from("club_members").update({ driver_id: driver.id }).eq("id", memberRow.id);
  }

  return { ok: true };
}
