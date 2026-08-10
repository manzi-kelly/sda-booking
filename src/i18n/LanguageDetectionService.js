import {
  DEFAULT_LANGUAGE,
  LOCALE_STORAGE_KEY,
  COUNTRY_DETECTION_CACHE_KEY,
  isLanguageSupported,
  normalizeLanguageCode,
  getRecommendedLanguageForCountry,
} from './languages.js'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

const COUNTRY_DETECTION_TIMEOUT_MS = 3000

let countryMemoryCache = undefined

function readStorage() {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null
  } catch {
    return null
  }
}

function readSessionStorage() {
  try {
    return typeof window !== 'undefined' ? window.sessionStorage : null
  } catch {
    return null
  }
}

export function getSavedLanguage() {
  const storage = readStorage()
  if (!storage) return null
  try {
    const stored = storage.getItem(LOCALE_STORAGE_KEY)
    const normalized = normalizeLanguageCode(stored)
    return isLanguageSupported(normalized) ? normalized : null
  } catch {
    return null
  }
}

export function setLanguage(code) {
  const normalized = normalizeLanguageCode(code)
  if (!normalized) return null
  const storage = readStorage()
  if (storage) {
    try {
      storage.setItem(LOCALE_STORAGE_KEY, normalized)
    } catch {
      // Storage unavailable (private mode); fall through silently.
    }
  }
  return normalized
}

export function clearSavedLanguage() {
  const storage = readStorage()
  if (storage) {
    try {
      storage.removeItem(LOCALE_STORAGE_KEY)
    } catch {
      // Ignore.
    }
  }
}

export function detectBrowserLanguage() {
  if (typeof navigator === 'undefined') return null
  const candidates = []
  if (Array.isArray(navigator.languages)) candidates.push(...navigator.languages)
  if (navigator.language) candidates.push(navigator.language)
  for (const candidate of candidates) {
    const normalized = normalizeLanguageCode(candidate)
    if (isLanguageSupported(normalized)) return normalized
  }
  return null
}

export async function detectCountry() {
  if (countryMemoryCache !== undefined) return countryMemoryCache
  const session = readSessionStorage()
  if (session) {
    try {
      const cached = session.getItem(COUNTRY_DETECTION_CACHE_KEY)
      if (cached) {
        countryMemoryCache = cached
        return cached
      }
    } catch {
      // Ignore storage errors.
    }
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), COUNTRY_DETECTION_TIMEOUT_MS)

  try {
    const response = await fetch(`${API_URL}/api/geo/country`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
    const data = await response.json()
    const country = data && data.country ? String(data.country).toUpperCase() : null
    countryMemoryCache = country
    if (country && session) {
      try {
        session.setItem(COUNTRY_DETECTION_CACHE_KEY, country)
      } catch {
        // Ignore.
      }
    }
    return country
  } catch {
    countryMemoryCache = null
    return null
  } finally {
    clearTimeout(timer)
  }
}

export async function getRecommendedLanguage() {
  const browserLanguage = detectBrowserLanguage()
  if (browserLanguage) return browserLanguage
  const country = await detectCountry()
  const countryLanguage = getRecommendedLanguageForCountry(country)
  if (countryLanguage) return countryLanguage
  return DEFAULT_LANGUAGE
}
