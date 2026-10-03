import { useNavigate } from "react-router-dom";
import { ArrowLeftIcon } from "@heroicons/react/24/solid";
import Button from "@/components/ui/Button";
import { useTranslation } from "@/app/i18n/I18nContext";

/**
 * Goes to browser history previous route. Pass `to` only when a fixed destination is required.
 */
export default function BackNavButton({
  to = null,
  label,
  variant = "primary",
  size = "sm",
  className = "",
  onClick,
}) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const text = label ?? t("common.back");

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={`!py-1 !px-3 !text-xs !rounded-sm flex items-center gap-1 ${className}`.trim()}
      onClick={() => {
        if (onClick) {
          onClick();
          return;
        }
        if (to) navigate(to);
        else navigate(-1);
      }}
    >
      <ArrowLeftIcon className="h-3 w-3 shrink-0" aria-hidden />
      {text}
    </Button>
  );
}
