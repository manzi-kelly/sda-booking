import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  FaBookOpen,
  FaSearch,
  FaTimes,
  FaUser,
  FaMapMarkerAlt,
  FaShoppingCart
} from 'react-icons/fa'
import { books as fallbackBooks } from '../data/books'
import { useLanguage } from '../i18n/LanguageContext.jsx'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

const formatPrice = (n) => 'RWF ' + Number(n || 0).toLocaleString()

const mapBooks = (items) =>
  (Array.isArray(items) ? items : []).map((b) => ({
    id: b.id,
    title: b.title || '',
    author: b.author || '',
    category: b.category || 'Book',
    description: b.description || '',
    image: b.image,
    gradient: b.gradient || 'from-teal-500 to-emerald-700',
    copies: Number(b.copies) || 1,
    price: Number(b.price) || 0
  }))

const SearchOverlay = ({ onClose, onSelectBook }) => {
  const { t } = useLanguage()
  const inputRef = useRef(null)
  const [query, setQuery] = useState('')
  const [books, setBooks] = useState([])

  useEffect(() => {
    let mounted = true
    fetch(`${API_URL}/api/books`)
      .then((res) => (res.ok ? res.json() : []))
      .then((items) => {
        if (!mounted) return
        const mapped = mapBooks(items)
        setBooks(mapped.length > 0 ? mapped : fallbackBooks)
      })
      .catch(() => {
        if (mounted) setBooks(fallbackBooks)
      })
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus()
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return books.filter((b) =>
      [b.title, b.author, b.category, b.description]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q)
    )
  }, [query, books])

  const notFound = query.trim() !== '' && results.length === 0

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-slideUp my-3 sm:my-8 max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-4rem)] flex flex-col">
        {/* Close */}
        <button
          onClick={onClose}
          aria-label={t('aria.close')}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 text-gray-400 hover:text-gray-600 transition-colors z-10 w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
        >
          <FaTimes />
        </button>

        {/* Search input */}
        <div className="p-4 sm:p-6 pb-3 sm:pb-4">
          <div className="text-center mb-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto bg-primary rounded-xl flex items-center justify-center text-white text-xl sm:text-2xl shadow-lg shadow-primary/30">
              <FaSearch />
            </div>
            <h2 className="mt-3 text-xl sm:text-2xl font-bold text-gray-800">{t('search.title')}</h2>
          </div>
          <div className="relative">
            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('search.placeholder')}
              className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-gray-200 outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all text-gray-700 placeholder-gray-400"
            />
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-4 sm:pb-6 min-h-0">
          {notFound ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mb-4">
                <FaBookOpen className="text-2xl" />
              </div>
              <p className="text-gray-600 font-semibold">{t('search.notFound')}</p>
              <p className="text-sm text-gray-400 mt-1">{t('search.notFoundHint')}</p>
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mb-4">
                <FaBookOpen className="text-2xl" />
              </div>
              <p className="text-gray-500 font-medium">{t('search.emptyHint')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {results.map((book) => (
                <button
                  key={book.id}
                  onClick={() => onSelectBook(book)}
                  className="w-full flex items-center gap-3 sm:gap-4 p-3 rounded-xl border border-gray-100 bg-gray-50 hover:border-primary hover:bg-primary/5 transition-all text-left group"
                >
                  <div className="w-12 h-14 sm:w-14 sm:h-16 rounded-lg overflow-hidden bg-white border border-gray-100 flex-shrink-0">
                    {book.image ? (
                      <img
                        src={book.image}
                        alt={book.title}
                        onError={(e) => { e.currentTarget.style.display = 'none' }}
                        className="w-full h-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800 truncate group-hover:text-primary transition-colors">
                      {book.title}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{book.author}</p>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-400">
                      <span className="flex items-center gap-1">
                        <FaUser className="text-primary/50" />
                        {book.category}
                      </span>
                      <span className="flex items-center gap-1">
                        <FaMapMarkerAlt className="text-primary/50" />
                        {t('dashboard.copies', { count: book.copies })}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <span className="text-sm font-bold text-gray-900">{formatPrice(book.price)}</span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg btn-primary text-white text-xs font-semibold transition-colors">
                      <FaShoppingCart className="text-[10px]" />
                      {t('nav.bookNow')}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SearchOverlay
