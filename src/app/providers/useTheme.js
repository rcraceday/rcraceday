import { useContext } from "react";
import { ThemeContext } from "./ThemeProvider.jsx";

export default function useTheme() {
  return useContext(ThemeContext);
}

