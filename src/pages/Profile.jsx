import React, { useEffect, useState } from "react";
import { FaEye, FaEyeSlash, FaLock, FaSave, FaSpinner, FaUser } from "react-icons/fa";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../lib/api";
import { showToast } from "../services/notificationService";
import SearchableComboBox from "../components/SearchableComboBox";
import "./Profile.css";

export default function Profile() {
  const { user, refreshMe } = useAuth();

  const [activeTab, setActiveTab] = useState("account");
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [campusOptions, setCampusOptions] = useState([]);
  const [campusLoading, setCampusLoading] = useState(false);

  const [profileForm, setProfileForm] = useState({
    name: "",
    edp_number: "",
    campus: "",
  });

  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    new_password_confirmation: "",
  });

  const [profileErrors, setProfileErrors] = useState({});
  const [passwordErrors, setPasswordErrors] = useState({});

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [passwordValidation, setPasswordValidation] = useState({
    minLength: false,
    hasLetter: false,
    hasNumber: false,
  });
  const [showPasswordCriteria, setShowPasswordCriteria] = useState(false);

  const getUserField = (u, ...keys) => {
    for (const k of keys) {
      const v = u?.[k];
      if (v === null || v === undefined) continue;
      const s = String(v).trim();
      if (s) return s;
    }
    return "";
  };

  useEffect(() => {
    if (!user) return;

    // Initialize defaults from the logged-in user (same pattern as My Reports campus).
    // Support multiple possible backend shapes for resilience.
    const name = getUserField(user, "name");
    const edpNumber = getUserField(user, "edp_number", "edpNumber");
    const campus = getUserField(user, "campus");

    setProfileForm((prev) => {
      // Don't clobber in-progress edits if the user object refreshes.
      const next = { ...prev };
      if (!String(prev.name || "").trim()) next.name = name;
      if (!String(prev.edp_number || "").trim()) next.edp_number = edpNumber;
      if (!String(prev.campus || "").trim()) next.campus = campus;
      return next;
    });
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setCampusLoading(true);
      try {
        const res = await api.get("/locations");
        if (cancelled) return;
        setCampusOptions(
          Array.isArray(res.data?.data)
            ? res.data.data.map((l) => String(l?.name ?? "")).filter(Boolean)
            : []
        );
      } finally {
        if (!cancelled) setCampusLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!user) {
    return null;
  }

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileForm((prev) => ({ ...prev, [name]: value }));
    if (profileErrors[name]) {
      setProfileErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));

    if (name === "new_password") {
      if (value.length > 0) setShowPasswordCriteria(true);
      const validation = {
        minLength: value.length >= 8,
        hasLetter: /[A-Za-z]/.test(value),
        hasNumber: /[0-9]/.test(value),
      };
      setPasswordValidation(validation);
    }

    if (passwordErrors[name]) {
      setPasswordErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validatePassword = (pwd) => {
    if (!pwd) return false;
    const validation = {
      minLength: pwd.length >= 8,
      hasLetter: /[A-Za-z]/.test(pwd),
      hasNumber: /[0-9]/.test(pwd),
    };
    setPasswordValidation(validation);
    return validation.minLength && validation.hasLetter && validation.hasNumber;
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = {};
    if (!profileForm.name?.trim()) {
      nextErrors.name = "Name is required.";
    }
    if (!profileForm.edp_number?.trim()) {
      nextErrors.edp_number = "EDP number is required.";
    }
    if (!profileForm.campus?.trim()) {
      nextErrors.campus = "Campus is required.";
    }
    setProfileErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setProfileLoading(true);
    try {
      await api.put("/user/profile", {
        name: profileForm.name.trim(),
        edp_number: profileForm.edp_number.trim(),
        campus: profileForm.campus.trim(),
      });
      await refreshMe();
      showToast.success("Profile updated successfully.");
    } catch (err) {
      const msg =
        err?.response?.data?.errors
          ? Object.values(err.response.data.errors).flat().join(" ")
          : err?.response?.data?.message || err?.message || "Failed to update profile.";
      showToast.error(msg);
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = {};

    if (!passwordForm.current_password) {
      nextErrors.current_password = "Current password is required.";
    }
    if (!passwordForm.new_password) {
      nextErrors.new_password = "New password is required.";
    } else if (!validatePassword(passwordForm.new_password)) {
      nextErrors.new_password =
        "Password must be at least 8 characters and include a letter and a number.";
    }
    if (passwordForm.new_password !== passwordForm.new_password_confirmation) {
      nextErrors.new_password_confirmation = "Passwords do not match.";
    }

    setPasswordErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setPasswordLoading(true);
    try {
      await api.put("/user/password", {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
        new_password_confirmation: passwordForm.new_password_confirmation,
      });

      setPasswordForm({
        current_password: "",
        new_password: "",
        new_password_confirmation: "",
      });
      setPasswordErrors({});
      setPasswordValidation({ minLength: false, hasLetter: false, hasNumber: false });
      setShowPasswordCriteria(false);
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);

      showToast.success("Password changed successfully.");
    } catch (err) {
      const apiErrors = err?.response?.data?.errors;
      const msg =
        apiErrors?.current_password?.[0] ||
        (apiErrors ? Object.values(apiErrors).flat().join(" ") : null) ||
        err?.response?.data?.message ||
        err?.message ||
        "Failed to change password.";
      showToast.error(msg);
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="container-fluid page-transition-enter">
      <div className="my-profile-container">
        <header className="my-profile-header">
          <div className="my-profile-header-icon">
            <FaUser />
          </div>
          <div className="my-profile-header-text">
            <h1 className="my-profile-title">My profile</h1>
            <p className="my-profile-subtitle">
              {user?.name || "User"} • {user?.email || "—"}
            </p>
            <p className="my-profile-desc">
              Review and maintain your account information and security credentials for system
              access.
            </p>
          </div>
        </header>

        <div className="my-profile-row">
          <aside className="my-profile-card my-profile-card-left">
            <h2 className="my-profile-menu-title">Profile Menu</h2>
            <nav className="my-profile-nav-vertical" aria-label="Profile menu">
              <button
                type="button"
                className={`my-profile-nav-item ${activeTab === "account" ? "active" : ""}`}
                onClick={() => setActiveTab("account")}
              >
                <FaUser className="my-profile-nav-item-icon" aria-hidden="true" />
                <span className="my-profile-nav-item-text">
                  <span className="my-profile-nav-item-label">Account information</span>
                  <span className="my-profile-nav-item-desc">Update your profile details</span>
                </span>
              </button>

              <button
                type="button"
                className={`my-profile-nav-item ${activeTab === "security" ? "active" : ""}`}
                onClick={() => setActiveTab("security")}
              >
                <FaLock className="my-profile-nav-item-icon" aria-hidden="true" />
                <span className="my-profile-nav-item-text">
                  <span className="my-profile-nav-item-label">Security</span>
                  <span className="my-profile-nav-item-desc">Change your password</span>
                </span>
              </button>
            </nav>
          </aside>

          <section className="my-profile-card my-profile-card-right">
            <div className="my-profile-content-body">
              {activeTab === "account" && (
                <div className="my-profile-tab-panel tab-transition-enter">
                  <h2 className="my-profile-card-title">
                    <FaUser className="my-profile-card-title-icon" aria-hidden="true" />
                    <span>Account information</span>
                  </h2>

                  <div className="my-profile-note">
                    <strong>Note:</strong> Your email address is used for authentication and cannot
                    be changed.
                  </div>

                  <form onSubmit={handleProfileSubmit} className="my-profile-form">
                    <div className="my-profile-grid">
                      <div className="my-profile-form-group">
                        <label htmlFor="name" className="form-label my-profile-label">
                          Full name <span className="text-danger">*</span>
                        </label>
                        <input
                          id="name"
                          name="name"
                          type="text"
                          className={`form-control my-profile-input ${
                            profileErrors.name ? "is-invalid" : ""
                          }`}
                          value={profileForm.name}
                          onChange={handleProfileChange}
                          disabled={profileLoading}
                          maxLength={255}
                          placeholder="Enter your full name"
                        />
                        <AnimatePresence>
                          {profileErrors.name && (
                            <motion.div
                              className="invalid-feedback d-block"
                              initial={{ opacity: 0, y: -4 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -4 }}
                              transition={{ duration: 0.28, ease: "easeOut" }}
                            >
                              {profileErrors.name}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      <div className="my-profile-form-group my-profile-form-group-readonly">
                        <label htmlFor="email" className="form-label my-profile-label">
                          Email <span className="my-profile-readonly-tag">(cannot be changed)</span>
                        </label>
                        <input
                          id="email"
                          type="email"
                          className="form-control my-profile-input my-profile-input-readonly"
                          value={user?.email || ""}
                          disabled
                          readOnly
                        />
                      </div>

                      <div className="my-profile-form-group">
                        <label htmlFor="edp_number" className="form-label my-profile-label">
                          EDP number <span className="text-danger">*</span>
                        </label>
                        <input
                          id="edp_number"
                          name="edp_number"
                          type="text"
                          className={`form-control my-profile-input ${
                            profileErrors.edp_number ? "is-invalid" : ""
                          }`}
                          value={profileForm.edp_number}
                          onChange={handleProfileChange}
                          disabled={profileLoading}
                          maxLength={64}
                          placeholder="Enter your EDP number"
                        />
                        <AnimatePresence>
                          {profileErrors.edp_number && (
                            <motion.div
                              className="invalid-feedback d-block"
                              initial={{ opacity: 0, y: -4 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -4 }}
                              transition={{ duration: 0.28, ease: "easeOut" }}
                            >
                              {profileErrors.edp_number}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      <div className="my-profile-form-group my-profile-searchable-group">
                        <label htmlFor="campus" className="form-label my-profile-label">
                          Campus <span className="text-danger">*</span>
                        </label>
                        <SearchableComboBox
                          id="campus"
                          name="campus"
                          value={profileForm.campus || ""}
                          onChange={(val) => setProfileForm((prev) => ({ ...prev, campus: val }))}
                          options={campusOptions}
                          placeholder="Search campus..."
                          disabled={profileLoading || campusLoading}
                          invalid={!!profileErrors.campus}
                          className={`form-control my-profile-input ${
                            profileErrors.campus ? "is-invalid" : ""
                          }`}
                          theme={{
                            primary: "var(--primary-color, #0d7a3a)",
                            borderColor: profileErrors.campus
                              ? "#b91c1c"
                              : "var(--input-border, #d5dbe6)",
                            textPrimary: "var(--text-primary, #10172b)",
                          }}
                        />
                        <AnimatePresence>
                          {profileErrors.campus && (
                            <motion.p
                              className="text-danger small mt-1 mb-0"
                              initial={{ opacity: 0, y: -4 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -4 }}
                              transition={{ duration: 0.28, ease: "easeOut" }}
                            >
                              {profileErrors.campus}
                            </motion.p>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    <div className="my-profile-form-footer my-profile-form-footer-left">
                      <button
                        type="submit"
                        className="btn btn-login my-profile-primary-btn"
                        disabled={profileLoading}
                        aria-busy={profileLoading}
                      >
                        {profileLoading ? (
                          <>
                            <FaSpinner className="spinner me-2" aria-hidden />
                            Saving…
                          </>
                        ) : (
                          <>
                            <FaSave className="me-2" aria-hidden />
                            Save changes
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {activeTab === "security" && (
                <div className="my-profile-tab-panel tab-transition-enter">
                  <h2 className="my-profile-card-title">
                    <FaLock className="my-profile-card-title-icon" aria-hidden="true" />
                    <span>Security</span>
                  </h2>

                  <div className="my-profile-note">
                    <strong>Security note:</strong> Use a strong password and do not share your
                    credentials.
                  </div>

                  <form onSubmit={handlePasswordSubmit} className="my-profile-form">
                    <div className="my-profile-security-stack">
                      <div className="my-profile-form-group">
                        <label htmlFor="current_password" className="form-label my-profile-label">
                          Current password <span className="text-danger">*</span>
                        </label>
                        <div className="input-group mb-2">
                          <span className="input-group-text">
                            <FaLock size={14} />
                          </span>
                          <input
                            id="current_password"
                            name="current_password"
                            type={showCurrentPassword ? "text" : "password"}
                            className={`form-control login-input ${
                              passwordErrors.current_password ? "is-invalid" : ""
                            }`}
                            value={passwordForm.current_password}
                            onChange={handlePasswordChange}
                            disabled={passwordLoading}
                            autoComplete="current-password"
                            placeholder="Enter your current password"
                          />
                          <button
                            type="button"
                            className="btn btn-outline-secondary"
                            onClick={() =>
                              !passwordLoading && setShowCurrentPassword(!showCurrentPassword)
                            }
                            disabled={passwordLoading}
                            aria-label={showCurrentPassword ? "Hide password" : "Show password"}
                          >
                            {showCurrentPassword ? <FaEyeSlash /> : <FaEye />}
                          </button>
                        </div>
                        <AnimatePresence>
                          {passwordErrors.current_password && (
                            <motion.p
                              className="invalid-feedback d-block small mb-2"
                              initial={{ opacity: 0, y: -4 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -4 }}
                              transition={{ duration: 0.28, ease: "easeOut" }}
                            >
                              {passwordErrors.current_password}
                            </motion.p>
                          )}
                        </AnimatePresence>
                      </div>

                      <div className="my-profile-form-group">
                        <label htmlFor="new_password" className="form-label my-profile-label">
                          New password <span className="text-danger">*</span>
                        </label>
                        <div className="input-group mb-2">
                          <span className="input-group-text">
                            <FaLock size={14} />
                          </span>
                          <input
                            id="new_password"
                            name="new_password"
                            type={showNewPassword ? "text" : "password"}
                            className={`form-control login-input border-start-0 ps-2 fw-semibold ${
                              passwordForm.new_password &&
                              passwordValidation.minLength &&
                              passwordValidation.hasLetter &&
                              passwordValidation.hasNumber
                                ? "is-valid"
                                : passwordForm.new_password
                                  ? "is-invalid"
                                  : ""
                            }`}
                            value={passwordForm.new_password}
                            onChange={handlePasswordChange}
                            disabled={passwordLoading}
                            autoComplete="new-password"
                            placeholder="Create a new password"
                            minLength={8}
                          />
                          <button
                            type="button"
                            className="btn btn-outline-secondary"
                            onClick={() => !passwordLoading && setShowNewPassword(!showNewPassword)}
                            disabled={passwordLoading}
                            aria-label={showNewPassword ? "Hide password" : "Show password"}
                          >
                            {showNewPassword ? <FaEyeSlash /> : <FaEye />}
                          </button>
                        </div>

                        <div
                          className={`password-criteria-wrapper ${
                            showPasswordCriteria ? "password-criteria-visible" : ""
                          }`}
                        >
                          <div className="password-criteria-inner">
                            <ul className="password-criteria-content small text-secondary mb-3 ps-3 list-unstyled">
                              <li className={passwordValidation.minLength ? "text-success" : ""}>
                                • At least 8 characters
                              </li>
                              <li className={passwordValidation.hasLetter ? "text-success" : ""}>
                                • Contains a letter
                              </li>
                              <li className={passwordValidation.hasNumber ? "text-success" : ""}>
                                • Contains a number
                              </li>
                            </ul>
                          </div>
                        </div>

                        <AnimatePresence>
                          {passwordErrors.new_password && (
                            <motion.p
                              className="invalid-feedback d-block small mb-2"
                              initial={{ opacity: 0, y: -4 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -4 }}
                              transition={{ duration: 0.28, ease: "easeOut" }}
                            >
                              {passwordErrors.new_password}
                            </motion.p>
                          )}
                        </AnimatePresence>
                      </div>

                      <div className="my-profile-form-group">
                        <label
                          htmlFor="new_password_confirmation"
                          className="form-label my-profile-label"
                        >
                          Confirm new password <span className="text-danger">*</span>
                        </label>
                        <div className="input-group mb-1">
                          <span className="input-group-text">
                            <FaLock size={14} />
                          </span>
                          <input
                            id="new_password_confirmation"
                            name="new_password_confirmation"
                            type={showConfirmPassword ? "text" : "password"}
                            className={`form-control login-input ${
                              passwordErrors.new_password_confirmation ? "is-invalid" : ""
                            }`}
                            value={passwordForm.new_password_confirmation}
                            onChange={handlePasswordChange}
                            disabled={passwordLoading}
                            autoComplete="new-password"
                            placeholder="Confirm new password"
                            minLength={8}
                          />
                          <button
                            type="button"
                            className="btn btn-outline-secondary"
                            onClick={() =>
                              !passwordLoading && setShowConfirmPassword(!showConfirmPassword)
                            }
                            disabled={passwordLoading}
                            aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                          >
                            {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                          </button>
                        </div>
                        <AnimatePresence>
                          {passwordErrors.new_password_confirmation && (
                            <motion.p
                              className="invalid-feedback d-block small mb-3"
                              initial={{ opacity: 0, y: -4 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -4 }}
                              transition={{ duration: 0.28, ease: "easeOut" }}
                            >
                              {passwordErrors.new_password_confirmation}
                            </motion.p>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    <div className="my-profile-form-footer my-profile-form-footer-left">
                      <button
                        type="submit"
                        className="btn btn-login my-profile-primary-btn"
                        disabled={passwordLoading}
                        aria-busy={passwordLoading}
                      >
                        {passwordLoading ? (
                          <>
                            <FaSpinner className="spinner me-2" aria-hidden />
                            Changing…
                          </>
                        ) : (
                          <>
                            <FaLock className="me-2" aria-hidden />
                            Change password
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

