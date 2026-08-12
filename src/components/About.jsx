import React, { useState, useEffect, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowRight } from "react-icons/fa";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { books as fallbackBooks } from "../data/books";
import SectionHeader from "./ui/SectionHeader";
import CTAButton from "./ui/CTAButton";
import BookCard from "./ui/BookCard";
import useReveal from "../hooks/useReveal";
import { openBooking } from "../utils/navigation";

const AuthPage = lazy(() => import("../pages/AuthPage"));

const AuthModal = ({ onClose }) => (
  <Suspense fallback={null}>
    <AuthPage onClose={onClose} />
  </Suspense>
)

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const About = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const sectionRef = useReveal();
  const [showAuth, setShowAuth] = useState(false);
  const [books, setBooks] = useState([]);
  const [fromDb, setFromDb] = useState(false);

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

  useEffect(() => {
    fetch(`${API_URL}/api/books`)
      .then((res) => (res.ok ? res.json() : []))
      .then((items) => {
        if (Array.isArray(items) && items.length) {
          setBooks(mapBooks(items));
          setFromDb(true);
        }
      })
      .catch(() => {});
  }, []);

  const displayBooks = (fromDb ? books : fallbackBooks).slice(0, 6);

  // Booking CTA: signed-in users go straight to the dashboard,
  // everyone else is asked to log in / register first.
  const handleBooking = () => {
    openBooking(navigate, () => setShowAuth(true));
  };

  return (
    <>
      <section
        id="about"
        ref={sectionRef}
        className="py-24 bg-white"
      >
        <div className="max-w-7xl mx-auto px-6">

          {/* Header */}
          <SectionHeader
            badge={t("about.booksBadge")}
            title={t("dashboard.availableBooks")}
            subtitle={t("dashboard.browseBooks")}
          />

          {/* Books Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6 mt-14">
            {displayBooks.map((book) => (
              <div key={book.id} className="slide-up">
                <BookCard book={book} onBookNow={handleBooking} />
              </div>
            ))}
          </div>

          {/* View More */}
          <div className="slide-up mt-12 text-center">
            <CTAButton onClick={handleBooking}>
              {t("about.viewMore")}
              <FaArrowRight />
            </CTAButton>
          </div>

        </div>
      </section>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </>
  );
};

export default About;
