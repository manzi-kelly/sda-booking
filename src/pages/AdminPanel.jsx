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
  FaShieldAlt,
  FaPlus,
  FaPencilAlt,
  FaTimes,
  FaPaperPlane,
  FaClipboardList,
  FaTags
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

const ORDER_TABS = [
  { id: 'all', labelKey: 'admin.tabAll' },
  { id: 'new', labelKey: 'admin.tabNew' },
  { id: 'processing', labelKey: 'admin.tabProcessing' },
  { id: 'completed', labelKey: 'admin.tabCompleted' },
  { id: 'cancelled', labelKey: 'admin.tabCancelled' }
]

const matchesOrderTab = (order, tab) => {
  switch (tab) {
    case 'new': return order.status === 'New'
    case 'processing': return order.status === 'Processing'
    case 'completed': return order.status === 'Delivered' || order.status === 'Complete'
    case 'cancelled': return order.status === 'Cancelled'
    default: return true
  }
}

const GRADIENTS = [
  'from-teal-500 to-emerald-700',
  'from-blue-600 to-indigo-700',
  'from-rose-500 to-pink-700',
  'from-amber-500 to-orange-700',
  'from-purple-600 to-violet-800',
  'from-cyan-500 to-blue-700',
  'from-lime-500 to-green-700',
  'from-red-500 to-rose-700'
]

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
  const [orderTab, setOrderTab] = useState('all')
  const [toast, setToast] = useState(null)
  const [adminToken, setAdminToken] = useState('')

  const [activeTab, setActiveTab] = useState('orders')

  const [products, setProducts] = useState([])
  const [showBookForm, setShowBookForm] = useState(false)
  const [editingBook, setEditingBook] = useState(null)
  const [bookForm, setBookForm] = useState({
    title: '',
    author: '',
    category: '',
    description: '',
    image: '',
    gradient: GRADIENTS[0],
    copies: 1,
    price: ''
  })
  const [bookErrors, setBookErrors] = useState({})

  const [confirmOrder, setConfirmOrder] = useState(null)
  const [notifyEmail, setNotifyEmail] = useState('')
  const [notifyPhone, setNotifyPhone] = useState('')
  const [isNotifying, setIsNotifying] = useState(false)

  const mergeOrders = (local, remote) => {
    const map = new Map()
    const keyOf = (o) => o.id || `${toTimestamp(o.bookedAt || o.createdAt)}-${o.title}-${o.email}`
    ;(Array.isArray(local) ? local : []).forEach((o) => map.set(keyOf(o), o))
    ;(Array.isArray(remote) ? remote : []).forEach((o) => map.set(keyOf(o), o))
    return Array.from(map.values())
  }

  const fetchProducts = () => {
    return fetch(`${API_URL}/api/books`)
      .then((res) => (res.ok ? res.json() : []))
      .then((items) => setProducts(Array.isArray(items) ? items : []))
      .catch(() => setProducts([]))
  }

  useEffect(() => {
    try {
      const local = JSON.parse(localStorage.getItem('bookings')) || []
      if (Array.isArray(local)) setOrders(local)
    } catch {
      setOrders([])
    }

    fetchProducts()

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

  const doUpdateStatus = (index, status, extra = {}, onDone) => {
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
        body: JSON.stringify({ status, ...extra })
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (onDone) onDone(data)
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

  const handleStatusChange = (index, status) => {
    const order = orders[index]
    if (!order) return
    if (order.status === status) return

    const isDelivery = status === 'Delivered' || status === 'Complete'
    if (isDelivery) {
      setConfirmOrder({ index, order, status })
      setNotifyEmail(order.email || '')
      setNotifyPhone(order.phone || '')
      return
    }

    doUpdateStatus(index, status)
  }

  const handleConfirmNotify = (e) => {
    e.preventDefault()
    if (!confirmOrder) return
    const { index, status } = confirmOrder
    setIsNotifying(true)

    doUpdateStatus(index, status, { notifyEmail: notifyEmail.trim(), notifyPhone: notifyPhone.trim() }, () => {
      setIsNotifying(false)
      setConfirmOrder(null)
      setToast({ type: 'success', text: t('admin.notifySuccess', { status: statusLabel(status) }) })
    })
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

  /* ----------------------------------------------------------------
     PRODUCTS (books)
  ---------------------------------------------------------------- */

  const openAddBook = () => {
    setEditingBook(null)
    setBookForm({
      title: '',
      author: '',
      category: '',
      description: '',
      image: '',
      gradient: GRADIENTS[0],
      copies: 1,
      price: ''
    })
    setBookErrors({})
    setShowBookForm(true)
  }

  const openEditBook = (book) => {
    setEditingBook(book)
    setBookForm({
      title: book.title || '',
      author: book.author || '',
      category: book.category || '',
      description: book.description || '',
      image: book.image || '',
      gradient: book.gradient || GRADIENTS[0],
      copies: Number(book.copies) || 1,
      price: book.price != null ? Number(book.price) : ''
    })
    setBookErrors({})
    setShowBookForm(true)
  }

  const changeBookForm = (e) => {
    const { name, value } = e.target
    setBookForm((prev) => ({ ...prev, [name]: value }))
    setBookErrors((prev) => ({ ...prev, [name]: '' }))
  }

  const submitBook = (e) => {
    e.preventDefault()
    const next = {}
    if (!bookForm.title.trim()) next.title = t('admin.titleRequired')
    if (bookForm.price === '' || isNaN(Number(bookForm.price)) || Number(bookForm.price) < 0) {
      next.price = t('admin.priceRequired')
    }
    if (Object.keys(next).length > 0) {
      setBookErrors(next)
      return
    }

    const payload = {
      title: bookForm.title.trim(),
      author: bookForm.author.trim(),
      category: bookForm.category.trim() || 'General',
      description: bookForm.description.trim(),
      image: bookForm.image.trim(),
      gradient: bookForm.gradient,
      copies: Math.max(1, Number(bookForm.copies) || 1),
      price: Number(bookForm.price)
    }

    const url = editingBook
      ? `${API_URL}/api/admin/books/${editingBook.id}`
      : `${API_URL}/api/admin/books`
    const method = editingBook ? 'PATCH' : 'POST'

    fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify(payload)
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) throw new Error('Failed to save book')
        setShowBookForm(false)
        fetchProducts()
        setToast({ type: 'success', text: t('admin.bookSaved') })
      })
      .catch((err) => {
        console.warn('Failed to save book:', err.message)
        setToast({ type: 'danger', text: err.message })
      })
  }

  const deleteBook = (book) => {
    if (!book.id) return
    if (!window.confirm(t('admin.deleteBookConfirm', { title: book.title }))) return
    fetch(`${API_URL}/api/admin/books/${book.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    })
      .then((res) => (res.ok ? res.json() : null))
      .then(() => {
        fetchProducts()
        setToast({ type: 'danger', text: t('admin.bookDeleted') })
      })
      .catch((err) => {
        console.warn('Failed to delete book:', err.message)
        setToast({ type: 'danger', text: err.message })
      })
  }

  /* ----------------------------------------------------------------
     DERIVED STATE
  ---------------------------------------------------------------- */

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
    return matchesSearch && matchesOrderTab(o, orderTab)
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

  const tabButton = (id, labelKey, active, onClick) => (
    <button
      key={id}
      onClick={onClick}
      className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
        active
          ? 'btn-primary text-white shadow-md'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
    >
      {t(labelKey)}
    </button>
  )

  const inputClass = 'w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all text-gray-700 placeholder-gray-400'
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1.5'
  const errorClass = 'text-red-500 text-sm mt-1'

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

        {/* Section tabs */}
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pb-3 flex gap-2">
          {tabButton('orders', 'admin.tabOrders', activeTab === 'orders', () => setActiveTab('orders'))}
          {tabButton('products', 'admin.tabProducts', activeTab === 'products', () => setActiveTab('products'))}
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

        {/* ================= ORDERS ================= */}
        {activeTab === 'orders' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-100 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                  <FaClipboardList className="text-primary" />
                  {t('admin.orders')}
                </h2>
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
              </div>
            </div>

            {/* Order status tabs */}
            <div className="px-4 sm:px-6 py-3 flex flex-wrap gap-2 border-b border-gray-100">
              {ORDER_TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setOrderTab(tab.id)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                    orderTab === tab.id
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {t(tab.labelKey)}
                </button>
              ))}
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
                                onChange={(e) => handleStatusChange(realIndex, e.target.value)}
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
        )}

        {/* ================= PRODUCTS ================= */}
        {activeTab === 'products' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                  <FaTags className="text-primary" />
                  {t('admin.tabProducts')}
                </h2>
                <p className="text-xs sm:text-sm text-gray-500">{t('admin.productsSubtitle')}</p>
              </div>
              <button
                onClick={openAddBook}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl btn-primary text-white text-sm font-semibold transition-all hover:scale-[1.02] shadow-md"
              >
                <FaPlus /> {t('admin.addBook')}
              </button>
            </div>

            {products.length === 0 ? (
              <div className="text-center py-16 px-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mb-4">
                  <FaBookOpen className="text-2xl" />
                </div>
                <p className="text-gray-500 font-medium">{t('admin.noBooksAdmin')}</p>
                <p className="text-sm text-gray-400 mt-1">{t('admin.noBooksAdminHint')}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50 text-[11px] sm:text-xs uppercase tracking-wider text-gray-500">
                      <th className="px-4 sm:px-6 py-3 font-semibold">{t('admin.book')}</th>
                      <th className="px-4 py-3 font-semibold">{t('admin.bookCategory')}</th>
                      <th className="px-4 py-3 font-semibold">{t('admin.bookCopies')}</th>
                      <th className="px-4 py-3 font-semibold">{t('admin.bookPrice')}</th>
                      <th className="px-4 sm:px-6 py-3 font-semibold text-right">{t('admin.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {products.map((book) => (
                      <tr key={book.id} className="hover:bg-gray-50/70 transition-colors align-top">
                        <td className="px-4 sm:px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-11 h-13 sm:w-12 sm:h-14 rounded-lg overflow-hidden bg-gradient-to-br ${book.gradient || 'from-teal-600 to-emerald-800'} flex-shrink-0`}>
                              {book.image ? (
                                <img
                                  src={book.image}
                                  alt={book.title}
                                  className="w-full h-full object-cover"
                                  onError={(e) => { e.currentTarget.style.display = 'none' }}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-white">
                                  <FaBookOpen className="text-sm" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-800 truncate max-w-[12rem]">{book.title}</p>
                              <p className="text-xs text-gray-400 truncate max-w-[12rem]">
                                {book.author || '—'} · {book.category || 'General'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-xs text-gray-600">{book.category || 'General'}</span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-xs text-gray-600">{Number(book.copies) || 0}</span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm font-bold text-primary">{formatPrice(book.price)}</span>
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEditBook(book)}
                              className="text-gray-400 hover:text-primary transition-colors p-2 hover:bg-primary/10 rounded-lg"
                              aria-label={t('admin.editBook')}
                            >
                              <FaPencilAlt />
                            </button>
                            <button
                              onClick={() => deleteBook(book)}
                              className="text-gray-300 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-lg"
                              aria-label={t('admin.deleteBook')}
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ============ Book add/edit modal ============ */}
      {showBookForm && (
        <div className="fixed inset-0 z-[70] flex items-start sm:items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-slideUp my-3 sm:my-8 max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-4rem)] flex flex-col">
            <button
              onClick={() => setShowBookForm(false)}
              aria-label={t('aria.close')}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 text-gray-400 hover:text-gray-600 transition-colors z-10 w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
            >
              <FaTimes />
            </button>

            <div className="p-5 sm:p-7 overflow-y-auto">
              <div className="text-center mb-5">
                <div className="w-14 h-14 mx-auto btn-primary rounded-xl flex items-center justify-center text-white text-xl shadow-lg shadow-black/20">
                  <FaBookOpen />
                </div>
                <h2 className="mt-3 text-xl sm:text-2xl font-bold text-gray-800">
                  {editingBook ? t('admin.editBook') : t('admin.addBook')}
                </h2>
              </div>

              <form onSubmit={submitBook} className="space-y-4">
                <div>
                  <label className={labelClass}>{t('admin.bookTitle')} *</label>
                  <input
                    type="text"
                    name="title"
                    value={bookForm.title}
                    onChange={changeBookForm}
                    placeholder={t('admin.bookTitlePlaceholder')}
                    className={inputClass}
                  />
                  {bookErrors.title && <p className={errorClass}>{bookErrors.title}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>{t('admin.bookAuthor')}</label>
                    <input
                      type="text"
                      name="author"
                      value={bookForm.author}
                      onChange={changeBookForm}
                      placeholder={t('admin.bookAuthorPlaceholder')}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>{t('admin.bookCategory')}</label>
                    <input
                      type="text"
                      name="category"
                      value={bookForm.category}
                      onChange={changeBookForm}
                      placeholder={t('admin.bookCategoryPlaceholder')}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>{t('admin.bookDescription')}</label>
                  <textarea
                    name="description"
                    value={bookForm.description}
                    onChange={changeBookForm}
                    rows="3"
                    placeholder={t('admin.bookDescriptionPlaceholder')}
                    className={`${inputClass} resize-none`}
                  ></textarea>
                </div>

                <div>
                  <label className={labelClass}>{t('admin.bookImage')}</label>
                  <input
                    type="text"
                    name="image"
                    value={bookForm.image}
                    onChange={changeBookForm}
                    placeholder="https://..."
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>{t('admin.bookGradient')}</label>
                  <div className="flex flex-wrap gap-2">
                    {GRADIENTS.map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setBookForm((prev) => ({ ...prev, gradient: g }))}
                        className={`w-8 h-8 rounded-lg bg-gradient-to-br ${g} transition-all ${
                          bookForm.gradient === g ? 'ring-2 ring-offset-2 ring-primary' : 'opacity-70 hover:opacity-100'
                        }`}
                        aria-label={g}
                      ></button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>{t('admin.bookCopies')}</label>
                    <input
                      type="number"
                      name="copies"
                      min="1"
                      value={bookForm.copies}
                      onChange={changeBookForm}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>{t('admin.bookPrice')} *</label>
                    <input
                      type="number"
                      name="price"
                      min="0"
                      value={bookForm.price}
                      onChange={changeBookForm}
                      placeholder="0"
                      className={inputClass}
                    />
                    {bookErrors.price && <p className={errorClass}>{bookErrors.price}</p>}
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowBookForm(false)}
                    className="px-5 py-3.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm transition-all hover:bg-gray-50"
                  >
                    {t('admin.cancel')}
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3.5 rounded-xl btn-primary text-white font-semibold transition-all hover:scale-[1.02] shadow-lg shadow-black/20"
                  >
                    {editingBook ? t('admin.save') : t('admin.addBook')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ============ Confirm & Notify modal ============ */}
      {confirmOrder && (
        <div className="fixed inset-0 z-[80] flex items-start sm:items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-slideUp my-3 sm:my-8 max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-4rem)] flex flex-col">
            <button
              onClick={() => setConfirmOrder(null)}
              aria-label={t('aria.close')}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 text-gray-400 hover:text-gray-600 transition-colors z-10 w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
            >
              <FaTimes />
            </button>

            <div className="p-5 sm:p-7 overflow-y-auto">
              <div className="text-center mb-5">
                <div className="w-14 h-14 mx-auto btn-primary rounded-xl flex items-center justify-center text-white text-xl shadow-lg shadow-black/20">
                  <FaPaperPlane />
                </div>
                <h2 className="mt-3 text-xl sm:text-2xl font-bold text-gray-800">{t('admin.confirmNotifyTitle')}</h2>
                <p className="text-gray-500 text-xs sm:text-sm mt-1">
                  {t('admin.confirmNotifySubtitle', { status: statusLabel(confirmOrder.status) })}
                </p>
                <p className="mt-3 text-sm text-gray-700 font-semibold truncate">
                  {confirmOrder.order.title} × {confirmOrder.order.qty}
                </p>
              </div>

              <form onSubmit={handleConfirmNotify} className="space-y-4">
                <div>
                  <label className={labelClass}>
                    <FaEnvelope className="inline mr-1 -mt-0.5 text-primary/60" /> {t('admin.notifyEmail')}
                  </label>
                  <input
                    type="email"
                    value={notifyEmail}
                    onChange={(e) => setNotifyEmail(e.target.value)}
                    placeholder={t('checkout.emailPlaceholder')}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    <FaPhone className="inline mr-1 -mt-0.5 text-primary/60" /> {t('admin.notifyPhone')}
                  </label>
                  <input
                    type="tel"
                    value={notifyPhone}
                    onChange={(e) => setNotifyPhone(e.target.value)}
                    placeholder={t('checkout.phonePlaceholder')}
                    className={inputClass}
                  />
                  <p className="text-xs text-gray-400 mt-2">{t('admin.notifyPhoneHint')}</p>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setConfirmOrder(null)}
                    className="px-5 py-3.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm transition-all hover:bg-gray-50"
                  >
                    {t('admin.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={isNotifying}
                    className="flex-1 py-3.5 rounded-xl btn-primary text-white font-semibold transition-all hover:scale-[1.02] shadow-lg shadow-black/20 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isNotifying ? (
                      <>
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {t('admin.notifying')}
                      </>
                    ) : (
                      <>{t('admin.notifyAndUpdate')}</>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

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
