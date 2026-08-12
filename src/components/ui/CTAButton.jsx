import React from 'react'

const CTAButton = ({ children, className = '', ...props }) => (
  <button
    {...props}
    className={`inline-flex items-center gap-3 px-10 py-4 rounded-full bg-blue-600 text-white font-semibold transition-all duration-300 hover:bg-blue-700 hover:scale-105 active:scale-95 shadow-lg shadow-blue-600/30 ${className}`}
  >
    {children}
  </button>
)

export default CTAButton
