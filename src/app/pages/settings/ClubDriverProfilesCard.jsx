import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "@/app/i18n/I18nContext";
import { useClub } from "@/app/providers/ClubProvider";
import { useDrivers } from "@/app/providers/DriverProvider";
import useDriverProfilesAccess from "@/app/hooks/useDriverProfilesAccess";
import {
  evaluateDriverProfileReadiness,
  juniorTagInParens,
} from "@/app/lib/driverClubSettings";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

export default function ClubDriverProfilesCard() {
  const { t } = useTranslation();
  const { club } = useClub();
  const { clubSlug } = useParams();
  const navigate = useNavigate();
  const { drivers, loadingDrivers } = useDrivers();
  const { allowed, loading: loadingAccess } = useDriverProfilesAccess();
  const juniorParens = juniorTagInParens(club);

  const driverList = Array.isArray(drivers) ? drivers : [];
  const managerPath = `/${clubSlug}/app/profile/drivers`;
  const welcomePath = `/${clubSlug}/app/profile/drivers/welcome`;

  return (
    <Card className="w-full p-6 space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold m-0 text-gray-900">
          {t("settings.myDrivers.clubSection.title", { club: club?.name || t("settings.myDrivers.clubSection.thisClub") })}
        </h2>
        <p className="text-sm text-gray-600 m-0 leading-relaxed">
          {t("settings.myDrivers.clubSection.hint")}
        </p>
      </div>

      {!loadingAccess && !allowed ? (
        <p className="text-sm text-amber-900 m-0 rounded-lg border border-amber-200 bg-amber-50 p-3">
          {t("settings.myDrivers.clubSection.membershipRequired")}{" "}
          <Link
            to={`/${clubSlug}/app/membership`}
            className="font-semibold underline"
            style={{ color: "inherit" }}
          >
            {t("settings.myDrivers.clubSection.membershipLink")}
          </Link>
        </p>
      ) : null}

      {loadingDrivers || loadingAccess ? (
        <p className="text-sm text-gray-600 m-0">{t("loading.loading")}</p>
      ) : driverList.length === 0 ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-gray-700 m-0">{t("settings.myDrivers.clubSection.noDrivers")}</p>
          <Button type="button" onClick={() => navigate(welcomePath)}>
            {t("settings.myDrivers.clubSection.setUpAtClub")}
          </Button>
        </div>
      ) : (
        <ul className="m-0 p-0 list-none flex flex-col gap-3">
          {driverList.map((driver) => {
            const readiness = evaluateDriverProfileReadiness(club, driver);
            const number =
              driver.permanent_number ||
              driver.number ||
              driver.driver_number ||
              driver.nickname ||
              null;
            const editPath = `/${clubSlug}/app/profile/drivers/${driver.id}/edit`;
            const viewPath = `/${clubSlug}/app/profile/drivers/${driver.id}`;

            return (
              <li
                key={driver.id}
                className="rounded-lg border border-gray-200 bg-gray-50 p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-semibold text-gray-900 m-0 truncate">
                    {driver.first_name} {driver.last_name}
                    {driver.is_junior ? ` ${juniorParens.trim()}` : ""}
                  </p>
                  {number ? (
                    <p className="text-xs text-gray-600 m-0">
                      {t("settings.myDrivers.clubSection.numberLabel", { number })}
                    </p>
                  ) : null}
                  {!readiness.ready ? (
                    <p className="text-xs text-amber-800 m-0">
                      {t("settings.myDrivers.clubSection.profileIncomplete")}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <Button
                    type="button"
                    size="sm"
                    disabled={!allowed}
                    onClick={() => navigate(editPath)}
                  >
                    {t("settings.myDrivers.clubSection.editDriverProfile")}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={!allowed}
                    onClick={() => navigate(viewPath)}
                  >
                    {t("settings.myDrivers.clubSection.viewDriverProfile")}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="pt-2 border-t border-gray-200 flex flex-col gap-2">
        <p className="text-sm text-gray-700 m-0">{t("settings.myDrivers.clubSection.managerBlurb")}</p>
        <Button
          type="button"
          variant="secondary"
          disabled={!allowed}
          onClick={() => navigate(managerPath)}
        >
          {t("settings.myDrivers.clubSection.openDriverManager")}
        </Button>
      </div>
    </Card>
  );
}
