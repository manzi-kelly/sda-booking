import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import enDictionary from '../locales/en.json'
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES, normalizeLanguageCode } from './languages.js'
import * as TranslationService from './TranslationService.js'
import * as LanguageDetectionService from './LanguageDetectionService.js'

const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const [locale, setLocale] = useState(DEFAULT_LANGUAGE)
  const [dictionary, setDictionary] = useState(enDictionary)
  const detectionStarted = useRef(false)

  const applyLocale = useCallback(async (code) => {
    const dict = await TranslationService.setLocale(code)
    setLocale(code)
    setDictionary(dict)
    if (typeof document !== 'undefined') {
      document.documentElement.lang = code
    }
  }, [])

  useEffect(() => {
    if (detectionStarted.current) return
    detectionStarted.current = true

    async function init() {
      const saved = LanguageDetectionService.getSavedLanguage()
      if (saved) {
        await applyLocale(saved)
        return
      }
      const detected = await LanguageDetectionService.getRecommendedLanguage()
      await applyLocale(detected)
    }

    init()
  }, [applyLocale])

  const setLanguage = useCallback(
    async (code) => {
      const normalized = normalizeLanguageCode(code)
      if (!normalized) return
      await applyLocale(normalized)
      LanguageDetectionService.setLanguage(normalized)
    },
    [applyLocale]
  )

  const t = useMemo(() => TranslationService.createTranslator(dictionary), [dictionary])

  const value = useMemo(
    () => ({
      locale,
      setLanguage,
      t,
      isReady: Boolean(dictionary),
      supportedLanguages: SUPPORTED_LANGUAGES,
    }),
    [locale, setLanguage, t, dictionary]
  )

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
