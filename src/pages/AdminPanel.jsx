import React, { useState, useEffect } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import {
  FaSignOutAlt,
  FaBoxOpen,
  FaMoneyBillWave,
  FaClock,
  FaCheckCircle,
  FaTruck,
  FaBan,
  FaSearch,
  FaTrash,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaMobileAlt,
  FaCreditCard,
  FaBookOpen,
  FaShieldAlt
} from 'react-icons/fa'
import { ADMIN_CREDENTIALS } from '../config/admin'
import { useLanguage } from '../i18n/LanguageContext.jsx'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

const formatPrice = (n) => 'RWF ' + Number(n || 0).toLocaleString()

const formatDate = (iso) => {
  const ms = toTimestamp(iso)
  if (!ms) return ''
  return new Date(ms).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

const toTimestamp = (value) => {
  if (!value) return 0
  if (typeof value === 'object') {
    const seconds = value._seconds != null ? value._seconds : value.seconds
    return (Number(seconds) || 0) * 1000
  }
  const ms = new Date(value).getTime()
  return Number.isNaN(ms) ? 0 : ms
}

const PAYMENT_LABEL_KEYS = {
  airtel: 'checkout.airtelMoney',
  momo: 'checkout.mtnMomo',
  card: 'checkout.bankCard'
}

const STATUS_OPTIONS = ['New', 'Processing', 'Delivered', 'Complete', 'Cancelled']

const STATUS_STYLES = {
  New: 'bg-amber-100 text-amber-700',
  Processing: 'bg-indigo-100 text-indigo-700',
  Delivered: 'bg-blue-100 text-blue-700',
  Complete: 'bg-green-100 text-green-700',
  Cancelled: 'bg-red-100 text-red-600'
}

const STATUS_ICONS = {
  New: <FaClock className="text-amber-600" />,
  Processing: <FaClock className="text-indigo-600" />,
  Delivered: <FaTruck className="text-blue-600" />,
  Complete: <FaCheckCircle className="text-green-600" />,
  Cancelled: <FaBan className="text-red-600" />
}

const AdminPanel = () => {
  const { t } = useLanguage()
  const navigate = useNavigate()

  const statusLabel = (status) => {
    const key = `dashboard.status${status}`
    const label = t(key)
    return label === key ? status : label
  }

  const paymentLabel = (method) => t(PAYMENT_LABEL_KEYS[method] || 'checkout.bankCard')
  const [orders, setOrders] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [toast, setToast] = useState(null)
  const [adminToken, setAdminToken] = useState('')

  const mergeOrders = (local, remote) => {
    const map = new Map()
    const keyOf = (o) => o.id || `${toTimestamp(o.bookedAt || o.createdAt)}-${o.title}-${o.email}`
    ;(Array.isArray(local) ? local : []).forEach((o) => map.set(keyOf(o), o))
    ;(Array.isArray(remote) ? remote : []).forEach((o) => map.set(keyOf(o), o))
    return Array.from(map.values())
  }

  useEffect(() => {
    try {
      const local = JSON.parse(localStorage.getItem('bookings')) || []
      if (Array.isArray(local)) setOrders(local)
    } catch {
      setOrders([])
    }

    fetch(`${API_URL}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ADMIN_CREDENTIALS)
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data || !data.token) return null
        setAdminToken(data.token)
        return fetch(`${API_URL}/api/admin/bookings`, {
          headers: { Authorization: `Bearer ${data.token}` }
        })
      })
      .then((res) => (res && res.ok ? res.json() : null))
      .then((items) => {
        if (Array.isArray(items)) {
          setOrders((prev) => mergeOrders(prev, items))
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(timer)
  }, [toast])

  if (localStorage.getItem('isAdminLoggedIn') !== 'true') {
    return <Navigate to="/admin" replace />
  }

  const persist = (next) => {
    localStorage.setItem('bookings', JSON.stringify(next))
    setOrders(next)
  }

  const changeStatus = (index, status) => {
    const next = orders.map((o, i) => (i === index ? { ...o, status } : o))
    persist(next)

    const target = next[index]
    if (target && target.id && adminToken) {
      fetch(`${API_URL}/api/admin/bookings/${target.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({ status })
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && (status === 'Delivered' || status === 'Complete')) {
            setToast({ type: 'success', text: t('admin.statusUpdatedNotified', { status: statusLabel(status) }) })
            return
          }
          setToast({ type: 'success', text: t('admin.statusUpdated', { status: statusLabel(status) }) })
        })
        .catch(() => {
          setToast({ type: 'success', text: t('admin.statusUpdated', { status: statusLabel(status) }) })
        })
      return
    }

    setToast({ type: 'success', text: t('admin.statusUpdated', { status: statusLabel(status) }) })
  }

  const deleteOrder = (index) => {
    const target = orders[index]
    if (!window.confirm(t('admin.deleteConfirm', { title: target?.title || '', name: target?.name || '' }))) return
    const next = orders.filter((_, i) => i !== index)
    persist(next)
    setToast({ type: 'danger', text: t('admin.orderDeleted') })

    if (target && target.id && adminToken) {
      fetch(`${API_URL}/api/admin/bookings/${target.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` }
      }).catch(() => {})
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('isAdminLoggedIn')
    navigate('/admin', { replace: true })
  }

  const sorted = orders.slice().sort((a, b) => toTimestamp(b.bookedAt || b.createdAt) - toTimestamp(a.bookedAt || a.createdAt))

  const stats = {
    total: sorted.length,
    revenue: sorted
      .filter((o) => o.status !== 'Cancelled')
      .reduce((sum, o) => sum + (Number(o.price) || 0) * (Number(o.qty) || 1), 0),
    pending: sorted.filter((o) => o.status === 'New').length,
    confirmed: sorted.filter((o) => o.status === 'Complete').length
  }

  const query = search.trim().toLowerCase()
  const filtered = sorted.filter((o) => {
    const haystack = [o.name, o.email, o.phone, o.title, o.district, o.sector, paymentLabel(o.paymentMethod)]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    const matchesSearch = !query || haystack.includes(query)
    const matchesStatus = statusFilter === 'All' || o.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const StatCard = ({ icon, label, value, color }) => (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5 flex items-center gap-3 sm:gap-4">
      <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl ${color} flex items-center justify-center flex-shrink-0`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className="text-lg sm:text-xl font-bold text-gray-900 truncate">{value}</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-4 flex justify-between items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold flex-shrink-0">
              <FaShieldAlt />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-gray-800 truncate">SDA Booking Admin</h1>
              <p className="text-[11px] sm:text-xs text-gray-500 truncate">{t('admin.subtitle')}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2.5 text-gray-600 hover:text-red-600 transition-colors rounded-xl hover:bg-red-50 border border-transparent hover:border-red-100"
          >
            <FaSignOutAlt className="flex-shrink-0" />
            <span className="hidden md:inline font-medium text-sm">{t('admin.logout')}</span>
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 mb-6 sm:mb-8">
          <StatCard
            icon={<FaBoxOpen className="text-primary text-lg sm:text-xl" />}
            label={t('admin.totalOrders')}
            value={stats.total}
            color="bg-primary/10 text-primary"
          />
          <StatCard
            icon={<FaMoneyBillWave className="text-emerald-600 text-lg sm:text-xl" />}
            label={t('admin.revenue')}
            value={formatPrice(stats.revenue)}
            color="bg-emerald-100 text-emerald-600"
          />
          <StatCard
            icon={<FaClock className="text-yellow-600 text-lg sm:text-xl" />}
            label={t('admin.new')}
            value={stats.pending}
            color="bg-yellow-100 text-yellow-600"
          />
          <StatCard
            icon={<FaCheckCircle className="text-blue-600 text-lg sm:text-xl" />}
            label={t('admin.complete')}
            value={stats.confirmed}
            color="bg-blue-100 text-blue-600"
          />
        </div>

        {/* Orders card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900">{t('admin.orders')}</h2>
              <p className="text-xs sm:text-sm text-gray-500">{t('admin.ordersShown', { filtered: filtered.length, total: sorted.length })}</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1 sm:w-56">
                <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('admin.searchOrders')}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all text-sm text-gray-700 placeholder-gray-400"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2.5 rounded-xl border border-gray-200 outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all text-sm text-gray-700 bg-white cursor-pointer"
              >
                <option value="All">{t('admin.allStatuses')}</option>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{statusLabel(s)}</option>
                ))}
              </select>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mb-4">
                <FaBoxOpen className="text-2xl" />
              </div>
              <p className="text-gray-500 font-medium">{t('admin.noOrders')}</p>
              <p className="text-sm text-gray-400 mt-1">{t('admin.noOrdersHint')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50 text-[11px] sm:text-xs uppercase tracking-wider text-gray-500">
                    <th className="px-4 sm:px-6 py-3 font-semibold">{t('admin.customer')}</th>
                    <th className="px-4 py-3 font-semibold">{t('admin.book')}</th>
                    <th className="px-4 py-3 font-semibold">{t('admin.location')}</th>
                    <th className="px-4 py-3 font-semibold">{t('admin.payment')}</th>
                    <th className="px-4 py-3 font-semibold">{t('admin.date')}</th>
                    <th className="px-4 py-3 font-semibold">{t('admin.status')}</th>
                    <th className="px-4 sm:px-6 py-3 font-semibold text-right">{t('admin.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((o, i) => {
                    const realIndex = orders.indexOf(o)
                    const total = (Number(o.price) || 0) * (Number(o.qty) || 1)
                    return (
                      <tr key={`${o.bookedAt}-${i}`} className="hover:bg-gray-50/70 transition-colors align-top">
                        <td className="px-4 sm:px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <FaBookOpen className="text-primary text-sm" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-800 truncate max-w-[10rem]">{o.name || t('admin.unknown')}</p>
                              <p className="text-xs text-gray-400 truncate max-w-[10rem]">
                                <FaEnvelope className="inline mr-1 -mt-0.5" />
                                {o.email}
                              </p>
                              <p className="text-xs text-gray-400 truncate max-w-[10rem]">
                                <FaPhone className="inline mr-1 -mt-0.5" />
                                {o.phone}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-sm font-medium text-gray-800 max-w-[12rem]">{o.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            ×{o.qty} · {t('admin.each', { price: formatPrice(o.price) })}
                          </p>
                          <p className="text-sm font-bold text-primary mt-1">{formatPrice(total)}</p>
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-sm text-gray-600">
                            <FaMapMarkerAlt className="inline mr-1 -mt-0.5 text-primary/60" />
                            {o.district} · {o.sector}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <span className="inline-flex items-center gap-1.5 text-xs text-gray-600">
                            {o.paymentMethod === 'card' ? (
                              <FaCreditCard className="text-blue-600" />
                            ) : (
                              <FaMobileAlt className={o.paymentMethod === 'airtel' ? 'text-red-500' : 'text-yellow-500'} />
                            )}
                            {paymentLabel(o.paymentMethod) || o.paymentMethod || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-xs text-gray-500 whitespace-nowrap">{formatDate(o.bookedAt)}</p>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex w-7 h-7 items-center justify-center rounded-full ${STATUS_STYLES[o.status] || 'bg-gray-100 text-gray-600'}`}>
                              {STATUS_ICONS[o.status] || <FaClock />}
                            </span>
                            <select
                              value={o.status}
                              onChange={(e) => changeStatus(realIndex, e.target.value)}
                              className={`px-2 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer outline-none focus:ring-2 focus:ring-primary/20 ${STATUS_STYLES[o.status] || 'bg-gray-100 text-gray-700'} border-transparent`}
                            >
                              {STATUS_OPTIONS.map((s) => (
                                <option key={s} value={s}>{statusLabel(s)}</option>
                              ))}
                            </select>
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-right">
                          <button
                            onClick={() => deleteOrder(realIndex)}
                            className="text-gray-300 hover:text-red-500 transition-colors p-1.5 hover:bg-red-50 rounded-lg"
                            aria-label={t('admin.deleteOrder')}
                          >
                            <FaTrash />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-3 right-3 left-3 sm:bottom-5 sm:right-5 sm:left-auto z-50 animate-toast">
          <div className={`w-full sm:max-w-sm ml-auto bg-white rounded-2xl shadow-2xl border overflow-hidden ${toast.type === 'danger' ? 'border-red-100' : 'border-green-100'}`}>
            <div className="flex items-center gap-3 p-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${toast.type === 'danger' ? 'bg-red-100 text-red-500' : 'bg-green-100 text-green-600'}`}>
                {toast.type === 'danger' ? <FaBan /> : <FaCheckCircle />}
              </div>
              <p className="text-sm font-medium text-gray-800">{toast.text}</p>
            </div>
            <div className={`h-1 ${toast.type === 'danger' ? 'bg-gradient-to-r from-red-500 to-red-400' : 'bg-gradient-to-r from-green-500 to-emerald-400'}`}></div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminPanel
