import { useTranslation } from "@/app/i18n/I18nContext";
// src/app/components/driver/DriverProfileCard/sections/MobileLayout.jsx

import React from "react";
import useTheme from "@/app/providers/useTheme";

import AvatarSection from "./AvatarSection";
import IdentitySection from "./IdentitySection";
import NumberNicknameSection from "./NumberNicknameSection";
import TeamChassisTrackSection from "./TeamChassisTrackSection";
import SponsorsSection from "./SponsorsSection";

import PersonalDetailsSection from "./PersonalDetailsSection";
import RacingInformationSection from "./RacingInformationSection";
import SicCarProfileSection from "./SicCarProfileSection";
import DirtCarProfileSection from "./DirtCarProfileSection";
import ExperienceSection from "./ExperienceSection";
import TriviaSection from "./TriviaSection";

export default function MobileLayout({ driver, country, brand: brandProp, chassis }) {
  const { t } = useTranslation();
  const { palette } = useTheme();
  const brand = brandProp || palette?.primary || "#0A66C2";

  return (
    <div className="space-y-10">

      {/* TOP AREA */}
      <div className="space-y-6">
        <AvatarSection driver={driver} country={country} />
        <IdentitySection driver={driver} />
        <NumberNicknameSection driver={driver} brand={brand} />
      </div>

      {/* TEAM / CHASSIS / TRACK / SPONSORS */}
      <div className="space-y-4">
        <TeamChassisTrackSection driver={driver} chassis={chassis} />
        <SponsorsSection driver={driver} brand={brand} />
      </div>

      {/* PERSONAL DETAILS */}
      <div
        className="-mx-3 px-3 py-2 rounded-lg"
        style={{ backgroundColor: brand, color: "white" }}
      >
        <h3 className="text-sm font-semibold">{t("driverProfile.personalDetails")}</h3>
      </div>
      <PersonalDetailsSection driver={driver} />

      {/* RACING INFORMATION */}
      <div
        className="-mx-3 px-3 py-2 rounded-lg"
        style={{ backgroundColor: brand, color: "white" }}
      >
        <h3 className="text-sm font-semibold">{t("driverProfile.racingInformation")}</h3>
      </div>
      <RacingInformationSection driver={driver} chassis={chassis} update={driver.update} />

      {/* SIC CAR PROFILE */}
      <div
        className="-mx-3 px-3 py-2 rounded-lg"
        style={{ backgroundColor: brand, color: "white" }}
      >
        <h3 className="text-sm font-semibold">{t("driverProfile.sicCarProfileShort")}</h3>
      </div>
      <SicCarProfileSection driver={driver} />

      {/* DIRT CAR PROFILE */}
      <div
        className="-mx-3 px-3 py-2 rounded-lg"
        style={{ backgroundColor: brand, color: "white" }}
      >
        <h3 className="text-sm font-semibold">{t("driverProfile.dirtCarProfileShort")}</h3>
      </div>
      <DirtCarProfileSection driver={driver} />

      {/* EXPERIENCE */}
      <div
        className="-mx-3 px-3 py-2 rounded-lg"
        style={{ backgroundColor: brand, color: "white" }}
      >
        <h3 className="text-sm font-semibold">{t("driverProfile.experience")}</h3>
      </div>
      <ExperienceSection driver={driver} />

      {/* TRIVIA */}
      <div
        className="-mx-3 px-3 py-2 rounded-lg"
        style={{ backgroundColor: brand, color: "white" }}
      >
        <h3 className="text-sm font-semibold">{t("driverProfile.funTrivia")}</h3>
      </div>
      <TriviaSection driver={driver} />

    </div>
  );
}
