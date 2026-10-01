import React from "react";
import { useTranslation } from "@/app/i18n/I18nContext";

export default function DeleteDriverModal({
  visible,
  hasFutureNominations,
  onConfirm,
  onCancel,
}) {
  const { t } = useTranslation();
  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      aria-modal="true"
      role="dialog"
    >
      {/* Dimmed background */}
      <div className="absolute inset-0 bg-black bg-opacity-40"></div>

      {/* Modal box */}
      <div className="relative bg-white rounded-lg shadow-lg p-6 w-full max-w-sm z-10">
        <h2 className="text-xl font-semibold mb-2">{t("driverUi.deleteDriverTitle")}</h2>

        {hasFutureNominations ? (
          <p className="text-gray-700 mb-6">{t("driverUi.deleteWithNoms")}</p>
        ) : (
          <p className="text-gray-700 mb-6">{t("driverUi.deleteConfirm")}</p>
        )}

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
          >
            {t("driverUi.keepDriver")}
          </button>

          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            {t("driverUi.confirmDelete")}
          </button>
        </div>
      </div>
    </div>
  );
}
