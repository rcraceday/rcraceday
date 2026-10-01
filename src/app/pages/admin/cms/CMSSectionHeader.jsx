import { cmsStyles } from "./styles";
import { useTranslation } from "@/app/i18n/I18nContext";

export default function CMSSectionHeader({ children }) {
  const { t } = useTranslation();
  return <div style={cmsStyles.sectionHeader}>{children}</div>;
}
