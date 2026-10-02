import { useTranslation } from "@/app/i18n/I18nContext";
// src/app/components/driver/profile-sections/AvatarAndBasicInfoSection.jsx

import { UserCircleIcon, PhotoIcon } from "@heroicons/react/24/solid";
import useTheme from "@/app/providers/useTheme";
import Input from "@/components/ui/Input";
import CustomFlagSelect from "@/components/ui/CustomFlagSelect";
import FilterDropdown from "@/components/ui/FilterDropdown";

export default function AvatarAndBasicInfoSection({
  driver,
  update,
  isMember,
  brand: brandProp,
  handleAvatarSelect,
  handleRemoveAvatar,
  showLivetimeNameNotice,
  livetimeNoticeBody,
  lockNameFields = false,
}) {
  const { t } = useTranslation();
  const { palette } = useTheme();
  const brand = brandProp || palette?.primary || "#0A66C2";

  const genderOptions = [
    { value: "", label: t("driverProfile.genderSelect") },
    { value: "Male", label: t("driverProfile.genderMale") },
    { value: "Female", label: t("driverProfile.genderFemale") },
    { value: "Non-Binary", label: t("driverProfile.genderNonBinary") },
    { value: "Prefer Not To Say", label: t("driverProfile.genderPreferNot") },
  ];

  return (
    <section className="space-y-10">
      {/* ------------------------------------------------------------
          AVATAR
      ------------------------------------------------------------ */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          {t("driverProfile.profilePhoto")}
        </h3>

        <div className="flex flex-col items-center gap-4">
          {driver.avatar_url ? (
            <img
              src={driver.avatar_url}
              alt={t("driverUi.avatarAlt")}
              className="h-32 w-32 rounded-full object-cover border border-gray-300"
            />
          ) : (
            <UserCircleIcon className="h-32 w-32 text-gray-300" />
          )}

          {isMember ? (
            <div className="flex flex-col items-center gap-2">
              <label
                className="cursor-pointer flex items-center gap-2 text-sm font-medium"
                style={{ color: brand }}
              >
                <PhotoIcon className="h-5 w-5" />
                {t("driverProfile.changePhoto")}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleAvatarSelect(file);
                    e.target.value = "";
                  }}
                />
              </label>

              {driver.avatar_url && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  className="text-red-600 text-xs font-medium"
                >
                  {t("driverProfile.removePhoto")}
                </button>
              )}
            </div>
          ) : (
            <p className="text-xs text-gray-500">
              {t("driverProfile.membersOnlyPhoto")}
            </p>
          )}
        </div>
      </div>

      <hr className="border-surfaceBorder" />

      {/* ------------------------------------------------------------
          BASIC INFO
      ------------------------------------------------------------ */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold">{t("driverProfile.basicInfo")}</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label={t("driverProfile.firstName")}
            value={driver.first_name || ""}
            onChange={(e) => update("first_name", e.target.value)}
            disabled={lockNameFields}
          />

          <Input
            label={t("driverProfile.lastName")}
            value={driver.last_name || ""}
            onChange={(e) => update("last_name", e.target.value)}
            disabled={lockNameFields}
          />

          {showLivetimeNameNotice && (
            <div className="md:col-span-2 rounded-md bg-yellow-300 p-3 space-y-1 text-black">
              <p className="text-sm font-semibold">{t("driverProfile.livetimeNameMatch")}</p>
              <p className="text-sm">
                {livetimeNoticeBody || t("driverProfile.livetimeNoticeBody")}
              </p>
            </div>
          )}

          <Input
            label={t("driverProfile.nickname")}
            value={driver.nickname || ""}
            onChange={(e) => update("nickname", e.target.value)}
          />

          {/* GENDER */}
          <div>
            <label className="block text-sm font-medium mb-1">{t("driverProfile.gender")}</label>
            <FilterDropdown
              variant="cms"
              value={driver.gender || ""}
              onChange={(value) => update("gender", value)}
              options={genderOptions}
              ariaLabel={t("driverProfile.gender")}
              triggerStyleOverrides={{ fontSize: "0.875rem" }}
            />
          </div>

          {/* COUNTRY */}
          <div>
            <label className="block text-sm font-medium mb-1">{t("driverProfile.country")}</label>
            <CustomFlagSelect
              value={driver.country}
              onChange={(val) => update("country", val)}
              brand={brand}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
