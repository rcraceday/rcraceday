// src/app/pages/membership/Membership.jsx

import { IdentificationIcon } from "@heroicons/react/24/solid";
import { useOutletContext } from "react-router-dom";
import { useMembership } from "@/app/providers/MembershipProvider";
import useTheme from "@/app/providers/useTheme";
import PageTitle from "@/components/ui/PageTitle";
import { useTranslation } from "@/app/i18n/I18nContext";

import NonMemberView from "./membership-sections/NonMemberView";
import MemberView from "./membership-sections/MemberView";

export default function Membership() {
  const { club } = useOutletContext();
  const { membership } = useMembership();
  const { palette } = useTheme();
  const { t } = useTranslation();

  const brand = palette?.primary || "#00438a";

  const isMember = membership?.isMember === true;

  return (
    <div className="min-h-screen w-full bg-background text-text-base">

      <PageTitle
        icon={IdentificationIcon}
        title={t("membership.title")}
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
