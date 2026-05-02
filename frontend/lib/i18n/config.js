/**
 * i18n + region configuration.
 * Single source of truth for supported locales, currencies, FX rates,
 * tax rules and country → locale/currency defaults.
 */

// ---- Locales ----
export const LOCALES = [
  { code: "en", name: "English", dir: "ltr", flag: "🇺🇸" },
  { code: "hi", name: "हिन्दी", dir: "ltr", flag: "🇮🇳" },
  { code: "ar", name: "العربية", dir: "rtl", flag: "🇦🇪" },
  { code: "es", name: "Español", dir: "ltr", flag: "🇪🇸" },
  { code: "fr", name: "Français", dir: "ltr", flag: "🇫🇷" },
  { code: "de", name: "Deutsch", dir: "ltr", flag: "🇩🇪" },
  { code: "zh-CN", name: "简体中文", dir: "ltr", flag: "🇨🇳" },
  { code: "ja", name: "日本語", dir: "ltr", flag: "🇯🇵" },
];

export const LOCALE_CODES = LOCALES.map((l) => l.code);
export const DEFAULT_LOCALE = "en";
export const RTL_LOCALES = LOCALES.filter((l) => l.dir === "rtl").map((l) => l.code);

export function getLocaleDir(code) {
  return RTL_LOCALES.includes(code) ? "rtl" : "ltr";
}

// ---- Currencies (FX = how many UNITS-of-currency equal 1 INR base) ----
// Static rates, anchored to INR. Update manually when needed.
// Example: USD rate 0.012 means 1 INR = 0.012 USD => 1 USD ≈ 83 INR.
export const CURRENCIES = {
  INR: { code: "INR", symbol: "₹",   name: "Indian Rupee",      locale: "en-IN", fxFromINR: 1 },
  USD: { code: "USD", symbol: "$",   name: "US Dollar",         locale: "en-US", fxFromINR: 0.012 },
  EUR: { code: "EUR", symbol: "€",   name: "Euro",              locale: "de-DE", fxFromINR: 0.011 },
  GBP: { code: "GBP", symbol: "£",   name: "British Pound",     locale: "en-GB", fxFromINR: 0.0094 },
  AED: { code: "AED", symbol: "د.إ", name: "UAE Dirham",        locale: "ar-AE", fxFromINR: 0.044 },
  SGD: { code: "SGD", symbol: "S$",  name: "Singapore Dollar",  locale: "en-SG", fxFromINR: 0.016 },
  AUD: { code: "AUD", symbol: "A$",  name: "Australian Dollar", locale: "en-AU", fxFromINR: 0.018 },
  CAD: { code: "CAD", symbol: "C$",  name: "Canadian Dollar",   locale: "en-CA", fxFromINR: 0.016 },
};

export const CURRENCY_CODES = Object.keys(CURRENCIES);
export const DEFAULT_CURRENCY = "INR";

// ---- Country → tax + currency + locale defaults ----
// taxRate is a fraction (0.18 = 18%). taxLabel shown on invoice.
// EU members default to 20% VAT; you can refine per-country if needed.
export const COUNTRY_REGIONS = {
  // South Asia
  IN: { currency: "INR", locale: "en", taxRate: 0.18, taxLabel: "GST" },
  // North America
  US: { currency: "USD", locale: "en", taxRate: 0,    taxLabel: "Sales Tax" },
  CA: { currency: "CAD", locale: "en", taxRate: 0.13, taxLabel: "HST" },
  // UK
  GB: { currency: "GBP", locale: "en", taxRate: 0.20, taxLabel: "VAT" },
  // EU (representative)
  DE: { currency: "EUR", locale: "de", taxRate: 0.19, taxLabel: "MwSt." },
  FR: { currency: "EUR", locale: "fr", taxRate: 0.20, taxLabel: "TVA" },
  ES: { currency: "EUR", locale: "es", taxRate: 0.21, taxLabel: "IVA" },
  IT: { currency: "EUR", locale: "es", taxRate: 0.22, taxLabel: "IVA" },
  NL: { currency: "EUR", locale: "en", taxRate: 0.21, taxLabel: "VAT" },
  // Middle East
  AE: { currency: "AED", locale: "ar", taxRate: 0.05, taxLabel: "VAT" },
  SA: { currency: "AED", locale: "ar", taxRate: 0.15, taxLabel: "VAT" },
  // APAC
  SG: { currency: "SGD", locale: "en", taxRate: 0.09, taxLabel: "GST" },
  AU: { currency: "AUD", locale: "en", taxRate: 0.10, taxLabel: "GST" },
  JP: { currency: "USD", locale: "ja", taxRate: 0.10, taxLabel: "Tax" },
  CN: { currency: "USD", locale: "zh-CN", taxRate: 0.13, taxLabel: "VAT" },
};

export const FALLBACK_REGION = {
  currency: DEFAULT_CURRENCY,
  locale: DEFAULT_LOCALE,
  taxRate: 0,
  taxLabel: "Tax",
};

export function getRegionForCountry(countryCode) {
  if (!countryCode) return FALLBACK_REGION;
  return COUNTRY_REGIONS[countryCode.toUpperCase()] || FALLBACK_REGION;
}
