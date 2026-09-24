// src/app/components/driver/profile-sections/AvatarAndBasicInfoSection.jsx

import { UserCircleIcon, PhotoIcon } from "@heroicons/react/24/solid";
import useTheme from "@/app/providers/useTheme";
import Input from "@/components/ui/Input";
import CustomFlagSelect from "@/components/ui/CustomFlagSelect";
import FilterDropdown from "@/components/ui/FilterDropdown";

const GENDER_OPTIONS = [
  { value: "", label: "Select gender" },
  { value: "Male", label: "Male" },
  { value: "Female", label: "Female" },
  { value: "Non-Binary", label: "Non-Binary" },
  { value: "Prefer Not To Say", label: "Prefer Not To Say" },
];

export default function AvatarAndBasicInfoSection({
  driver,
  update,
  isMember,
  brand: brandProp,
  handleAvatarSelect,
  handleRemoveAvatar,
}) {
  const { palette } = useTheme();
  const brand = brandProp || palette?.primary || "#0A66C2";

  return (
    <section className="space-y-10">
      {/* ------------------------------------------------------------
          AVATAR
      ------------------------------------------------------------ */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          Profile Photo
        </h3>

        <div className="flex flex-col items-center gap-4">
          {driver.avatar_url ? (
            <img
              src={driver.avatar_url}
              alt="Avatar"
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
                Change Photo
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarSelect}
                />
              </label>

              {driver.avatar_url && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  className="text-red-600 text-xs font-medium"
                >
                  Remove Photo
                </button>
              )}
            </div>
          ) : (
            <p className="text-xs text-gray-500">
              Only club members can change their profile photo.
            </p>
          )}
        </div>
      </div>

      <hr className="border-surfaceBorder" />

      {/* ------------------------------------------------------------
          BASIC INFO
      ------------------------------------------------------------ */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold">Basic Info</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="First Name"
            value={driver.first_name || ""}
            onChange={(e) => update("first_name", e.target.value)}
          />

          <Input
            label="Last Name"
            value={driver.last_name || ""}
            onChange={(e) => update("last_name", e.target.value)}
          />

          <Input
            label="Nickname"
            value={driver.nickname || ""}
            onChange={(e) => update("nickname", e.target.value)}
          />

          {/* GENDER */}
          <div>
            <label className="block text-sm font-medium mb-1">Gender</label>
            <FilterDropdown
              variant="cms"
              value={driver.gender || ""}
              onChange={(value) => update("gender", value)}
              options={GENDER_OPTIONS}
              ariaLabel="Gender"
              triggerStyleOverrides={{ fontSize: "0.875rem" }}
            />
          </div>

          {/* COUNTRY */}
          <div>
            <label className="block text-sm font-medium mb-1">Country</label>
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
