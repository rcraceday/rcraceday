import { Link } from "react-router-dom";
import Card from "@/components/ui/Card";
import useTheme from "@/app/providers/useTheme";
import { useTranslation } from "@/app/i18n/I18nContext";

export default function ChampionshipPromoCard({ clubSlug, championship }) {
  const { palette } = useTheme();
  const { t } = useTranslation();
  if (!championship?.id) return null;

  return (
    <Link
      to={`/${clubSlug}/app/championships/${championship.id}`}
      className="no-underline block"
    >
      <Card className="p-4 mb-2">
        <div className="flex items-center gap-4">
          {championship.logo_url ? (
            <img
              src={championship.logo_url}
              alt=""
              className="h-14 w-14 object-contain shrink-0"
            />
          ) : null}
          <div className="min-w-0">
            <div className="font-semibold text-slate-900">{championship.name}</div>
            <div className="text-sm text-slate-500">
              {t("results.seasonN", { season: championship.season })}
            </div>
            <div
              className="text-sm font-semibold mt-1"
              style={{ color: palette.primary }}
            >
              {t("results.championshipPoints")}
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
