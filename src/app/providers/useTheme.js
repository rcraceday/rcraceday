import { useContext } from "react";
import { ThemeContext } from "./ThemeContext.jsx";

export default function useTheme() {
  return useContext(ThemeContext);
}

