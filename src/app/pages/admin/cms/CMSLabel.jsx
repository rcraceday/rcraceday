import { cmsStyles } from "./styles";
import { useTranslation } from "@/app/i18n/I18nContext";

export default function CMSLabel({ children, labelKey }) {
  const { t } = useTranslation();
  const content = labelKey ? t(labelKey) : children;
  return <label style={cmsStyles.label}>{content}</label>;
}
