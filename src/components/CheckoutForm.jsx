import React, { useState } from 'react'
import {
  FaMapMarkerAlt,
  FaUser,
  FaEnvelope,
  FaPhone,
  FaBookOpen,
  FaMobileAlt,
  FaCreditCard,
  FaLock,
  FaChevronLeft
} from 'react-icons/fa'
import { districts } from '../data/locations'
import { auth } from '../firebase'
import { useLanguage } from '../i18n/LanguageContext.jsx'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

const formatPrice = (n) => 'RWF ' + Number(n || 0).toLocaleString()

const CheckoutForm = ({ cart, onClose, onComplete }) => {
  const { t } = useLanguage()
  const loggedUser = JSON.parse(localStorage.getItem('user') || '{}')

  const [step, setStep] = useState(1)
  const [details, setDetails] = useState({
    name: loggedUser.name || '',
    email: loggedUser.email || '',
    phone: '',
    district: '',
    sector: ''
  })
  const [errors, setErrors] = useState({})
  const [payment, setPayment] = useState({
    email: loggedUser.email || '',
    method: 'airtel',
    airtelPhone: '',
    momoPhone: '',
    cardName: '',
    cardNumber: '',
    cardExpiry: '',
    cardCvv: ''
  })
  const [isLoading, setIsLoading] = useState(false)

  const selectedDistrict = districts.find((d) => d.name === details.district)
  const sectors = selectedDistrict ? selectedDistrict.sectors : []

  const total = cart.reduce((sum, item) => sum + (item.book.price || 0) * item.qty, 0)

  const changeDetails = (e) => {
    const { name, value } = e.target
    setDetails((prev) => ({
      ...prev,
      [name]: value,
      ...(name === 'district' ? { sector: '' } : {})
    }))
    setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  const changePayment = (e) => {
    const { name, value } = e.target
    setPayment((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  const validateDetails = () => {
    const next = {}
    if (!details.name.trim()) next.name = t('checkout.errors.nameRequired')
    if (!details.email.trim()) {
      next.email = t('checkout.errors.emailRequired')
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email)) {
      next.email = t('checkout.errors.emailInvalid')
    }
    if (!details.phone.trim()) {
      next.phone = t('checkout.errors.phoneRequired')
    } else if (details.phone.replace(/\D/g, '').length < 9) {
      next.phone = t('checkout.errors.phoneInvalid')
    }
    if (!details.district) next.district = t('checkout.errors.districtRequired')
    if (!details.sector) next.sector = t('checkout.errors.sectorRequired')
    return next
  }

  const validatePayment = () => {
    const next = {}
    if (!payment.email.trim()) {
      next.email = t('checkout.errors.emailRequired')
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payment.email)) {
      next.email = t('checkout.errors.emailInvalid')
    }
    if (payment.method === 'airtel') {
      if (!payment.airtelPhone.trim()) {
        next.airtelPhone = t('checkout.errors.airtelPhoneRequired')
      } else if (payment.airtelPhone.replace(/\D/g, '').length < 9) {
        next.airtelPhone = t('checkout.errors.airtelPhoneInvalid')
      }
    } else if (payment.method === 'momo') {
      if (!payment.momoPhone.trim()) {
        next.momoPhone = t('checkout.errors.momoPhoneRequired')
      } else if (payment.momoPhone.replace(/\D/g, '').length < 9) {
        next.momoPhone = t('checkout.errors.momoPhoneInvalid')
      }
    } else if (payment.method === 'card') {
      if (!payment.cardName.trim()) next.cardName = t('checkout.errors.cardNameRequired')
      if (!payment.cardNumber.trim()) {
        next.cardNumber = t('checkout.errors.cardNumberRequired')
      } else if (payment.cardNumber.replace(/\s/g, '').length < 12) {
        next.cardNumber = t('checkout.errors.cardNumberInvalid')
      }
      if (!payment.cardExpiry.trim()) next.cardExpiry = t('checkout.errors.cardExpiryRequired')
      if (!payment.cardCvv.trim()) {
        next.cardCvv = t('checkout.errors.cardCvvRequired')
      } else if (payment.cardCvv.replace(/\D/g, '').length !== 3) {
        next.cardCvv = t('checkout.errors.cardCvvInvalid')
      }
    }
    return next
  }

  const saveBooking = (booking) => {
    const existing = JSON.parse(localStorage.getItem('bookings')) || []
    existing.push(booking)
    localStorage.setItem('bookings', JSON.stringify(existing))
  }

  const saveBookingToBackend = async (booking) => {
    try {
      const user = auth.currentUser
      const headers = { 'Content-Type': 'application/json' }
      if (user) {
        const token = await user.getIdToken()
        headers.Authorization = `Bearer ${token}`
      }
      const res = await fetch(`${API_URL}/api/bookings`, {
        method: 'POST',
        headers,
        body: JSON.stringify(booking)
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Booking sync failed')
      }
      return await res.json().catch(() => ({}))
    } catch (err) {
      console.warn('Failed to sync booking to backend:', err.message)
      return {}
    }
  }

  const handleDetailsSubmit = (e) => {
    e.preventDefault()
    const nextErrors = validateDetails()
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }
    setErrors({})
    setPayment((prev) => ({ ...prev, email: details.email }))
    setStep(2)
  }

  const handlePaymentSubmit = (e) => {
    e.preventDefault()
    const nextErrors = validatePayment()
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    setIsLoading(true)

    setTimeout(async () => {
      for (const item of cart) {
        const booking = {
          name: details.name,
          email: payment.email || details.email,
          phone: details.phone,
          district: details.district,
          sector: details.sector,
          title: item.book.title,
          qty: item.qty,
          price: item.book.price,
          paymentMethod: payment.method,
          status: 'New',
          bookedAt: new Date().toISOString()
        }
        const saved = await saveBookingToBackend(booking)
        booking.id = saved.id || ''
        saveBooking(booking)
      }
      localStorage.removeItem('cart')
      setIsLoading(false)
      if (onComplete) onComplete({ paymentMethod: payment.method, total })
    }, 1500)
  }

  const inputClass = 'w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all text-gray-700 placeholder-gray-400'
  const errorClass = 'text-red-500 text-sm mt-1'
  const paymentMethods = [
    { id: 'airtel', label: t('checkout.airtelMoney'), icon: FaMobileAlt, color: 'text-red-500' },
    { id: 'momo', label: t('checkout.mtnMomo'), icon: FaPhone, color: 'text-yellow-500' },
    { id: 'card', label: t('checkout.bankCard'), icon: FaCreditCard, color: 'text-blue-600' }
  ]

  return (
    <div className="fixed inset-0 z-[60] flex items-start sm:items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-slideUp my-3 sm:my-8 max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-4rem)] flex flex-col">
        <button
          onClick={onClose}
          aria-label={t('aria.close')}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 text-gray-400 hover:text-gray-600 transition-colors z-10 w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="p-5 sm:p-8 overflow-y-auto">
          {/* Steps indicator */}
          <div className="flex items-center justify-center gap-2 mb-5 sm:mb-6">
            <span className={`w-2.5 h-2.5 rounded-full ${step >= 1 ? 'bg-primary' : 'bg-gray-200'}`}></span>
            <span className="text-xs text-gray-400 font-medium">{t('checkout.details')}</span>
            <span className="w-6 h-px bg-gray-200"></span>
            <span className={`w-2.5 h-2.5 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-gray-200'}`}></span>
            <span className="text-xs text-gray-400 font-medium">{t('checkout.payment')}</span>
          </div>

          {step === 1 && (
            <>
              <div className="text-center mb-5 sm:mb-6">
                <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto bg-primary rounded-xl flex items-center justify-center text-white text-xl sm:text-2xl shadow-lg shadow-primary/30">
                  <FaMapMarkerAlt />
                </div>
                <h2 className="mt-3 sm:mt-4 text-xl sm:text-2xl font-bold text-gray-800">{t('checkout.deliveryTitle')}</h2>
                <p className="text-gray-500 text-xs sm:text-sm">{t('checkout.deliverySubtitle')}</p>
              </div>

              <form onSubmit={handleDetailsSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-2">
                    <FaUser className="text-primary/60" /> {t('checkout.fullName')}
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={details.name}
                    onChange={changeDetails}
                    placeholder={t('checkout.namePlaceholder')}
                    className={inputClass}
                  />
                  {errors.name && <p className={errorClass}>{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-2">
                    <FaEnvelope className="text-primary/60" /> {t('checkout.emailAddress')}
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={details.email}
                    onChange={changeDetails}
                    placeholder={t('checkout.emailPlaceholder')}
                    className={inputClass}
                  />
                  {errors.email && <p className={errorClass}>{errors.email}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-2">
                    <FaPhone className="text-primary/60" /> {t('checkout.phoneNumber')}
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={details.phone}
                    onChange={changeDetails}
                    placeholder={t('checkout.phonePlaceholder')}
                    className={inputClass}
                  />
                  {errors.phone && <p className={errorClass}>{errors.phone}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-2">
                    <FaMapMarkerAlt className="text-primary/60" /> {t('checkout.district')}
                  </label>
                  <select
                    name="district"
                    value={details.district}
                    onChange={changeDetails}
                    className={`${inputClass} cursor-pointer`}
                  >
                    <option value="">{t('checkout.selectDistrict')}</option>
                    {districts.map((d) => (
                      <option key={d.name} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                  {errors.district && <p className={errorClass}>{errors.district}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-2">
                    <FaMapMarkerAlt className="text-primary/60" /> {t('checkout.sector')}
                  </label>
                  <select
                    name="sector"
                    value={details.sector}
                    onChange={changeDetails}
                    disabled={!details.district}
                    className={`${inputClass} cursor-pointer disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed`}
                  >
                    <option value="">
                      {details.district ? t('checkout.selectSector') : t('checkout.selectDistrictFirst')}
                    </option>
                    {sectors.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  {errors.sector && <p className={errorClass}>{errors.sector}</p>}
                </div>

                <button
                  type="submit"
                  className="w-full py-4 rounded-xl bg-blue-600 text-white font-semibold text-lg transition-all hover:bg-blue-700 hover:scale-[1.02] shadow-lg shadow-blue-600/30"
                >
                  {t('checkout.continueToPayment')}
                </button>
              </form>
            </>
          )}

          {step === 2 && (
            <>
              <div className="text-center mb-5 sm:mb-6">
                <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto bg-primary rounded-xl flex items-center justify-center text-white text-xl sm:text-2xl shadow-lg shadow-primary/30">
                  <FaLock />
                </div>
                <h2 className="mt-3 sm:mt-4 text-xl sm:text-2xl font-bold text-gray-800">{t('checkout.paymentTitle')}</h2>
                <p className="text-gray-500 text-xs sm:text-sm">{t('checkout.paymentSubtitle')}</p>
              </div>

              {/* Order summary */}
              <div className="bg-gray-50 rounded-xl border border-gray-100 p-4 mb-5">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{t('checkout.orderSummary')}</p>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {cart.map((item) => (
                    <div key={item.book.id} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700 truncate pr-2">
                        <FaBookOpen className="inline text-primary/60 mr-1.5 -mt-0.5" />
                        {item.book.title}
                        <span className="text-gray-400"> × {item.qty}</span>
                      </span>
                      <span className="text-gray-800 font-medium flex-shrink-0">{formatPrice(item.book.price * item.qty)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between border-t border-gray-200 mt-3 pt-3">
                  <span className="text-sm font-semibold text-gray-700">{t('checkout.total')}</span>
                  <span className="text-lg font-bold text-primary">{formatPrice(total)}</span>
                </div>
              </div>

              <form onSubmit={handlePaymentSubmit} className="space-y-5">
                {/* Email for confirmation */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-2">
                    <FaEnvelope className="text-primary/60" /> {t('checkout.emailForConfirmation')}
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={payment.email}
                    onChange={changePayment}
                    placeholder={t('checkout.emailPlaceholder')}
                    className={inputClass}
                  />
                  <p className="text-xs text-gray-400 mt-2">
                    {t('checkout.emailHint')}
                  </p>
                  {errors.email && <p className={errorClass}>{errors.email}</p>}
                </div>

                {/* Method selection */}
                <div className="grid grid-cols-3 gap-2">
                  {paymentMethods.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setPayment((prev) => ({ ...prev, method: m.id }))
                        setErrors({})
                      }}
                      className={`flex flex-col items-center gap-2 py-3 rounded-xl border-2 transition-all ${
                        payment.method === m.id
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      <m.icon className={`text-xl ${m.color}`} />
                      <span className="text-[11px] font-semibold leading-tight text-center">{m.label}</span>
                    </button>
                  ))}
                </div>

                {payment.method === 'airtel' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-2">
                      <FaMobileAlt className="text-red-500" /> {t('checkout.airtelNumber')}
                    </label>
                    <input
                      type="tel"
                      name="airtelPhone"
                      value={payment.airtelPhone}
                      onChange={changePayment}
                      placeholder={t('checkout.phonePlaceholder')}
                      className={inputClass}
                    />
                    {errors.airtelPhone && <p className={errorClass}>{errors.airtelPhone}</p>}
                    <p className="text-xs text-gray-400 mt-2">{t('checkout.approvePrompt')}</p>
                  </div>
                )}

                {payment.method === 'momo' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-2">
                      <FaPhone className="text-yellow-500" /> {t('checkout.momoNumber')}
                    </label>
                    <input
                      type="tel"
                      name="momoPhone"
                      value={payment.momoPhone}
                      onChange={changePayment}
                      placeholder={t('checkout.phonePlaceholder')}
                      className={inputClass}
                    />
                    {errors.momoPhone && <p className={errorClass}>{errors.momoPhone}</p>}
                    <p className="text-xs text-gray-400 mt-2">{t('checkout.approvePrompt')}</p>
                  </div>
                )}

                {payment.method === 'card' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-2">
                        <FaUser className="text-primary/60" /> {t('checkout.cardHolderName')}
                      </label>
                      <input
                        type="text"
                        name="cardName"
                        value={payment.cardName}
                        onChange={changePayment}
                        placeholder={t('checkout.nameOnCard')}
                        className={inputClass}
                      />
                      {errors.cardName && <p className={errorClass}>{errors.cardName}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-2">
                        <FaCreditCard className="text-blue-600" /> {t('checkout.cardNumber')}
                      </label>
                      <input
                        type="text"
                        name="cardNumber"
                        value={payment.cardNumber}
                        onChange={changePayment}
                        placeholder="0000 0000 0000 0000"
                        className={inputClass}
                      />
                      {errors.cardNumber && <p className={errorClass}>{errors.cardNumber}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('checkout.expiryDate')}</label>
                        <input
                          type="text"
                          name="cardExpiry"
                          value={payment.cardExpiry}
                          onChange={changePayment}
                          placeholder="MM/YY"
                          className={inputClass}
                        />
                        {errors.cardExpiry && <p className={errorClass}>{errors.cardExpiry}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('checkout.cvv')}</label>
                        <input
                          type="password"
                          name="cardCvv"
                          value={payment.cardCvv}
                          onChange={changePayment}
                          placeholder="•••"
                          maxLength={3}
                          className={inputClass}
                        />
                        {errors.cardCvv && <p className={errorClass}>{errors.cardCvv}</p>}
                      </div>
                    </div>
                  </>
                )}

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-5 py-4 rounded-xl border border-gray-200 text-gray-600 font-semibold transition-all hover:bg-gray-50 flex items-center gap-2"
                  >
                    <FaChevronLeft className="text-xs" /> {t('checkout.back')}
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className={`flex-1 py-4 rounded-xl bg-blue-600 text-white font-semibold text-lg transition-all hover:bg-blue-700 hover:scale-[1.02] shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 ${
                      isLoading ? 'opacity-70 cursor-not-allowed' : ''
                    }`}
                  >
                    {isLoading ? (
                      <>
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {t('checkout.processing')}
                      </>
                    ) : (
                      <>{t('checkout.pay', { total: formatPrice(total) })}</>
                    )}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default CheckoutForm
