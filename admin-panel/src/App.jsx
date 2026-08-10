import { Routes, Route, Navigate } from 'react-router-dom'
import AdminLogin from './pages/AdminLogin'
import AdminPanel from './pages/AdminPanel'
import AdminBooks from './pages/AdminBooks'

const AdminRoute = ({ children }) => {
  if (localStorage.getItem('isAdminLoggedIn') !== 'true') {
    return <Navigate to="/admin" replace />
  }
  return children
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/admin" replace />} />
      <Route path="/admin" element={<AdminLogin />} />
      <Route
        path="/admin/panel"
        element={
          <AdminRoute>
            <AdminPanel />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/books"
        element={
          <AdminRoute>
            <AdminBooks />
          </AdminRoute>
        }
      />
    </Routes>
  )
}

export default App
