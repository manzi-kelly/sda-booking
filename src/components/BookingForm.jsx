import React, { useState } from 'react'
import { FaBookOpen, FaMapMarkerAlt, FaUser, FaEnvelope, FaPhone } from 'react-icons/fa'
import { districts } from '../data/locations'

const BookingForm = ({ book, onClose, onSubmit }) => {
  const loggedUser = JSON.parse(localStorage.getItem('user') || '{}')

  const [form, setForm] = useState({
    name: loggedUser.name || '',
    email: loggedUser.email || '',
    phone: '',
    district: '',
    sector: ''
  })
  const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)

  const selectedDistrict = districts.find((d) => d.name === form.district)
  const sectors = selectedDistrict ? selectedDistrict.sectors : []

  const changeHandler = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === 'district' ? { sector: '' } : {})
    }))
    setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  const validate = () => {
    const nextErrors = {}

    if (!form.name.trim()) nextErrors.name = 'Please enter your full name'
    if (!form.email.trim()) {
      nextErrors.email = 'Please enter your email'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      nextErrors.email = 'Please enter a valid email address'
    }
    if (!form.phone.trim()) {
      nextErrors.phone = 'Please enter your phone number'
    } else if (form.phone.replace(/\D/g, '').length < 9) {
      nextErrors.phone = 'Please enter a valid phone number'
    }
    if (!form.district) nextErrors.district = 'Please select your district'
    if (!form.sector) nextErrors.sector = 'Please select your sector'

    return nextErrors
  }

  const saveBooking = (booking) => {
    const existing = JSON.parse(localStorage.getItem('bookings')) || []
    existing.push(booking)
    localStorage.setItem('bookings', JSON.stringify(existing))
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    const nextErrors = validate()
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    setIsLoading(true)

    const booking = {
      name: form.name,
      email: form.email,
      phone: form.phone,
      district: form.district,
      sector: form.sector,
      title: book?.title || 'Church Book',
      status: 'New',
      bookedAt: new Date().toISOString()
    }
    saveBooking(booking)

    setTimeout(() => {
      if (onSubmit) onSubmit(booking)
    }, 600)
  }

  const inputClass = 'w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all text-gray-700 placeholder-gray-400'
  const errorClass = 'text-red-500 text-sm mt-1'

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-slideUp my-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10 w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="p-8">
          <div className="text-center mb-7">
            <div className="w-14 h-14 mx-auto bg-primary rounded-xl flex items-center justify-center text-white text-2xl shadow-lg shadow-primary/30">
              <FaBookOpen />
            </div>
            <h2 className="mt-4 text-2xl font-bold text-gray-800">Book Now</h2>
            <p className="text-gray-500 text-sm">Complete your location details below</p>
            {book?.title && (
              <span className="mt-3 inline-block bg-primary/10 text-primary text-xs font-semibold px-4 py-1.5 rounded-full">
                Booking: {book.title}
              </span>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-2">
                <FaUser className="text-primary/60" /> Full Name
              </label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={changeHandler}
                placeholder="e.g. Jean Pierre"
                className={inputClass}
              />
              {errors.name && <p className={errorClass}>{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-2">
                <FaEnvelope className="text-primary/60" /> Email Address
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={changeHandler}
                placeholder="you@email.com"
                className={inputClass}
              />
              {errors.email && <p className={errorClass}>{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-2">
                <FaPhone className="text-primary/60" /> Phone Number
              </label>
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={changeHandler}
                placeholder="+250 7XX XXX XXX"
                className={inputClass}
              />
              {errors.phone && <p className={errorClass}>{errors.phone}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-2">
                <FaMapMarkerAlt className="text-primary/60" /> District
              </label>
              <select
                name="district"
                value={form.district}
                onChange={changeHandler}
                className={`${inputClass} cursor-pointer`}
              >
                <option value="">Select your district</option>
                {districts.map((d) => (
                  <option key={d.name} value={d.name}>{d.name}</option>
                ))}
              </select>
              {errors.district && <p className={errorClass}>{errors.district}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-2">
                <FaMapMarkerAlt className="text-primary/60" /> Sector
              </label>
              <select
                name="sector"
                value={form.sector}
                onChange={changeHandler}
                disabled={!form.district}
                className={`${inputClass} cursor-pointer disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed`}
              >
                <option value="">
                  {form.district ? 'Select your sector' : 'Select a district first'}
                </option>
                {sectors.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              {errors.sector && <p className={errorClass}>{errors.sector}</p>}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-4 rounded-xl bg-blue-600 text-white font-semibold text-lg transition-all hover:bg-blue-700 hover:scale-[1.02] shadow-lg shadow-blue-600/30 ${
                isLoading ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Booking...
                </span>
              ) : (
                'Booking'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default BookingForm
