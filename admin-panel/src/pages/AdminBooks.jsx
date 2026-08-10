import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import {
  FaArrowLeft,
  FaPlus,
  FaBookOpen,
  FaUser,
  FaMapMarkerAlt,
  FaTrash,
  FaEdit,
  FaShieldAlt,
  FaSignOutAlt,
  FaCheckCircle,
  FaBan,
  FaExclamationTriangle,
  FaSpinner,
  FaStore,
  FaUpload
} from 'react-icons/fa'
import { adminFetch, API_URL } from '../config/api'
import { books as fallbackBooks } from '../data/books'

const formatPrice = (n) => 'RWF ' + Number(n || 0).toLocaleString()

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/bmp']

const processImage = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = reject
    reader.onload = () => {
      const img = new Image()
      img.onerror = reject
      img.onload = () => {
        const max = 900
        let { width, height } = img
        if (width > max || height > max) {
          const scale = Math.min(max / width, max / height)
          width = Math.round(width * scale)
          height = Math.round(height * scale)
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)
        const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
        resolve(canvas.toDataURL(mime, 0.85))
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })

const BookCard = ({ book, onDelete, onEdit }) => {
  const [imgError, setImgError] = useState(false)

  return (
    <div className="group bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col">
      <div className="relative h-56 sm:h-60 overflow-hidden bg-gray-100">
        {imgError ? (
          <div className={`w-full h-full bg-gradient-to-br ${book.gradient} flex flex-col items-center justify-center text-white p-4`}>
            <FaBookOpen className="text-5xl mb-3 opacity-90" />
            <span className="text-center font-bold leading-snug">{book.title}</span>
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

        <span className="absolute top-3 left-3 bg-white/85 backdrop-blur-sm text-gray-700 text-[10px] font-semibold uppercase tracking-wider px-3 py-1 rounded-full shadow-sm">
          {book.category}
        </span>

        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent pt-16 pb-4 px-4">
          <p className="text-white text-xs leading-5 clamp-2">{book.description}</p>
        </div>

        <div className="absolute top-3 right-3 flex flex-col gap-2">
          <button
            onClick={onEdit}
            className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm text-gray-500 hover:text-primary hover:bg-primary/10 flex items-center justify-center shadow-sm transition-colors"
            aria-label="Edit book"
            title="Edit this book"
          >
            <FaEdit className="text-sm" />
          </button>
          <button
            onClick={onDelete}
            className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm text-gray-500 hover:text-red-500 hover:bg-red-50 flex items-center justify-center shadow-sm transition-colors"
            aria-label="Delete book"
            title="Delete this book"
          >
            <FaTrash className="text-sm" />
          </button>
        </div>
        <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary text-white text-[10px] font-bold uppercase tracking-wide shadow-sm">
          <FaStore className="text-[9px]" /> {book.posted ? 'Posted' : 'Default'}
        </span>
      </div>

      <div className="p-5 flex flex-col flex-1">
        <h3 className="text-lg font-bold text-gray-900 leading-snug">{book.title}</h3>
        <p className="text-sm text-gray-500 mt-1">{book.author}</p>

        <div className="flex items-center gap-4 mt-3 mb-5 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <FaUser className="text-primary/60" />
            {book.author}
          </span>
          <span className="flex items-center gap-1.5">
            <FaMapMarkerAlt className="text-primary/60" />
            {book.copies} copies
          </span>
        </div>

        <div className="mt-auto">
          <div className="text-lg font-bold text-gray-900 mb-3">{formatPrice(book.price)}</div>
          <div className="w-full py-3 rounded-xl bg-gray-50 text-gray-400 text-sm font-semibold text-center border border-gray-100">
            {book.posted ? 'Visible on user dashboard' : 'Default book'}
          </div>
        </div>
      </div>
    </div>
  )
}

const AdminBooks = () => {
  const navigate = useNavigate()
  const [postedBooks, setPostedBooks] = useState([])
  const [booksFromDb, setBooksFromDb] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [showBookForm, setShowBookForm] = useState(false)
  const [editingBook, setEditingBook] = useState(null)
  const [postingBook, setPostingBook] = useState(false)
  const [bookError, setBookError] = useState('')
  const [toast, setToast] = useState(null)
  const [bookForm, setBookForm] = useState({
    title: '',
    author: '',
    category: '',
    description: '',
    copies: 1,
    price: ''
  })
  const [imageData, setImageData] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [imageError, setImageError] = useState('')
  const fileInputRef = useRef(null)

  if (localStorage.getItem('isAdminLoggedIn') !== 'true') {
    return <Navigate to="/admin" replace />
  }

  const loadBooks = async () => {
    setLoading(true)
    setLoadError('')
    try {
      const res = await fetch(`${API_URL}/api/books`)
      const data = await res.json().catch(() => [])
      setPostedBooks(Array.isArray(data) ? data : [])
      setBooksFromDb(true)
    } catch (err) {
      setBooksFromDb(false)
      setLoadError(err.message || 'Could not load posted books. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBooks()
  }, [])

  useEffect(() => {
    let source
    try {
      source = new EventSource(`${API_URL}/api/books/events`)
      source.addEventListener('books-changed', () => loadBooks())
    } catch {
      source = null
    }
    return () => {
      if (source) source.close()
    }
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(timer)
  }, [toast])

  const allBooks = useMemo(
    () => booksFromDb
      ? postedBooks.map((b) => ({
          ...b,
          posted: true,
          image: b.image,
          gradient: b.gradient || 'from-teal-500 to-emerald-700',
          copies: Number(b.copies) || 1,
          price: Number(b.price) || 0
        }))
      : fallbackBooks.map((b) => ({ ...b, posted: false })),
    [postedBooks, booksFromDb]
  )

  const openBookForm = () => {
    setEditingBook(null)
    setBookError('')
    setImageError('')
    setImageData('')
    setBookForm({
      title: '',
      author: '',
      category: '',
      description: '',
      copies: 1,
      price: ''
    })
    setShowBookForm(true)
  }

  const openEditBook = (book) => {
    setEditingBook(book)
    setBookError('')
    setImageError('')
    setImageData(book.image || '')
    setBookForm({
      title: book.title || '',
      author: book.author || '',
      category: book.category || '',
      description: book.description || '',
      copies: Number(book.copies) || 1,
      price: Number(book.price) || ''
    })
    setShowBookForm(true)
  }

  const handleImageFile = async (file) => {
    if (!file) return
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setImageError('Unsupported file type. Use PNG, JPG, JPEG, WEBP or GIF.')
      return
    }
    setImageError('')
    try {
      const dataUrl = await processImage(file)
      setImageData(dataUrl)
    } catch {
      setImageError('Could not read this image. Try another file.')
    }
  }

  const clearImage = () => {
    setImageData('')
    setImageError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const updateBookField = (key, value) => setBookForm((prev) => ({ ...prev, [key]: value }))

  const submitBook = async (e) => {
    e.preventDefault()
    if (!String(bookForm.title).trim()) {
      setBookError('Book title is required')
      return
    }
    if (isNaN(Number(bookForm.price)) || Number(bookForm.price) < 0) {
      setBookError('Enter a valid price')
      return
    }

    setPostingBook(true)
    setBookError('')
    const payload = {
      title: bookForm.title,
      author: bookForm.author,
      category: bookForm.category || 'General',
      description: bookForm.description,
      image: imageData || (editingBook ? editingBook.image : ''),
      copies: Number(bookForm.copies) || 1,
      price: Number(bookForm.price)
    }
    try {
      if (editingBook) {
        await adminFetch(`/api/admin/books/${editingBook.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload)
        })
        setShowBookForm(false)
        setToast({ type: 'success', text: `"${bookForm.title}" updated` })
        loadBooks()
      } else {
        await adminFetch('/api/admin/books', {
          method: 'POST',
          body: JSON.stringify(payload)
        })
        setShowBookForm(false)
        setToast({ type: 'success', text: `"${bookForm.title}" posted to the user dashboard` })
        loadBooks()
      }
    } catch (err) {
      setBookError(err.message || 'Failed to save the book')
    } finally {
      setPostingBook(false)
    }
  }

  const deleteBook = async (id, title) => {
    if (!window.confirm(`Remove "${title}" from the user dashboard?`)) return
    try {
      await adminFetch(`/api/admin/books/${id}`, { method: 'DELETE' })
      setPostedBooks((prev) => prev.filter((b) => b.id !== id))
      setToast({ type: 'danger', text: `"${title}" removed.` })
    } catch (err) {
      setToast({ type: 'danger', text: err.message || 'Failed to remove the book' })
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('isAdminLoggedIn')
    localStorage.removeItem('admin_token')
    navigate('/admin', { replace: true })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-4 flex justify-between items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold flex-shrink-0">
              <FaShieldAlt />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-gray-800 truncate">Manage Books</h1>
              <p className="text-[11px] sm:text-xs text-gray-500 truncate">Books shown on the user booking dashboard</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => navigate('/admin/panel')}
              className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2.5 text-gray-600 hover:text-primary transition-colors rounded-xl hover:bg-primary/5 border border-transparent"
            >
              <FaArrowLeft className="flex-shrink-0" />
              <span className="hidden md:inline font-medium text-sm">Dashboard</span>
            </button>
            <button
              onClick={openBookForm}
              className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2.5 rounded-xl bg-primary text-white font-semibold text-sm transition-all hover:bg-primary/90 hover:scale-[1.02] shadow-lg shadow-primary/25 flex-shrink-0"
            >
              <FaPlus className="flex-shrink-0" />
              <span className="hidden md:inline">Add Another Book</span>
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

      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8">
        {loadError && (
          <div className="mb-6 bg-red-50 border border-red-100 rounded-2xl p-4 flex items-start gap-3">
            <FaExclamationTriangle className="text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-700">Could not load posted books</p>
              <p className="text-xs text-red-600 mt-0.5">{loadError} Make sure the backend is running on http://localhost:5000.</p>
              <button onClick={loadBooks} className="mt-2 text-xs font-semibold text-red-700 hover:underline">
                Retry
              </button>
            </div>
          </div>
        )}

        <div className="mb-6 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
            <FaStore />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base sm:text-lg font-bold text-gray-900">
              Books on the user dashboard
            </h2>
            <p className="text-xs sm:text-sm text-gray-500">
              {loading ? 'Loading...' : booksFromDb ? `${allBooks.length} books in the store` : `${allBooks.length} default books (backend offline)`}
            </p>
          </div>
          <button
            onClick={openBookForm}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary/10 text-primary text-sm font-semibold hover:bg-primary hover:text-white transition-colors"
          >
            <FaPlus /> Add Another Book
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-3 py-16 text-gray-400">
            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-sm font-medium">Loading books...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 lg:gap-6">
            {allBooks.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                onDelete={() => deleteBook(book.id, book.title)}
                onEdit={() => openEditBook(book)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Post book modal */}
      {showBookForm && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-slideUp my-3 sm:my-8 max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-4rem)] flex flex-col">
            <div className="px-5 sm:px-7 py-4 sm:py-5 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <FaBookOpen />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{editingBook ? 'Edit Book' : 'Post a New Book'}</h2>
                  <p className="text-xs text-gray-500">
                    {editingBook ? 'Save your changes — users see them live' : 'It will appear on the user booking dashboard'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowBookForm(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={submitBook} className="p-5 sm:p-7 space-y-4 overflow-y-auto">
              {bookError && (
                <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600 font-medium flex items-start gap-2">
                  <FaExclamationTriangle className="mt-0.5 flex-shrink-0" />
                  {bookError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Title *</label>
                  <input
                    value={bookForm.title}
                    onChange={(e) => updateBookField('title', e.target.value)}
                    placeholder="e.g. The Great Controversy"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all text-sm text-gray-700 placeholder-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Author</label>
                  <input
                    value={bookForm.author}
                    onChange={(e) => updateBookField('author', e.target.value)}
                    placeholder="e.g. Ellen G. White"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all text-sm text-gray-700 placeholder-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Category</label>
                  <input
                    value={bookForm.category}
                    onChange={(e) => updateBookField('category', e.target.value)}
                    placeholder="e.g. Devotional"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all text-sm text-gray-700 placeholder-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Price (RWF) *</label>
                  <input
                    value={bookForm.price}
                    onChange={(e) => updateBookField('price', e.target.value)}
                    type="number"
                    min="0"
                    placeholder="e.g. 10000"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all text-sm text-gray-700 placeholder-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Copies</label>
                  <input
                    value={bookForm.copies}
                    onChange={(e) => updateBookField('copies', e.target.value)}
                    type="number"
                    min="1"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all text-sm text-gray-700 placeholder-gray-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Cover Image</label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault()
                    setDragOver(true)
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault()
                    setDragOver(false)
                    handleImageFile(e.dataTransfer.files?.[0])
                  }}
                  className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-all cursor-pointer overflow-hidden ${
                    dragOver ? 'border-primary bg-primary/5' : 'border-gray-200 bg-gray-50 hover:border-primary/50 hover:bg-primary/5'
                  }`}
                  style={{ minHeight: '170px' }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif,image/bmp"
                    className="hidden"
                    onChange={(e) => handleImageFile(e.target.files?.[0])}
                  />

                  {imageData ? (
                    <>
                      <img src={imageData} alt="Book cover preview" className="w-full h-52 object-contain" />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          clearImage()
                        }}
                        className="absolute top-2 right-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/70 text-white text-xs font-semibold hover:bg-red-600 transition-colors"
                      >
                        <FaTrash className="text-[10px]" /> Remove
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3">
                        <FaUpload />
                      </div>
                      <p className="text-sm font-semibold text-gray-700">
                        Drag & drop your cover here
                      </p>
                      <p className="text-xs text-gray-400 mt-1">or click to browse files</p>
                      <p className="text-[11px] text-gray-400 mt-2">PNG · JPG · JPEG · WEBP · GIF</p>
                    </>
                  )}
                </div>
                {imageError && <p className="text-xs text-red-500 mt-1.5">{imageError}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Description</label>
                <textarea
                  value={bookForm.description}
                  onChange={(e) => updateBookField('description', e.target.value)}
                  rows="3"
                  placeholder="Short description shown on the book card..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all text-sm text-gray-700 placeholder-gray-400 resize-none"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
                <p className="text-xs text-gray-400">
                  {editingBook ? 'Changes appear on the user dashboard immediately.' : 'Book appears on the user dashboard immediately.'}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowBookForm(false)}
                    className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={postingBook}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-white font-semibold text-sm transition-all hover:bg-primary/90 hover:scale-[1.02] shadow-lg shadow-primary/25 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {postingBook ? (
                      <>
                        <FaSpinner className="animate-spin" /> Saving...
                      </>
                    ) : editingBook ? (
                      <>
                        <FaEdit /> Save Changes
                      </>
                    ) : (
                      <>
                        <FaPlus /> Post Book
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
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

export default AdminBooks
