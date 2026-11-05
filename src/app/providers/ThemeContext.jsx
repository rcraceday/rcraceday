import { createContext } from "react";

const DEFAULT_PALETTE = {
  logoUrl: null,
  adminLogoUrl: null,
  primary: "#ce0202",
  primarySoft: "#ce0202",
  text: "#1f2937",
  textMuted: "#6b7280",
  button: "#ce0202",
  buttonText: "#ffffff",
  background: "#ffffff",
  surface: "#ffffff",
  surfaceAlt: "#f9fafb",
  surfaceBorder: "#e5e7eb",
  cardColor: "#ffffff",
  borderColor: "#e5e7eb",
  buttonColor: "#ce0202",
  headerAccent: "#ce0202",
  headerText: "#ffffff",
  headerColor: "#ce0202",
};

export const ThemeContext = createContext({
  palette: DEFAULT_PALETTE,
  mode: "drivers",
});
