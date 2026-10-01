// src/app/components/MoveToFamilyCTA.jsx

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { useTranslation } from "@/app/i18n/I18nContext";

export default function MoveToFamilyCTA({ brand, onMove }) {
  const { t } = useTranslation();

  return (
    <Card
      className="p-6 space-y-4 w-full"
    >
      <h2 className="text-lg font-semibold">{t("membershipUi.upgradeFamily")}</h2>

      <p className="text-sm text-text-muted">
        {t("membershipUi.moveToFamilyBody")}
      </p>

      <div className="pt-2 flex justify-center">
        <Button
          variant="primary"
          className="!w-auto !px-6 !py-1.5 !text-sm !rounded-md"
          onClick={onMove}
        >
          {t("membershipUi.moveToFamily")}
        </Button>
      </div>
    </Card>
  );
}
