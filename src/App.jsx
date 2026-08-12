import React, { lazy, Suspense, useEffect, useState } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'

const HomePage = lazy(() => import('./pages/HomePage'))
const BookingDashboard = lazy(() => import('./pages/BookingDashboard'))
const AdminLogin = lazy(() => import('./pages/AdminLogin'))
const AdminPanel = lazy(() => import('./pages/AdminPanel'))
const NotFound = lazy(() => import('./pages/NotFound'))

const PageFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-white">
    <div className="w-10 h-10 rounded-full border-4 border-teal-500 border-t-transparent animate-spin" />
  </div>
)

function App() {
  const [user, setUser] = useState(() => {
    const data = localStorage.getItem('user')
    return data ? JSON.parse(data) : null
  })
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem('isLoggedIn') === 'true')
  const location = useLocation()

  useEffect(() => {
    // Sync login state from localStorage whenever the route changes.
    // This ensures that after logging in/registering the user is taken
    // straight to the dashboard without being bounced back to home.
    const loggedIn = localStorage.getItem('isLoggedIn') === 'true'
    const userData = localStorage.getItem('user')

    setIsLoggedIn(loggedIn)
    setUser(userData ? JSON.parse(userData) : null)
  }, [location])

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn')
    localStorage.removeItem('user')
    localStorage.removeItem('isGuest')
    setIsLoggedIn(false)
    setUser(null)
  }

  // Protected route wrapper
  const ProtectedRoute = ({ children }) => {
    // Read directly from localStorage so the check is always up to date
    // right after login/register, before React state has re-synced.
    if (localStorage.getItem('isLoggedIn') !== 'true') {
      return <Navigate to="/" replace />
    }
    return children
  }

  // Admin routes are intentionally NOT linked anywhere in the UI.
  // Access them by visiting /admin directly.
  const AdminRoute = ({ children }) => {
    if (localStorage.getItem('isAdminLoggedIn') !== 'true') {
      return <Navigate to="/admin" replace />
    }
    return children
  }

  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <BookingDashboard user={user} onLogout={handleLogout} />
            </ProtectedRoute>
          } 
        />
        <Route path="/admin" element={<AdminLogin />} />
        <Route
          path="/admin/panel"
          element={
            <AdminRoute>
              <AdminPanel />
            </AdminRoute>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  )
}

export default App