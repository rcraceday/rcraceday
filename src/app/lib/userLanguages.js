export const USER_LANGUAGES = [
  { value: "en", label: "English" },
  { value: "en-AU", label: "English (Australia)" },
  { value: "zh", label: "Chinese (中文)" },
  { value: "fr", label: "French (Français)" },
  { value: "de", label: "German (Deutsch)" },
  { value: "it", label: "Italian (Italiano)" },
  { value: "ja", label: "Japanese (日本語)" },
  { value: "pt", label: "Portuguese (Português)" },
  { value: "es", label: "Spanish (Español)" },
];

export function languageLabel(code) {
  return USER_LANGUAGES.find((row) => row.value === code)?.label || code || "English";
}
