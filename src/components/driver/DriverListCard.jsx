// src/components/driver/DriverListCard.jsx

import useTheme from "@/app/providers/useTheme";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { UserCircleIcon } from "@heroicons/react/24/solid";

export default function DriverListCard({
  driver,
  brand: brandProp,
  onEditProfile,
  onViewProfile,
}) {
  const { palette } = useTheme();
  const brand = brandProp || palette?.primary || "#0A66C2";
  if (!driver) return null;

  const isJunior = !!driver.is_junior;
  const number =
    driver.permanent_number ||
    driver.number ||
    driver.driver_number ||
    null;

  return (
    <Card
      className="p-4 w-full rounded-xl shadow-sm"
      style={{ borderColor: brand, background: palette?.surface || "#ffffff" }}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">

        {/* LEFT SIDE — Avatar + Info */}
        <div className="flex items-center gap-4 min-w-0">
          {/* Avatar */}
          <div className="h-14 w-14 rounded-full overflow-hidden border border-gray-300 bg-gray-100 flex items-center justify-center">
            {driver.avatar_url ? (
              <img
                src={driver.avatar_url}
                alt="Avatar"
                className="h-full w-full object-cover"
              />
            ) : (
              <UserCircleIcon className="h-8 w-8 text-gray-400" />
            )}
          </div>

          {/* Name + Type + Number */}
          <div className="flex flex-col gap-0.5 min-w-0">
            <div className="text-sm font-semibold truncate">
              {driver.first_name} {driver.last_name}
            </div>

            <div className="text-xs text-text-muted">
              {isJunior ? "Junior Driver" : "Adult Driver"}
            </div>

            {number && (
              <div className="text-xs font-medium">
                Number: <span className="font-semibold">{number}</span>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT SIDE — Buttons */}
        <div className="flex flex-wrap gap-2 justify-end">
          <Button onClick={onEditProfile} className="!py-1.5 !text-xs">
            Edit Profile
          </Button>

          <Button
            variant="secondary"
            onClick={onViewProfile}
            className="!py-1.5 !text-xs"
          >
            View Profile
          </Button>
        </div>
      </div>
    </Card>
  );
}
