import React, { useEffect, useMemo, useRef, useState } from "react";
import { api, ensureCsrfCookie } from "../../lib/api";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import SearchableSelect from "../../components/SearchableSelect.jsx";
import PortalModal from "../../components/PortalModal";
import { showToast } from "../../services/notificationService";
import { motion, AnimatePresence } from "framer-motion";
import { compressImageFile } from "../../lib/imageCompression";

const interFamily =
  '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';

export default function SubmitHazard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showContent, setShowContent] = useState(false);

  const [categoryId, setCategoryId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [selectedCampus, setSelectedCampus] = useState("");
  const [severity, setSeverity] = useState("low");
  const [observedAt, setObservedAt] = useState(() => {
    const d = new Date();
    d.setSeconds(0, 0);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
      d.getHours(),
    )}:${pad(d.getMinutes())}`;
  });
  const [description, setDescription] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [attachmentPreviewUrls, setAttachmentPreviewUrls] = useState([]);
  const [imagePreview, setImagePreview] = useState(null); // { name: string, url: string }
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const initialSnapshotRef = useRef(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const pendingNavigationRef = useRef(null); // { type: 'path'|'back', value: string }

  const campusOptions = useMemo(() => {
    if (!locations?.length) return [];
    const seen = new Set();
    return locations
      .map((l) => String(l.name || "").trim())
      .filter((name) => {
        const key = name.toLowerCase();
        if (!key) return false;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }, [locations]);

  function removeAttachment(indexToRemove) {
    setAttachments((prev) => prev.filter((_, index) => index !== indexToRemove));
  }

  const isDirty = useMemo(() => {
    const snap = initialSnapshotRef.current;
    if (!snap) return false;
    return (
      String(categoryId || "") !== snap.categoryId ||
      String(locationId || "") !== snap.locationId ||
      String(selectedCampus || "") !== snap.selectedCampus ||
      String(severity || "") !== snap.severity ||
      String(observedAt || "") !== snap.observedAt ||
      String(description || "") !== snap.description ||
      (attachments?.length ?? 0) !== snap.attachmentsCount
    );
  }, [attachments?.length, categoryId, description, locationId, observedAt, selectedCampus, severity]);

  // Establish the initial snapshot once the form has its first stable render.
  useEffect(() => {
    if (loading) return;
    if (initialSnapshotRef.current) return;
    initialSnapshotRef.current = {
      categoryId: String(categoryId || ""),
      locationId: String(locationId || ""),
      selectedCampus: String(selectedCampus || ""),
      severity: String(severity || ""),
      observedAt: String(observedAt || ""),
      description: String(description || ""),
      attachmentsCount: attachments?.length ?? 0,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  // Warn on browser refresh/close if there is unsaved progress.
  useEffect(() => {
    const handler = (e) => {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // Intercept sidebar navigation clicks when dirty (Submit Hazard only).
  useEffect(() => {
    const navRoot = document.getElementById("layoutSidenav_nav");
    if (!navRoot) return;
    const onClickCapture = (e) => {
      if (!isDirty) return;
      const a = e.target?.closest?.('a.nav-link');
      if (!a) return;
      const href = a.getAttribute("href");
      if (!href) return;
      try {
        const url = new URL(href, window.location.origin);
        const nextPath = url.pathname + url.search + url.hash;
        const currentPath = window.location.pathname + window.location.search + window.location.hash;
        if (nextPath === currentPath) return;
        e.preventDefault();
        e.stopPropagation();
        pendingNavigationRef.current = { type: "path", value: nextPath };
        setShowLeaveConfirm(true);
      } catch {
        // ignore malformed hrefs
      }
    };
    navRoot.addEventListener("click", onClickCapture, true);
    return () => navRoot.removeEventListener("click", onClickCapture, true);
  }, [isDirty]);

  const requestLeave = (next) => {
    if (!isDirty) {
      if (next.type === "back") navigate(-1);
      else navigate(next.value);
      return;
    }
    pendingNavigationRef.current = next;
    setShowLeaveConfirm(true);
  };

  const confirmLeave = () => {
    const pending = pendingNavigationRef.current;
    pendingNavigationRef.current = null;
    setShowLeaveConfirm(false);
    if (!pending) return;
    initialSnapshotRef.current = null;
    if (pending.type === "back") navigate(-1);
    else navigate(pending.value);
  };

  const cancelLeave = () => {
    pendingNavigationRef.current = null;
    setShowLeaveConfirm(false);
  };

  useEffect(() => {
    const urls = attachments.map((file) =>
      file?.type?.startsWith("image/") ? URL.createObjectURL(file) : null
    );
    setAttachmentPreviewUrls(urls);

    return () => {
      urls.forEach((u) => {
        if (u) URL.revokeObjectURL(u);
      });
    };
  }, [attachments]);

  useEffect(() => {
    (async () => {
      try {
        const [catRes, locRes] = await Promise.all([
          api.get("/categories"),
          api.get("/locations"),
        ]);
        setCategories(catRes.data?.data ?? []);
        setLocations(locRes.data?.data ?? []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Intentionally do NOT prefill Location.
  // Location must be chosen explicitly by the reporter.

  useEffect(() => {
    if (!loading) {
      const id = requestAnimationFrame(() => setShowContent(true));
      return () => cancelAnimationFrame(id);
    }
    setShowContent(false);
  }, [loading]);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");

    // Resolve location id from selected campus text if needed
    let resolvedLocationId = locationId;
    if (!resolvedLocationId && selectedCampus && locations.length) {
      const norm = (s) => String(s).trim().toLowerCase();
      const campusKey = norm(selectedCampus);
      const match = locations.find((l) => norm(l.name) === campusKey);
      if (match?.id) {
        resolvedLocationId = String(match.id);
      }
    }

    const nextErrors = {};
    if (!categoryId) {
      nextErrors.category = "Please select a hazard category.";
    }
    // Require a real mapped location id – no silent fallback.
    if (!resolvedLocationId) {
      nextErrors.location = "Please select the location where the hazard was observed.";
    }
    const desc = String(description || "").trim();
    if (!desc) {
      nextErrors.description = "Please provide a brief description of the hazard.";
    } else if (desc.length < 10) {
      nextErrors.description = "Description must be at least 10 characters.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      showToast.error("Please correct the highlighted fields before submitting.");
      return;
    }

    setSaving(true);
    try {
      await ensureCsrfCookie();

      const form = new FormData();
      form.append("category_id", String(categoryId));
      form.append("location_id", String(resolvedLocationId || ""));
      form.append("severity", severity);
      if (observedAt) {
        // `datetime-local` is a timezone-less local timestamp.
        // Convert to an ISO instant so the backend stores the correct moment and the UI renders accurately.
        const iso = new Date(observedAt).toISOString();
        form.append("observed_at", iso);
      }
      form.append("description", description);
      attachments.forEach((f) => form.append("attachments[]", f));

      // Let Axios/browser set the correct multipart boundary.
      const res = await api.post("/hazards", form);

      initialSnapshotRef.current = null;
      navigate("/reporter/my-reports");
    } catch (err) {
      let message =
        err?.response?.data?.message ||
        Object.values(err?.response?.data?.errors ?? {})?.[0]?.[0] ||
        err?.message ||
        "Failed to submit report";

      setError(message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="page-transition-enter">
        <div className="card border-0 shadow-sm w-100">
          <div
            className="card-header border-0"
            style={{
              backgroundColor: "#d3e9d7",
              borderBottom: "1px solid #b5d3ba",
              padding: "1.1rem 1.75rem",
            }}
          >
            <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center gap-2 gap-md-3">
              <div
                className="d-inline-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                style={{
                  width: 40,
                  height: 40,
                  minWidth: 40,
                  minHeight: 40,
                  backgroundColor: "#0C8A3B",
                  color: "#ffffff",
                  boxShadow: "0 4px 14px rgba(13, 122, 58, 0.28)",
                  fontSize: "1.05rem",
                }}
              >
                <i className="fas fa-file-alt" />
              </div>
              <div className="flex-grow-1">
                <h2
                  className="mb-1"
                  style={{
                    fontFamily: interFamily,
                    fontWeight: 700,
                    fontSize: "1.1rem",
                    lineHeight: 1.3,
                    color: "var(--text-primary)",
                  }}
                >
                  Submit Hazard Report
                </h2>
                <p
                  className="mb-0"
                  style={{
                    fontFamily: interFamily,
                    fontSize: "0.875rem",
                    lineHeight: 1.4,
                    color: "var(--text-secondary)",
                    fontWeight: 600,
                  }}
                >
                  Submit hazard report details for official review and appropriate action.
                </p>
              </div>
            </div>
          </div>

          <div className="card-body">
            <div className="d-flex flex-column align-items-center justify-content-center py-4">
              <div
                className="spinner-border"
                role="status"
                aria-label="Loading"
                style={{ width: "1.75rem", height: "1.75rem", color: "#0C8A3B" }}
              />
              <p
                className="mt-3 mb-0 text-muted"
                style={{ fontFamily: interFamily, fontSize: "0.9rem" }}
              >
                Loading form… Please wait.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-transition-enter">
      <div
        className="card border-0 shadow-sm w-100"
        style={{
          opacity: showContent ? 1 : 0,
          transition: "opacity 0.2s ease-out",
        }}
      >
        <div
          className="card-header border-0"
          style={{
            backgroundColor: "#d3e9d7",
            borderBottom: "1px solid #b5d3ba",
            padding: "1.1rem 1.75rem",
          }}
        >
          <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center gap-2 gap-md-3">
            <div
              className="d-inline-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
              style={{
                width: 40,
                height: 40,
                minWidth: 40,
                minHeight: 40,
                backgroundColor: "#0C8A3B",
                color: "#ffffff",
                boxShadow: "0 4px 14px rgba(13, 122, 58, 0.28)",
                fontSize: "1.05rem",
              }}
            >
              <i className="fas fa-file-alt" />
            </div>

            <div className="flex-grow-1">
              <h2
                className="mb-1"
                style={{
                  fontFamily: interFamily,
                  fontWeight: 700,
                  fontSize: "1.1rem",
                  lineHeight: 1.3,
                  color: "var(--text-primary)",
                }}
              >
                Submit Hazard Report
              </h2>
              <p
                className="mb-0"
                style={{
                  fontFamily: interFamily,
                  fontSize: "0.875rem",
                  lineHeight: 1.4,
                  color: "var(--text-secondary)",
                  fontWeight: 600,
                }}
              >
                Submit hazard report details for official review and appropriate action.
              </p>
            </div>
          </div>
        </div>

        <div className="card-body" style={{ backgroundColor: "#ffffff" }}>
          <form onSubmit={onSubmit} noValidate>
            <PortalModal
              isOpen={showLeaveConfirm}
              onRequestClose={cancelLeave}
              ariaLabelledby="hazard-unsaved-title"
              overlayClassName="account-approvals-detail-overlay"
              backdropClassName="account-approvals-detail-backdrop"
              wrapClassName=""
              panelClassName="account-approvals-detail-modal"
              closeOnBackdrop
              closeOnEsc
            >
              <div className="account-approvals-detail-header">
                <div className="account-approvals-detail-header-text">
                  <h5 id="hazard-unsaved-title" className="mb-0 fw-semibold">
                    Leave this page?
                  </h5>
                  <div className="account-approvals-detail-subtitle">
                    <span className="account-approvals-detail-name">
                      Unsaved progress will be lost
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn-close-custom"
                  onClick={cancelLeave}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>

              <div className="account-approvals-detail-body">
                <p className="account-approvals-action-help mb-0">
                  You have unsaved changes in this hazard submission. If you continue, your entered
                  information will not be saved.
                </p>
              </div>

              <div className="account-approvals-detail-footer">
                <button
                  type="button"
                  className="btn btn-light account-approvals-detail-close-btn"
                  onClick={cancelLeave}
                >
                  Stay on page
                </button>
                <button
                  type="button"
                  className="btn btn-primary account-approvals-detail-close-btn logout-confirm-signout-btn"
                  onClick={confirmLeave}
                >
                  Leave page
                </button>
              </div>
            </PortalModal>

            <div className="mb-3">
              <label
                htmlFor="hazard_category"
                className="form-label mb-1"
                style={{ fontFamily: interFamily, fontWeight: 600, fontSize: "0.9rem" }}
              >
                Category <span className="text-danger">*</span>
              </label>
              <SearchableSelect
                id="hazard_category"
                options={categories.map((c) => c.name)}
                value={
                  categoryId
                    ? categories.find((c) => String(c.id) === String(categoryId))?.name ?? ""
                    : ""
                }
                onChange={(label) => {
                  const match = categories.find((c) => c.name === label);
                  setCategoryId(match ? String(match.id) : "");
                  if (fieldErrors.category) {
                    setFieldErrors((prev) => ({ ...prev, category: "" }));
                  }
                }}
                disabled={saving}
                placeholder="Search or select category..."
                theme={{
                  primary: "#0C8A3B",
                  borderColor: "#d1d5db",
                  textPrimary: "#1a2a1a",
                }}
                inputStyle={{
                  paddingLeft: 42,
                  paddingRight: 30,
                  height: "38px",
                }}
              />
            </div>

            <AnimatePresence>
              {fieldErrors.category && (
                <motion.p
                  className="text-danger small mb-2"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.28, ease: "easeOut" }}
                  style={{ fontFamily: interFamily }}
                >
                  {fieldErrors.category}
                </motion.p>
              )}
            </AnimatePresence>

            <div className="mb-3 mt-2">
              <label
                htmlFor="hazard_location"
                className="form-label mb-1"
                style={{ fontFamily: interFamily, fontWeight: 600, fontSize: "0.9rem" }}
              >
                Location <span className="text-danger">*</span>
              </label>
              <SearchableSelect
                id="hazard_location"
                options={campusOptions}
                value={selectedCampus}
                onChange={(label) => {
                  const campus = String(label || "").trim();
                  setSelectedCampus(campus);

                  if (!campus || !locations.length) {
                    setLocationId("");
                    return;
                  }
                  const norm = (s) => String(s).trim().toLowerCase();
                  const match = locations.find((l) => norm(l.name) === norm(campus));
                  if (match?.id) {
                    setSelectedCampus(String(match.name));
                    setLocationId(String(match.id));
                  } else {
                    setLocationId("");
                  }
                  if (fieldErrors.location) {
                    setFieldErrors((prev) => ({ ...prev, location: "" }));
                  }
                }}
                disabled={saving}
                placeholder="Search or select location..."
                theme={{
                  primary: "#0C8A3B",
                  borderColor: "#d1d5db",
                  textPrimary: "#1a2a1a",
                }}
                inputStyle={{
                  paddingLeft: 42,
                  paddingRight: 30,
                  height: "38px",
                }}
              />
            </div>

            <AnimatePresence>
              {fieldErrors.location && (
                <motion.p
                  className="text-danger small mb-2"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.28, ease: "easeOut" }}
                  style={{ fontFamily: interFamily }}
                >
                  {fieldErrors.location}
                </motion.p>
              )}
            </AnimatePresence>

            <div className="row g-3">
              <div className="col-12 col-md-6">
                <label
                  htmlFor="hazard_severity"
                  className="form-label mb-1"
                  style={{ fontFamily: interFamily, fontWeight: 600, fontSize: "0.9rem" }}
                >
                  Severity
                </label>
                <SearchableSelect
                  id="hazard_severity"
                  options={["Low", "Medium", "High", "Critical"]}
                  value={
                    severity
                      ? severity.charAt(0).toUpperCase() + severity.slice(1)
                      : ""
                  }
                  onChange={(label) => {
                    const v = (label || "").toLowerCase();
                    if (["low", "medium", "high", "critical"].includes(v)) {
                      setSeverity(v);
                    } else {
                      setSeverity("low");
                    }
                  }}
                  disabled={saving}
                  placeholder="Select severity level..."
                  theme={{
                    primary: "#0C8A3B",
                    borderColor: "#d1d5db",
                    textPrimary: "#1a2a1a",
                  }}
                  inputStyle={{
                    paddingLeft: 42,
                    paddingRight: 30,
                    height: "38px",
                  }}
                />
              </div>

              <div className="col-12 col-md-6">
                <label
                  htmlFor="hazard_observed_at"
                  className="form-label mb-1"
                  style={{ fontFamily: interFamily, fontWeight: 600, fontSize: "0.9rem" }}
                >
                  Date/time observed (optional)
                </label>
                <input
                  id="hazard_observed_at"
                  type="datetime-local"
                  className="form-control"
                  value={observedAt}
                  onChange={(e) => setObservedAt(e.target.value)}
                  disabled={saving}
                  style={{
                    borderRadius: 8,
                    border: "1px solid #d1d5db",
                    fontFamily: interFamily,
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#0C8A3B";
                    e.target.style.boxShadow = "0 0 0 0.15rem rgba(12, 138, 59, 0.25)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#d1d5db";
                    e.target.style.boxShadow = "none";
                  }}
                />
              </div>
            </div>

            <div className="mb-3 mt-3">
              <label
                htmlFor="hazard_description"
                className="form-label mb-1"
                style={{ fontFamily: interFamily, fontWeight: 600, fontSize: "0.9rem" }}
              >
                Description <span className="text-danger">*</span>
              </label>
              <textarea
                id="hazard_description"
                className="form-control"
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  if (fieldErrors.description) {
                    setFieldErrors((prev) => ({ ...prev, description: "" }));
                  }
                }}
                required
                minLength={10}
                rows={4}
                disabled={saving}
                placeholder="Enter a clear and concise description of the hazard"
                style={{
                  borderRadius: 8,
                  border: "1px solid #d1d5db",
                  fontFamily: interFamily,
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#0C8A3B";
                  e.target.style.boxShadow = "0 0 0 0.15rem rgba(12, 138, 59, 0.25)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#d1d5db";
                  e.target.style.boxShadow = "none";
                }}
              />
              <div className="form-text" style={{ fontFamily: interFamily }}>
                Minimum 10 characters. Avoid personal data unless necessary for investigation.
              </div>
              <AnimatePresence>
                {fieldErrors.description && (
                  <motion.p
                    className="text-danger small mb-0 mt-1"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.28, ease: "easeOut" }}
                    style={{ fontFamily: interFamily }}
                  >
                    {fieldErrors.description}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            <div className="mb-3">
              <label
                htmlFor="hazard_attachments"
                className="form-label mb-1"
                style={{ fontFamily: interFamily, fontWeight: 600, fontSize: "0.9rem" }}
              >
                Attachments (optional)
              </label>
              <input
                id="hazard_attachments"
                type="file"
                className="form-control"
                multiple
                accept="image/*"
                onChange={(e) => {
                  const rawFiles = Array.from(e.target.files ?? []);
                  if (!rawFiles.length) return;

                  const imageFiles = rawFiles.filter((file) =>
                    file.type?.startsWith("image/")
                  );

                  if (imageFiles.length === 0) {
                    const msg =
                      "Only image files (JPEG, PNG, GIF, etc.) are allowed as attachments.";
                    showToast.error(msg);
                    e.target.value = "";
                    return;
                  }
                  // Deployed servers often have stricter upload limits than localhost.
                  // Compress images client-side to avoid "failed to upload" validation errors.
                  (async () => {
                    try {
                      const MAX_BYTES = 1800000; // ~1.8MB safety buffer
                      const compressed = [];
                      for (const f of imageFiles) {
                        compressed.push(
                          await compressImageFile(f, { maxSizeBytes: MAX_BYTES })
                        );
                      }
                      setAttachments((prev) => [...prev, ...compressed]);
                    } catch {
                      // If compression fails, fall back to original files.
                      setAttachments((prev) => [...prev, ...imageFiles]);
                      showToast.error(
                        "Could not compress attachments; trying original files."
                      );
                    } finally {
                      e.target.value = "";
                    }
                  })();
                }}
                disabled={saving}
              />
              <div className="form-text" style={{ fontFamily: interFamily }}>
                You can upload multiple image files (JPEG, PNG, etc.) up to 5 recommended.
              </div>
              {attachments.length > 0 && (
                <div
                  className="mt-2 border rounded p-3"
                  style={{
                    borderColor: "#d1d5db",
                    backgroundColor: "#f3f4f6",
                  }}
                >
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <div
                      style={{
                        fontFamily: interFamily,
                        fontWeight: 600,
                        fontSize: "0.8rem",
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                        color: "#4b5563",
                      }}
                    >
                      Selected attachments
                    </div>
                    <button
                      type="button"
                      className="btn btn-light btn-sm d-inline-flex align-items-center gap-1"
                      onClick={() => setAttachments([])}
                      disabled={saving}
                      style={{
                        fontFamily: interFamily,
                        fontSize: "0.8rem",
                        paddingInline: "0.6rem",
                        borderRadius: 999,
                        borderColor: "#fecaca",
                        color: "#dc2626",
                        backgroundColor: "#ffffff",
                        transition:
                          "background-color 0.18s ease-out, color 0.18s ease-out, transform 0.15s ease-out",
                      }}
                      onMouseEnter={(e) => {
                        if (saving) return;
                        e.currentTarget.style.backgroundColor = "#fee2e2";
                        e.currentTarget.style.color = "#b91c1c";
                        e.currentTarget.style.transform = "translateY(-1px)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "#ffffff";
                        e.currentTarget.style.color = "#dc2626";
                        e.currentTarget.style.transform = "translateY(0)";
                      }}
                    >
                      <i className="fas fa-trash-alt" aria-hidden="true" />
                      <span>Clear all</span>
                    </button>
                  </div>
                  <div className="d-flex flex-wrap gap-3">
                    {attachments.map((file, index) => {
                      const isImage = file.type?.startsWith("image/");
                      const previewUrl = attachmentPreviewUrls[index];
                      return (
                        <div
                          key={file.name + index}
                          className="d-flex align-items-center gap-3 border rounded-3 px-2 py-2"
                          style={{
                            borderColor: "#e5e7eb",
                            backgroundColor: "#ffffff",
                            maxWidth: 320,
                            minWidth: 260,
                            boxShadow:
                              "0 1px 2px rgba(15, 23, 42, 0.06), 0 0 0 1px rgba(148, 163, 184, 0.15)",
                            transition:
                              "transform 0.15s ease-out, box-shadow 0.15s ease-out, border-color 0.15s ease-out",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = "translateY(-1px)";
                            e.currentTarget.style.boxShadow =
                              "0 4px 10px rgba(15, 23, 42, 0.12)";
                            e.currentTarget.style.borderColor = "#cbd5f5";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "translateY(0)";
                            e.currentTarget.style.boxShadow =
                              "0 1px 2px rgba(15, 23, 42, 0.06), 0 0 0 1px rgba(148, 163, 184, 0.15)";
                            e.currentTarget.style.borderColor = "#e5e7eb";
                          }}
                        >
                          {isImage ? (
                            <div
                              style={{
                                width: 64,
                                height: 64,
                                borderRadius: 8,
                                overflow: "hidden",
                                flexShrink: 0,
                                backgroundColor: "#e5e7eb",
                                cursor: previewUrl ? "pointer" : "default",
                              }}
                              role="button"
                              tabIndex={0}
                              aria-label={`View ${file.name}`}
                              onClick={() => {
                                if (!previewUrl) return;
                                setImagePreview({ name: file.name, url: previewUrl });
                              }}
                              onKeyDown={(e) => {
                                if (e.key !== "Enter" && e.key !== " ") return;
                                e.preventDefault();
                                if (!previewUrl) return;
                                setImagePreview({ name: file.name, url: previewUrl });
                              }}
                            >
                              <img
                                src={previewUrl ?? ""}
                                alt={file.name}
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "cover",
                                }}
                              />
                            </div>
                          ) : (
                            <div
                              className="d-flex align-items-center justify-content-center rounded-2"
                              style={{
                                width: 40,
                                height: 40,
                                backgroundColor: "#eff6ff",
                                color: "#1d4ed8",
                                flexShrink: 0,
                              }}
                            >
                              <i className="fas fa-file" aria-hidden="true" />
                            </div>
                          )}
                          <div
                            style={{
                              fontFamily: interFamily,
                              fontSize: "0.8rem",
                              overflow: "hidden",
                              flexGrow: 1,
                            }}
                          >
                            <div
                              title={file.name}
                              style={{
                                whiteSpace: "nowrap",
                                textOverflow: "ellipsis",
                                overflow: "hidden",
                              }}
                            >
                              {file.name}
                            </div>
                            <div style={{ color: "#6b7280" }}>
                              {(file.size / 1024).toFixed(1)} KB
                            </div>
                          </div>
                          <button
                            type="button"
                            className="btn btn-light btn-sm"
                            onClick={() => removeAttachment(index)}
                            disabled={saving}
                            style={{
                              borderRadius: "999px",
                              width: 28,
                              height: 28,
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              borderWidth: 1,
                              borderColor: "#fecaca",
                              color: "#ef4444",
                              transition:
                                "background-color 0.18s ease-out, color 0.18s ease-out, transform 0.15s ease-out",
                            }}
                            onMouseEnter={(e) => {
                              if (saving) return;
                              e.currentTarget.style.backgroundColor = "#fee2e2";
                              e.currentTarget.style.color = "#b91c1c";
                              e.currentTarget.style.transform = "translateY(-1px)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = "transparent";
                              e.currentTarget.style.borderColor = "#fecaca";
                              e.currentTarget.style.color = "#ef4444";
                              e.currentTarget.style.transform = "translateY(0)";
                            }}
                            aria-label={`Remove ${file.name}`}
                          >
                            <i className="fas fa-times" aria-hidden="true" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <PortalModal
              isOpen={Boolean(imagePreview)}
              onRequestClose={() => setImagePreview(null)}
              ariaLabelledby="attachment-preview-title"
              overlayClassName="account-approvals-detail-overlay"
              backdropClassName="account-approvals-detail-backdrop"
              wrapClassName=""
              panelClassName="account-approvals-detail-modal"
              durationMs={300}
            >
              {imagePreview ? (
                <>
                  <div className="account-approvals-detail-header">
                    <div className="account-approvals-detail-header-text">
                      <h5 id="attachment-preview-title" className="mb-0 fw-semibold">
                        Attachment preview
                      </h5>
                      <div className="account-approvals-detail-subtitle">
                        <span className="account-approvals-detail-name">{imagePreview.name}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="btn-close-custom"
                      aria-label="Close"
                      onClick={() => setImagePreview(null)}
                    >
                      ×
                    </button>
                  </div>

                  <div
                    className="account-approvals-detail-body"
                    style={{
                      backgroundColor: "#f9fafb",
                      padding: "1.5rem",
                    }}
                  >
                    <div
                      className="d-flex align-items-center justify-content-center"
                      style={{
                        minHeight: 260,
                        borderRadius: 12,
                        border: "1px solid #e5e7eb",
                        background:
                          "radial-gradient(circle at top left, #f3f4f6 0, #ffffff 42%, #f9fafb 100%)",
                      }}
                    >
                      <img
                        src={imagePreview.url}
                        alt={imagePreview.name}
                        style={{
                          maxWidth: "100%",
                          maxHeight: "60vh",
                          objectFit: "contain",
                          borderRadius: 10,
                          boxShadow: "0 10px 30px rgba(15, 23, 42, 0.15)",
                        }}
                      />
                    </div>
                  </div>

                  <div className="account-approvals-detail-footer">
                    <button
                      type="button"
                      className="btn btn-light account-approvals-detail-close-btn"
                      onClick={() => setImagePreview(null)}
                    >
                      Close
                    </button>
                  </div>
                </>
              ) : null}
            </PortalModal>

            {error ? (
              <div
                className="alert alert-danger py-2"
                role="alert"
                style={{ fontFamily: interFamily, marginBottom: "1rem" }}
              >
                {error}
              </div>
            ) : null}

            <hr className="my-4" />

            <div className="d-flex flex-wrap gap-2 justify-content-end">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => requestLeave({ type: "back", value: "" })}
                disabled={saving}
                style={{
                  minWidth: 96,
                  borderRadius: 6,
                  fontFamily: interFamily,
                  fontWeight: 600,
                  fontSize: "0.9rem",
                  borderColor: "#d1d5db",
                  color: "#4b5563",
                  backgroundColor: "#f9fafb",
                  transition:
                    "background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  if (saving) return;
                  e.currentTarget.style.backgroundColor = "#e5e7eb";
                  e.currentTarget.style.borderColor = "#cbd5e1";
                }}
                onMouseLeave={(e) => {
                  if (saving) return;
                  e.currentTarget.style.backgroundColor = "#f9fafb";
                  e.currentTarget.style.borderColor = "#d1d5db";
                }}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="btn"
                disabled={saving}
                style={{
                  minWidth: 170,
                  borderRadius: 6,
                  backgroundColor: "#0C8A3B",
                  borderColor: "#0C8A3B",
                  color: "#ffffff",
                  fontFamily: interFamily,
                  fontWeight: 700,
                  fontSize: "0.9rem",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
                onMouseEnter={(e) => {
                  if (saving) return;
                  e.currentTarget.style.backgroundColor = "#0A6B2E";
                  e.currentTarget.style.borderColor = "#0A6B2E";
                }}
                onMouseLeave={(e) => {
                  if (saving) return;
                  e.currentTarget.style.backgroundColor = "#0C8A3B";
                  e.currentTarget.style.borderColor = "#0C8A3B";
                }}
              >
                {saving ? (
                  <span className="spinner-border spinner-border-sm" aria-hidden="true" />
                ) : (
                  <i className="fas fa-paper-plane" aria-hidden="true" />
                )}
                <span>{saving ? "Submitting…" : "Submit Hazard Report"}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

