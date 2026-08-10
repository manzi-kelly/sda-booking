import { DEFAULT_LANGUAGE, isLanguageSupported } from './languages.js'

const LOADERS = {
  en: () => import('../locales/en.json'),
  rw: () => import('../locales/rw.json'),
  fr: () => import('../locales/fr.json'),
  sw: () => import('../locales/sw.json'),
}

const cache = {}

let currentLocale = DEFAULT_LANGUAGE
let defaultDictionary = null
let currentDictionary = null

async function load(locale) {
  if (cache[locale]) return cache[locale]
  const module = await LOADERS[locale]()
  const dictionary = module.default || module
  cache[locale] = dictionary
  return dictionary
}

export function getCurrentLocale() {
  return currentLocale
}

export function isLoaded(locale) {
  return Boolean(cache[locale])
}

export async function setLocale(locale) {
  const code = isLanguageSupported(locale) ? locale : DEFAULT_LANGUAGE
  if (!defaultDictionary) defaultDictionary = await load(DEFAULT_LANGUAGE)
  if (code === DEFAULT_LANGUAGE) {
    currentDictionary = defaultDictionary
  } else {
    currentDictionary = await load(code)
  }
  currentLocale = code
  return currentDictionary
}

function resolvePath(dictionary, key) {
  return key.split('.').reduce((acc, part) => {
    if (acc == null) return undefined
    return acc[part]
  }, dictionary)
}

export function translate(dictionary, fallbackDictionary, key, params = {}) {
  let value = resolvePath(dictionary, key)
  if (value == null && fallbackDictionary) value = resolvePath(fallbackDictionary, key)
  if (value == null) return key

  if (typeof value === 'object' && value !== null) {
    if ('count' in params && value.one != null) {
      value = Number(params.count) === 1 ? value.one : value.many
    } else {
      return key
    }
  }

  if (typeof value !== 'string') return key

  return value.replace(/\{(\w+)\}/g, (match, name) =>
    name in params ? String(params[name]) : match
  )
}

export function createTranslator(dictionary) {
  return (key, params) => translate(dictionary, defaultDictionary, key, params)
}
