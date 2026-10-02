import { useClub } from "@/app/providers/ClubProvider";
import { useMembership } from "@/app/providers/MembershipProvider";
import { membershipHasFeature } from "@/app/lib/membershipClubLimits";

export default function useDriverProfilesAccess() {
  const { club, loadingClub } = useClub();
  const { membership, loadingMembership } = useMembership();

  const allowed = membershipHasFeature(
    club,
    membership?.membership_type,
    "driver_profiles"
  );

  return {
    allowed,
    loading: loadingClub || loadingMembership,
    club,
    membership,
  };
}
