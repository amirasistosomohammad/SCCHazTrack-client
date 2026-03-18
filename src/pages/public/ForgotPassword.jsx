import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaEnvelope, FaSpinner } from "react-icons/fa";
import { useAuth } from "../../hooks/useAuth";
import { showToast } from "../../services/notificationService";
import LoginBackground from "../../assets/background-image.png";
import Logo from "../../assets/images/logo.png";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const { forgotPassword } = useAuth();

  const theme = useMemo(
    () => ({
      primary: "#0d7a3a",
      primaryDark: "#0a5f2d",
      textPrimary: "#1e3a5f",
      textSecondary: "#475569",
      backgroundLight: "#f8fafc",
      backgroundWhite: "#ffffff",
      borderColor: "#e2e8f0",
    }),
    []
  );

  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      showToast.error("Please enter your email address.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await forgotPassword(email.trim());
      if (res?.success) {
        showToast.success(
          res.message ||
            "If an account exists with this email, a reset link has been sent. Check your inbox."
        );
        navigate("/login", { replace: true });
      } else {
        showToast.error(res?.error || "Something went wrong. Please try again.");
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
                style={{ width: "112px", height: "112px", objectFit: "contain" }}
              />
            </div>
          </div>

          <h5 className="text-center fw-bolder fs-4" style={{ color: theme.primary }}>
            Forgot password?
          </h5>
          <p className="text-center small mb-4" style={{ color: theme.textSecondary }}>
            Enter your email and we&apos;ll send you a link to reset your password.
          </p>

          <form onSubmit={handleSubmit}>
            <label
              htmlFor="email"
              className="mb-1 fw-semibold"
              style={{ fontSize: ".9rem", color: theme.textSecondary }}
            >
              Email
            </label>
            <div className="mb-3 position-relative">
              <FaEnvelope
                className="position-absolute top-50 translate-middle-y text-muted ms-3"
                size={16}
              />
              <input
                type="email"
                name="email"
                id="email"
                className="form-control ps-5 fw-semibold login-input"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isSubmitting}
                style={{
                  backgroundColor: "var(--input-bg)",
                  color: "var(--input-text)",
                  border: "1px solid var(--input-border)",
                }}
              />
            </div>

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
                  e.currentTarget.style.boxShadow = "0 6px 20px rgba(13, 122, 58, 0.3)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isSubmitting) {
                  e.currentTarget.style.backgroundColor = theme.primary;
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 2px 10px rgba(13, 122, 58, 0.3)";
                }
              }}
            >
              {isSubmitting ? (
                <>
                  <FaSpinner className="spinner me-2" />
                  Sending...
                </>
              ) : (
                "Send reset link"
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
  );
}

