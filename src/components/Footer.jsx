import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { FaFacebookF, FaTwitter, FaInstagram, FaLinkedinIn, FaMapMarkerAlt, FaPhone, FaEnvelope } from 'react-icons/fa'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import { goToSection } from '../utils/navigation'

const Footer = () => {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const year = new Date().getFullYear()

  const handleSubscribe = (e) => {
    e.preventDefault()
    console.log('Email subscribed:', email)
    setEmail('')
  }

  const handleQuickLink = (e, id, isProducts) => {
    e.preventDefault()
    if (isProducts) {
      navigate('/dashboard')
      return
    }
    goToSection(navigate, location, id)
  }

  const quickLinks = [
    { id: 'home', label: t('nav.home') },
    { id: 'about', label: t('footer.aboutUs') },
    { id: 'products', label: t('nav.products'), isProducts: true },
    { id: 'contact', label: t('nav.contact') },
  ]

  return (
    <footer className="bg-gray-900 text-white/80 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 py-12 border-b border-gray-800">
          {/* Brand Column */}
          <div>
            <h3 className="text-2xl font-bold text-white mb-3">
              <span className="text-primary">SDA</span> Booking
            </h3>
            <p className="text-sm text-gray-400 leading-relaxed mb-4">
              {t('footer.description')}
            </p>
            <div className="flex gap-3">
              <a href="#" onClick={(e) => e.preventDefault()} aria-label="Facebook" className="w-9 h-9 rounded-full bg-gray-800 hover:bg-primary text-gray-400 hover:text-white flex items-center justify-center transition-all duration-300">
                <FaFacebookF size={14} />
              </a>
              <a href="#" onClick={(e) => e.preventDefault()} aria-label="Twitter" className="w-9 h-9 rounded-full bg-gray-800 hover:bg-primary text-gray-400 hover:text-white flex items-center justify-center transition-all duration-300">
                <FaTwitter size={14} />
              </a>
              <a href="#" onClick={(e) => e.preventDefault()} aria-label="Instagram" className="w-9 h-9 rounded-full bg-gray-800 hover:bg-primary text-gray-400 hover:text-white flex items-center justify-center transition-all duration-300">
                <FaInstagram size={14} />
              </a>
              <a href="#" onClick={(e) => e.preventDefault()} aria-label="LinkedIn" className="w-9 h-9 rounded-full bg-gray-800 hover:bg-primary text-gray-400 hover:text-white flex items-center justify-center transition-all duration-300">
                <FaLinkedinIn size={14} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold text-lg mb-4">{t('footer.quickLinks')}</h4>
            <ul className="space-y-2 text-sm">
              {quickLinks.map((link) => (
                <li key={link.id}>
                  <a
                    href={link.isProducts ? '/dashboard' : `#${link.id}`}
                    onClick={(e) => handleQuickLink(e, link.id, link.isProducts)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold text-lg mb-4">{t('footer.contactTitle')}</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <FaPhone className="text-primary mt-1 flex-shrink-0" size={14} />
                <span className="text-gray-400">+2507XXXXX</span>
              </li>
              <li className="flex items-start gap-3">
                <FaEnvelope className="text-primary mt-1 flex-shrink-0" size={14} />
                <span className="text-gray-400">info@sdabooking.com</span>
              </li>
              <li className="flex items-start gap-3">
                <FaMapMarkerAlt className="text-primary mt-1 flex-shrink-0" size={14} />
                <span className="text-gray-400">Kigali, Rwanda</span>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="text-white font-semibold text-lg mb-4">{t('footer.stayUpdated')}</h4>
            <p className="text-sm text-gray-400 mb-3">
              {t('footer.subscribeDesc')}
            </p>
            <form onSubmit={handleSubscribe} className="flex flex-col gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('footer.emailPlaceholder')}
                className="px-4 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-primary transition-colors"
                required
              />
              <button
                type="submit"
                className="px-4 py-2.5 rounded-lg bg-primary text-white font-semibold hover:bg-primary/90 transition-colors"
              >
                {t('footer.subscribe')}
              </button>
            </form>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="py-6 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-500">
          <p>{t('footer.rights', { year })}</p>
          <div className="flex gap-6">
            <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-white transition-colors">{t('footer.privacy')}</a>
            <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-white transition-colors">{t('footer.terms')}</a>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer