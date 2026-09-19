// src/app/pages/membership/Membership.jsx

import { IdentificationIcon } from "@heroicons/react/24/solid";
import { useOutletContext } from "react-router-dom";
import { useMembership } from "@/app/providers/MembershipProvider";
import PageTitle from "@/components/ui/PageTitle";

import NonMemberView from "./membership-sections/NonMemberView";
import MemberView from "./membership-sections/MemberView";

export default function Membership() {
  const { club } = useOutletContext();
  const { membership } = useMembership();

  const brand = club?.theme?.hero?.backgroundColor || "#0A66C2";

  const isMember = membership?.isMember === true;

  return (
    <div className="min-h-screen w-full bg-background text-text-base">

      <PageTitle
        icon={IdentificationIcon}
        title="Membership"
        style={{ color: brand }}
      />

      {/* ROUTING */}
      {isMember ? (
        <MemberView
          brand={brand}
          club={club}
          membership={membership}
        />
      ) : (
        <NonMemberView
          brand={brand}
          club={club}
        />
      )}
    </div>
  );
}
