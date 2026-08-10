import React, { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import {
  FaLock,
  FaUser,
  FaEnvelope,
  FaEye,
  FaEyeSlash,
  FaPaperPlane,
  FaCheckCircle,
  FaChevronLeft
} from "react-icons/fa";
import {
  signInWithEmailAndPassword
} from "firebase/auth";
import { auth } from "../firebase";
import WelcomeScreen from "../components/WelcomeScreen";
import OtpInput from "../components/OtpInput";
import { useLanguage } from "../i18n/LanguageContext.jsx";

const API_URL = "http://localhost:5000";

const AuthPage = ({ onClose }) => {
  const { t } = useLanguage();

  const mapAuthError = (err) => {
    const code = err.code || "";
    if (code.includes("weak-password")) return t("auth.errors.weakPassword");
    if (code.includes("invalid-email")) return t("auth.errors.invalidEmail");
    if (code.includes("user-not-found")) return t("auth.errors.userNotFound");
    if (code.includes("wrong-password") || code.includes("invalid-credential")) return t("auth.errors.wrongPassword");
    if (code.includes("too-many-requests")) return t("auth.errors.tooManyRequests");
    if (code.includes("network-request-failed")) return t("auth.errors.networkError");
    return err.message || t("auth.errors.generic");
  };

  const navigate = useNavigate();
  const [mode, setMode] = useState("login"); // 'login' | 'register' | 'forgot'
  const [step, setStep] = useState("form"); // 'form' | 'otp' | 'resetPassword'
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: ""
  });
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");
  const [pendingPurpose, setPendingPurpose] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [signedUser, setSignedUser] = useState(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const changeFormHandler = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const switchMode = (m) => {
    setMode(m);
    setStep("form");
    setError("");
    setNotice("");
    setOtp("");
    setPendingEmail("");
    setPendingPurpose("");
    setNewPassword("");
    setConfirmNewPassword("");
  };

  const completeAuth = async (user, name) => {
    const token = await user.getIdToken();
    const existing = JSON.parse(localStorage.getItem("user") || "{}");
    const displayName = name || existing.name || user.displayName || (user.email ? user.email.split("@")[0] : "") || "User";

    try {
      await fetch(`${API_URL}/api/auth/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: displayName, email: user.email || "" })
      });
    } catch (err) {
      console.warn("Backend sync failed:", err.message);
    }

    localStorage.setItem("user", JSON.stringify({
      name: displayName,
      email: user.email || "",
      phone: ""
    }));
    localStorage.setItem("isLoggedIn", "true");

    setSignedUser({ name: displayName });
    setIsLoading(false);
    setSuccess(true);
  };

  // ------------------------------------------------------------------
  // OTP helpers
  // ------------------------------------------------------------------
  const sendOtp = async (email, purpose) => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/api/auth/send-email-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, purpose })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("auth.errors.otpSendFailed"));
      if (data.devCode) console.warn("[dev] OTP code:", data.devCode);

      setPendingEmail(data.email || email);
      setPendingPurpose(purpose);
      setOtp("");
      setStep("otp");
      setCooldown(60);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!otp || otp.replace(/\D/g, "").length !== 6) {
      setError(t("auth.errors.otpInvalid"));
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/api/auth/verify-email-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: pendingEmail, code: otp })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("auth.errors.otpVerifyFailed"));

      if (pendingPurpose === "register") {
        await doRegister();
      } else {
        setStep("resetPassword");
      }
    } catch (err) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  const doRegister = async () => {
    const res = await fetch(`${API_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.name, email: pendingEmail, password: form.password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || t("auth.errors.generic"));

    // Sign the new account in.
    const cred = await signInWithEmailAndPassword(auth, pendingEmail, form.password);
    await completeAuth(cred.user, form.name);
  };

  const resendOtp = async () => {
    setError("");
    if (!pendingEmail) {
      setError(t("auth.errors.goBack"));
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/resend-email-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: pendingEmail, purpose: pendingPurpose })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("auth.errors.otpResendFailed"));
      if (data.devCode) console.warn("[dev] OTP code:", data.devCode);
      setOtp("");
      setCooldown(60);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ------------------------------------------------------------------
  // Login (email + password)
  // ------------------------------------------------------------------
  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setNotice("");

    const email = loginEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(t("auth.errors.invalidEmail"));
      return;
    }
    if (!loginPassword) {
      setError(t("auth.errors.passwordRequired"));
      return;
    }

    setIsLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, loginPassword);
      await completeAuth(cred.user);
    } catch (err) {
      setError(mapAuthError(err));
      setIsLoading(false);
    }
  };

  // ------------------------------------------------------------------
  // Register (name, email, password -> email OTP -> account)
  // ------------------------------------------------------------------
  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.name.trim()) {
      setError(t("auth.errors.nameRequired"));
      return;
    }
    const email = form.email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(t("auth.errors.invalidEmail"));
      return;
    }
    if (form.password.length < 6) {
      setError(t("auth.errors.passwordMin"));
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError(t("auth.errors.passwordMatch"));
      return;
    }

    await sendOtp(email, "register");
  };

  // ------------------------------------------------------------------
  // Forgot password (email -> email OTP -> new password)
  // ------------------------------------------------------------------
  const handleForgotStart = async (e) => {
    e.preventDefault();
    setError("");

    const email = forgotEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(t("auth.errors.invalidEmail"));
      return;
    }

    await sendOtp(email, "forgot");
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < 6) {
      setError(t("auth.errors.passwordMin"));
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError(t("auth.errors.passwordMatch"));
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: pendingEmail, code: otp, newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("auth.errors.passwordResetFailed"));

      switchMode("login");
      setNotice(t("auth.notices.passwordUpdated"));
      setLoginEmail(pendingEmail);
    } catch (err) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  const handleComplete = () => {
    if (onClose) onClose();
    navigate('/dashboard');
  };

  const Spinner = () => (
    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );

  return (
    <>
      {success ? (
        <WelcomeScreen
          userName={signedUser?.name || form.name || (loginEmail ? loginEmail.split('@')[0] : '') || 'User'}
          onComplete={handleComplete}
        />
      ) : (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-slideUp my-3 sm:my-8 max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-4rem)] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 text-gray-400 hover:text-gray-600 transition-colors z-10 w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="p-5 sm:p-8 overflow-y-auto">
          {step === "otp" ? (
            /* ---------- EMAIL OTP ---------- */
            <div className="text-center py-6">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                <FaCheckCircle className="text-3xl" />
              </div>
              <h2 className="mt-5 text-2xl font-bold text-gray-800">{t("auth.otpTitle")}</h2>
              <p className="mt-3 text-sm text-gray-600">
                {t("auth.otpSubtitle")}
                <span className="block font-semibold text-gray-800 mt-1">{pendingEmail}</span>
              </p>

              <div className="mt-6 space-y-4">
                <OtpInput value={otp} onChange={setOtp} disabled={isLoading} onComplete={verifyOtp} />

                <p className="text-xs text-gray-400">
                  {t("auth.otpHint")}
                </p>

                {error && <p className="text-red-500 text-sm text-center bg-red-50 py-2 rounded-lg">{error}</p>}

                <button
                  onClick={verifyOtp}
                  disabled={isLoading}
                  className="w-full py-3.5 rounded-xl bg-primary text-white font-semibold transition-all hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? <Spinner /> : t("auth.verify")}
                </button>

                <button
                  onClick={resendOtp}
                  disabled={cooldown > 0}
                  className="w-full py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm transition-all hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cooldown > 0 ? t("auth.resendCountdown", { seconds: cooldown }) : t("auth.resendCode")}
                </button>

                <button
                  onClick={() => { setStep("form"); setOtp(""); setError(""); }}
                  className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 flex items-center justify-center gap-2"
                >
                  <FaChevronLeft className="text-xs" /> {t("auth.changeEmail")}
                </button>
              </div>
            </div>
          ) : step === "resetPassword" ? (
            /* ---------- NEW PASSWORD ---------- */
            <div className="text-center py-6">
              <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <FaLock className="text-3xl" />
              </div>
              <h2 className="mt-5 text-2xl font-bold text-gray-800">{t("auth.setNewPassword")}</h2>
              <p className="mt-3 text-sm text-gray-600">
                {t("auth.for")} <span className="font-semibold text-gray-800">{pendingEmail}</span>
              </p>

              <form onSubmit={handleResetPassword} className="mt-6 space-y-4 text-left">
                <div className="relative">
                  <Input icon={<FaLock />} placeholder={t("auth.newPasswordPlaceholder")} name="newPassword" type={showPassword ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
                <Input icon={<FaLock />} placeholder={t("auth.confirmNewPasswordPlaceholder")} name="confirmNewPassword" type="password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} />

                {error && <p className="text-red-500 text-sm text-center bg-red-50 py-2 rounded-lg">{error}</p>}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 rounded-xl bg-primary text-white font-semibold transition-all hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? <Spinner /> : t("auth.updatePassword")}
                </button>
              </form>
            </div>
          ) : (
            <>
            {/* LOGO */}
            <div className="text-center mb-6">
              <div className="w-14 h-14 mx-auto bg-primary rounded-xl flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-primary/30">
                S
              </div>
              <h1 className="mt-4 text-2xl font-bold text-gray-800">
                SDA Booking
              </h1>
              <p className="text-gray-500 text-sm">
                {mode === "login" && t("auth.welcomeBack")}
                {mode === "register" && t("auth.createAccountTitle")}
                {mode === "forgot" && t("auth.resetPasswordTitle")}
              </p>
            </div>

            {/* MODE SWITCH */}
            <div className="flex bg-gray-100 rounded-xl p-1 mb-5">
              <button
                onClick={() => switchMode("login")}
                className={`flex-1 py-3 rounded-lg font-medium transition-all ${
                  mode === "login" ? "bg-white shadow-md text-primary" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {t("auth.login")}
              </button>
              <button
                onClick={() => switchMode("register")}
                className={`flex-1 py-3 rounded-lg font-medium transition-all ${
                  mode === "register" ? "bg-white shadow-md text-primary" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {t("auth.register")}
              </button>
            </div>

            {mode === "register" ? (
              /* ---------- REGISTER ---------- */
              <form onSubmit={handleRegister} className="space-y-4">
                <Input icon={<FaUser />} placeholder={t("auth.fullNamePlaceholder")} name="name" value={form.name} onChange={changeFormHandler} />

                <Input icon={<FaEnvelope />} placeholder={t("auth.emailPlaceholder")} name="email" type="email" value={form.email} onChange={changeFormHandler} />

                <div className="relative">
                  <Input icon={<FaLock />} placeholder={t("auth.passwordPlaceholder")} name="password" type={showPassword ? "text" : "password"} value={form.password} onChange={changeFormHandler} />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>

                <Input icon={<FaLock />} placeholder={t("auth.confirmPasswordPlaceholder")} name="confirmPassword" type="password" value={form.confirmPassword} onChange={changeFormHandler} />

                <p className="text-xs text-gray-500 leading-5 flex items-start gap-2">
                  <FaEnvelope className="text-primary/60 mt-0.5 flex-shrink-0" />
                  {t("auth.sendCodeNote")}
                </p>

                {error && <p className="text-red-500 text-sm text-center bg-red-50 py-2 rounded-lg">{error}</p>}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 rounded-xl bg-emerald-600 text-white font-semibold transition-all hover:bg-emerald-700 hover:scale-[1.02] shadow-lg shadow-emerald-600/30 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? <Spinner /> : (
                    <>{t("auth.sendCode")} <FaPaperPlane className="text-sm" /></>
                  )}
                </button>
              </form>
            ) : (
              /* ---------- LOGIN / FORGOT ---------- */
              <form onSubmit={mode === "forgot" ? handleForgotStart : handleLogin} className="space-y-4">
                {notice && <p className="text-emerald-600 text-sm text-center bg-emerald-50 py-2 rounded-lg">{notice}</p>}

                <Input
                  icon={<FaEnvelope />}
                  placeholder={t("auth.emailPlaceholder")}
                  name={mode === "forgot" ? "forgotEmail" : "loginEmail"}
                  type="email"
                  value={mode === "forgot" ? forgotEmail : loginEmail}
                  onChange={(e) => {
                    if (mode === "forgot") setForgotEmail(e.target.value);
                    else setLoginEmail(e.target.value);
                    setError("");
                  }}
                />

                {mode !== "forgot" && (
                  <div className="relative">
                    <Input icon={<FaLock />} placeholder={t("auth.passwordPlaceholderShort")} name="loginPassword" type={showPassword ? "text" : "password"} value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                )}

                {mode === "forgot" && (
                  <p className="text-xs text-gray-500 leading-5 flex items-start gap-2">
                    <FaEnvelope className="text-primary/60 mt-0.5 flex-shrink-0" />
                    {t("auth.forgotNote")}
                  </p>
                )}

                {error && <p className="text-red-500 text-sm text-center bg-red-50 py-2 rounded-lg">{error}</p>}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 rounded-xl bg-primary text-white font-semibold transition-all hover:bg-primary/90 hover:scale-[1.02] shadow-lg shadow-primary/30 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? <Spinner /> : mode === "forgot" ? t("auth.sendCode") : t("auth.login")}
                </button>

                {mode === "login" && (
                  <button
                    type="button"
                    onClick={() => switchMode("forgot")}
                    className="w-full py-1 text-sm text-primary font-semibold hover:underline"
                  >
                    {t("auth.forgotPassword")}
                  </button>
                )}

                {mode === "forgot" && (
                  <button
                    type="button"
                    onClick={() => switchMode("login")}
                    className="w-full py-1 text-sm text-gray-500 hover:text-gray-700 flex items-center justify-center gap-2"
                  >
                    <FaChevronLeft className="text-xs" /> {t("auth.backToLogin")}
                  </button>
                )}
              </form>
            )}

            <p className="text-center text-sm text-gray-500 mt-7">
              {mode === "login" || mode === "forgot" ? t("auth.noAccount") : t("auth.haveAccount")}
              <button
                onClick={() => switchMode(mode === "login" || mode === "forgot" ? "register" : "login")}
                className="ml-2 text-primary font-semibold hover:underline"
              >
                {mode === "login" || mode === "forgot" ? t("auth.createAccount") : t("auth.login")}
              </button>
            </p>
            </>
          )}
          </div>
      </div>
    </div>
      )}
    </>
  );
};

const Input = ({ icon, placeholder, name, type = "text", value, onChange }) => {
  return (
    <div className="relative">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
        {icon}
      </div>
      <input
        required
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="
          w-full py-3 pl-12 pr-4 rounded-xl border border-gray-200 
          outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary
          transition-all text-gray-700 placeholder-gray-400
        "
      />
    </div>
  );
};

export default AuthPage;
