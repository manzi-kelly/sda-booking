import React, { useState, useEffect, lazy, Suspense } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { FaBars, FaTimes, FaSearch } from 'react-icons/fa'
import LanguageSwitcher from './LanguageSwitcher'
import SearchOverlay from './SearchOverlay'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import { goToSection, openBooking } from '../utils/navigation'

const AuthPage = lazy(() => import('../pages/AuthPage'))

const AuthModal = ({ onClose }) => (
  <Suspense fallback={null}>
    <AuthPage onClose={onClose} />
  </Suspense>
)

const Navbar = () => {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const location = useLocation()
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [activeLink, setActiveLink] = useState('home')
  const [isVisible, setIsVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)
  const [showAuth, setShowAuth] = useState(false)
  const [showSearch, setShowSearch] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      
      if (currentScrollY > lastScrollY && currentScrollY > 80) {
        setIsVisible(false)
      } else if (currentScrollY < lastScrollY) {
        setIsVisible(true)
      }
      
      setIsScrolled(currentScrollY > 20)
      
      const sections = ['home', 'about', 'contact']
      const scrollY = currentScrollY + 120
      for (const id of sections) {
        const el = document.getElementById(id)
        if (el && el.offsetTop <= scrollY && el.offsetTop + el.offsetHeight > scrollY) {
          setActiveLink(id)
          break
        }
      }
      
      setLastScrollY(currentScrollY)
    }
    
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [lastScrollY])

  const navLinks = [
    { id: 'home', label: t('nav.home') },
    { id: 'about', label: t('nav.about') },
    { id: 'products', label: t('nav.products'), isProducts: true },
    { id: 'contact', label: t('nav.contact') },
  ]

  const handleNavClick = (e, link) => {
    e.preventDefault()
    setIsMobileMenuOpen(false)
    if (link.isProducts) {
      openBooking(navigate, () => setShowAuth(true))
      return
    }
    setActiveLink(link.id)
    goToSection(navigate, location, link.id)
  }

  const handleBookNow = () => {
    setIsMobileMenuOpen(false)
    openBooking(navigate, () => setShowAuth(true))
  }

  const handleSearchSelect = () => {
    setShowSearch(false)
    openBooking(navigate, () => setShowAuth(true))
  }

  return (
    <>
      <header
        className={`fixed top-0 left-0 w-full z-50 transition-all duration-500 ease-in-out ${
          isVisible ? 'translate-y-0' : '-translate-y-full'
        } ${
          isScrolled ? 'nav-scrolled bg-white/95 backdrop-blur-md shadow-sm' : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-20 md:h-24">
          {/* Logo */}
          <div className="flex items-center">
            <Link 
              to="/" 
              onClick={() => {
                setActiveLink('home')
                setIsMobileMenuOpen(false)
              }} 
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center font-bold text-lg md:text-xl border transition-all duration-300 ${
                isScrolled 
                  ? 'bg-primary text-white border-primary' 
                  : 'bg-white/20 backdrop-blur-sm text-white border-white/30'
              }`}>
                S
              </div>
              <div>
                <h1 className={`text-xl md:text-2xl font-bold tracking-tight transition-colors duration-300 ${
                  isScrolled ? 'text-gray-800' : 'text-white'
                }`}>
                  SDA Booking
                </h1>
                <p className={`text-[10px] md:text-xs uppercase tracking-widest font-medium transition-colors duration-300 ${
                  isScrolled ? 'text-gray-500' : 'text-white/80'
                }`}>
                  {t('brand.tagline')}
                </p>
              </div>
            </Link>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center space-x-8 lg:space-x-10">
            {navLinks.map((link) => (
              <a
                key={link.id}
                href={link.isProducts ? '/dashboard' : `#${link.id}`}
                onClick={(e) => handleNavClick(e, link)}
                className={`nav-link ${
                  activeLink === link.id ? 'active' : ''
                } text-sm font-medium transition-colors duration-300 uppercase tracking-wide ${
                  isScrolled ? 'text-gray-600 hover:text-primary' : 'text-white/90 hover:text-white'
                }`}
              >
                {link.label}
              </a>
            ))}
            <button
              onClick={() => setShowSearch(true)}
              aria-label={t('aria.searchBooks')}
              className={`p-2.5 rounded-full transition-colors ${
                isScrolled ? 'text-gray-600 hover:text-primary hover:bg-gray-100' : 'text-white/90 hover:text-white hover:bg-white/10'
              }`}
            >
              <FaSearch size={17} />
            </button>
            <LanguageSwitcher variant={isScrolled ? 'light' : 'dark'} />
            <button
              onClick={handleBookNow}
              className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg ${
                isScrolled 
                  ? 'btn-primary text-white shadow-black/20' 
                  : 'btn-primary text-white'
              }`}
            >
              {t('nav.bookNow')}
            </button>
          </nav>
          {/* Mobile hamburger */}
          <div className="flex items-center gap-1">
            <button
              className={`md:hidden focus:outline-none p-2 rounded-lg transition-colors ${
                isScrolled ? 'text-gray-700 hover:bg-gray-100' : 'text-white hover:bg-white/10'
              }`}
              onClick={() => setShowSearch(true)}
              aria-label={t('aria.searchBooks')}
            >
              <FaSearch size={20} />
            </button>
            <button
              className={`md:hidden focus:outline-none p-2 rounded-lg transition-colors ${
                isScrolled ? 'text-gray-700 hover:bg-gray-100' : 'text-white hover:bg-white/10'
              }`}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label={t('aria.toggleMenu')}
            >
              {isMobileMenuOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <div
          className={`md:hidden fixed top-0 left-0 w-full h-screen ${
            isScrolled ? 'bg-white/98' : 'bg-gray-900/95'
          } backdrop-blur-md z-40 pt-24 px-8 transition-transform duration-500 ease-in-out ${
            isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="flex flex-col items-center justify-center h-full max-w-sm mx-auto space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl ${
                isScrolled ? 'bg-primary text-white' : 'bg-white/20 text-white border border-white/30'
              }`}>
                S
              </div>
              <div>
                <h2 className={`text-lg font-bold ${
                  isScrolled ? 'text-gray-800' : 'text-white'
                }`}>
                  SDA Booking
                </h2>
                <p className={`text-[10px] uppercase tracking-widest ${
                  isScrolled ? 'text-gray-500' : 'text-white/70'
                }`}>
                  {t('brand.tagline')}
                </p>
              </div>
            </div>
            
            <div className={`w-full border-t pt-6 ${
              isScrolled ? 'border-gray-200' : 'border-white/20'
            }`}></div>
            
            {navLinks.map((link) => (
              <a
                key={link.id}
                href={link.isProducts ? '/dashboard' : `#${link.id}`}
                onClick={(e) => handleNavClick(e, link)}
                className={`text-lg font-medium transition-colors duration-300 py-2 w-full text-center border-b ${
                  activeLink === link.id 
                    ? isScrolled ? 'text-primary' : 'text-white' 
                    : isScrolled ? 'text-gray-700' : 'text-white/80'
                } hover:text-primary transition-colors duration-300 ${
                  isScrolled ? 'border-gray-100' : 'border-white/10'
                }`}
              >
                {link.label}
              </a>
            ))}
            <LanguageSwitcher variant={isScrolled ? 'light' : 'dark'} />
            <button
              onClick={handleBookNow}
              className={`px-8 py-3.5 rounded-full text-base font-semibold transition-all duration-300 inline-block hover:scale-105 hover:shadow-xl mt-4 w-full text-center btn-primary text-white shadow-lg shadow-black/20`}
            >
              {t('nav.bookNow')}
            </button>
          </div>
        </div>
      </header>

      {/* Auth Modal */}
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}

      {/* Search Modal */}
      {showSearch && (
        <SearchOverlay
          onClose={() => setShowSearch(false)}
          onSelectBook={handleSearchSelect}
        />
      )}
    </>
  )
}

export default Navbar