import React, { useState } from 'react'
import { FaCheckCircle, FaArrowRight } from 'react-icons/fa'
import AuthPage from '../pages/AuthPage'
import heroImg from '../assets/hlybible.jpg'
import { useLanguage } from '../i18n/LanguageContext.jsx'

const Hero = () => {
  const { t } = useLanguage()
  const [showAuth, setShowAuth] = useState(false)

  return (
    <>
      <section id="home" className="relative min-h-screen flex items-center overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0">
          <img
            src={heroImg}
            alt={t('hero.imageAlt')}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-gray-900/95 via-gray-900/85 to-gray-900/60"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 py-32 md:py-28 text-center lg:text-left lg:flex lg:items-center lg:justify-between w-full gap-16">
          <div className="max-w-2xl mx-auto lg:mx-0">
            <span className="inline-block text-primary uppercase tracking-[5px] font-semibold bg-white/10 border border-white/20 rounded-full px-5 py-2">
              {t('hero.badge')}
            </span>
            <h1 className="mt-6 text-4xl md:text-6xl font-bold text-white leading-tight">
              {t('hero.titleA')}
              <span className="text-primary"> {t('hero.titleHighlight')} </span>
              {t('hero.titleB')}
            </h1>
            <p className="mt-6 text-lg text-white/80 leading-8 max-w-lg mx-auto lg:mx-0">
              {t('hero.description')}
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <span className="flex items-center gap-3 text-white/90">
                <FaCheckCircle className="text-primary" />
                {t('hero.fastConfirmation')}
              </span>
              <span className="flex items-center gap-3 text-white/90">
                <FaCheckCircle className="text-primary" />
                {t('hero.pickupAtChurch')}
              </span>
            </div>
            <button
              onClick={() => setShowAuth(true)}
              className="mt-10 inline-flex items-center gap-3 bg-blue-600 text-white px-10 py-4 rounded-full font-semibold hover:bg-blue-700 hover:scale-105 hover:shadow-lg hover:shadow-blue-600/30 transition-all duration-300"
            >
              {t('hero.bookNow')} <FaArrowRight />
            </button>
          </div>
        </div>
      </section>

      {showAuth && (
        <AuthPage onClose={() => setShowAuth(false)} />
      )}
    </>
  )
}

export default Hero
