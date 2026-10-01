import enCore from "./messages/en";
import enApp from "./messages/enBundles/app";
import enMember from "./messages/enBundles/member";
import enAdmin from "./messages/enBundles/admin";
import enCms from "./messages/enBundles/cms";
import enAU from "./messages/en-AU";
import fr from "./messages/fr";
import frApp from "./messages/fr/app";
import frMember from "./messages/fr/member";
import frAdmin from "./messages/fr/admin";
import de from "./messages/de";
import deApp from "./messages/de/app";
import deMember from "./messages/de/member";
import deAdmin from "./messages/de/admin";
import es from "./messages/es";
import esApp from "./messages/es/app";
import esMember from "./messages/es/member";
import esAdmin from "./messages/es/admin";
import zh from "./messages/zh";
import zhApp from "./messages/zh/app";
import zhMember from "./messages/zh/member";
import zhAdmin from "./messages/zh/admin";
import ja from "./messages/ja";
import pt from "./messages/pt";
import it from "./messages/it";

function deepMerge(base, override) {
  if (!override || typeof override !== "object") return base;
  const out = { ...base };
  for (const key of Object.keys(override)) {
    const value = override[key];
    if (value && typeof value === "object" && !Array.isArray(value)) {
      out[key] = deepMerge(base[key] || {}, value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

const en = deepMerge(
  deepMerge(enCore, enApp),
  deepMerge(enMember, deepMerge(enAdmin, enCms))
);

const catalogs = {
  en,
  "en-AU": deepMerge(en, enAU),
  fr: deepMerge(deepMerge(fr, frApp), deepMerge(frMember, frAdmin)),
  de: deepMerge(deepMerge(de, deApp), deepMerge(deMember, deAdmin)),
  es: deepMerge(deepMerge(es, esApp), deepMerge(esMember, esAdmin)),
  zh: deepMerge(deepMerge(zh, zhApp), deepMerge(zhMember, zhAdmin)),
  ja,
  pt,
  it,
};

const supported = new Set(Object.keys(catalogs));

export function normalizeLocale(code) {
  if (!code) return "en";
  const trimmed = String(code).trim();
  if (supported.has(trimmed)) return trimmed;
  const base = trimmed.split("-")[0];
  if (supported.has(base)) return base;
  return "en";
}

function getNested(obj, path) {
  return path.split(".").reduce((acc, part) => (acc == null ? undefined : acc[part]), obj);
}

export function createTranslator(locale) {
  const resolved = normalizeLocale(locale);
  const dictionary =
    resolved === "en" ? en : deepMerge(en, catalogs[resolved] || {});

  return function t(key, vars) {
    let value = getNested(dictionary, key);
    if (typeof value !== "string") {
      return key;
    }
    if (!vars) return value;
    return value.replace(/\{\{(\w+)\}\}/g, (_, name) =>
      vars[name] != null ? String(vars[name]) : ""
    );
  };
}

