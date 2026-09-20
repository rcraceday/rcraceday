import { createContext } from "react";

const DEFAULT_PALETTE = {
  logoUrl: null,
  adminLogoUrl: null,
  primary: "#00438a",
  primarySoft: "#0a5bb8",
  text: "#1f2937",
  textMuted: "#6b7280",
  button: "#00438a",
  buttonText: "#ffffff",
  background: "#ffffff",
  surface: "#ffffff",
  surfaceAlt: "#f9fafb",
  surfaceBorder: "#e5e7eb",
  cardColor: "#ffffff",
  borderColor: "#e5e7eb",
  buttonColor: "#00438a",
  headerAccent: "#00438a",
  headerText: "#ffffff",
  headerColor: "#00438a",
};

export const ThemeContext = createContext({
  palette: DEFAULT_PALETTE,
  mode: "drivers",
});
