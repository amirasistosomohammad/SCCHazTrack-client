import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FaLock, FaSpinner, FaEye, FaEyeSlash } from "react-icons/fa";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "../../hooks/useAuth";
import { showToast } from "../../services/notificationService";
import LoginBackground from "../../assets/background-image.png";
import Logo from "../../assets/images/logo.png";

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export default function ResetPassword() {
  const navigate = useNavigate();
  const query = useQuery();
  const token = query.get("token") || "";
  const { resetPassword } = useAuth();

  const theme = useMemo(
    () => ({
      primary: "#0d7a3a",
      primaryDark: "#0a5f2d",
      textSecondary: "#475569",
      backgroundLight: "#f8fafc",
      borderColor: "#e2e8f0",
    }),
    [],
  );

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [passwordValidation, setPasswordValidation] = useState({
    minLength: false,
    hasLetter: false,
    hasNumber: false,
  });
  const [showPasswordCriteria, setShowPasswordCriteria] = useState(false);

  const validatePassword = (pwd) => ({
    minLength: (pwd || "").length >= 8,
    hasLetter: /[A-Za-z]/.test(pwd || ""),
    hasNumber: /[0-9]/.test(pwd || ""),
  });

  const handlePasswordChange = (value) => {
    setPassword(value);
    setShowPasswordCriteria(value.length > 0);
    const v = validatePassword(value);
    setPasswordValidation(v);
    setFieldErrors((prev) => {
      const next = { ...prev };
      if (next.password) next.password = "";
      if (next.confirmPassword) {
        if (confirmPassword && value !== confirmPassword)
          next.confirmPassword = "Passwords do not match.";
        else next.confirmPassword = "";
      }
      return next;
    });
  };

  const handleConfirmChange = (value) => {
    setConfirmPassword(value);
    setFieldErrors((prev) => {
      const next = { ...prev };
      if (next.confirmPassword) next.confirmPassword = "";
      if (value && password && value !== password)
        next.confirmPassword = "Passwords do not match.";
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldErrors({});
    if (!token) {
      showToast.error(
        "Reset link is missing or invalid. Please request a new reset link.",
      );
      return;
    }
    const pwdValidation = validatePassword(password);
    setPasswordValidation(pwdValidation);
    const pwdOk =
      pwdValidation.minLength &&
      pwdValidation.hasLetter &&
      pwdValidation.hasNumber;

    const errors = {};
    if (!password) {
      errors.password = "Please enter a password.";
    } else if (!pwdOk) {
      errors.password =
        "Password must be at least 8 characters and include a letter and a number.";
    }
    if (!confirmPassword) {
      errors.confirmPassword = "Please confirm your password.";
    } else if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match.";
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      const firstError = Object.values(errors)[0];
      if (firstError) showToast.error(firstError);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await resetPassword({ resetToken: token, password });
      if (res?.success) {
        showToast.success(
          res.message || "Password updated successfully. You can now sign in.",
        );
        navigate("/login", { replace: true });
      } else {
        showToast.error(
          res?.error || "Unable to reset password. Please try again.",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-vh-100 d-flex flex-column position-relative">
      <div
        className="position-absolute top-0 start-0 w-100 h-100"
        style={{
          backgroundImage: `url(${LoginBackground})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          backgroundColor: theme.backgroundLight,
        }}
        aria-hidden
      />

      <div className="flex-grow-1 d-flex align-items-center justify-content-center position-relative">
        <div
          className="bg-white rounded-4 shadow-lg p-4 p-sm-5 w-100 mx-4 mx-sm-0 position-relative"
          style={{
            maxWidth: "420px",
            border: `1px solid ${theme.borderColor}`,
            animation: "fadeIn 0.6s ease-in-out",
          }}
        >
          <div className="logo-section mb-3 w-100">
            <div className="d-flex align-items-center justify-content-center mx-auto">
              <img
                src={Logo}
                alt="SCC HazTrack Logo"
                className="img-fluid"
                style={{
                  width: "112px",
                  height: "112px",
                  objectFit: "contain",
                }}
              />
            </div>
          </div>

          <h5
            className="text-center fw-bolder fs-4"
            style={{ color: theme.primary }}
          >
            Reset password
          </h5>
          <p
            className="text-center small mb-4"
            style={{ color: theme.textSecondary }}
          >
            Create a new password for your account.
          </p>

          <form onSubmit={handleSubmit}>
            <label
              htmlFor="password"
              className="mb-1 fw-semibold"
              style={{ fontSize: ".9rem", color: theme.textSecondary }}
            >
              New password
            </label>
            <div className="mb-3 position-relative">
              <FaLock
                className="position-absolute top-50 translate-middle-y text-muted ms-3"
                size={16}
              />
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                id="password"
                className="form-control ps-5 pe-5 fw-semibold login-input"
                placeholder="New password"
                value={password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                required
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
                style={{ cursor: isSubmitting ? "not-allowed" : "pointer" }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    if (!isSubmitting) setShowPassword((prev) => !prev);
                  }
                }}
                aria-label={showPassword ? "Hide password" : "Show password"}
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
                  style={{ color: theme.textSecondary, paddingLeft: "0.25rem" }}
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

            <label
              htmlFor="confirmPassword"
              className="mb-1 fw-semibold"
              style={{ fontSize: ".9rem", color: theme.textSecondary }}
            >
              Confirm new password
            </label>
            <div className="mb-3 position-relative">
              <FaLock
                className="position-absolute top-50 translate-middle-y text-muted ms-3"
                size={16}
              />
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                id="confirmPassword"
                className="form-control ps-5 pe-5 fw-semibold login-input"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => handleConfirmChange(e.target.value)}
                required
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
                  !isSubmitting && setShowConfirmPassword((prev) => !prev)
                }
                className="position-absolute top-50 end-0 translate-middle-y me-3 text-muted"
                style={{ cursor: isSubmitting ? "not-allowed" : "pointer" }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    if (!isSubmitting) setShowConfirmPassword((prev) => !prev);
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
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow =
                    "0 6px 20px rgba(13, 122, 58, 0.3)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isSubmitting) {
                  e.currentTarget.style.backgroundColor = theme.primary;
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow =
                    "0 2px 10px rgba(13, 122, 58, 0.3)";
                }
              }}
            >
              {isSubmitting ? (
                <>
                  <FaSpinner className="spinner me-2" />
                  Updating...
                </>
              ) : (
                "Update password"
              )}
            </button>

            <div className="text-center mt-3">
              <Link
                to="/login"
                className="small fw-semibold register-link"
                style={{
                  color: theme.primary,
                  textDecoration: "none",
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
                Back to sign in
              </Link>
            </div>
          </form>
        </div>
      </div>

      <footer
        className="login-page-footer position-relative"
        role="contentinfo"
      >
        <div className="login-page-footer-inner">
          <p className="login-page-footer-copy">
            © 2026 SCC HazTrack. SCC Hazard Reporting and Tracking System. All
            rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
