import React, { useState, lazy, Suspense } from 'react'
import { FaArrowRight } from 'react-icons/fa'
import { useLanguage } from '../i18n/LanguageContext.jsx'

const AuthPage = lazy(() => import('../pages/AuthPage'))

const AuthModal = ({ onClose }) => (
  <Suspense fallback={null}>
    <AuthPage onClose={onClose} />
  </Suspense>
)

const Hero = () => {
  const { t } = useLanguage()
  const [showAuth, setShowAuth] = useState(false)

  return (
    <>
      <section
        id="home"
        className="relative min-h-screen overflow-hidden flex items-center"
      >
        {/* Background Image */}
        <img
          src="/sda.png"
          alt={t('hero.imageAlt')}
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-[#071b2d]/70" />

        {/* Optional Gradient for Better Text Readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#071b2d]/90 via-[#071b2d]/60 to-transparent" />

        {/* Hero Content */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 lg:px-10">
          <div className="max-w-2xl">

            {/* Small Label */}
            <div className="flex items-center gap-3 mb-5">
              <span className="h-px w-10 bg-[#f4b942]" />

              <p className="text-[#f4b942] text-sm font-semibold uppercase tracking-[2px]">
                {t('hero.badge')}
              </p>
            </div>

            {/* Main Heading */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.05] text-white">
              {t('hero.titleA')}
              <span className="block text-[#f4b942] mt-2">
                {t('hero.titleHighlight')}
              </span>
              <span className="block mt-2">
                {t('hero.titleB')}
              </span>
            </h1>

            {/* Description */}
            <p className="mt-6 max-w-lg text-base md:text-lg leading-relaxed text-white/80">
              {t('hero.description')}
            </p>

            {/* Button */}
            <button
              type="button"
              onClick={() => setShowAuth(true)}
              className="mt-8 inline-flex items-center gap-3 rounded-full bg-[#f4b942] px-7 py-4 font-semibold text-[#071b2d] shadow-lg shadow-black/20 transition-all duration-300 hover:bg-white hover:scale-105 active:scale-95"
            >
              {t('hero.explore')}
              <FaArrowRight size={13} />
            </button>

          </div>
        </div>

        {/* Bottom Navigation Words */}
        <div className="absolute bottom-7 left-0 right-0 z-10">
          <div className="max-w-7xl mx-auto px-6 lg:px-10">
            <div className="flex justify-between text-[10px] sm:text-xs uppercase tracking-[2px] text-white/50">
              <span>{t('hero.faith')}</span>
              <span>{t('hero.hope')}</span>
              <span>{t('hero.growth')}</span>
              <span>{t('hero.service')}</span>
            </div>
          </div>
        </div>

        {/* Bottom Fade */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#071b2d]/60 to-transparent pointer-events-none" />
      </section>

      {/* Authentication Modal */}
      {showAuth && (
        <AuthModal onClose={() => setShowAuth(false)} />
      )}
    </>
  )
}

export default Hero