import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  FaEnvelope,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaSpinner,
} from "react-icons/fa";
import { useAuth } from "../../hooks/useAuth";
import { showToast } from "../../services/notificationService";
import { getHomePathForUser } from "../../utils/authRouting";
import { useAuth as useAuthContext } from "../../contexts/AuthContext";
import LoginBackground from "../../assets/background-image.png";
import Logo from "../../assets/images/logo.png";
import PortalModal from "../../components/PortalModal";
import "./Login.css";

const REJECTION_STORAGE_KEY = "midtask_login_rejection";
const DEACTIVATION_STORAGE_KEY = "midtask_login_deactivated";

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accountStatusModal, setAccountStatusModal] = useState(null);
  const navigate = useNavigate();

  const { login } = useAuth();
  const { user, loading } = useAuthContext();

  useEffect(() => {
    if (!loading && user) {
      navigate(getHomePathForUser(user), { replace: true });
    }
  }, [loading, user, navigate]);

  const closeAccountStatusModal = useCallback(
    () => setAccountStatusModal(null),
    []
  );

  useEffect(() => {
    try {
      const rejectionRaw = sessionStorage.getItem(REJECTION_STORAGE_KEY);
      if (rejectionRaw) {
        sessionStorage.removeItem(REJECTION_STORAGE_KEY);
        const data = JSON.parse(rejectionRaw);
        setAccountStatusModal({
          type: "rejected",
          remarks: data?.rejection_remarks ?? data?.rejectionRemarks ?? null,
        });
        return;
      }
      const deactivationRaw = sessionStorage.getItem(DEACTIVATION_STORAGE_KEY);
      if (deactivationRaw) {
        sessionStorage.removeItem(DEACTIVATION_STORAGE_KEY);
        try {
          const data = JSON.parse(deactivationRaw);
          setAccountStatusModal({
            type: "deactivated",
            remarks:
              data?.deactivation_remarks ?? data?.deactivationRemarks ?? null,
          });
        } catch {
          setAccountStatusModal({ type: "deactivated", remarks: null });
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Client color scheme – match DATravelApp deep green / amber
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

  useEffect(() => {
    const img = new Image();
    img.src = LoginBackground;
  }, []);

  useEffect(() => {
    if (!accountStatusModal) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") closeAccountStatusModal();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [accountStatusModal, closeAccountStatusModal]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.email || !form.password) {
      showToast.error("Please fill in all fields.");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await login(form.email, form.password);

      if (result.success) {
        showToast.success(`Welcome back, ${result.user?.name ?? "User"}!`);
        setTimeout(() => {
          navigate(getHomePathForUser(result.user), { replace: true });
        }, 1500);
      } else {
        if (
          result.httpStatus === 403 &&
          (result.accountStatus === "deactivated" ||
            result.accountStatus === "rejected")
        ) {
          const type =
            result.accountStatus === "deactivated" ? "deactivated" : "rejected";
          let remarks =
            type === "deactivated"
              ? result.deactivation_remarks ?? null
              : result.rejection_remarks ?? null;
          if (!remarks && result.error && result.error.includes(" Reason: ")) {
            const parts = result.error.split(" Reason: ");
            remarks = parts[1] ? parts[1].trim() : null;
          }
          setAccountStatusModal({ type, remarks: remarks || null });
        } else {
          showToast.error(
            result.error ||
              "Invalid credentials. Please check your email and password."
          );
        }
      }
    } catch (error) {
      showToast.error(
        "Unable to connect to the server. Please check your internet connection and try again."
      );
      console.error("Login error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="min-vh-100 d-flex flex-column position-relative">
      {/* Background image */}
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

      {/* Centered form card */}
      <div className="flex-grow-1 d-flex align-items-center justify-content-center position-relative">
        <div
          className="bg-white rounded-4 shadow-lg p-4 p-sm-5 w-100 mx-4 mx-sm-0 position-relative"
          style={{
            maxWidth: "420px",
            border: `1px solid ${theme.borderColor}`,
            animation: "fadeIn 0.6s ease-in-out",
          }}
        >
          {/* Logo section – icon only, larger */}
          <div className="logo-section mb-4 w-100">
            <div className="d-flex align-items-center justify-content-center mx-auto">
              <div className="d-flex align-items-center justify-content-center">
                <img
                  src={Logo}
                  alt="MidTask Logo"
                  className="img-fluid"
                  style={{
                    width: "112px",
                    height: "112px",
                    objectFit: "contain",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Title */}
          <h5
            className="text-center fw-bolder fs-4"
            style={{
              marginTop: "2rem",
              marginBottom: "2rem",
              color: theme.primary,
            }}
          >
            Log in to your account
          </h5>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {/* Email */}
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
                value={form.email}
                onChange={handleInputChange}
                required
                disabled={isSubmitting}
                style={{
                  backgroundColor: "var(--input-bg)",
                  color: "var(--input-text)",
                  border: "1px solid var(--input-border)",
                }}
              />
            </div>

            {/* Password */}
            <label
              htmlFor="password"
              className="mb-1 fw-semibold"
              style={{ fontSize: ".9rem", color: theme.textSecondary }}
            >
              Password
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
                placeholder="Password"
                value={form.password}
                onChange={handleInputChange}
                required
                disabled={isSubmitting}
                style={{
                  backgroundColor: "var(--input-bg)",
                  color: "var(--input-text)",
                  border: "1px solid var(--input-border)",
                }}
              />
              <span
                onClick={() => !isSubmitting && setShowPassword(!showPassword)}
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

            {/* Forgot password link – same green + hover as Register here */}
            <div className="d-flex justify-content-end mb-3">
              <Link
                to="/forgot-password"
                className="register-link small fw-semibold"
                style={{
                  color: theme.primary,
                  fontWeight: 700,
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
                Forgot password?
              </Link>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              className="w-100 fw-semibold d-flex align-items-center justify-content-center"
              disabled={isSubmitting}
              style={{
                backgroundColor: theme.primary,
                color: "#ffffff",
                borderRadius: "8px",
                border: `1px solid ${theme.primaryDark}`,
                padding: "0.5rem 1.2rem",
                fontSize: "0.85rem",
                transition: "background-color 0.25s ease, transform 0.2s ease",
              }}
              onMouseEnter={(e) => {
                if (!isSubmitting) {
                  e.currentTarget.style.backgroundColor = theme.primaryDark;
                  e.currentTarget.style.transform = "translateY(-1px)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = theme.primary;
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              {isSubmitting ? (
                <>
                  <FaSpinner className="spinner me-2" />
                  Signing In...
                </>
              ) : (
                "Sign In"
              )}
            </button>

            {/* Register link */}
            <p
              className="text-center mt-3 small fw-semibold"
              style={{ color: theme.primary }}
            >
              Don&apos;t have an account?{" "}
              <Link
                to="/register"
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
                Register here
              </Link>
            </p>
          </form>
        </div>
      </div>

      {/* Rejection / deactivation modal (portal) */}
      <PortalModal
        isOpen={Boolean(accountStatusModal)}
        onRequestClose={closeAccountStatusModal}
        role="alertdialog"
        ariaLabelledby="login-account-status-title"
        ariaDescribedby="login-account-status-desc"
        overlayClassName="account-approvals-detail-overlay"
        backdropClassName="account-approvals-detail-backdrop"
        wrapClassName=""
        panelClassName="account-approvals-detail-modal"
      >
        {accountStatusModal ? (
          <>
            <div className="account-approvals-detail-header">
              <div className="account-approvals-detail-header-text">
                <h5 id="login-account-status-title" className="mb-0 fw-semibold">
                  {accountStatusModal.type === "deactivated"
                    ? "Account deactivated"
                    : "Account rejected"}
                </h5>
                <div
                  id="login-account-status-desc"
                  className="account-approvals-detail-subtitle"
                >
                  <span className="account-approvals-detail-name">
                    {accountStatusModal.type === "deactivated"
                      ? "Your account has been deactivated by an administrator. You are not permitted to sign in until your account is reactivated."
                      : "Your account has been rejected. You are not permitted to sign in."}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="btn-close-custom"
                aria-label="Close"
                onClick={closeAccountStatusModal}
              >
                ×
              </button>
            </div>

            <div className="account-approvals-detail-body">
              <p className="account-approvals-action-help mb-3">
                {accountStatusModal.type === "deactivated"
                  ? "Your account has been deactivated. Please contact your administrator for assistance or to request reactivation."
                  : "Your registration has been reviewed and was not approved. You do not have access to this system."}
              </p>
              <div className="border-top pt-3">
                <p className="mb-2 small fw-semibold text-uppercase text-muted">
                  Remarks from administrator
                </p>
                {accountStatusModal.remarks ? (
                  <p className="mb-0" style={{ whiteSpace: "pre-wrap" }}>
                    {accountStatusModal.remarks}
                  </p>
                ) : (
                  <p className="mb-0 fst-italic text-muted">
                    No additional remarks provided.
                  </p>
                )}
              </div>
            </div>

            <div className="account-approvals-detail-footer">
              <button
                type="button"
                className="btn btn-light account-approvals-detail-close-btn"
                onClick={closeAccountStatusModal}
              >
                Close
              </button>
            </div>
          </>
        ) : null}
      </PortalModal>

      {/* Footer pinned to bottom – match SCC HazTrack system */}
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

