import { useClub } from "@/app/providers/ClubProvider";
import { useMembership } from "@/app/providers/MembershipProvider";
import { canAccessExtendedDriverProfile } from "@/app/lib/membershipClubLimits";

/** Extended profile sections + browsing other members’ profiles (not Driver Manager / LiveTime essentials). */
export default function useDriverProfilesAccess() {
  const { club, loadingClub } = useClub();
  const { membership, loadingMembership } = useMembership();

  const allowed = canAccessExtendedDriverProfile(club, membership);

  return {
    allowed,
    loading: loadingClub || loadingMembership,
    club,
    membership,
  };
}
