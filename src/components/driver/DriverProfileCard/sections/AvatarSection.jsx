import React from "react";
import { UserCircleIcon } from "@heroicons/react/24/solid";
import { useTranslation } from "@/app/i18n/I18nContext";

export default function AvatarSection({ driver, country }) {
  const { t } = useTranslation();
  return (
    <div className="col-span-3 flex flex-col items-center text-center space-y-3">

      <div className="h-40 w-40 rounded-full overflow-hidden border bg-gray-100 flex items-center justify-center">
        {driver.avatar_url ? (
          <img
            src={driver.avatar_url}
            alt="Avatar"
            className="h-full w-full object-cover"
          />
        ) : (
          <UserCircleIcon className="h-16 w-16 text-gray-400" />
        )}
      </div>

      {country && (
        <div className="text-xl text-gray-700 flex items-center gap-2">
          {country.flag && (
            <img
              src={country.flag}
              alt={country.name}
              className="h-6 w-8 object-cover rounded-xl border"
            />
          )}
          <span>{country.name}</span>
        </div>
      )}

      <div className="text-lrg font-medium text-gray-800">
        {driver.is_junior ? t("driverUi.juniorDriver") : t("driverUi.adultDriver")}
      </div>
    </div>
  );
}
