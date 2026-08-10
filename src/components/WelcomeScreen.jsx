import React, { useEffect, useState } from 'react'
import { FaBookOpen, FaCheckCircle } from 'react-icons/fa'
import { useLanguage } from '../i18n/LanguageContext.jsx'

const WelcomeScreen = ({ userName = 'User', onComplete }) => {
  const { t } = useLanguage()
  const [progress, setProgress] = useState(0)
  const [showCheck, setShowCheck] = useState(false)

  useEffect(() => {
    const duration = 1000
    const start = Date.now()

    const interval = setInterval(() => {
      const elapsed = Date.now() - start
      setProgress(Math.min((elapsed / duration) * 100, 100))
      if (elapsed >= duration) {
        clearInterval(interval)
        setShowCheck(true)
        setTimeout(onComplete, 500)
      }
    }, 40)

    return () => clearInterval(interval)
  }, [onComplete])

  return (
    <div className="fixed inset-0 z-[100] bg-gradient-to-br from-teal-600 via-teal-700 to-slate-900 flex items-center justify-center overflow-hidden">
      {/* Decorative background */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-white/5 rounded-full"></div>
      <div className="absolute -bottom-32 -right-24 w-[28rem] h-[28rem] bg-white/5 rounded-full"></div>
      <div className="absolute top-1/4 right-1/4 w-4 h-4 bg-white/20 rounded-full animate-pulse"></div>
      <div className="absolute bottom-1/4 left-1/5 w-3 h-3 bg-white/15 rounded-full animate-pulse"></div>

      <div className="relative px-6 text-center max-w-xl w-full">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="absolute inset-0 rounded-2xl bg-white/20 animate-welcome-ring"></div>
            <div className="relative w-24 h-24 bg-white text-teal-600 rounded-2xl shadow-2xl flex items-center justify-center animate-welcome-logo">
              <FaBookOpen className="text-5xl" />
            </div>
          </div>
        </div>

        {/* Welcome text */}
        <div className="animate-welcome-fade">
          <span className="inline-block bg-white/15 text-white text-[10px] uppercase tracking-[6px] font-semibold px-5 py-2 rounded-full mb-4">
            {t('welcome.badge')}
          </span>
          <h1 className="text-2xl sm:text-3xl md:text-5xl font-bold text-white leading-tight">
            {t('welcome.title')} <span className="text-teal-200">SDA Booking</span>
          </h1>
          <p className="mt-4 text-white/85 text-base md:text-lg">
            {t('welcome.subtitle', { name: userName })}
          </p>
        </div>

        {/* Progress / redirect */}
        <div className="mt-10 flex flex-col items-center gap-4">
          {showCheck ? (
            <div className="flex items-center gap-2 text-white animate-welcome-fade">
              <FaCheckCircle className="text-2xl" />
              <span className="font-medium">{t('welcome.redirecting')}</span>
            </div>
          ) : (
            <p className="text-white/70 text-sm tracking-wide">{t('welcome.preparing')}</p>
          )}
          <div className="w-56 h-1.5 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-100"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WelcomeScreen
