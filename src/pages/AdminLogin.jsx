import React, { useState } from 'react'
import { useNavigate, Navigate, Link } from 'react-router-dom'
import { FaLock, FaEnvelope, FaEye, FaEyeSlash, FaChevronLeft, FaShieldAlt } from 'react-icons/fa'
import { ADMIN_CREDENTIALS } from '../config/admin'

const AdminLogin = () => {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  if (localStorage.getItem('isAdminLoggedIn') === 'true') {
    return <Navigate to="/admin/panel" replace />
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')

    if (email.trim().toLowerCase() !== ADMIN_CREDENTIALS.email) {
      setError('Invalid email or password.')
      return
    }
    if (password !== ADMIN_CREDENTIALS.password) {
      setError('Invalid email or password.')
      return
    }

    setIsLoading(true)
    setTimeout(() => {
      localStorage.setItem('isAdminLoggedIn', 'true')
      navigate('/admin/panel', { replace: true })
    }, 400)
  }

  const inputClass =
    'w-full py-3 pl-12 pr-4 rounded-xl border border-gray-200 outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all text-gray-700 placeholder-gray-400'

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary transition-colors mb-6"
        >
          <FaChevronLeft className="text-xs" /> Back to website
        </Link>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-slideUp">
          <div className="bg-primary/5 px-8 pt-8 pb-6 text-center border-b border-primary/10">
            <div className="w-14 h-14 mx-auto rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/30">
              <FaShieldAlt className="text-2xl" />
            </div>
            <h1 className="mt-4 text-xl font-bold text-gray-900">Admin Login</h1>
            <p className="text-sm text-gray-500 mt-1">Restricted area - authorised staff only</p>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
              <div className="relative">
                <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setError('')
                  }}
                  placeholder="admin@example.com"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    setError('')
                  }}
                  placeholder="Enter your password"
                  className="w-full py-3 pl-12 pr-12 rounded-xl border border-gray-200 outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all text-gray-700 placeholder-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            {error && <p className="text-red-500 text-sm text-center bg-red-50 py-2 rounded-lg">{error}</p>}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-xl bg-primary text-white font-semibold transition-all hover:bg-primary/90 hover:scale-[1.01] shadow-lg shadow-primary/30 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default AdminLogin
