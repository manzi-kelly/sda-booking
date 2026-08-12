import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaBookOpen,
  FaSignOutAlt,
  FaBell,
  FaCheckCircle,
  FaHistory,
  FaClock,
  FaShoppingCart,
  FaMinus,
  FaPlus,
  FaLock,
  FaSearch,
  FaArrowRight
} from 'react-icons/fa';

import { books as fallbackBooks } from '../data/books';
import CheckoutForm from '../components/CheckoutForm';
import SearchOverlay from '../components/SearchOverlay';
import SectionHeader from '../components/ui/SectionHeader';
import CTAButton from '../components/ui/CTAButton';
import BookCard from '../components/ui/BookCard';
import { useLanguage } from '../i18n/LanguageContext.jsx';

const API_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:5000';

const formatPrice = (value) => {
  return `RWF ${Number(value || 0).toLocaleString()}`;
};

const formatDate = (value) => {
  if (!value) return '';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const BookingDashboard = ({ user, onLogout }) => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  // Dynamic browser tab title.
  useEffect(() => {
    const storeName = t('dashboard.storeName') || 'Bookstore';
    document.title = `${storeName} | Dashboard`;

    return () => {
      document.title = 'Bookstore';
    };
  }, [t]);

  const [toast, setToast] = useState(null);

  const [showNotifications, setShowNotifications] =
    useState(false);

  const [showBookings, setShowBookings] =
    useState(false);

  const [bookingTab, setBookingTab] =
    useState('waiting');

  const [bookings, setBookings] = useState(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem('bookings') || '[]'
      );
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  });

  const [cart, setCart] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem('cart') || '[]'
      );
    } catch {
      return [];
    }
  });

  const [showCart, setShowCart] = useState(false);

  const [showCheckout, setShowCheckout] =
    useState(false);

  const [showSearch, setShowSearch] =
    useState(false);

  const [postedBooks, setPostedBooks] =
    useState([]);

  const [fromDb, setFromDb] =
    useState(false);

  const bellRef = useRef(null);

  /*
   * ==========================================================
   * BOOK DATA
   * ==========================================================
   */

  const mapBooks = (items) => {
    if (!Array.isArray(items)) return [];

    return items.map((book, index) => ({
      id: book?.id ?? `book-${index}`,
      title: book?.title || 'Untitled Book',
      author: book?.author || '',
      category: book?.category || 'Book',
      description: book?.description || '',
      image: book?.image || '',
      gradient:
        book?.gradient ||
        'from-teal-600 to-emerald-800',
      copies: Math.max(0, Number(book?.copies) || 0),
      price: Math.max(0, Number(book?.price) || 0)
    }));
  };

  /*
   * ==========================================================
   * FETCH BOOKS
   * ==========================================================
   */

  const booksRequestRef = useRef(null);
  const booksAbortRef = useRef(null);

  const fetchBooks = async ({ force = false } = {}) => {
    // Never allow multiple identical requests to run at the same time.
    if (booksRequestRef.current && !force) {
      return booksRequestRef.current;
    }

    if (force && booksAbortRef.current) {
      booksAbortRef.current.abort();
    }

    const controller = new AbortController();
    booksAbortRef.current = controller;

    const request = (async () => {
      try {
        const response = await fetch(`${API_URL}/api/books`, {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
          cache: 'no-store'
        });

        if (!response.ok) {
          throw new Error(`Books request failed: ${response.status}`);
        }

        const data = await response.json();

        if (Array.isArray(data)) {
          const mapped = mapBooks(data);
          setPostedBooks(mapped);
          setFromDb(true);

          // Keep the latest successful result for instant next visit.
          try {
            sessionStorage.setItem(
              'books-cache',
              JSON.stringify(mapped)
            );
          } catch {
            // Storage may be disabled; the UI still works.
          }
        }
      } catch (error) {
        if (error?.name !== 'AbortError') {
          console.warn('Books API unavailable. Using cached/local books.');
        }
      } finally {
        if (booksRequestRef.current === request) {
          booksRequestRef.current = null;
        }
        if (booksAbortRef.current === controller) {
          booksAbortRef.current = null;
        }
      }
    })();

    booksRequestRef.current = request;
    return request;
  };

  /*
   * ==========================================================
   * INITIAL LOAD
   * ==========================================================
   */

  useEffect(() => {
    let eventSource = null;
    let refreshTimer = null;
    let disposed = false;

    // Render cached books immediately; network refresh happens in background.
    try {
      const cached = JSON.parse(
        sessionStorage.getItem('books-cache') || 'null'
      );

      if (Array.isArray(cached) && cached.length > 0) {
        setPostedBooks(cached);
        setFromDb(true);
      }
    } catch {
      // Ignore invalid cache.
    }

    // Do not block the first paint on the API.
    fetchBooks();

    // SSE is optional. If it is unavailable, the dashboard keeps working.
    try {
      eventSource = new EventSource(`${API_URL}/api/books/events`);

      eventSource.addEventListener('books-changed', () => {
        if (!disposed) fetchBooks({ force: true });
      });

      eventSource.onerror = () => {
        // Close a broken SSE connection instead of repeatedly retrying.
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
      };
    } catch {
      eventSource = null;
    }

    const handleFocus = () => {
      if (!document.hidden) fetchBooks();
    };

    const handleVisibility = () => {
      if (!document.hidden) fetchBooks();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    // Background refresh is intentionally infrequent to protect performance.
    refreshTimer = window.setInterval(() => {
      if (!document.hidden) fetchBooks();
    }, 120000);

    return () => {
      disposed = true;

      if (eventSource) eventSource.close();
      if (refreshTimer) window.clearInterval(refreshTimer);

      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);

      if (booksAbortRef.current) {
        booksAbortRef.current.abort();
      }
    };
  }, []);

  /*
   * ==========================================================
   * LOAD BOOKINGS
   * ==========================================================
   */

  /*
   * ==========================================================
   * SAVE CART
   * ==========================================================
   */

  useEffect(() => {
    try {
      localStorage.setItem('cart', JSON.stringify(cart));
    } catch {
      // Storage quota/private mode should never crash the dashboard.
    }
  }, [cart]);

  /*
   * ==========================================================
   * TOAST
   * ==========================================================
   */

  useEffect(() => {
    if (!toast) return;

    const timer = setTimeout(() => {
      setToast(null);
    }, 4000);

    return () => clearTimeout(timer);
  }, [toast]);

  /*
   * ==========================================================
   * CLOSE NOTIFICATIONS
   * ==========================================================
   */

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        bellRef.current &&
        !bellRef.current.contains(event.target)
      ) {
        setShowNotifications(false);
      }
    };

    document.addEventListener(
      'mousedown',
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        'mousedown',
        handleClickOutside
      );
    };
  }, []);

  /*
   * ==========================================================
   * USER
   * ==========================================================
   */

  const isGuest =
    localStorage.getItem('isGuest') === 'true';

  let storedUser = {};
  try {
    storedUser =
      JSON.parse(localStorage.getItem('user') || '{}') || {};
  } catch {
    storedUser = {};
  }

  const userName = isGuest
    ? 'Guest'
    : user?.name ||
      storedUser?.name ||
      'User';

  const userEmail =
    user?.email ||
    storedUser?.email ||
    '';

  /*
   * ==========================================================
   * BOOKINGS
   * ==========================================================
   */

  const myBookings = isGuest
    ? []
    : bookings.filter(
        (booking) =>
          !userEmail ||
          booking?.email === userEmail
      );

  const waitingBookings = myBookings.filter(
    (booking) =>
      booking?.status === 'New' ||
      booking?.status === 'Pending'
  );

  const historyBookings = myBookings;

  /*
   * ==========================================================
   * CART
   * ==========================================================
   */

  const cartCount = cart.reduce(
    (total, item) =>
      total + Math.max(0, Number(item?.qty) || 0),
    0
  );

  const cartTotal = cart.reduce(
    (total, item) =>
      total +
      Math.max(0, Number(item?.book?.price) || 0) *
        Math.max(0, Number(item?.qty) || 0),
    0
  );

  /*
   * ==========================================================
   * BOOKS
   * ==========================================================
   */

  const allBooks = fromDb
    ? postedBooks
    : mapBooks(fallbackBooks);

  /*
   * ==========================================================
   * STATUS LABEL
   * ==========================================================
   */

  const statusLabel = (status) => {
    const map = {
      'New': t('dashboard.statusNew'),
      'Pending': t('dashboard.statusPending'),
      'Confirmed': t('dashboard.statusConfirmed'),
      'Processing': t('dashboard.statusProcessing'),
      'Delivered': t('dashboard.statusDelivered'),
      'Complete': t('dashboard.statusComplete'),
      'Cancelled': t('dashboard.statusCancelled'),
      'Rejected': t('dashboard.statusRejected')
    };
    return map[status] || status || t('dashboard.statusPending');
  };

  /*
   * ==========================================================
   * PAYMENT METHOD LABEL
   * ==========================================================
   */

  const paymentMethodLabel = (method) => {
    const map = {
      'airtel': t('checkout.airtelMoney'),
      'momo': t('checkout.mtnMomo'),
      'card': t('checkout.bankCard')
    };
    return map[method] || method || '';
  };

  /*
   * ==========================================================
   * LOGOUT
   * ==========================================================
   */

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('isGuest');

    if (onLogout) {
      onLogout();
    }

    navigate('/');
  };

  /*
   * ==========================================================
   * ADD TO CART
   * ==========================================================
   */

  const handleBookNow = (book) => {
    if (!book) return;

    const copies = Number(book.copies || 0);

    if (copies <= 0) {
      setToast({
        title: t('dashboard.bookUnavailable'),
        message: t('dashboard.outOfStock')
      });

      return;
    }

    setCart((previousCart) => {
      const existing =
        previousCart.find(
          (item) =>
            item?.book?.id === book.id
        );

      if (existing) {
        if (existing.qty >= copies) {
          return previousCart;
        }

        return previousCart.map((item) =>
          item?.book?.id === book.id
            ? {
                ...item,
                qty: item.qty + 1
              }
            : item
        );
      }

      return [
        ...previousCart,
        {
          book,
          qty: 1
        }
      ];
    });

    setToast({
      title: t('dashboard.addedToCartTitle'),
      message: `${book.title} ${t('dashboard.addedToCart')}`
    });
  };

  /*
   * ==========================================================
   * UPDATE CART QUANTITY
   * ==========================================================
   */

  const updateQty = (id, change) => {
    setCart((previousCart) =>
      previousCart
        .map((item) => {
          if (item?.book?.id !== id) {
            return item;
          }

          const maxCopies =
            Number(item.book.copies || 0);

          const newQty = Math.min(
            maxCopies,
            Math.max(
              0,
              Number(item.qty || 0) +
                change
            )
          );

          return {
            ...item,
            qty: newQty
          };
        })
        .filter(
          (item) =>
            Number(item.qty || 0) > 0
        )
    );
  };

  /*
   * ==========================================================
   * REMOVE FROM CART
   * ==========================================================
   */

  const removeFromCart = (id) => {
    setCart((previousCart) =>
      previousCart.filter(
        (item) =>
          item?.book?.id !== id
      )
    );
  };

  /*
   * ==========================================================
   * CHECKOUT COMPLETE
   * ==========================================================
   */

  const handleCheckoutComplete = (
    result
  ) => {
    setShowCheckout(false);
    setShowCart(false);
    setCart([]);

    try {
      const savedBookings =
        JSON.parse(
          localStorage.getItem(
            'bookings'
          ) || '[]'
        );

      setBookings(
        Array.isArray(savedBookings)
          ? savedBookings
          : []
      );
    } catch {
      setBookings([]);
    }

    setToast({
      title: t('dashboard.paymentSuccessful'),
      message: t('dashboard.paymentMessage', {
        total: formatPrice(result?.total || 0),
        method: paymentMethodLabel(result?.paymentMethod) || '—'
      })
    });
  };

  /*
   * ==========================================================
   * SEARCH SELECT
   * ==========================================================
   */

  const handleSearchSelect = (book) => {
    if (!book) return;

    setShowSearch(false);
    handleBookNow(book);
  };

  /*
   * ==========================================================
   * RENDER
   * ==========================================================
   */

  return (
    <div className="min-h-screen bg-white">

      {/* ======================================================
          HEADER
      ======================================================= */}

      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 shadow-sm backdrop-blur-xl">

        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-3 sm:px-6 sm:py-4 lg:px-8">

          {/* BRAND */}

          <div className="flex min-w-0 items-center gap-3">

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/20">
              <FaBookOpen className="text-lg" />
            </div>

            <div className="min-w-0">

              <h1 className="truncate text-lg font-extrabold tracking-tight text-gray-900 sm:text-xl">
                {t('dashboard.storeName')}
              </h1>

              <p className="truncate text-xs text-gray-500">
                {t('dashboard.welcomeUser', { name: userName })}
              </p>

            </div>

          </div>

          {/* ACTIONS */}

          <div className="flex shrink-0 items-center gap-1 sm:gap-2">

            {/* SEARCH */}

            <button
              type="button"
              onClick={() =>
                setShowSearch(true)
              }
              className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
              aria-label={t('aria.searchBooks')}
            >
              <FaSearch />
            </button>

            {/* CART */}

            <button
              type="button"
              onClick={() =>
                setShowCart(true)
              }
              className="relative flex h-10 w-10 items-center justify-center rounded-xl text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
              aria-label={t('aria.cart')}
            >
              <FaShoppingCart />

              {cartCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white ring-2 ring-white">
                  {cartCount}
                </span>
              )}
            </button>

            {/* NOTIFICATIONS */}

            <div
              ref={bellRef}
              className="relative"
            >

              <button
                type="button"
                onClick={() =>
                  setShowNotifications(
                    (value) => !value
                  )
                }
                className="relative flex h-10 w-10 items-center justify-center rounded-xl text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
                aria-label={t('aria.notifications')}
              >
                <FaBell />

                {myBookings.length > 0 && (
                  <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-3 w-80 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">

                  <div className="border-b border-gray-100 px-5 py-4">
                    <h3 className="font-bold text-gray-900">
                      {t('dashboard.notifications')}
                    </h3>
                  </div>

                  <div className="max-h-80 overflow-y-auto">

                    {myBookings.length === 0 ? (
                      <div className="px-5 py-10 text-center">

                        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                          <FaBell />
                        </div>

                        <p className="text-sm text-gray-500">
                          {t('dashboard.noNotifications')}
                        </p>

                      </div>
                    ) : (
                      myBookings
                        .slice()
                        .reverse()
                        .slice(0, 5)
                        .map(
                          (
                            booking,
                            index
                          ) => (
                            <div
                              key={booking?.id ?? `${booking?.email ?? 'booking'}-${booking?.bookedAt ?? index}`}
                              className="border-b border-gray-50 px-5 py-4 hover:bg-gray-50"
                            >
                              <p className="truncate text-sm font-bold text-gray-800">
                                {booking.title}
                              </p>

                              <p className="mt-1 text-xs text-gray-500">
                                {statusLabel(booking.status)}
                              </p>
                            </div>
                          )
                        )
                    )}

                  </div>
                </div>
              )}

            </div>

            {/* LOGOUT */}

            <button
              type="button"
              onClick={handleLogout}
              className="flex h-10 items-center gap-2 rounded-xl px-2 text-gray-600 transition hover:bg-red-50 hover:text-red-600 sm:px-3"
              aria-label={t('aria.logout')}
            >
              <FaSignOutAlt />

              <span className="hidden text-sm font-semibold md:inline">
                {t('dashboard.logout')}
              </span>
            </button>

          </div>

        </div>

      </header>

      {/* ======================================================
          MAIN
      ======================================================= */}

      <main className="mx-auto max-w-7xl px-6 py-24">

        {/* PAGE HEADER */}

        <SectionHeader
          badge={t('dashboard.welcomeBadge')}
          title={t('dashboard.welcomeTitle', { name: userName })}
          subtitle={t('dashboard.welcomeSubtitle')}
        />

        {/* ACTIONS ROW */}

        <div className="mt-10 flex flex-col items-center justify-between gap-5 sm:flex-row">

          <div className="inline-flex items-center gap-2 self-start rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
            <FaBookOpen className="text-primary" />
            <span className="text-sm text-gray-500">
              {t('dashboard.booksAvailable', { count: allBooks.length })}
            </span>
          </div>

          {/* MY BOOKINGS */}

          {!isGuest && (
            <CTAButton
              className=""
              onClick={() => {
                setShowBookings(true);
                setBookingTab(
                  waitingBookings.length > 0
                    ? 'waiting'
                    : 'history'
                );
              }}
            >
              <FaHistory />
              {t('dashboard.myBookings')}

              {waitingBookings.length > 0 && (
                <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-white/20 px-1.5 text-[11px]">
                  {waitingBookings.length}
                </span>
              )}
            </CTAButton>
          )}

        </div>

        {/* GUEST NOTICE */}

        {isGuest && (
          <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center text-sm text-amber-800">
            {t('dashboard.guestBanner')}
          </div>
        )}

        {/* ====================================================
            PRODUCT GRID
        ===================================================== */}

        {allBooks.length === 0 ? (
          <div className="mt-14 rounded-3xl border border-dashed border-gray-300 bg-gray-50 py-20 text-center">

            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-gray-400 shadow-sm">
              <FaBookOpen className="text-2xl" />
            </div>

            <h3 className="font-bold text-gray-800">
              {t('dashboard.noBooks')}
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              {t('dashboard.noBooksHint')}
            </p>

          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6 mt-14">

            {allBooks.map((book) => (
              <div key={book.id} className="">
                <BookCard
                  book={book}
                  onBookNow={handleBookNow}
                />
              </div>
            ))}

          </div>
        )}

        <div className="mt-16 text-center">
          <CTAButton onClick={() => setShowCart(true)}>
            {t('dashboard.cart')}
            <FaArrowRight />
          </CTAButton>
        </div>

      </main>

      {/* ======================================================
          CART
      ======================================================= */}

      {showCart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm">

          <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">

            <div className="flex items-center justify-between border-b border-gray-100 p-5">

              <div className="flex items-center gap-3">

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-white">
                  <FaShoppingCart />
                </div>

                <div>
                  <h2 className="font-extrabold text-gray-900">
                    {t('dashboard.yourCart')}
                  </h2>

                  <p className="text-xs text-gray-500">
                    {t('dashboard.cartCount', { count: cartCount })}
                  </p>
                </div>

              </div>

              <button
                type="button"
                onClick={() =>
                  setShowCart(false)
                }
                className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-xl text-gray-500 hover:bg-gray-200"
                aria-label={t('aria.close')}
              >
                ×
              </button>

            </div>

            <div className="flex-1 overflow-y-auto p-5">

              {cart.length === 0 ? (
                <div className="py-12 text-center">

                  <FaShoppingCart className="mx-auto mb-4 text-4xl text-gray-300" />

                  <p className="font-semibold text-gray-600">
                    {t('dashboard.noBooksInCart')}
                  </p>

                  <p className="mt-1 text-sm text-gray-400">
                    {t('dashboard.addToCartHint')}
                  </p>

                </div>
              ) : (
                <div className="space-y-3">

                  {cart.map((item) => (
                    <div
                      key={item.book.id}
                      className="rounded-2xl border border-gray-100 bg-gray-50 p-4"
                    >

                      <div className="flex gap-3">

                        <div className="h-16 w-14 shrink-0 overflow-hidden rounded-xl bg-gray-200">

                          {item.book.image ? (
                            <img
                              src={item.book.image}
                              alt={item.book.title}
                              loading="lazy"
                              decoding="async"
                              className="h-full w-full object-cover"
                              onError={(event) => {
                                event.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div
                              className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${
                                item.book.gradient ||
                                'from-teal-600 to-emerald-800'
                              } text-white`}
                            >
                              <FaBookOpen />
                            </div>
                          )}

                        </div>

                        <div className="min-w-0 flex-1">

                          <p className="line-clamp-2 text-sm font-bold text-gray-800">
                            {item.book.title}
                          </p>

                          <p className="mt-1 text-xs text-gray-500">
                            {formatPrice(item.book.price)}
                          </p>

                          <div className="mt-3 flex items-center justify-between">

                            <div className="flex items-center gap-2">

                              <button
                                type="button"
                                onClick={() =>
                                  updateQty(
                                    item.book.id,
                                    -1
                                  )
                                }
                                className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-gray-500 shadow-sm"
                                aria-label={t('aria.decreaseQty')}
                              >
                                <FaMinus className="text-[9px]" />
                              </button>

                              <span className="w-6 text-center text-sm font-bold">
                                {item.qty}
                              </span>

                              <button
                                type="button"
                                onClick={() =>
                                  updateQty(
                                    item.book.id,
                                    1
                                  )
                                }
                                className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-gray-500 shadow-sm"
                                aria-label={t('aria.increaseQty')}
                              >
                                <FaPlus className="text-[9px]" />
                              </button>

                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                removeFromCart(
                                  item.book.id
                                )
                              }
                              className="text-xs font-semibold text-red-500"
                              aria-label={t('aria.removeFromCart')}
                            >
                              {t('dashboard.remove')}
                            </button>

                          </div>

                        </div>

                      </div>

                    </div>
                  ))}

                </div>
              )}

            </div>

            {cart.length > 0 && (
              <div className="border-t border-gray-100 p-5">

                <div className="mb-4 flex items-center justify-between">

                  <span className="text-sm font-medium text-gray-500">
                    {t('dashboard.total')}
                  </span>

                  <span className="text-2xl font-black text-gray-900">
                    {formatPrice(cartTotal)}
                  </span>

                </div>

                <CTAButton
                  className="w-full justify-center"
                  onClick={() =>
                    setShowCheckout(true)
                  }
                >
                  <FaLock />
                  {t('dashboard.continueToCheckout')}
                </CTAButton>

              </div>
            )}

          </div>

        </div>
      )}

      {/* ======================================================
          CHECKOUT
      ======================================================= */}

      {showCheckout && (
        <CheckoutForm
          cart={cart}
          onClose={() =>
            setShowCheckout(false)
          }
          onComplete={
            handleCheckoutComplete
          }
        />
      )}

      {/* ======================================================
          SEARCH
      ======================================================= */}

      {showSearch && (
        <SearchOverlay
          onClose={() =>
            setShowSearch(false)
          }
          onSelectBook={
            handleSearchSelect
          }
        />
      )}

      {/* ======================================================
          BOOKINGS
      ======================================================= */}

      {showBookings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm">

          <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">

            <div className="border-b border-gray-100 p-5">

              <div className="flex items-center justify-between">

                <div>
                  <h2 className="text-xl font-extrabold text-gray-900">
                    {t('dashboard.myBookings')}
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    {t('dashboard.trackOrders')}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setShowBookings(false)
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-xl text-gray-500"
                  aria-label={t('aria.close')}
                >
                  ×
                </button>

              </div>

              <div className="mt-5 grid grid-cols-2 rounded-xl bg-gray-100 p-1">

                <button
                  type="button"
                  onClick={() =>
                    setBookingTab(
                      'waiting'
                    )
                  }
                  className={`rounded-lg py-2.5 text-sm font-bold ${
                    bookingTab ===
                    'waiting'
                      ? 'bg-white text-primary shadow-sm'
                      : 'text-gray-500'
                  }`}
                >
                  <FaClock className="mr-2 inline" />
                  {t('dashboard.waiting', { count: waitingBookings.length })}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setBookingTab(
                      'history'
                    )
                  }
                  className={`rounded-lg py-2.5 text-sm font-bold ${
                    bookingTab ===
                    'history'
                      ? 'bg-white text-primary shadow-sm'
                      : 'text-gray-500'
                  }`}
                >
                  <FaHistory className="mr-2 inline" />
                  {t('dashboard.history', { count: historyBookings.length })}
                </button>

              </div>

            </div>

            <div className="flex-1 overflow-y-auto p-5">

              {(
                bookingTab ===
                'waiting'
                  ? waitingBookings
                  : historyBookings
              ).length === 0 ? (
                <div className="py-12 text-center">

                  <FaHistory className="mx-auto mb-4 text-4xl text-gray-300" />

                  <p className="font-semibold text-gray-600">
                    {bookingTab === 'waiting'
                      ? t('dashboard.noWaiting')
                      : t('dashboard.noHistory')}
                  </p>

                  <p className="mt-1 text-sm text-gray-400">
                    {bookingTab === 'waiting'
                      ? t('dashboard.noWaitingHint')
                      : t('dashboard.noHistoryHint')}
                  </p>

                </div>
              ) : (
                <div className="space-y-3">

                  {(
                    bookingTab ===
                    'waiting'
                      ? waitingBookings
                      : historyBookings
                  )
                    .slice()
                    .reverse()
                    .map(
                      (
                        booking,
                        index
                      ) => (
                        <div
                          key={
                            booking.id ||
                            index
                          }
                          className="rounded-2xl border border-gray-100 bg-gray-50 p-4"
                        >

                          <div className="flex items-start gap-3">

                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                              <FaBookOpen />
                            </div>

                            <div className="min-w-0 flex-1">

                              <p className="font-bold text-gray-800">
                                {booking.title ||
                                  'Book'}
                              </p>

                              <p className="mt-1 text-xs text-gray-500">
                                {booking.district ||
                                  ''}
                                {booking.sector
                                  ? ` · ${booking.sector}`
                                  : ''}
                              </p>

                              <p className="mt-1 text-xs text-gray-400">
                                {formatDate(
                                  booking.bookedAt
                                )}
                              </p>

                            </div>

                            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary">
                              {statusLabel(booking.status)}
                            </span>

                          </div>

                        </div>
                      )
                    )}

                </div>
              )}

            </div>

          </div>

        </div>
      )}

      {/* ======================================================
          TOAST
      ======================================================= */}

      {toast && (
        <div className="fixed bottom-5 left-3 right-3 z-[70] sm:left-auto sm:right-6 sm:max-w-md">

          <div className="rounded-2xl border border-green-100 bg-white p-4 shadow-2xl">

            <div className="flex items-start gap-3">

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600">
                <FaCheckCircle />
              </div>

              <div className="min-w-0 flex-1">

                <p className="font-bold text-gray-900">
                  {toast.title}
                </p>

                <p className="mt-1 text-sm text-gray-500">
                  {toast.message}
                </p>

              </div>

              <button
                type="button"
                onClick={() =>
                  setToast(null)
                }
                className="text-xl text-gray-400"
                aria-label={t('aria.close')}
              >
                ×
              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
};

export default BookingDashboard;