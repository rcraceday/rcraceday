// src/app/pages/membership/Membership.jsx

import { IdentificationIcon } from "@heroicons/react/24/solid";
import { useOutletContext } from "react-router-dom";
import { useMembership } from "@/app/providers/MembershipProvider";

import NonMemberView from "./membership-sections/NonMemberView";
import MemberView from "./membership-sections/MemberView";

export default function Membership() {
  const { club } = useOutletContext();
  const { membership } = useMembership();

  const brand = club?.theme?.hero?.backgroundColor || "#0A66C2";

  const isMember = membership?.isMember === true;

  return (
    <div className="min-h-screen w-full bg-background text-text-base">

      {/* PAGE HEADER */}
      <section className="w-full border-b border-surfaceBorder bg-surface">
        <div className="w-full mx-auto px-4 py-4 flex items-center gap-2">
          <IdentificationIcon className="w-5 h-5" style={{ color: brand }} />
          <h1 className="text-xl font-semibold tracking-tight">Membership</h1>
        </div>
      </section>

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
