import { cmsStyles } from "./styles";

export default function CMSLabel({ children }) {
  return <label style={cmsStyles.label}>{children}</label>;
}
