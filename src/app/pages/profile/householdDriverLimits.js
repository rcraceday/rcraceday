export function normalizeMembershipProductType(raw) {
  const type = (raw || "").toLowerCase().trim();
  if (type === "single" || type === "adult" || type === "individual") return "adult";
  if (type.includes("family")) return "family";
  if (type === "junior") return "junior";
  return type;
}

/** Membership product types available when joining (family is always included). */
export function allowedMembershipProductTypesFromDrivers(drivers = []) {
  const list = Array.isArray(drivers) ? drivers : [];
  const allowed = new Set(["family"]);

  if (list.length === 0) {
    allowed.add("adult");
    allowed.add("junior");
    return allowed;
  }

  if (list.length === 1) {
    allowed.add(list[0].is_junior ? "junior" : "adult");
    return allowed;
  }

  return allowed;
}

export function membershipJoinDriverNote(drivers = []) {
  const list = Array.isArray(drivers) ? drivers : [];
  if (list.length <= 1) return "";
  return (
    "Family membership is available for your household. Single Adult and Junior options require " +
    "exactly one matching driver — remove extra drivers in Driver Manager if you prefer those instead."
  );
}

export function canUpgradeMembershipToFamily(membershipType) {
  const type = normalizeMembershipProductType(membershipType);
  return type === "adult" || type === "junior";
}

export function membershipUpgradeDifferenceAmount(currentPrice, targetPrice) {
  return Math.max(Number(targetPrice || 0) - Number(currentPrice || 0), 0);
}

/** Pairs of catalog rows (current tier + family) keyed by duration/period. */
function productMatchesMembershipTier(productType, membershipType) {
  return (
    normalizeMembershipProductType(productType) ===
    normalizeMembershipProductType(membershipType)
  );
}

export function familyUpgradeOptionsFromProducts(products, currentMembershipType) {
  const list = Array.isArray(products) ? products : [];

  const familyProducts = list.filter(
    (p) => normalizeMembershipProductType(p.type) === "family"
  );
  const currentProducts = list.filter((p) =>
    productMatchesMembershipTier(p.type, currentMembershipType)
  );

  const optionKey = (p) =>
    `${p.duration || "full"}:${p.period || ""}`.toLowerCase();

  const currentByKey = new Map(currentProducts.map((p) => [optionKey(p), p]));

  return familyProducts
    .map((familyProduct) => {
      const currentProduct = currentByKey.get(optionKey(familyProduct));
      if (!currentProduct) return null;

      return {
        key: optionKey(familyProduct),
        duration: familyProduct.duration,
        period: familyProduct.period,
        familyProduct,
        currentProduct,
        difference: membershipUpgradeDifferenceAmount(
          currentProduct.price,
          familyProduct.price
        ),
      };
    })
    .filter(Boolean);
}

function usesHouseholdSlotLimits(membershipType) {
  return membershipType === "family" || membershipType === "non_member";
}

export function countHouseholdSlots(drivers = [], clubMembers = []) {
  const driverList = Array.isArray(drivers) ? drivers : [];
  const members = Array.isArray(clubMembers) ? clubMembers : [];

  const adults =
    driverList.filter((d) => !d.is_junior).length +
    members.filter((m) => !m.is_junior && !m.driver_id).length;

  const juniors =
    driverList.filter((d) => d.is_junior).length +
    members.filter((m) => m.is_junior && !m.driver_id).length;

  return { adults, juniors };
}

export function canAddHouseholdDriver({
  membershipType,
  isJunior,
  drivers,
  clubMembers,
  maxAdults,
  maxJuniors,
}) {
  if (!membershipType) return true;

  if (usesHouseholdSlotLimits(membershipType)) {
    const { adults, juniors } = countHouseholdSlots(drivers, clubMembers);
    if (isJunior) return juniors < maxJuniors;
    return adults < maxAdults;
  }

  return (drivers?.length ?? 0) === 0;
}

export function canShowAddDriverButton({
  membershipType,
  drivers,
  clubMembers,
  maxAdults,
  maxJuniors,
}) {
  if (!membershipType) return true;

  if (usesHouseholdSlotLimits(membershipType)) {
    const { adults, juniors } = countHouseholdSlots(drivers, clubMembers);
    return adults < maxAdults || juniors < maxJuniors;
  }

  return (drivers?.length ?? 0) === 0;
}
