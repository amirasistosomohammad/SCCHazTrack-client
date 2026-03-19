import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FaEnvelope,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaUser,
  FaIdCard,
  FaMapMarkerAlt,
  FaSpinner,
  FaArrowLeft,
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../hooks/useAuth";
import { showToast } from "../../services/notificationService";
import { getHomePathForUser } from "../../utils/authRouting";
import LoginBackground from "../../assets/background-image.png";
import Logo from "../../assets/images/logo.png";
import SearchableComboBox from "../../components/SearchableComboBox";
import OtpInput from "../../components/OtpInput";
import { api } from "../../lib/api";

const Register = () => {
  const navigate = useNavigate();
  const { register: registerUser, verifyEmail, resendOtp, refreshMe, setUser } = useAuth();

  // Match Login page color scheme for UI consistency
  const theme = {
    primary: "#0d7a3a",
    primaryDark: "#0a5f2d",
    accent: "#ffb300",
    accentDark: "#c98a00",
    textPrimary: "#1e3a5f",
    textSecondary: "#475569",
    backgroundLight: "#f8fafc",
    backgroundWhite: "#ffffff",
    borderColor: "#e2e8f0",
  };

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [passwordValidation, setPasswordValidation] = useState({
    minLength: false,
    hasLetter: false,
    hasNumber: false,
  });
  const [showPasswordCriteria, setShowPasswordCriteria] = useState(false);

  const [step, setStep] = useState("form"); // form | otp
  const [pendingEmail, setPendingEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isResendingOtp, setIsResendingOtp] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const RESEND_COOLDOWN_SECONDS = 60;

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    edp_number: "",
    campus: "",
    password: "",
    confirmPassword: "",
  });

  const [campusOptions, setCampusOptions] = useState([]);
  const [campusLoading, setCampusLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setCampusLoading(true);
      try {
        const res = await api.get("/locations");
        if (cancelled) return;
        const names = Array.isArray(res.data?.data)
          ? res.data.data.map((l) => String(l?.name ?? "")).filter(Boolean)
          : [];
        setCampusOptions(names);
      } catch {
        // Keep UI functional even if lookup fails.
        if (!cancelled) setCampusOptions([]);
      } finally {
        if (!cancelled) setCampusLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      if (next[name]) next[name] = "";
      // Live email format feedback
      if (name === "email" && value) {
        if (!emailPattern.test(value)) {
          next.email = "Please enter a valid email address.";
        } else {
          next.email = "";
        }
      }
      // Live confirm password mismatch feedback
      if (name === "confirmPassword" || name === "password") {
        const password = name === "password" ? value : form.password;
        const confirm =
          name === "confirmPassword" ? value : form.confirmPassword;
        if (confirm && password && password !== confirm) {
          next.confirmPassword = "Passwords do not match.";
        } else if (next.confirmPassword) {
          next.confirmPassword = "";
        }
      }
      return next;
    });
    if (name === "password") {
      setShowPasswordCriteria(value.length > 0);
      const validation = {
        minLength: value.length >= 8,
        hasLetter: /[A-Za-z]/.test(value),
        hasNumber: /[0-9]/.test(value),
      };
      setPasswordValidation(validation);
    }
  };

  const setFormField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      if (next[name]) next[name] = "";
      return next;
    });
  };

  const validateForm = () => {
    const errors = {};

    if (!form.full_name.trim()) {
      errors.full_name = "Please enter your full name.";
    }
    if (!form.email.trim()) {
      errors.email = "Please enter your email address.";
    } else if (!emailPattern.test(form.email)) {
      errors.email = "Please enter a valid email address.";
    }
    if (!form.edp_number.trim()) {
      errors.edp_number = "Please enter your EDP number.";
    }
    if (!form.campus.trim()) {
      errors.campus = "Please enter your campus.";
    }
    if (!form.password) {
      errors.password = "Please enter a password.";
    } else {
      const validation = {
        minLength: form.password.length >= 8,
        hasLetter: /[A-Za-z]/.test(form.password),
        hasNumber: /[0-9]/.test(form.password),
      };
      setPasswordValidation(validation);
      const allOk =
        validation.minLength && validation.hasLetter && validation.hasNumber;
      if (!allOk) {
        errors.password =
          "Password must be at least 8 characters and include a letter and a number.";
      }
    }
    if (!form.confirmPassword) {
      errors.confirmPassword = "Please confirm your password.";
    } else if (form.password !== form.confirmPassword) {
      errors.confirmPassword = "Passwords do not match.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      const firstError = Object.values(errors)[0];
      if (firstError) {
        showToast.error(firstError);
      }
      return false;
    }

    return true;
  };

  const normalizeOtp = (value) => String(value || "").replace(/\D+/g, "").slice(0, 6);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      // Shape of payload can be adjusted once backend contract is finalized
      const payload = {
        name: form.full_name,
        email: form.email,
        edp_number: form.edp_number,
        campus: form.campus,
        password: form.password,
      };

      const result = await registerUser(payload);
      if (result?.success) {
        if (result?.requiresEmailVerification) {
          const emailToVerify = (result?.email || payload.email || "").toString();
          setPendingEmail(emailToVerify);
          setStep("otp");
          setOtp("");
          setOtpError("");
          setResendCooldown(RESEND_COOLDOWN_SECONDS);
          showToast.success(result.message || "We sent a verification code to your email.");
        } else {
          showToast.success(
            result.message ||
              "Registration submitted successfully. You can log in once your account is approved."
          );
          navigate("/login");
        }
      } else {
        // Inline error for duplicate email
        if (
          result?.httpStatus === 422 &&
          (result?.code === "EMAIL_EXISTS" ||
            String(result?.error || "")
              .toLowerCase()
              .includes("email already exists"))
        ) {
          setFieldErrors((prev) => ({
            ...prev,
            email: result?.error || "An account with this email already exists.",
          }));
        }
        showToast.error(
          result?.error ||
            "Unable to complete registration. Please review your details and try again."
        );
      }
    } catch (error) {
      console.error("Registration error:", error);
      showToast.error(
        error?.message ||
          "There was an error creating your account. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const clean = normalizeOtp(otp);
    if (clean.length !== 6) {
      setOtpError("Please enter the 6-digit code.");
      showToast.error("Please enter the 6-digit code.");
      return;
    }

    setIsVerifyingOtp(true);
    setOtpError("");
    try {
      const res = await verifyEmail({ email: pendingEmail || form.email, otp: clean });
      if (res?.success) {
        if (res?.user) {
          // Session cookie is set server-side; update client state immediately.
          setUser(res.user);
          showToast.success(res.message || "Email verified successfully.");
          navigate(getHomePathForUser(res.user), { replace: true });
        } else {
          // Fallback: if server didn't return a user, just refresh and route by /me.
          await refreshMe();
          showToast.success(res.message || "Email verified successfully.");
          navigate("/reporter", { replace: true });
        }
      } else {
        const msg = res?.error || "Invalid code. Please try again.";
        setOtpError(msg);
        showToast.error(msg);
      }
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    if (!pendingEmail && !form.email) return;
    if (resendCooldown > 0) return;
    setIsResendingOtp(true);
    try {
      const res = await resendOtp({ email: pendingEmail || form.email, purpose: "email_verify" });
      if (res?.success) {
        setResendCooldown(RESEND_COOLDOWN_SECONDS);
        showToast.success(res.message || "A new code has been sent.");
      } else {
        // If server responds with cooldown, keep client in cooldown too.
        if (res?.httpStatus === 429) setResendCooldown(RESEND_COOLDOWN_SECONDS);
        showToast.error(res?.error || "Unable to resend code.");
      }
    } finally {
      setIsResendingOtp(false);
    }
  };

  useEffect(() => {
    if (step !== "otp") return;
    if (resendCooldown <= 0) return;

    const t = window.setInterval(() => {
      setResendCooldown((s) => (s > 0 ? s - 1 : 0));
    }, 1000);

    return () => window.clearInterval(t);
  }, [step, resendCooldown]);

  const slideVariants = {
    initial: (direction) => ({ x: direction > 0 ? 60 : -60, opacity: 0 }),
    animate: { x: 0, opacity: 1 },
    exit: (direction) => ({ x: direction > 0 ? -60 : 60, opacity: 0 }),
  };

  const direction = step === "otp" ? 1 : -1;

  return (
    <div
      className="d-flex flex-row"
      style={{
        height: "100vh",
        overflow: "hidden",
        backgroundColor: theme.backgroundLight,
      }}
    >
      {/* Left panel – fixed (non-scrolling) image */}
      <div
        className="d-none d-md-flex flex-column flex-shrink-0"
        style={{
          width: "45%",
          height: "100vh",
          position: "sticky",
          top: 0,
          alignSelf: "flex-start",
          backgroundImage: `url(${LoginBackground})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div
          className="mt-auto p-4 text-white"
          style={{
            background:
              "linear-gradient(to top, rgba(0,0,0,0.7), rgba(0,0,0,0))",
          }}
        >
          <h4 className="fw-bold mb-1">SCC HazTrack</h4>
          <p className="mb-0 small">
            SCC Hazard Reporting and Tracking System – official platform for
            reporting, monitoring, and resolving campus safety concerns.
          </p>
        </div>
      </div>

      {/* Right panel – the ONLY scroll container, with background overlay effect */}
      <div
        className="flex-grow-1 d-flex flex-column register-auth-right"
        style={{
          height: "100vh",
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          backgroundColor: theme.backgroundLight,
          position: "relative",
        }}
      >
        <div
          className="flex-grow-1 d-flex justify-content-center align-items-stretch"
          style={{ padding: "2rem 1.25rem", position: "relative" }}
        >
          <div
            className="bg-white rounded-4 shadow-lg w-100 fadeIn"
            style={{
              maxWidth: "520px",
              padding: "2rem 1.75rem 2.5rem",
              border: `1px solid ${theme.borderColor}`,
            }}
          >
            {/* Logo */}
            <div className="d-flex justify-content-center mb-3">
              <img
                src={Logo}
                alt="SCC HazTrack Logo"
                style={{
                  width: "96px",
                  height: "96px",
                  objectFit: "contain",
                }}
              />
            </div>

            {/* Title / subtitle */}
            <h5
              className="text-center fw-bold mb-2"
              style={{ color: theme.primary }}
            >
              {step === "otp" ? "Verify your email" : "Create your SCC HazTrack account"}
            </h5>
            <p
              className="text-center mb-4 small"
              style={{ color: theme.textSecondary }}
            >
              {step === "otp"
                ? (
                    <>
                      Enter the 6-digit code we sent to{" "}
                      <span className="fw-semibold" style={{ color: theme.textPrimary }}>
                        {pendingEmail || form.email}
                      </span>
                      .
                    </>
                  )
                : "Register using your official institutional email, EDP number, and campus information to access the hazard reporting dashboard."}
            </p>

            <AnimatePresence mode="wait" custom={direction}>
              {step === "form" ? (
                <motion.div
                  key="register-form"
                  custom={direction}
                  variants={slideVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ duration: 0.28, ease: "easeOut" }}
                >
                  {/* Form */}
                  <form onSubmit={handleSubmit}>
                    {/* Full name */}
                    <label
                      htmlFor="full_name"
                      className="mb-1 fw-semibold small"
                      style={{ color: theme.textSecondary }}
                    >
                      Full Name<span className="text-danger">*</span>
                    </label>
                    <div className="mb-3 position-relative">
                      <FaUser
                        className="position-absolute top-50 translate-middle-y text-muted ms-3"
                        size={15}
                      />
                      <input
                        type="text"
                        id="full_name"
                        name="full_name"
                        className="form-control ps-5 fw-semibold login-input"
                        placeholder="Full name"
                        value={form.full_name}
                        onChange={handleInputChange}
                        disabled={isSubmitting}
                        style={{
                          backgroundColor: "var(--input-bg)",
                          color: "var(--input-text)",
                          borderColor: fieldErrors.full_name
                            ? "#dc3545"
                            : "var(--input-border)",
                        }}
                      />
                    </div>
                    <AnimatePresence>
                      {fieldErrors.full_name && (
                        <motion.p
                          className="text-danger small mb-2"
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.28, ease: "easeOut" }}
                        >
                          {fieldErrors.full_name}
                        </motion.p>
                      )}
                    </AnimatePresence>

                    {/* Email */}
                    <label
                      htmlFor="email"
                      className="mb-1 fw-semibold small"
                      style={{ color: theme.textSecondary }}
                    >
                      Institutional Email<span className="text-danger">*</span>
                    </label>
                    <div
                      className={`position-relative ${
                        showPasswordCriteria ? "mb-1" : "mb-3"
                      }`}
                    >
                      <FaEnvelope
                        className="position-absolute top-50 translate-middle-y text-muted ms-3"
                        size={15}
                      />
                      <input
                        type="email"
                        id="email"
                        name="email"
                        className="form-control ps-5 fw-semibold login-input"
                        placeholder="Institutional email address"
                        value={form.email}
                        onChange={handleInputChange}
                        disabled={isSubmitting}
                        style={{
                          backgroundColor: "var(--input-bg)",
                          color: "var(--input-text)",
                          borderColor: fieldErrors.email
                            ? "#dc3545"
                            : "var(--input-border)",
                        }}
                      />
                    </div>
                    <AnimatePresence>
                      {fieldErrors.email && (
                        <motion.p
                          className="text-danger small mb-2"
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.28, ease: "easeOut" }}
                        >
                          {fieldErrors.email}
                        </motion.p>
                      )}
                    </AnimatePresence>

                    {/* EDP number */}
                    <label
                      htmlFor="edp_number"
                      className="mb-1 fw-semibold small"
                      style={{ color: theme.textSecondary }}
                    >
                      EDP Number<span className="text-danger">*</span>
                    </label>
                    <div className="mb-3 position-relative">
                      <FaIdCard
                        className="position-absolute top-50 translate-middle-y text-muted ms-3"
                        size={15}
                      />
                      <input
                        type="text"
                        id="edp_number"
                        name="edp_number"
                        className="form-control ps-5 fw-semibold login-input"
                        placeholder="EDP number"
                        value={form.edp_number}
                        onChange={handleInputChange}
                        disabled={isSubmitting}
                        style={{
                          backgroundColor: "var(--input-bg)",
                          color: "var(--input-text)",
                          borderColor: fieldErrors.edp_number
                            ? "#dc3545"
                            : "var(--input-border)",
                        }}
                      />
                    </div>
                    <AnimatePresence>
                      {fieldErrors.edp_number && (
                        <motion.p
                          className="text-danger small mb-2"
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.28, ease: "easeOut" }}
                        >
                          {fieldErrors.edp_number}
                        </motion.p>
                      )}
                    </AnimatePresence>

                    {/* Campus */}
                    <label
                      htmlFor="campus"
                      className="mb-1 fw-semibold small"
                      style={{ color: theme.textSecondary }}
                    >
                      Campus<span className="text-danger">*</span>
                    </label>
                    <div className="mb-3 position-relative">
                      <FaMapMarkerAlt
                        className="position-absolute top-50 translate-middle-y text-muted ms-3"
                        size={15}
                        style={{ zIndex: 2, pointerEvents: "none" }}
                      />
                      <SearchableComboBox
                        id="campus"
                        name="campus"
                        value={form.campus}
                        onChange={(val) => setFormField("campus", val)}
                        options={campusOptions}
                        placeholder="Search campus..."
                        disabled={isSubmitting || campusLoading}
                        invalid={!!fieldErrors.campus}
                        className="form-control ps-5 fw-semibold login-input"
                        style={{
                          backgroundColor: "var(--input-bg)",
                          color: "var(--input-text)",
                          borderColor: fieldErrors.campus
                            ? "#dc3545"
                            : "var(--input-border)",
                        }}
                        theme={{
                          primary: theme.primary,
                          borderColor: fieldErrors.campus ? "#dc3545" : "var(--input-border)",
                          textPrimary: "var(--input-text)",
                        }}
                      />
                    </div>
                    <AnimatePresence>
                      {fieldErrors.campus && (
                        <motion.p
                          className="text-danger small mb-2"
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.28, ease: "easeOut" }}
                        >
                          {fieldErrors.campus}
                        </motion.p>
                      )}
                    </AnimatePresence>

                    {/* Password */}
                    <label
                      htmlFor="password"
                      className="mb-1 fw-semibold small"
                      style={{ color: theme.textSecondary }}
                    >
                      Password<span className="text-danger">*</span>
                    </label>
                    <div className="mb-3 position-relative">
                      <FaLock
                        className="position-absolute top-50 translate-middle-y text-muted ms-3"
                        size={15}
                      />
                      <input
                        type={showPassword ? "text" : "password"}
                        id="password"
                        name="password"
                        className="form-control ps-5 pe-5 fw-semibold login-input"
                        placeholder="Password"
                        value={form.password}
                        onChange={handleInputChange}
                        disabled={isSubmitting}
                        style={{
                          backgroundColor: "var(--input-bg)",
                          color: "var(--input-text)",
                          borderColor: fieldErrors.password
                            ? "#dc3545"
                            : "var(--input-border)",
                        }}
                      />
                      <span
                        onClick={() =>
                          !isSubmitting && setShowPassword((prev) => !prev)
                        }
                        className="position-absolute top-50 end-0 translate-middle-y me-3 text-muted"
                        style={{
                          cursor: isSubmitting ? "not-allowed" : "pointer",
                        }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            if (!isSubmitting) {
                              setShowPassword((prev) => !prev);
                            }
                          }
                        }}
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                      >
                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                      </span>
                    </div>
                    <AnimatePresence>
                      {showPasswordCriteria && (
                        <motion.div
                          className="mb-2 small"
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.28, ease: "easeOut" }}
                          style={{
                            color: theme.textSecondary,
                            paddingLeft: "0.25rem",
                          }}
                        >
                          <div>
                            <span
                              style={{
                                fontWeight: 600,
                                color: passwordValidation.minLength
                                  ? theme.primary
                                  : theme.textSecondary,
                              }}
                            >
                              • At least 8 characters
                            </span>
                          </div>
                          <div>
                            <span
                              style={{
                                fontWeight: 600,
                                color: passwordValidation.hasLetter
                                  ? theme.primary
                                  : theme.textSecondary,
                              }}
                            >
                              • Contains a letter
                            </span>
                          </div>
                          <div>
                            <span
                              style={{
                                fontWeight: 600,
                                color: passwordValidation.hasNumber
                                  ? theme.primary
                                  : theme.textSecondary,
                              }}
                            >
                              • Contains a number
                            </span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <AnimatePresence>
                      {fieldErrors.password && (
                        <motion.p
                          className="text-danger small mb-2"
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.28, ease: "easeOut" }}
                        >
                          {fieldErrors.password}
                        </motion.p>
                      )}
                    </AnimatePresence>

                    {/* Confirm password */}
                    <label
                      htmlFor="confirmPassword"
                      className="mb-1 fw-semibold small"
                      style={{ color: theme.textSecondary }}
                    >
                      Confirm Password<span className="text-danger">*</span>
                    </label>
                    <div className="mb-3 position-relative">
                      <FaLock
                        className="position-absolute top-50 translate-middle-y text-muted ms-3"
                        size={15}
                      />
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        id="confirmPassword"
                        name="confirmPassword"
                        className="form-control ps-5 pe-5 fw-semibold login-input"
                        placeholder="Confirm password"
                        value={form.confirmPassword}
                        onChange={handleInputChange}
                        disabled={isSubmitting}
                        style={{
                          backgroundColor: "var(--input-bg)",
                          color: "var(--input-text)",
                          borderColor: fieldErrors.confirmPassword
                            ? "#dc3545"
                            : "var(--input-border)",
                        }}
                      />
                      <span
                        onClick={() =>
                          !isSubmitting &&
                          setShowConfirmPassword((prev) => !prev)
                        }
                        className="position-absolute top-50 end-0 translate-middle-y me-3 text-muted"
                        style={{
                          cursor: isSubmitting ? "not-allowed" : "pointer",
                        }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            if (!isSubmitting) {
                              setShowConfirmPassword((prev) => !prev);
                            }
                          }
                        }}
                        aria-label={
                          showConfirmPassword
                            ? "Hide confirm password"
                            : "Show confirm password"
                        }
                      >
                        {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                      </span>
                    </div>
                    <AnimatePresence>
                      {fieldErrors.confirmPassword && (
                        <motion.p
                          className="text-danger small mb-3"
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.28, ease: "easeOut" }}
                        >
                          {fieldErrors.confirmPassword}
                        </motion.p>
                      )}
                    </AnimatePresence>

                    {/* Submit button */}
                    <button
                      type="submit"
                      className="w-100 py-2 fw-semibold d-flex align-items-center justify-content-center"
                      disabled={isSubmitting}
                      style={{
                        backgroundColor: theme.primary,
                        color: "#ffffff",
                        borderRadius: "8px",
                        border: `1px solid ${theme.primaryDark}`,
                        transition:
                          "background-color 0.25s ease, transform 0.2s ease, box-shadow 0.2s ease",
                      }}
                      onMouseEnter={(e) => {
                        if (!isSubmitting) {
                          e.currentTarget.style.backgroundColor = theme.primaryDark;
                          e.currentTarget.style.transform = "translateY(-1px)";
                          e.currentTarget.style.boxShadow =
                            "0 10px 18px rgba(15, 23, 42, 0.18)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = theme.primary;
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      {isSubmitting ? (
                        <>
                          <FaSpinner className="spinner me-2" />
                          Creating account...
                        </>
                      ) : (
                        "Create account"
                      )}
                    </button>

                    {/* Login link */}
                    <p
                      className="text-center mt-3 small fw-semibold"
                      style={{ color: theme.primary }}
                    >
                      Already have an account?{" "}
                      <Link
                        to="/login"
                        className="register-link fw-bold"
                        style={{
                          color: theme.primary,
                          display: "inline-block",
                          transition:
                            "color 0.25s ease-in-out, transform 0.25s ease-in-out",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = theme.primaryDark;
                          e.currentTarget.style.transform = "translateY(-2px)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = theme.primary;
                          e.currentTarget.style.transform = "translateY(0)";
                        }}
                      >
                        Sign in here
                      </Link>
                    </p>
                  </form>
                </motion.div>
              ) : (
                <motion.div
                  key="register-otp"
                  custom={direction}
                  variants={slideVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ duration: 0.28, ease: "easeOut" }}
                >
                  <div className="d-flex align-items-center mb-3">
                    <button
                      type="button"
                      className="btn btn-link p-0 small fw-semibold"
                      onClick={() => {
                        if (isVerifyingOtp || isResendingOtp) return;
                        setStep("form");
                      }}
                      style={{
                        color: theme.primary,
                        textDecoration: "none",
                        display: "inline-block",
                        transition:
                          "color 0.25s ease-in-out, transform 0.25s ease-in-out",
                      }}
                      aria-label="Back to sign up"
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = theme.primaryDark;
                        e.currentTarget.style.transform = "translateY(-2px)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = theme.primary;
                        e.currentTarget.style.transform = "translateY(0)";
                      }}
                    >
                      <span className="d-inline-flex align-items-center" style={{ gap: "8px" }}>
                        <FaArrowLeft />
                        Back to sign up
                      </span>
                    </button>
                  </div>

                  <form onSubmit={handleVerifyOtp}>
                    <div className="mb-3">
                      <OtpInput
                        value={otp}
                        onChange={(v) => {
                          setOtp(normalizeOtp(v));
                          if (otpError) setOtpError("");
                        }}
                        length={6}
                        disabled={isVerifyingOtp}
                        error={Boolean(otpError)}
                        autoFocus
                      />
                    </div>
                    <AnimatePresence>
                      {otpError && (
                        <motion.p
                          className="text-danger small mb-2 text-center"
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.28, ease: "easeOut" }}
                        >
                          {otpError}
                        </motion.p>
                      )}
                    </AnimatePresence>

                    <button
                      type="submit"
                      className="w-100 py-2 fw-semibold d-flex align-items-center justify-content-center"
                      disabled={isVerifyingOtp}
                      style={{
                        backgroundColor: theme.primary,
                        color: "#ffffff",
                        borderRadius: "8px",
                        border: `1px solid ${theme.primaryDark}`,
                        transition:
                          "background-color 0.25s ease, transform 0.2s ease, box-shadow 0.2s ease",
                        outline: "none",
                      }}
                      onMouseEnter={(e) => {
                        if (!isVerifyingOtp) {
                          e.currentTarget.style.backgroundColor = theme.primaryDark;
                          e.currentTarget.style.transform = "translateY(-1px)";
                          e.currentTarget.style.boxShadow =
                            "0 10px 18px rgba(15, 23, 42, 0.18)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = theme.primary;
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                      onFocus={(e) => {
                        // Remove browser/Bootstrap focus glow for this button
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      {isVerifyingOtp ? (
                        <>
                          <FaSpinner className="spinner me-2" />
                          Verifying...
                        </>
                      ) : (
                        "Verify email"
                      )}
                    </button>

                    <button
                      type="button"
                      className="w-100 py-2 fw-semibold d-flex align-items-center justify-content-center mt-2"
                      onClick={handleResendOtp}
                      disabled={isResendingOtp || resendCooldown > 0}
                      style={{
                        backgroundColor: "#ffffff",
                        color: theme.primary,
                        borderRadius: "8px",
                        border: `1px solid ${theme.borderColor}`,
                        transition:
                          "background-color 0.25s ease, transform 0.2s ease, box-shadow 0.2s ease",
                      }}
                      onMouseEnter={(e) => {
                        if (!isResendingOtp && resendCooldown <= 0) {
                          e.currentTarget.style.backgroundColor = "#f8fafc";
                          e.currentTarget.style.transform = "translateY(-1px)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "#ffffff";
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      {isResendingOtp
                        ? "Sending..."
                        : resendCooldown > 0
                          ? `Resend code (${resendCooldown}s)`
                          : "Resend code"}
                    </button>

                    <p
                      className="text-center mt-3 small fw-semibold"
                      style={{ color: theme.primary }}
                    >
                      Already have an account?{" "}
                      <Link
                        to="/login"
                        className="register-link fw-bold"
                        style={{
                          color: theme.primary,
                          display: "inline-block",
                          transition:
                            "color 0.25s ease-in-out, transform 0.25s ease-in-out",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = theme.primaryDark;
                          e.currentTarget.style.transform = "translateY(-2px)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = theme.primary;
                          e.currentTarget.style.transform = "translateY(0)";
                        }}
                      >
                        Sign in here
                      </Link>
                    </p>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Footer pinned to bottom – match Login page footer */}
        <footer className="login-page-footer position-relative" role="contentinfo">
          <div className="login-page-footer-inner">
            <p className="login-page-footer-name">SCC HazTrack</p>
            <p className="login-page-footer-tagline">
              SCC Hazard Reporting and Tracking System
            </p>
            <p className="login-page-footer-copy">
              © {new Date().getFullYear()} SCC. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
      {/* Background overlay effect for right panel – custom to HazTrack */}
      <style>{`
        .register-auth-right {
          background:
            radial-gradient(circle at 20% 10%, rgba(13, 122, 58, 0.10), transparent 55%),
            radial-gradient(circle at 90% 70%, rgba(255, 179, 0, 0.08), transparent 50%),
            linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
          position: relative;
          overflow: hidden;
        }

        .register-auth-right::before {
          content: "";
          position: absolute;
          inset: 0;
          z-index: 0;
          opacity: 0.08;
          background-image: radial-gradient(rgba(15, 23, 42, 0.35) 1px, transparent 1px);
          background-size: 4px 4px;
          pointer-events: none;
        }

        .register-auth-right::after {
          content: none;
        }

        .register-auth-right > * {
          position: relative;
          z-index: 1;
        }
      `}</style>
    </div>
  );
};

export default Register;