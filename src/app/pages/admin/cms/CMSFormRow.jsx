import { cmsStyles } from "./styles";
import { useTranslation } from "@/app/i18n/I18nContext";

export default function CMSFormRow({ children }) {
  const { t } = useTranslation();
  return (
    <div
      style={cmsStyles.formRow}
      onSubmit={(e) => e.preventDefault()}   // ⭐ prevents accidental navigation
      onClick={(e) => {
        // ⭐ Prevent clicks inside the row from bubbling up to a parent <form>
        if (e.target.tagName === "BUTTON" || e.target.tagName === "INPUT") {
          e.stopPropagation();
        }
      }}
    >
      {children}
    </div>
  );
}
