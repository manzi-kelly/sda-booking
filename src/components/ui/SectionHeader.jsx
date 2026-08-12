import React from 'react'

const SectionHeader = ({ badge, title, subtitle, align = 'center' }) => {
  const isCenter = align === 'center'

  return (
    <div className={`slide-up ${isCenter ? 'text-center' : 'text-left'}`}>
      <span className="text-primary uppercase tracking-[5px] font-semibold">
        {badge}
      </span>

      <h2 className="mt-4 text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
        {title}
      </h2>

      {subtitle && (
        <p
          className={`mt-5 text-gray-600 leading-7 ${
            isCenter ? 'max-w-2xl mx-auto' : ''
          }`}
        >
          {subtitle}
        </p>
      )}
    </div>
  )
}

export default SectionHeader
