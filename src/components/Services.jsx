import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaBookOpen,
  FaGlobe,
  FaSearch,
  FaShippingFast,
  FaChurch,
  FaMobileAlt,
  FaHandsHelping,
} from "react-icons/fa";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import AuthPage from "../pages/AuthPage";
import { openBooking } from "../utils/navigation";

const Services = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const sectionRef = useRef(null);
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target
              .querySelectorAll(".slide-up")
              .forEach((el) => el.classList.add("visible"));
          }
        });
      },
      { threshold: 0.15 }
    );

    if (sectionRef.current) observer.observe(sectionRef.current);

    return () => observer.disconnect();
  }, []);

  const services = [
    {
      icon: FaBookOpen,
      title: t("services.item1Title"),
      desc: t("services.item1Desc"),
    },
    {
      icon: FaGlobe,
      title: t("services.item2Title"),
      desc: t("services.item2Desc"),
    },
    {
      icon: FaSearch,
      title: t("services.item3Title"),
      desc: t("services.item3Desc"),
    },
    {
      icon: FaShippingFast,
      title: t("services.item4Title"),
      desc: t("services.item4Desc"),
    },
    {
      icon: FaMobileAlt,
      title: t("services.item5Title"),
      desc: t("services.item5Desc"),
    },
    {
      icon: FaHandsHelping,
      title: t("services.item6Title"),
      desc: t("services.item6Desc"),
    },
  ];

  return (
    <>
    <section
      id="services"
      ref={sectionRef}
      className="py-24 bg-gray-50 overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-6">

        {/* Header */}
        <div className="grid md:grid-cols-2 mb-20">

          <div></div>

          <div className="slide-up text-right">

            <span className="text-primary uppercase tracking-[5px] font-semibold">
              {t("services.badge")}
            </span>

            <h2 className="mt-4 text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
              {t("services.titleA")}
              <br />
              <span className="text-primary">
                {t("services.titleHighlight")}
              </span>
            </h2>

            <p className="mt-5 text-gray-600 max-w-md ml-auto leading-7">
              {t("services.description")}
            </p>

          </div>

        </div>

       {/* Services */}

<div className="grid md:grid-cols-2">

  {/* Left Side Empty */}
  <div></div>

  {/* Right Side */}
  <div className="grid sm:grid-cols-2 gap-10">

    {services.map((service, index) => (
      <div
        key={index}
        className="slide-up border-r-4 border-primary pr-6 text-right"
      >
        <div className="flex justify-end mb-5">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <service.icon className="text-primary text-3xl" />
          </div>
        </div>

        <span className="text-primary text-xs font-bold tracking-[3px]">
          {String(index + 1).padStart(2, "0")}
        </span>

        <h3 className="mt-2 text-xl font-bold text-gray-900">
          {service.title}
        </h3>

        <p className="mt-3 text-gray-600 leading-7">
          {service.desc}
        </p>
      </div>
    ))}

  </div>

</div>
        {/* Button */}

        <div className="grid md:grid-cols-2 mt-20">

          <div></div>

          <div className="slide-up text-right">

            <button
              onClick={() => openBooking(navigate, () => setShowAuth(true))}
              className="inline-block bg-blue-600 text-white px-10 py-4 rounded-full font-semibold hover:bg-blue-700 hover:scale-105 transition-all duration-300 shadow-lg shadow-blue-600/30"
            >
              {t("services.reserveCta")}
            </button>

          </div>

        </div>

      </div>
    </section>
    {showAuth && <AuthPage onClose={() => setShowAuth(false)} />}
    </>
  );
};

export default Services;