import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaBookOpen,
  FaSignOutAlt,
  FaBell,
  FaCheckCircle,
  FaMapMarkerAlt,
  FaUser,
  FaHistory,
  FaClock,
  FaShoppingCart,
  FaTrash,
  FaMinus,
  FaPlus,
  FaLock
} from 'react-icons/fa';
import { books as fallbackBooks } from '../data/books';
import CheckoutForm from '../components/CheckoutForm';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const formatPrice = (n) => 'RWF ' + Number(n || 0).toLocaleString();

const BookingDashboard = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [toast, setToast] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showBookings, setShowBookings] = useState(false);
  const [bookingTab, setBookingTab] = useState('waiting');
  const [bookings, setBookings] = useState([]);
  const [cart, setCart] = useState(() => JSON.parse(localStorage.getItem('cart')) || []);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [postedBooks, setPostedBooks] = useState([]);
  const [fromDb, setFromDb] = useState(false);
  const bellRef = useRef(null);

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
    }));

  const fetchBooks = () => {
    fetch(`${API_URL}/api/books`)
      .then((res) => (res.ok ? res.json() : []))
      .then((items) => {
        if (!Array.isArray(items)) return;
        setPostedBooks(mapBooks(items));
        setFromDb(true);
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchBooks();

    let source;
    try {
      source = new EventSource(`${API_URL}/api/books/events`);
      source.addEventListener('books-changed', () => fetchBooks());
    } catch {
      source = null;
    }

    const onFocus = () => fetchBooks();
    window.addEventListener('focus', onFocus);
    const interval = setInterval(fetchBooks, 30000);

    return () => {
      if (source) source.close();
      window.removeEventListener('focus', onFocus);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    setBookings(JSON.parse(localStorage.getItem('bookings')) || []);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  const userName = user?.name || JSON.parse(localStorage.getItem('user') || '{}')?.name || 'User';
  const userEmail = user?.email || JSON.parse(localStorage.getItem('user') || '{}')?.email;

  const myBookings = bookings.filter((b) => !userEmail || b.email === userEmail);
  const waitingBookings = myBookings.filter((b) => b.status === 'New' || b.status === 'Pending');
  const historyBookings = myBookings;

  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const cartTotal = cart.reduce((sum, item) => sum + (item.book.price || 0) * item.qty, 0);

  const allBooks = fromDb ? postedBooks : fallbackBooks;

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('isLoggedIn');
    onLogout();
    navigate('/');
  };

  const handleBookNow = (book) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.book.id === book.id);
      if (existing) {
        return prev.map((item) =>
          item.book.id === book.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, { book, qty: 1 }];
    });
    setToast({ title: book.title, message: 'has been added to your cart.' });
  };

  const updateQty = (id, delta) => {
    setCart((prev) =>
      prev
        .map((item) => (item.book.id === id ? { ...item, qty: item.qty + delta } : item))
        .filter((item) => item.qty > 0)
    );
  };

  const removeFromCart = (id) => {
    setCart((prev) => prev.filter((item) => item.book.id !== id));
  };

  const handleCheckoutComplete = (result) => {
    setShowCheckout(false);
    setShowCart(false);
    setCart([]);
    setBookings(JSON.parse(localStorage.getItem('bookings')) || []);
    setToast({
      title: 'Payment Successful!',
      message: `Your payment of ${formatPrice(result.total)} via ${result.paymentMethod} was completed. Books confirmed and booked.`
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-4 flex justify-between items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold flex-shrink-0">
              S
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-gray-800 truncate">SDA Booking</h1>
              <p className="text-[11px] sm:text-xs text-gray-500 truncate">
                Welcome, <span className="text-primary font-semibold">{userName}</span>!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 md:gap-3 flex-shrink-0">
            {/* Cart */}
            <button
              onClick={() => setShowCart(true)}
              className="p-2 sm:p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full relative transition-colors"
              aria-label="Cart"
            >
              <FaShoppingCart size={20} />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[1.15rem] h-[1.15rem] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>

            {/* Notifications */}
            <div className="relative" ref={bellRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 sm:p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full relative transition-colors"
                aria-label="Notifications"
              >
                <FaBell size={20} />
                {bookings.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-3 w-72 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-slideUp">
                  <div className="px-5 py-3.5 border-b border-gray-100">
                    <h3 className="text-sm font-bold text-gray-800">Notifications</h3>
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {bookings.length === 0 ? (
                      <p className="px-5 py-8 text-center text-sm text-gray-500">
                        No new notifications yet.
                      </p>
                    ) : (
                      bookings.slice().reverse().slice(0, 5).map((b, i) => (
                        <div key={i} className="px-5 py-3.5 border-b border-gray-50 hover:bg-gray-50 transition-colors">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <FaBookOpen className="text-primary text-sm" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">{b.title}</p>
                              <p className="text-xs text-gray-500">
                                {b.district} · {b.sector} · {b.status}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Logout */}
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Section Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <FaBookOpen className="text-primary text-xl" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Available Books</h2>
                <p className="text-xs sm:text-sm text-gray-500">
                  Browse our collection and reserve your favourite SDA books.
                </p>
              </div>
            </div>

            {/* My Bookings Button */}
            <button
              onClick={() => {
                setShowBookings(true);
                setBookingTab(waitingBookings.length > 0 ? 'waiting' : 'history');
              }}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold transition-all hover:bg-primary/90 hover:scale-[1.02] shadow-lg shadow-primary/25 flex-shrink-0"
            >
              <FaHistory />
              My Bookings
              {waitingBookings.length > 0 && (
                <span className="min-w-[1.25rem] h-5 px-1 rounded-full bg-white/25 text-xs flex items-center justify-center font-bold">
                  {waitingBookings.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Books Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 lg:gap-6">
          {allBooks.map((book) => (
            <BookCard key={book.id} book={book} onBookNow={handleBookNow} />
          ))}
        </div>

        {/* Footer note */}
        <div className="mt-12 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-2xl p-6 text-center border border-primary/10">
          <p className="text-gray-700 font-medium">Thank you for booking with SDA Booking!</p>
          <p className="text-gray-500 text-sm mt-1">
            Your reservation will be processed and confirmed at your selected church.
          </p>
        </div>
      </main>

      {/* Cart Modal */}
      {showCart && (
        <div className="fixed inset-0 z-40 flex items-start sm:items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-slideUp my-3 sm:my-8 max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-4rem)] flex flex-col">
            <button
              onClick={() => setShowCart(false)}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 text-gray-400 hover:text-gray-600 transition-colors z-10 w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="p-5 sm:p-8 flex flex-col min-h-0 flex-1">
              <div className="text-center mb-5 sm:mb-6">
                <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto bg-primary rounded-xl flex items-center justify-center text-white text-xl sm:text-2xl shadow-lg shadow-primary/30">
                  <FaShoppingCart />
                </div>
                <h2 className="mt-3 sm:mt-4 text-xl sm:text-2xl font-bold text-gray-800">Your Cart</h2>
                <p className="text-gray-500 text-xs sm:text-sm">
                  {cartCount > 0 ? `${cartCount} book${cartCount > 1 ? 's' : ''} ready to pay` : 'Your cart is empty'}
                </p>
              </div>

              {cart.length === 0 ? (
                <div className="text-center py-10">
                  <div className="w-16 h-16 mx-auto rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mb-4">
                    <FaShoppingCart className="text-2xl" />
                  </div>
                  <p className="text-gray-500 font-medium">No books in your cart</p>
                  <p className="text-sm text-gray-400 mt-1">Click "Book Now" on any book to add it here.</p>
                </div>
              ) : (
                <>
                  <div className="space-y-3 overflow-y-auto pr-1 min-h-0">
                    {cart.map((item) => (
                      <div key={item.book.id} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <FaBookOpen className="text-primary text-base sm:text-lg" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate">{item.book.title}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{formatPrice(item.book.price)} each</p>
                          </div>
                          <button
                            onClick={() => removeFromCart(item.book.id)}
                            className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0"
                            aria-label="Remove from cart"
                          >
                            <FaTrash />
                          </button>
                        </div>

                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                          {/* Quantity */}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateQty(item.book.id, -1)}
                              className="w-8 h-8 sm:w-7 sm:h-7 rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-primary hover:border-primary flex items-center justify-center transition-colors"
                              aria-label="Decrease quantity"
                            >
                              <FaMinus className="text-[10px]" />
                            </button>
                            <span className="w-6 text-center text-sm font-semibold text-gray-800">{item.qty}</span>
                            <button
                              onClick={() => updateQty(item.book.id, 1)}
                              className="w-8 h-8 sm:w-7 sm:h-7 rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-primary hover:border-primary flex items-center justify-center transition-colors"
                              aria-label="Increase quantity"
                            >
                              <FaPlus className="text-[10px]" />
                            </button>
                          </div>

                          <div className="text-sm font-bold text-gray-800">
                            {formatPrice(item.book.price * item.qty)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 mt-5 pt-5 border-t border-gray-100">
                    <div className="text-center sm:text-left">
                      <p className="text-xs sm:text-sm text-gray-500">Total</p>
                      <p className="text-xl sm:text-2xl font-bold text-primary">{formatPrice(cartTotal)}</p>
                    </div>
                    <button
                      onClick={() => setShowCheckout(true)}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-blue-600 text-white font-semibold text-sm transition-all hover:bg-blue-700 hover:scale-[1.02] shadow-lg shadow-blue-600/25"
                    >
                      <FaLock />
                      Pay Now
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {showCheckout && (
        <CheckoutForm
          cart={cart}
          onClose={() => setShowCheckout(false)}
          onComplete={handleCheckoutComplete}
        />
      )}

      {/* My Bookings Modal */}
      {showBookings && (
        <div className="fixed inset-0 z-40 flex items-start sm:items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-slideUp my-3 sm:my-8 max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-4rem)] flex flex-col">
            <button
              onClick={() => setShowBookings(false)}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 text-gray-400 hover:text-gray-600 transition-colors z-10 w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="p-5 sm:p-8 flex flex-col min-h-0 flex-1">
              <div className="text-center mb-5 sm:mb-6">
                <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto bg-primary rounded-xl flex items-center justify-center text-white text-xl sm:text-2xl shadow-lg shadow-primary/30">
                  <FaHistory />
                </div>
                <h2 className="mt-3 sm:mt-4 text-xl sm:text-2xl font-bold text-gray-800">My Bookings</h2>
                <p className="text-gray-500 text-xs sm:text-sm">View your booking history and waiting requests</p>
              </div>

              {/* Tabs */}
              <div className="flex bg-gray-100 rounded-xl p-1 mb-5 sm:mb-6">
                <button
                  onClick={() => setBookingTab('waiting')}
                  className={`flex-1 py-2.5 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${
                    bookingTab === 'waiting' ? 'bg-white shadow-md text-primary' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <FaClock />
                  Waiting ({waitingBookings.length})
                </button>
                <button
                  onClick={() => setBookingTab('history')}
                  className={`flex-1 py-2.5 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${
                    bookingTab === 'history' ? 'bg-white shadow-md text-primary' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <FaHistory />
                  History ({historyBookings.length})
                </button>
              </div>

              {/* List */}
              <div className="space-y-3 overflow-y-auto pr-1 min-h-0">
                {(bookingTab === 'waiting' ? waitingBookings : historyBookings).length === 0 ? (
                  <div className="text-center py-10">
                    <div className="w-16 h-16 mx-auto rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mb-4">
                      {bookingTab === 'waiting'
                        ? <FaClock className="text-2xl" />
                        : <FaHistory className="text-2xl" />}
                    </div>
                    <p className="text-gray-500 font-medium">
                      {bookingTab === 'waiting' ? 'No waiting bookings' : 'No booking history yet'}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      {bookingTab === 'waiting'
                        ? 'Books you reserve will appear here while being processed.'
                        : 'Every book you book will be recorded here.'}
                    </p>
                  </div>
                ) : (
                  (bookingTab === 'waiting' ? waitingBookings : historyBookings)
                    .slice()
                    .reverse()
                    .map((b, i) => (
                      <div key={i} className="flex items-center gap-3 sm:gap-4 bg-gray-50 rounded-xl p-4 border border-gray-100">
                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <FaBookOpen className="text-primary text-base sm:text-lg" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">{b.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {b.district} · {b.sector}
                            {b.qty > 1 ? ` · ×${b.qty}` : ''}
                          </p>
                          <p className="text-[11px] text-gray-400 mt-0.5">{formatDate(b.bookedAt)}</p>
                        </div>
                        <span className={`px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold flex-shrink-0 ${
                          b.status === 'New'
                            ? 'bg-amber-100 text-amber-700'
                            : b.status === 'Complete'
                              ? 'bg-green-100 text-green-700'
                              : b.status === 'Delivered'
                                ? 'bg-blue-100 text-blue-700'
                                : b.status === 'Cancelled'
                                  ? 'bg-red-100 text-red-600'
                                  : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {b.status}
                        </span>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {toast && (
        <div className="fixed bottom-3 right-3 left-3 sm:bottom-5 sm:right-5 sm:left-auto z-50 animate-toast">
          <div className="w-full sm:max-w-md ml-auto bg-white rounded-2xl shadow-2xl border border-green-100 overflow-hidden">
            <div className="flex items-start gap-3 sm:gap-4 p-4 sm:p-5">
              <div className="w-11 h-11 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <FaCheckCircle className="text-green-600 text-xl" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-900">{toast.title}</h3>
                <p className="text-sm text-gray-600 mt-1 leading-6">
                  <span className="font-semibold text-gray-800">{toast.message}</span>
                </p>
              </div>
              <button
                onClick={() => setToast(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                aria-label="Dismiss notification"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="h-1 bg-gradient-to-r from-green-500 to-emerald-400"></div>
          </div>
        </div>
      )}
    </div>
  );
};

const formatDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

const BookCard = ({ book, onBookNow }) => {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="group bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col">
      {/* Book Image */}
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

        {/* Category badge */}
        <span className="absolute top-3 left-3 bg-white/85 backdrop-blur-sm text-gray-700 text-[10px] font-semibold uppercase tracking-wider px-3 py-1 rounded-full shadow-sm">
          {book.category}
        </span>

        {/* Short description overlaid on the image */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent pt-16 pb-4 px-4">
          <p className="text-white text-xs leading-5 clamp-2">{book.description}</p>
        </div>
      </div>

      {/* Book Info */}
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
          <button
            onClick={() => onBookNow(book)}
            className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold text-sm transition-all hover:bg-blue-700 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2"
          >
            <FaShoppingCart className="text-sm" />
            Book Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookingDashboard;
