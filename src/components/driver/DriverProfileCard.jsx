// src/app/components/driver/DriverProfileCard.jsx

import React from "react";
import useTheme from "@/app/providers/useTheme";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

import { MANUFACTURERS } from "@/data/manufacturers";
import { COUNTRIES } from "@/data/countries";

import AvatarSection from "./DriverProfileCard/sections/AvatarSection";
import IdentitySection from "./DriverProfileCard/sections/IdentitySection";
import NumberNicknameSection from "./DriverProfileCard/sections/NumberNicknameSection";
import TeamChassisTrackSection from "./DriverProfileCard/sections/TeamChassisTrackSection";
import SponsorsSection from "./DriverProfileCard/sections/SponsorsSection";

import PersonalDetailsSection from "./DriverProfileCard/sections/PersonalDetailsSection";
import RacingInformationSection from "./DriverProfileCard/sections/RacingInformationSection";
import SicCarProfileSection from "./DriverProfileCard/sections/SicCarProfileSection";
import DirtCarProfileSection from "./DriverProfileCard/sections/DirtCarProfileSection";
import ExperienceSection from "./DriverProfileCard/sections/ExperienceSection";
import TriviaSection from "./DriverProfileCard/sections/TriviaSection";

import MobileLayout from "./DriverProfileCard/sections/MobileLayout";
import SectionWrapper from "./DriverProfileCard/sections/SectionWrapper";

export default function DriverProfileCard({ driver, club, isMember, navigate }) {
  const { palette } = useTheme();

  if (!driver || !club) return null;

  const brand = palette?.primary || "#0A66C2";
  const country = COUNTRIES.find((c) => c.name === driver.country);
  const chassis = MANUFACTURERS.find((m) => m.name === driver.manufacturer);

  return (
    <div className="relative">

      {/* GREYED OUT CARD WHEN NOT MEMBER */}
      <div
        className={!isMember ? "opacity-40 pointer-events-none" : ""}
        style={!isMember ? { filter: "grayscale(100%)" } : {}}
      >
        <Card
          className="w-full rounded-xl shadow-sm overflow-hidden !p-0 !pt-0"
          style={{ background: palette?.surface || "#ffffff", borderColor: palette?.surfaceBorder || "#e5e7eb" }}
        >
          {/* HEADER */}
          <div
            className="px-5 py-3"
            style={{ background: brand, color: palette?.buttonText || "#ffffff" }}
          >
            <h2 className="text-base font-semibold">Driver Profile</h2>
          </div>

          {/* BODY */}
          <div className="p-6 space-y-10">

            {/* DESKTOP HEADER AREA */}
            <div className="hidden md:grid md:grid-cols-12 md:gap-6">
              <AvatarSection driver={driver} country={country} />
              <NumberNicknameSection driver={driver} brand={brand} />
              <div className="col-span-6 space-y-4">
                <IdentitySection driver={driver} />
                <TeamChassisTrackSection driver={driver} chassis={chassis} />
                <SponsorsSection driver={driver} brand={brand} />
              </div>
            </div>

            {/* MOBILE HEADER AREA */}
            <div className="md:hidden">
              <MobileLayout
                driver={driver}
                country={country}
                brand={brand}
                chassis={chassis}
              />
            </div>

            {/* MOBILE STACKED SECTIONS */}
            <div className="md:hidden space-y-10">
              <PersonalDetailsSection driver={driver} />
              <RacingInformationSection driver={driver} chassis={chassis} />
              <SicCarProfileSection driver={driver} />
              <DirtCarProfileSection driver={driver} />
              <ExperienceSection driver={driver} />
              <TriviaSection driver={driver} />
            </div>

            {/* DESKTOP TWO-ROW LAYOUT */}
            <div className="hidden md:grid md:grid-cols-12 md:gap-6">
              <div className="col-span-6">
                <SectionWrapper title="Personal Details" brand={brand}>
                  <PersonalDetailsSection driver={driver} />
                </SectionWrapper>
              </div>

              <div className="col-span-6">
                <SectionWrapper title="Racing Information" brand={brand}>
                  <RacingInformationSection driver={driver} chassis={chassis} />
                </SectionWrapper>
              </div>

              <div className="col-span-6">
                <SectionWrapper title="SIC Car Profile" brand={brand}>
                  <SicCarProfileSection driver={driver} />
                </SectionWrapper>
              </div>

              <div className="col-span-6">
                <SectionWrapper title="Dirt Car Profile" brand={brand}>
                  <DirtCarProfileSection driver={driver} />
                </SectionWrapper>
              </div>

              <div className="col-span-6">
                <SectionWrapper title="Experience & Preferences" brand={brand}>
                  <ExperienceSection driver={driver} />
                </SectionWrapper>
              </div>

              <div className="col-span-6">
                <SectionWrapper title="Fun / Trivia" brand={brand}>
                  <TriviaSection driver={driver} />
                </SectionWrapper>
              </div>
            </div>

          </div>
        </Card>
      </div>

      {/* MEMBERSHIP OVERLAY */}
      {!isMember && (
        <div className="absolute inset-0 flex items-center justify-center px-4">
          <Card
            className="p-8 max-w-md text-center space-y-6"
          >
            <h3 className="text-lg font-semibold" style={{ color: brand }}>
              Members Only Feature
            </h3>

            <p className="text-sm" style={{ color: palette?.textMuted || "#6b7280" }}>
              Become a club member to unlock full driver profiles and enjoy these benefits:
            </p>

            <ul className="text-sm space-y-1 text-left mx-auto w-fit" style={{ color: palette?.text || "#1f2937" }}>
              <li>50% off race fees</li>
              <li>Insurance coverage</li>
              <li>Junior members race free</li>
              <li>Access to RCRA sanctioned events</li>
              <li>Helps increase the club’s profile for council and government investment</li>
              <li>Voting rights at AGM</li>
            </ul>

            <Button
              className="w-full"
              onClick={() => navigate(`/${club.slug}/app/membership`)}
            >
              Join Membership
            </Button>

            <Button
              variant="secondary"
              className="w-full"
              onClick={() => navigate(`/${club.slug}/app/profile/drivers`)}
            >
              Return to Drivers
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
}
