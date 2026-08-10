import React, { useEffect, useRef, useState } from 'react'
import { FaChevronDown } from 'react-icons/fa'
import { getLanguageMeta } from '../i18n/languages.js'
import { useLanguage } from '../i18n/LanguageContext.jsx'

const LanguageSwitcher = ({ variant = 'light', className = '' }) => {
  const { locale, setLanguage, supportedLanguages } = useLanguage()
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)
  const current = getLanguageMeta(locale)

  useEffect(() => {
    if (!open) return
    const handleOutsideClick = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false)
      }
    }
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleOutsideClick)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const select = (code) => {
    setOpen(false)
    setLanguage(code)
  }

  const buttonClasses =
    variant === 'dark'
      ? 'text-white/90 hover:text-white'
      : 'text-gray-700 hover:text-primary'

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Change language (${current ? current.nativeName : locale})`}
        className={`flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-full transition-colors duration-300 ${buttonClasses}`}
      >
        <span aria-hidden="true" className="text-base leading-none">
          {current ? current.flag : '🌐'}
        </span>
        <span className="hidden sm:inline">{current ? current.nativeName : locale}</span>
        <FaChevronDown
          size={10}
          className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Language"
          className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-slideUp"
        >
          {supportedLanguages.map((lang) => {
            const isCurrent = lang.code === locale
            return (
              <button
                key={lang.code}
                type="button"
                role="option"
                aria-selected={isCurrent}
                onClick={() => select(lang.code)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                  isCurrent
                    ? 'bg-primary/5 text-primary'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="text-xl flex-shrink-0" aria-hidden="true">
                  {lang.flag}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold">{lang.name}</span>
                  <span className="block text-xs text-gray-400">{lang.nativeName}</span>
                </span>
                {isCurrent && (
                  <span className="flex-shrink-0 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default LanguageSwitcher
