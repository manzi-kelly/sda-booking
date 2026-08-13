export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export const getAdminToken = () => localStorage.getItem('admin_token')

export const clearAdminSession = () => {
  localStorage.removeItem('isAdminLoggedIn')
  localStorage.removeItem('admin_token')
}

export const adminFetch = async (path, options = {}) => {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(getAdminToken() ? { Authorization: `Bearer ${getAdminToken()}` } : {}),
      ...(options.headers || {})
    }
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || 'Request failed')
    err.status = res.status
    throw err
  }
  return data
}
