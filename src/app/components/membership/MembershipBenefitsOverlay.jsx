import { useNavigate, useParams } from "react-router-dom";
import Button from "@/components/ui/Button";
import { useTranslation } from "@/app/i18n/I18nContext";
import { dismissMembershipPitch } from "@/app/lib/membershipPitchDismissal";
import {
  isDriverProfileMemberAppPath,
  sanitizeClubAppReturnPath,
} from "@/app/lib/publicAuthRedirect";

export default function MembershipBenefitsOverlay({
  open,
  onClose,
  clubId,
  userId,
  brand,
  returnTo,
  memberOnlyAttempt = false,
}) {
  const { clubSlug } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  if (!open) return null;

  function handleFindOutMore() {
    onClose();
    navigate(`/${clubSlug}/app/membership`);
  }

  function handleNoThanks() {
    dismissMembershipPitch(clubId, userId);
    onClose();
    const home = `/${clubSlug}/app`;
    const safe = sanitizeClubAppReturnPath(returnTo, clubSlug);
    const pathname = safe ? safe.split("?")[0]?.split("#")[0] : "";
    const sendHome =
      memberOnlyAttempt || (pathname && isDriverProfileMemberAppPath(pathname));
    navigate(sendHome ? home : safe || home, { replace: true });
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="membership-pitch-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/45 border-0 cursor-default"
        aria-label={t("membershipPitch.dismissBackdrop")}
        onClick={handleNoThanks}
      />
      <div
        className="relative w-full max-w-md rounded-xl bg-white shadow-xl overflow-hidden"
        style={{ border: `2px solid ${brand}` }}
      >
        <div
          className="px-4 py-2.5 text-center text-sm font-semibold text-white"
          style={{ background: brand }}
          id="membership-pitch-title"
        >
          {t("membershipPitch.title")}
        </div>
        <div className="px-5 py-4 space-y-3 text-center">
          <p className="text-sm text-gray-700 m-0">{t("membershipPitch.lead")}</p>
          <ul className="text-sm text-gray-800 space-y-1 text-left mx-auto w-fit m-0 pl-4">
            <li>{t("membershipPitch.benefitFees")}</li>
            <li>{t("membershipPitch.benefitInsurance")}</li>
            <li>{t("membershipPitch.benefitJuniors")}</li>
            <li>{t("membershipPitch.benefitEvents")}</li>
          </ul>
          <p className="text-xs text-gray-600 m-0">{t("membershipPitch.visitorNote")}</p>
          <div className="flex flex-col gap-2 pt-1">
            <Button type="button" className="w-full !py-2 !text-sm" onClick={handleFindOutMore}>
              {t("membershipPitch.findOutMore")}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="w-full !py-2 !text-sm"
              onClick={handleNoThanks}
            >
              {t("membershipPitch.noThanks")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
