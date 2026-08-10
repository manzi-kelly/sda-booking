import React, { useEffect, useRef } from "react";
import { FaArrowRight, FaCheckCircle } from "react-icons/fa";
import { useLanguage } from "../i18n/LanguageContext.jsx";

const About = () => {
  const { t } = useLanguage();
  const sectionRef = useRef(null);

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
      { threshold: 0.2 }
    );

    if (sectionRef.current) observer.observe(sectionRef.current);

    return () => observer.disconnect();
  }, []);

  const benefits = [
    t("about.benefit1"),
    t("about.benefit2"),
    t("about.benefit3"),
    t("about.benefit4"),
  ];

  return (
    <section
      id="about"
      ref={sectionRef}
      className="py-24 bg-white"
    >
      <div className="max-w-6xl mx-auto px-6">

        <div className="max-w-4xl">

          <div className="slide-up">

            <span className="text-primary uppercase tracking-[4px] font-semibold">
              {t("about.badge")}
            </span>

            <h2 className="mt-4 text-4xl md:text-5xl font-bold text-gray-900 leading-tight text-left">
              {t("about.title")}
            </h2>

          </div>

          <div className="slide-up mt-8 p-8 bg-gray-50 rounded-2xl border-l-4 border-primary">

            <p className="text-gray-700 text-lg leading-8 text-left">
              {t("about.p1")}
            </p>

          </div>

          <div className="slide-up mt-8 space-y-5">

            <p className="text-lg text-gray-600 leading-8 text-left">
              {t("about.p2")}
            </p>

            <p className="text-lg text-gray-600 leading-8 text-left">
              {t("about.p3")}
            </p>

          </div>

          <div className="slide-up mt-10">

            <h3 className="text-2xl font-bold text-gray-900 mb-6 text-left">
              {t("about.keyBenefits")}
            </h3>

            <div className="space-y-4">

              {benefits.map((benefit, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4"
                >
                  <FaCheckCircle className="text-primary text-lg flex-shrink-0" />

                  <span className="text-gray-700 text-lg">
                    {benefit}
                  </span>
                </div>
              ))}

            </div>

          </div>

          <div className="slide-up mt-10">

            <a
              href="#services"
              className="inline-flex items-center gap-3 text-primary font-semibold hover:gap-4 transition-all"
            >
              {t("about.explore")}
              <FaArrowRight />
            </a>

          </div>

        </div>

      </div>
    </section>
  );
};

export default About;