import React from "react";
import {
  FaPhoneAlt,
  FaEnvelope,
  FaMapMarkerAlt,
  FaClock,
  FaFacebookF,
  FaInstagram,
  FaLinkedinIn,
  FaPaperPlane,
} from "react-icons/fa";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import SectionHeader from "./ui/SectionHeader";
import useReveal from "../hooks/useReveal";

const Contact = () => {
  const { t } = useLanguage();
  const sectionRef = useReveal(0.2);

  return (
    <section
      id="contact"
      ref={sectionRef}
      className="py-24 bg-white"
    >
      <div className="max-w-7xl mx-auto px-6">

        {/* Heading */}

        <div className="mb-20">
          <SectionHeader
            badge={t("contact.badge")}
            title={t("contact.title")}
            subtitle={t("contact.description")}
          />
        </div>

        <div className="grid lg:grid-cols-2 gap-16">

          {/* Contact Information */}

          <div className="slide-up">

            <h3 className="text-2xl font-bold text-gray-900 mb-8">
              {t("contact.infoTitle")}
            </h3>

            <div className="space-y-8">

              <div className="flex gap-5">

                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <FaPhoneAlt className="text-primary text-xl" />
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900">
                    {t("contact.phone")}
                  </h4>
                  <p className="text-gray-600">
                    +250 7XX XXX XXX
                  </p>
                </div>

              </div>

              <div className="flex gap-5">

                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <FaEnvelope className="text-primary text-xl" />
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900">
                    {t("contact.emailLabel")}
                  </h4>
                  <p className="text-gray-600">
                    info@sdabooking.com
                  </p>
                </div>

              </div>

              <div className="flex gap-5">

                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <FaMapMarkerAlt className="text-primary text-xl" />
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900">
                    {t("contact.location")}
                  </h4>
                  <p className="text-gray-600">
                    Kigali, Rwanda
                  </p>
                </div>

              </div>

              <div className="flex gap-5">

                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <FaClock className="text-primary text-xl" />
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900">
                    {t("contact.hours")}
                  </h4>
                  <p className="text-gray-600">
                    {t("contact.monFri")}
                  </p>
                  <p className="text-gray-600">
                    {t("contact.hoursTime")}
                  </p>
                </div>

              </div>

            </div>

            {/* Social */}

            <div className="mt-10">

              <h4 className="font-semibold text-gray-900 mb-5">
                {t("contact.followUs")}
              </h4>

              <div className="flex gap-4">

                <a
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  aria-label="Facebook"
                  className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center hover:scale-110 transition"
                >
                  <FaFacebookF />
                </a>

                <a
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  aria-label="Instagram"
                  className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center hover:scale-110 transition"
                >
                  <FaInstagram />
                </a>

                <a
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  aria-label="LinkedIn"
                  className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center hover:scale-110 transition"
                >
                  <FaLinkedinIn />
                </a>

              </div>

            </div>

          </div>

          {/* Contact Form */}

          <div className="slide-up">

            <div className="bg-gray-50 rounded-3xl p-8 shadow-lg">

              <h3 className="text-2xl font-bold text-gray-900 mb-8">
                {t("contact.formTitle")}
              </h3>

              <form className="space-y-6">

                <input
                  type="text"
                  placeholder={t("contact.fullNamePlaceholder")}
                  className="w-full px-5 py-4 rounded-xl border border-gray-200 outline-none focus:border-primary"
                />

                <input
                  type="email"
                  placeholder={t("contact.emailPlaceholder")}
                  className="w-full px-5 py-4 rounded-xl border border-gray-200 outline-none focus:border-primary"
                />

                <input
                  type="text"
                  placeholder={t("contact.subjectPlaceholder")}
                  className="w-full px-5 py-4 rounded-xl border border-gray-200 outline-none focus:border-primary"
                />

                <textarea
                  rows="6"
                  placeholder={t("contact.messagePlaceholder")}
                  className="w-full px-5 py-4 rounded-xl border border-gray-200 outline-none resize-none focus:border-primary"
                ></textarea>

                <button
                  type="submit"
                  className="flex items-center gap-3 bg-primary text-white px-8 py-4 rounded-xl hover:scale-105 transition"
                >
                  <FaPaperPlane />
                  {t("contact.send")}
                </button>

              </form>

            </div>

          </div>

        </div>

      </div>
    </section>
  );
};

export default Contact;