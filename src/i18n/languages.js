export const DEFAULT_LANGUAGE = 'en'

export const LOCALE_STORAGE_KEY = 'language'

export const COUNTRY_DETECTION_CACHE_KEY = 'detectedCountry'

export const SUPPORTED_LANGUAGES = [
  { code: 'rw', name: 'Kinyarwanda', nativeName: 'Ikinyarwanda', flag: '🇷🇼' },
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'fr', name: 'Français', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'sw', name: 'Kiswahili', nativeName: 'Kiswahili', flag: '🇰🇪' },
]

export const COUNTRY_LANGUAGE_MAP = {
  RW: 'rw',
  KE: 'sw',
  TZ: 'sw',
  UG: 'en',
  CD: 'fr',
  BI: 'fr',
  FR: 'fr',
  BE: 'fr',
  CH: 'fr',
  LU: 'fr',
  MC: 'fr',
  CA: 'fr',
  BF: 'fr',
  CI: 'fr',
  SN: 'fr',
  ML: 'fr',
  NE: 'fr',
  CM: 'fr',
  MG: 'fr',
  TG: 'fr',
  BJ: 'fr',
  US: 'en',
  GB: 'en',
  AU: 'en',
  NZ: 'en',
  IE: 'en',
  ZA: 'en',
  NG: 'en',
  GH: 'en',
  ZM: 'en',
  ZW: 'en',
  MW: 'en',
}

const PRIMARY_LOCALE_MAP = {
  rw: 'rw',
  kin: 'rw',
  kinyarwanda: 'rw',
  sw: 'sw',
  swa: 'sw',
  kiswahili: 'sw',
  fr: 'fr',
  fra: 'fr',
  francais: 'fr',
  french: 'fr',
  en: 'en',
  eng: 'en',
  english: 'en',
}

export function getLanguageMeta(code) {
  return SUPPORTED_LANGUAGES.find((lang) => lang.code === code) || null
}

export function isLanguageSupported(code) {
  return SUPPORTED_LANGUAGES.some((lang) => lang.code === code)
}

export function normalizeLanguageCode(code) {
  if (!code) return null
  const value = String(code).trim().toLowerCase()
  const primary = value.split('-')[0]
  if (PRIMARY_LOCALE_MAP[value]) return PRIMARY_LOCALE_MAP[value]
  if (PRIMARY_LOCALE_MAP[primary]) return PRIMARY_LOCALE_MAP[primary]
  return null
}

export function getRecommendedLanguageForCountry(countryCode) {
  if (!countryCode) return null
  const key = String(countryCode).trim().toUpperCase()
  return COUNTRY_LANGUAGE_MAP[key] || null
}
