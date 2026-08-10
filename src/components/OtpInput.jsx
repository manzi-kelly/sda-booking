import React, { useRef } from "react";
import { useLanguage } from "../i18n/LanguageContext.jsx";

const OtpInput = ({ value, onChange, onComplete, disabled }) => {
  const { t } = useLanguage();
  const refs = useRef([]);

  const updateCode = (digits) => {
    const cleaned = String(digits || "").replace(/\D/g, "").slice(0, 6);
    onChange(cleaned);
    if (cleaned.length === 6 && onComplete) onComplete(cleaned);
  };

  const handleChange = (index, e) => {
    const val = e.target.value;
    if (val.length > 1) {
      // Pasting or autofill into the first box.
      updateCode(val);
      refs.current[5]?.focus();
      return;
    }
    const next = value.split("");
    next[index] = val.replace(/\D/g, "");
    const newVal = next.join("");
    onChange(newVal);
    if (val && index < 5) refs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !value[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && index > 0) refs.current[index - 1]?.focus();
    if (e.key === "ArrowRight" && index < 5) refs.current[index + 1]?.focus();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text");
    if (pasted) updateCode(pasted);
  };

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={6}
          value={value[i] || ""}
          disabled={disabled}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          aria-label={t("aria.digit", { index: i + 1 })}
          className="w-11 h-14 sm:w-13 sm:h-16 text-center text-2xl font-bold rounded-xl border border-gray-200 outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all text-gray-800 placeholder-gray-300 disabled:opacity-60"
          style={{ width: "3.25rem" }}
        />
      ))}
    </div>
  );
};

export default OtpInput;
