import useMembership from "../hooks/useMembership";
import { useTranslation } from "@/app/i18n/I18nContext";

export default function MembershipStatusCard() {
  const { t } = useTranslation();
  const {
    membership,
    loadingMembership,
    isExpired,
    expiresSoon,
    renewMembership,
    refreshMembership,
  } = useMembership();


  if (loadingMembership) {
    return (
      <div className="p-4 rounded-lg bg-gray-100 animate-pulse">
        {t("membershipUi.loadingMembership")}
      </div>
    );
  }

  if (!membership) {
    return (
      <div className="p-4 rounded-lg bg-red-100 text-red-700">
        {t("membershipUi.noMembershipFound")}
      </div>
    );
  }

  const expiry = new Date(membership.expires_at).toLocaleDateString();

  const handleRenew = async () => {
    await renewMembership();
    refreshMembership();
    notify(t("membershipUi.renewedSuccess"), "success");
  };

  return (
    <div className="p-6 rounded-xl bg-white shadow-md border border-gray-200">
      <h2 className="text-xl font-semibold mb-2">{t("membershipUi.statusTitle")}</h2>

      <p className="text-gray-600 mb-4">
        {t("membershipUi.expiresOn")}{" "}
        <span className="font-medium">{expiry}</span>
      </p>

      {isExpired && (
        <div className="p-3 mb-4 rounded-lg bg-red-100 text-red-700">
          {t("membershipUi.expiredBanner")}
        </div>
      )}

      {!isExpired && expiresSoon && (
        <div className="p-3 mb-4 rounded-lg bg-yellow-100 text-yellow-700">
          {t("membershipUi.expiresSoonBanner")}
        </div>
      )}

      <button
        onClick={handleRenew}
        className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
      >
        {t("membershipUi.renewMembership")}
      </button>
    </div>
  );
}
