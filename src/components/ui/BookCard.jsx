import React, { useState } from 'react'
import { FaBookOpen, FaUser, FaShoppingCart } from 'react-icons/fa'
import { useLanguage } from '../../i18n/LanguageContext.jsx'

const formatPrice = (n) => 'RWF ' + Number(n || 0).toLocaleString()

const BookCard = ({ book, onBookNow }) => {
  const { t } = useLanguage()
  const [imgError, setImgError] = useState(false)

  const copies = Number(book?.copies || 0)
  const price = Number(book?.price || 0)

  return (
    <div className="group bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-full">
      {/* Book Image */}
      <div className="relative h-56 sm:h-64 overflow-hidden bg-gray-100">
        {imgError || !book?.image ? (
          <div
            className={`w-full h-full bg-gradient-to-br ${
              book?.gradient || 'from-teal-600 to-emerald-800'
            } flex flex-col items-center justify-center text-white p-4`}
          >
            <FaBookOpen className="text-5xl mb-3 opacity-90" />
            <span className="text-center font-bold leading-snug">
              {book?.title || 'Book'}
            </span>
          </div>
        ) : (
          <img
            src={book.image}
            alt={book.title}
            loading="lazy"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        )}

        {/* Category badge */}
        <span className="absolute top-3 left-3 bg-white/85 backdrop-blur-sm text-gray-700 text-[10px] font-semibold uppercase tracking-wider px-3 py-1 rounded-full shadow-sm">
          {book?.category || 'Book'}
        </span>

        {/* Short description overlaid on the image */}
        {book?.description && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent pt-16 pb-4 px-4">
            <p className="text-white text-xs leading-5 clamp-2">
              {book.description}
            </p>
          </div>
        )}
      </div>

      {/* Book Info */}
      <div className="p-5 flex flex-col flex-1">
        <h3 className="text-lg font-bold text-gray-900 leading-snug">
          {book?.title || 'Book'}
        </h3>

        {book?.author && (
          <p className="text-sm text-gray-500 mt-1">{book.author}</p>
        )}

        <div className="flex items-center gap-4 mt-3 mb-5 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <FaUser className="text-primary/60" />
            {book?.author || '—'}
          </span>
          <span className="flex items-center gap-1.5">
            <FaBookOpen className="text-primary/60" />
            {t('dashboard.copies', { count: copies })}
          </span>
        </div>

        <div className="mt-auto">
          <div className="text-lg font-bold text-gray-900 mb-3">
            {formatPrice(price)}
          </div>

          <button
            onClick={() => onBookNow(book)}
            className="w-full py-3 rounded-xl btn-primary text-white font-semibold text-sm transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-black/20 flex items-center justify-center gap-2"
          >
            <FaShoppingCart className="text-sm" />
            {t('dashboard.bookNow')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default BookCard
