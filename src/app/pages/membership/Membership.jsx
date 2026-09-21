// src/app/pages/membership/Membership.jsx

import { ArrowLeftIcon, IdentificationIcon } from "@heroicons/react/24/solid";
import { useNavigate, useOutletContext } from "react-router-dom";
import { useMembership } from "@/app/providers/MembershipProvider";
import useTheme from "@/app/providers/useTheme";
import PageTitle from "@/components/ui/PageTitle";
import Button from "@/components/ui/Button";

import NonMemberView from "./membership-sections/NonMemberView";
import MemberView from "./membership-sections/MemberView";

export default function Membership() {
  const { club } = useOutletContext();
  const navigate = useNavigate();
  const { membership } = useMembership();
  const { palette } = useTheme();

  const brand = palette?.primary || "#00438a";

  const isMember = membership?.isMember === true;

  return (
    <div className="min-h-screen w-full bg-background text-text-base">

      <PageTitle
        icon={IdentificationIcon}
        title="Membership"
        style={{ color: brand }}
        actions={
          <Button
            variant="primary"
            className="!py-1 !px-3 !text-xs !rounded-sm flex items-center gap-1"
            onClick={() => navigate(`/${club?.slug}/app/profile`)}
          >
            <ArrowLeftIcon className="h-3 w-3" />
            Back
          </Button>
        }
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
