import { cmsStyles } from "./styles";

export default function CMSSectionHeader({ children }) {
  return <div style={cmsStyles.sectionHeader}>{children}</div>;
}
