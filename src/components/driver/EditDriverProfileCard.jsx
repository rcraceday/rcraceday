import { useTranslation } from "@/app/i18n/I18nContext";
// src/app/components/driver/EditDriverProfileCard.jsx

import { useState } from "react";
import useTheme from "@/app/providers/useTheme";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

import AvatarAndBasicInfoSection from "@/components/driver/profile-sections/AvatarAndBasicInfoSection";
import NumberAndColoursSection from "@/components/driver/profile-sections/NumberAndColoursSection";
import SponsorsSection from "@/components/driver/DriverProfileCard/sections/SponsorsSection";

import PersonalDetailsSection from "@/components/driver/profile-sections/PersonalDetailsSection";
import RacingInfoSection from "@/components/driver/profile-sections/RacingInfoSection";
import SicCarProfileSection from "@/components/driver/profile-sections/SicCarProfileSection";
import DirtCarProfileSection from "@/components/driver/profile-sections/DirtCarProfileSection";
import ExperienceSection from "@/components/driver/profile-sections/ExperienceSection";
import FunTriviaSection from "@/components/driver/profile-sections/FunTriviaSection";
import { isProfileSectionEnabled } from "@/app/lib/driverClubSettings";

export default function EditDriverProfileCard({
  driver,
  update,
  isMember,
  brand: brandProp,
  club,
  navigate,
  previewNumber,
  handleAvatarSelect,
  handleRemoveAvatar,
  save,
  saving = false,
  saveError = "",
  deleteDriver,
  showLivetimeNameNotice,
  livetimeNoticeBody,
  showLivetimeHints = true,
  lockNameFields = false,
  canDeleteDriver = true,
  canChooseNumber = true,
  canChangeNumber = true,
}) {
  const { t } = useTranslation();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { palette } = useTheme();
  const brand = brandProp || palette?.primary || "#0A66C2";

  if (!driver) return null;

  const joinUrl = `/${club.slug}/app/membership`;

  async function confirmDelete() {
    try {
      setDeleting(true);
      await deleteDriver(driver.id);
      navigate(`/${club.slug}/app/profile/drivers`);
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  }

  return (
    <>
      <Card
        className="w-full rounded-xl shadow-sm overflow-hidden !p-0 !pt-0"
        style={{ border: `2px solid ${brand}`, background: palette?.surface || "white" }}
      >
        {/* HEADER */}
        <div
          className="px-5 py-3"
          style={{ background: brand, color: palette?.buttonText || "white" }}
        >
          <h2 className="text-base font-semibold">{t("driverProfile.title")}</h2>
        </div>

        <div className="p-6 space-y-10">
          {/* AVATAR + BASIC INFO */}
          {isProfileSectionEnabled(club, "basic") && (
            <AvatarAndBasicInfoSection
              driver={driver}
              update={update}
              isMember={isMember}
              brand={brand}
              handleAvatarSelect={handleAvatarSelect}
              handleRemoveAvatar={handleRemoveAvatar}
              showLivetimeNameNotice={showLivetimeNameNotice}
              livetimeNoticeBody={livetimeNoticeBody}
              lockNameFields={lockNameFields}
            />
          )}

          {showLivetimeHints && isMember && (
            <p className="text-xs text-gray-600">{t("driverProfile.livetimeFieldsHint")}</p>
          )}

          {/* NON-MEMBER LOCKED BLOCK */}
          {!isMember && (
            <>
              <hr className="border-surfaceBorder" />

              <div
                className="space-y-6 p-6 rounded-lg"
                style={{
                  background: "#F5F5F5",
                  opacity: 0.6,
                  pointerEvents: "none",
                }}
              >
                {isProfileSectionEnabled(club, "colors_number") && (
                  <NumberAndColoursSection
                    driver={driver}
                    update={() => {}}
                    brand={brand}
                    club={club}
                    navigate={navigate}
                    previewNumber={previewNumber}
                    canChooseNumber={canChooseNumber}
                    canChangeNumber={canChangeNumber}
                  />
                )}

                <hr className="border-surfaceBorder" />

                {isProfileSectionEnabled(club, "trivia_sponsors") && (
                  <SponsorsSection driver={driver} update={() => {}} />
                )}
              </div>

              <div className="space-y-4 text-center">
                <p className="text-sm text-gray-700 font-medium">
                  {t("driverProfile.nonMemberUnlock")}
                </p>

                <button
                  onClick={() => navigate(joinUrl)}
                  className="px-6 py-3 rounded text-white text-sm font-semibold"
                  style={{ background: brand }}
                >
                  {t("driverProfile.joinMembership")}
                </button>
              </div>
            </>
          )}

          {/* MEMBER FULL PROFILE */}
          {isMember && (
            <>
              <hr className="border-surfaceBorder" />

              {isProfileSectionEnabled(club, "colors_number") && (
                <>
                  <NumberAndColoursSection
                    driver={driver}
                    update={update}
                    brand={brand}
                    club={club}
                    navigate={navigate}
                    previewNumber={previewNumber}
                    canChooseNumber={canChooseNumber}
                    canChangeNumber={canChangeNumber}
                  />
                  <hr className="border-surfaceBorder" />
                </>
              )}

              {isProfileSectionEnabled(club, "trivia_sponsors") && (
                <>
                  <SponsorsSection driver={driver} update={update} />
                  <hr className="border-surfaceBorder" />
                </>
              )}

              {isProfileSectionEnabled(club, "personal") && (
                <>
                  <PersonalDetailsSection driver={driver} update={update} />
                  <hr className="border-surfaceBorder" />
                </>
              )}

              {isProfileSectionEnabled(club, "racing") && (
                <>
                  <RacingInfoSection driver={driver} update={update} />
                  <hr className="border-surfaceBorder" />
                </>
              )}

              {isProfileSectionEnabled(club, "on_road") && (
                <>
                  <SicCarProfileSection driver={driver} update={update} />
                  <hr className="border-surfaceBorder" />
                </>
              )}

              {isProfileSectionEnabled(club, "off_road") && (
                <>
                  <DirtCarProfileSection driver={driver} update={update} />
                  <hr className="border-surfaceBorder" />
                </>
              )}

              {isProfileSectionEnabled(club, "experience") && (
                <>
                  <ExperienceSection driver={driver} update={update} />
                  <hr className="border-surfaceBorder" />
                </>
              )}

              {isProfileSectionEnabled(club, "trivia_sponsors") && (
                <FunTriviaSection driver={driver} update={update} />
              )}
            </>
          )}

          {/* SAVE + PREVIEW BUTTONS */}
          <div className="flex flex-col items-center gap-4 pt-4">
            {saveError ? (
              <p className="text-sm text-red-600 text-center max-w-md" role="alert">
                {saveError}
              </p>
            ) : null}
            <Button
              className="!w-auto px-6 py-3"
              onClick={() => save()}
              disabled={saving}
            >
              {saving ? t("common.saving") : t("driverProfile.saveChanges")}
            </Button>

            <Button
              variant="secondary"
              className="!w-auto px-6 py-3"
              onClick={() =>
                navigate(`/${club.slug}/app/profile/drivers/${driver.id}`)
              }
            >
              {t("driverProfile.previewProfile")}
            </Button>
          </div>
        </div>
      </Card>

      {canDeleteDriver && (
        <div className="flex flex-col items-center pt-4">
          <Button
            variant="danger"
            className="!w-auto px-6 py-3"
            onClick={() => setShowDeleteModal(true)}
            disabled={deleting}
          >
            {deleting ? t("driverProfile.deleting") : t("driverUi.deleteDriverTitle")}
          </Button>
        </div>
      )}

{/* DELETE DRIVER MODAL */}
{showDeleteModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
    <Card
      className="p-6 space-y-4 bg-white max-w-sm w-full"
    >
      <h3 className="text-lg font-semibold text-black">
        {t("driverUi.deleteDriverTitle")}
      </h3>

      <p className="text-sm text-black">
        {t("driverUi.deleteConfirm")}
        <br />
        <span className="text-red-600 font-semibold">
          {t("driverProfile.deleteCannotUndo")}
        </span>
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          variant="secondary"
          className="w-full"
          onClick={() => setShowDeleteModal(false)}
          disabled={deleting}
        >
          {t("cms.cancel")}
        </Button>

        <Button
          variant="danger"
          className="w-full"
          onClick={confirmDelete}
          disabled={deleting}
        >
          {deleting ? t("driverProfile.deleting") : t("driverUi.confirmDelete")}
        </Button>
      </div>
    </Card>
  </div>
)}
    </>
  );
}
