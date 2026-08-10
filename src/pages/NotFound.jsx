import React from 'react'
import { Link } from 'react-router-dom'
import { FaHome, FaBookOpen, FaExclamationTriangle } from 'react-icons/fa'

const NotFound = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg text-center">
        <div className="w-20 h-20 mx-auto rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-6">
          <FaExclamationTriangle className="text-3xl" />
        </div>
        <h1 className="text-7xl font-extrabold text-gray-900 leading-none">404</h1>
        <h2 className="mt-3 text-2xl font-bold text-gray-800">Page Not Found</h2>
        <p className="mt-3 text-gray-500">
          The page you're looking for doesn't exist or may have been moved.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-white font-semibold transition-all hover:bg-primary/90 hover:scale-[1.02] shadow-lg shadow-primary/25"
          >
            <FaHome /> Back to Home
          </Link>
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-gray-200 bg-white text-gray-700 font-semibold transition-all hover:bg-gray-50"
          >
            <FaBookOpen /> Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}

export default NotFound
