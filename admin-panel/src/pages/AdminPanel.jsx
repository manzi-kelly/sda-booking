import React, { useState, useEffect, useMemo } from 'react'
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
  FaExclamationTriangle,
  FaArrowLeft,
  FaUsers,
  FaBell,
  FaPlus,
  FaSpinner
} from 'react-icons/fa'
import { adminFetch } from '../config/api'

const formatPrice = (n) => 'RWF ' + Number(n || 0).toLocaleString()

const formatDate = (value) => {
  if (!value) return ''
  if (typeof value === 'object' && value._seconds) {
    return new Date(value._seconds * 1000).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
  }
  const d = new Date(value)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

const toTimestamp = (o) =>
  o?.createdAt?._seconds || new Date(o?.createdAt || o?.bookedAt || 0).getTime() / 1000 || 0

const PAYMENT_LABELS = {
  airtel: 'Airtel Money',
  momo: 'MTN MoMo',
  card: 'Bank Card'
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
  New: <FaBell className="text-amber-600" />,
  Processing: <FaSpinner className="text-indigo-600" />,
  Delivered: <FaTruck className="text-blue-600" />,
  Complete: <FaCheckCircle className="text-green-600" />,
  Cancelled: <FaBan className="text-red-600" />
}

const StatusBadge = ({ status, pulse }) => (
  <span
    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide ${
      STATUS_STYLES[status] || 'bg-gray-100 text-gray-600'
    } ${pulse ? 'animate-pulse' : ''}`}
  >
    {status || '—'}
  </span>
)

const AdminPanel = () => {
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')
  const [selectedEmail, setSelectedEmail] = useState(null)
  const [toast, setToast] = useState(null)

  const loadOrders = async () => {
    setLoading(true)
    setLoadError('')
    try {
      const items = await adminFetch('/api/admin/bookings')
      setOrders(items)
    } catch (err) {
      setLoadError(err.message || 'Failed to load orders. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrders()
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(timer)
  }, [toast])

  if (localStorage.getItem('isAdminLoggedIn') !== 'true') {
    return <Navigate to="/admin" replace />
  }

  const changeStatus = async (id, status) => {
    const previous = orders
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)))
    try {
      await adminFetch(`/api/admin/bookings/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      })
      setToast({ type: 'success', text: `Order marked as ${status}` })
    } catch (err) {
      setOrders(previous)
      setToast({ type: 'danger', text: err.message || 'Failed to update status' })
    }
  }

  const deleteOrder = async (id) => {
    const target = orders.find((o) => o.id === id)
    if (!window.confirm(`Delete the order for "${target ? target.title : 'this book'}" by ${target ? target.name : 'this customer'}?`)) return
    try {
      await adminFetch(`/api/admin/bookings/${id}`, { method: 'DELETE' })
      setOrders((prev) => prev.filter((o) => o.id !== id))
      setToast({ type: 'danger', text: 'Order deleted.' })
    } catch (err) {
      setToast({ type: 'danger', text: err.message || 'Failed to delete order' })
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('isAdminLoggedIn')
    localStorage.removeItem('admin_token')
    navigate('/admin', { replace: true })
  }

  const customers = useMemo(() => {
    const map = {}
    for (const o of orders) {
      const key = String(o.email || o.phone || o.name || 'unknown').trim().toLowerCase()
      if (!map[key]) map[key] = []
      map[key].push(o)
    }
    return Object.entries(map)
      .map(([key, items]) => {
        const sorted = items.slice().sort((a, b) => toTimestamp(b) - toTimestamp(a))
        const latest = sorted[0]
        const newCount = items.filter((o) => o.status === 'New').length
        const totalSpent = items
          .filter((o) => o.status !== 'Cancelled')
          .reduce((sum, o) => sum + (Number(o.price) || 0) * (Number(o.qty) || 1), 0)
        return {
          key,
          name: latest.name || 'Unknown',
          email: latest.email || '',
          phone: latest.phone || '',
          orders: sorted,
          orderCount: items.length,
          newCount,
          totalSpent,
          lastAt: toTimestamp(latest)
        }
      })
      .sort((a, b) => b.newCount - a.newCount || b.lastAt - a.lastAt)
  }, [orders])

  const stats = useMemo(
    () => ({
      total: orders.length,
      customers: customers.length,
      revenue: orders
        .filter((o) => o.status !== 'Cancelled')
        .reduce((sum, o) => sum + (Number(o.price) || 0) * (Number(o.qty) || 1), 0),
      newOrders: orders.filter((o) => o.status === 'New').length
    }),
    [orders, customers]
  )

  const query = search.trim().toLowerCase()
  const filteredCustomers = customers.filter((c) => {
    const matchesSearch =
      !query || [c.name, c.email, c.phone].filter(Boolean).join(' ').toLowerCase().includes(query)
    const matchesFilter = filter === 'All' || (filter === 'New' && c.newCount > 0)
    return matchesSearch && matchesFilter
  })

  const selectedCustomer = selectedEmail ? customers.find((c) => c.key === selectedEmail) : null

  const statusOptions = useMemo(() => {
    const set = new Set(STATUS_OPTIONS)
    for (const o of orders) set.add(o.status)
    return [...set]
  }, [orders])

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

  const renderCustomerList = () => (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-gray-900">Customers</h2>
          <p className="text-xs sm:text-sm text-gray-500">
            {filteredCustomers.length} of {customers.length} customer{customers.length === 1 ? '' : 's'} · {stats.newOrders} new order{stats.newOrders === 1 ? '' : 's'}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1 sm:w-56">
            <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customers..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all text-sm text-gray-700 placeholder-gray-400"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-gray-200 outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all text-sm text-gray-700 bg-white cursor-pointer"
          >
            <option value="All">All customers</option>
            <option value="New">New orders only</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-3 py-16 text-gray-400">
          <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-sm font-medium">Loading customers...</p>
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="text-center py-16 px-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mb-4">
            <FaUsers className="text-2xl" />
          </div>
          <p className="text-gray-500 font-medium">No customers found</p>
          <p className="text-sm text-gray-400 mt-1">Customers who placed orders will appear here.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 text-[11px] sm:text-xs uppercase tracking-wider text-gray-500">
                <th className="px-4 sm:px-6 py-3 font-semibold">Customer</th>
                <th className="px-4 py-3 font-semibold">Phone</th>
                <th className="px-4 py-3 font-semibold text-center">Orders</th>
                <th className="px-4 py-3 font-semibold">Total Spent</th>
                <th className="px-4 py-3 font-semibold">Last Order</th>
                <th className="px-4 py-3 font-semibold text-center">New</th>
                <th className="px-4 sm:px-6 py-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredCustomers.map((c) => (
                <tr
                  key={c.key}
                  onClick={() => setSelectedEmail(c.key)}
                  className={`hover:bg-primary/5 transition-colors cursor-pointer ${
                    c.newCount > 0 ? 'bg-amber-50/70' : ''
                  }`}
                >
                  <td className="px-4 sm:px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                          c.newCount > 0 ? 'bg-amber-100 text-amber-600' : 'bg-primary/10 text-primary'
                        }`}
                      >
                        <FaBookOpen className="text-sm" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate max-w-[11rem]">{c.name}</p>
                        <p className="text-xs text-gray-400 truncate max-w-[11rem]">
                          <FaEnvelope className="inline mr-1 -mt-0.5" />
                          {c.email || '—'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-sm text-gray-600 whitespace-nowrap">
                      <FaPhone className="inline mr-1 -mt-0.5 text-gray-300" />
                      {c.phone || '—'}
                    </p>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className="inline-flex items-center justify-center min-w-7 px-2 py-1 rounded-lg bg-gray-100 text-gray-700 text-sm font-bold">
                      {c.orderCount}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-sm font-bold text-primary">{formatPrice(c.totalSpent)}</p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-xs text-gray-500 whitespace-nowrap">{c.lastAt ? formatDate(c.orders[0].createdAt || c.orders[0].bookedAt) : '—'}</p>
                  </td>
                  <td className="px-4 py-4 text-center">
                    {c.newCount > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500 text-white text-[11px] font-bold animate-pulse">
                        <FaBell className="text-xs" /> {c.newCount} NEW
                      </span>
                    ) : (
                      <span className="inline-flex items-center justify-center text-xs text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 sm:px-6 py-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedEmail(c.key)
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary hover:text-white transition-colors"
                    >
                      View Orders
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )

  const renderCustomerDetail = () => {
    if (!selectedCustomer) {
      return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
          <p className="text-gray-500 font-medium">Customer not found</p>
          <button
            onClick={() => setSelectedEmail(null)}
            className="mt-3 text-sm font-semibold text-primary hover:underline"
          >
            Back to customers
          </button>
        </div>
      )
    }

    return (
      <div className="space-y-5 sm:space-y-6">
        {/* Back */}
        <button
          onClick={() => setSelectedEmail(null)}
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-primary transition-colors"
        >
          <FaArrowLeft /> Back to customers
        </button>

        {/* Customer header */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <FaBookOpen className="text-primary text-xl" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 truncate">{selectedCustomer.name}</h2>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-gray-500">
                <span>
                  <FaEnvelope className="inline mr-1 -mt-0.5 text-gray-300" />
                  {selectedCustomer.email || '—'}
                </span>
                <span>
                  <FaPhone className="inline mr-1 -mt-0.5 text-gray-300" />
                  {selectedCustomer.phone || '—'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4 sm:gap-6 flex-shrink-0">
              <div className="text-center">
                <p className="text-lg font-bold text-gray-900">{selectedCustomer.orderCount}</p>
                <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">Orders</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-primary">{formatPrice(selectedCustomer.totalSpent)}</p>
                <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">Total Spent</p>
              </div>
              <div className="text-center">
                <p className={`text-lg font-bold ${selectedCustomer.newCount > 0 ? 'text-amber-500' : 'text-gray-300'}`}>
                  {selectedCustomer.newCount}
                </p>
                <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">New</p>
              </div>
            </div>
          </div>
        </div>

        {/* Orders table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-100">
            <h3 className="text-base sm:text-lg font-bold text-gray-900">Order History</h3>
            <p className="text-xs sm:text-sm text-gray-500">
              {selectedCustomer.orderCount} order{selectedCustomer.orderCount === 1 ? '' : 's'} for this customer
            </p>
          </div>

          {selectedCustomer.orders.length === 0 ? (
            <div className="text-center py-14 px-4">
              <FaBoxOpen className="mx-auto text-3xl text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">No orders for this customer</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50 text-[11px] sm:text-xs uppercase tracking-wider text-gray-500">
                    <th className="px-4 sm:px-6 py-3 font-semibold">Book</th>
                    <th className="px-4 py-3 font-semibold">Location</th>
                    <th className="px-4 py-3 font-semibold">Payment</th>
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 sm:px-6 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {selectedCustomer.orders.map((o, i) => {
                    const total = (Number(o.price) || 0) * (Number(o.qty) || 1)
                    const isNew = o.status === 'New'
                    return (
                      <tr
                        key={o.id || `${o.bookedAt}-${i}`}
                        className={`transition-colors align-top ${isNew ? 'bg-amber-50/80 hover:bg-amber-50' : 'hover:bg-gray-50/70'}`}
                      >
                        <td className="px-4 sm:px-6 py-4">
                          <div className="flex items-start gap-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isNew ? 'bg-amber-100 text-amber-600' : 'bg-primary/10 text-primary'}`}>
                              <FaBookOpen className="text-sm" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-800 max-w-[11rem]">
                                {o.title}
                                {isNew && (
                                  <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold uppercase animate-pulse">
                                    <FaBell className="text-[9px]" /> New
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-gray-500 mt-0.5">×{o.qty} · {formatPrice(o.price)} each</p>
                              <p className="text-sm font-bold text-primary mt-1">{formatPrice(total)}</p>
                            </div>
                          </div>
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
                            {PAYMENT_LABELS[o.paymentMethod] || o.paymentMethod || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-xs text-gray-500 whitespace-nowrap">{formatDate(o.createdAt || o.bookedAt)}</p>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <StatusBadge status={o.status} pulse={isNew} />
                            <select
                              value={o.status}
                              onChange={(e) => changeStatus(o.id, e.target.value)}
                              className="px-2 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold cursor-pointer outline-none focus:ring-2 focus:ring-primary/20 text-gray-700 bg-white"
                            >
                              {statusOptions.map((s) => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-right">
                          <button
                            onClick={() => deleteOrder(o.id)}
                            className="text-gray-300 hover:text-red-500 transition-colors p-1.5 hover:bg-red-50 rounded-lg"
                            aria-label="Delete order"
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
      </div>
    )
  }

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
              <p className="text-[11px] sm:text-xs text-gray-500 truncate">Manage customers and their orders</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => navigate('/admin/books')}
              className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2.5 rounded-xl bg-primary text-white font-semibold text-sm transition-all hover:bg-primary/90 hover:scale-[1.02] shadow-lg shadow-primary/25 flex-shrink-0"
            >
              <FaPlus className="flex-shrink-0" />
              <span className="hidden md:inline">Post Book</span>
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2.5 text-gray-600 hover:text-red-600 transition-colors rounded-xl hover:bg-red-50 border border-transparent hover:border-red-100"
            >
              <FaSignOutAlt className="flex-shrink-0" />
              <span className="hidden md:inline font-medium text-sm">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Load error banner */}
        {loadError && (
          <div className="mb-6 bg-red-50 border border-red-100 rounded-2xl p-4 flex items-start gap-3">
            <FaExclamationTriangle className="text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-700">Could not load orders</p>
              <p className="text-xs text-red-600 mt-0.5">{loadError} Make sure the backend is running on http://localhost:5000.</p>
              <button onClick={loadOrders} className="mt-2 text-xs font-semibold text-red-700 hover:underline">
                Retry
              </button>
            </div>
          </div>
        )}

        {!selectedCustomer ? (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 mb-6 sm:mb-8">
              <StatCard
                icon={<FaUsers className="text-primary text-lg sm:text-xl" />}
                label="Customers"
                value={loading ? '…' : stats.customers}
                color="bg-primary/10 text-primary"
              />
              <StatCard
                icon={<FaBoxOpen className="text-gray-600 text-lg sm:text-xl" />}
                label="Total Orders"
                value={loading ? '…' : stats.total}
                color="bg-gray-100 text-gray-600"
              />
              <StatCard
                icon={<FaBell className="text-amber-500 text-lg sm:text-xl" />}
                label="New Orders"
                value={loading ? '…' : stats.newOrders}
                color="bg-amber-100 text-amber-500"
              />
              <StatCard
                icon={<FaMoneyBillWave className="text-emerald-600 text-lg sm:text-xl" />}
                label="Revenue"
                value={loading ? '…' : formatPrice(stats.revenue)}
                color="bg-emerald-100 text-emerald-600"
              />
            </div>

            {renderCustomerList()}
          </>
        ) : (
          renderCustomerDetail()
        )}
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
