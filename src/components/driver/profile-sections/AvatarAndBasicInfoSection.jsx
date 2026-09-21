// src/app/components/driver/profile-sections/AvatarAndBasicInfoSection.jsx

import { UserCircleIcon, PhotoIcon } from "@heroicons/react/24/solid";
import useTheme from "@/app/providers/useTheme";
import Input from "@/components/ui/Input";
import CustomFlagSelect from "@/components/ui/CustomFlagSelect";
import { COUNTRIES } from "@/data/countries";

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
            <select
              value={driver.gender || ""}
              onChange={(e) => update("gender", e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-sm"
            >
              <option value="">Select gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Non-Binary">Non-Binary</option>
              <option value="Prefer Not To Say">Prefer Not To Say</option>
            </select>
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
