import React, { useEffect, useMemo, useState } from "react";
import { api, ensureCsrfCookie } from "../../lib/api";
import PortalModal from "../../components/PortalModal";
import { showToast } from "../../services/notificationService";
import "./ManageUsers.css";

const interFamily =
  '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';

const statusOptions = [
  { value: "", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

function getInitials(name) {
  const text = String(name || "").trim();
  if (!text) return "U";
  const parts = text.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default function ManageUsers() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showContent, setShowContent] = useState(false);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState(null);
  const [activeSummaryModal, setActiveSummaryModal] = useState(null);
  const [summaryModalType, setSummaryModalType] = useState(null);
  const [viewUser, setViewUser] = useState(null);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [deactivateRemarks, setDeactivateRemarks] = useState("");
  const [deactivateLoading, setDeactivateLoading] = useState(false);

  const [filters, setFilters] = useState({
    query: "",
    status: "",
  });

  async function loadUsers() {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/manager/users", { params: { per_page: 50 } });
      setRows(res?.data?.data ?? []);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (!loading) {
      const id = requestAnimationFrame(() => setShowContent(true));
      return () => cancelAnimationFrame(id);
    }
    setShowContent(false);
  }, [loading]);

  useEffect(() => {
    if (activeSummaryModal) {
      setSummaryModalType(activeSummaryModal);
      return;
    }
    if (!summaryModalType) return;
    const t = setTimeout(() => setSummaryModalType(null), 220);
    return () => clearTimeout(t);
  }, [activeSummaryModal, summaryModalType]);

  // In this system, only reporter account(s) should be shown on this screen.
  const reporterRows = useMemo(() => rows.filter((u) => u.role === "reporter"), [rows]);

  const filteredUsers = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    return reporterRows.filter((u) => {
      if (filters.status) {
        const normalizedStatus = u.is_active ? "active" : "inactive";
        if (normalizedStatus !== filters.status) return false;
      }
      if (q) {
        const haystack = [u.id, u.name, u.email, u.role]
          .filter(Boolean)
          .map((v) => String(v).toLowerCase())
          .join(" ");
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [reporterRows, filters]);

  const stats = useMemo(
    () => ({
      total: reporterRows.length,
      active: reporterRows.filter((u) => Boolean(u.is_active)).length,
    }),
    [reporterRows]
  );

  async function updateUser(id, payload) {
    setSavingId(id);
    setError("");
    try {
      await ensureCsrfCookie();
      await api.patch(`/manager/users/${id}`, payload);
      await loadUsers();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to update user");
    } finally {
      setSavingId(null);
    }
  }

  async function deleteUser(id) {
    const deletedName = deleteTarget?.name?.trim();
    setDeleteLoading(true);
    setError("");
    try {
      await ensureCsrfCookie();
      await api.delete(`/manager/users/${id}`);
      showToast.success(
        deletedName
          ? `Account for ${deletedName} was deleted successfully.`
          : "User account deleted successfully."
      );
      setDeleteTarget(null);
      if (viewUser?.id === id) setViewUser(null);
      await loadUsers();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to delete user");
    } finally {
      setDeleteLoading(false);
    }
  }

  async function deactivateUserSubmit() {
    if (!deactivateTarget) return;
    const targetId = deactivateTarget.id;
    const targetName = deactivateTarget.name?.trim();
    const remarks = deactivateRemarks.trim() || undefined;

    setDeactivateLoading(true);
    setError("");
    try {
      await ensureCsrfCookie();
      await api.post(`/manager/users/${targetId}/deactivate`, { remarks });
      showToast.success(
        targetName ? `Account deactivated: ${targetName}` : "Account deactivated successfully."
      );
      setDeactivateTarget(null);
      setDeactivateRemarks("");
      if (viewUser?.id === targetId) {
        // Keep view open (it will refresh after reload), but close to avoid stale content.
        setViewUser(null);
      }
      await loadUsers();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to deactivate account");
    } finally {
      setDeactivateLoading(false);
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
                className="d-inline-flex align-items-center justify-content-center rounded-circle"
                style={{
                  width: 40,
                  height: 40,
                  backgroundColor: "#0C8A3B",
                  color: "#ffffff",
                  boxShadow: "0 4px 14px rgba(13, 122, 58, 0.28)",
                }}
              >
                <i className="fas fa-users" />
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
                  User accounts
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
                  Search, filter, and manage reporter accounts.
                </p>
              </div>
            </div>
          </div>
          <div className="card-body py-4 d-flex flex-column align-items-center">
            <div
              className="spinner-border"
              role="status"
              style={{ width: "1.75rem", height: "1.75rem", color: "#0C8A3B" }}
            />
            <p className="mt-3 mb-0 text-muted" style={{ fontFamily: interFamily }}>
              Loading users...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-transition-enter">
      <div
        className="card border-0 shadow-sm w-100"
        style={{ opacity: showContent ? 1 : 0, transition: "opacity 0.2s ease-out" }}
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
              <i className="fas fa-users" />
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
                User accounts
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
                Search, filter, and manage reporter accounts.
              </p>
            </div>
          </div>
        </div>

        <div className="card-body" style={{ backgroundColor: "#ffffff" }}>
          {error ? (
            <div className="alert alert-danger py-2 mb-3" style={{ fontFamily: interFamily }}>
              {error}
            </div>
          ) : null}

          <div className="row g-3 mb-4">
            <div className="col-12 col-md-6">
              <div
                className="w-100 text-start"
                style={{
                  borderRadius: 10,
                  padding: "0.9rem 1rem",
                  backgroundColor: "#ffffff",
                  boxShadow:
                    "0 1px 3px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(148, 163, 184, 0.18)",
                  fontFamily: interFamily,
                  transition:
                    "background-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#f0f7f3";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#ffffff";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
                onClick={() => setActiveSummaryModal("total")}
              >
                <div className="d-flex align-items-start gap-3">
                  <div
                    className="d-inline-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                    style={{
                      width: 38,
                      height: 38,
                      minWidth: 38,
                      minHeight: 38,
                      backgroundColor: "#0C8A3B",
                      color: "#ffffff",
                      boxShadow: "0 4px 14px rgba(13, 122, 58, 0.22)",
                      fontSize: "0.95rem",
                      marginTop: 2,
                    }}
                    aria-hidden="true"
                  >
                    <i className="fas fa-users" />
                  </div>
                  <div className="flex-grow-1">
                    <div
                      style={{
                        fontSize: "0.75rem",
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        color: "#6b7280",
                        fontWeight: 700,
                        marginBottom: 2,
                      }}
                    >
                      Total User Accounts
                    </div>
                    <div
                      style={{
                        fontSize: "1.4rem",
                        fontWeight: 700,
                        color: "#111827",
                        lineHeight: 1.1,
                      }}
                    >
                      {stats.total}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                      All user records registered in the system.
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-12 col-md-6">
              <div
                className="w-100 text-start"
                style={{
                  borderRadius: 10,
                  padding: "0.9rem 1rem",
                  backgroundColor: "#ffffff",
                  boxShadow:
                    "0 1px 3px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(148, 163, 184, 0.18)",
                  fontFamily: interFamily,
                  transition:
                    "background-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#f0fdfa";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#ffffff";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
                onClick={() => setActiveSummaryModal("active")}
              >
                <div className="d-flex align-items-start gap-3">
                  <div
                    className="d-inline-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                    style={{
                      width: 38,
                      height: 38,
                      minWidth: 38,
                      minHeight: 38,
                      backgroundColor: "#0f766e",
                      color: "#ffffff",
                      boxShadow: "0 4px 14px rgba(15, 118, 110, 0.20)",
                      fontSize: "0.95rem",
                      marginTop: 2,
                    }}
                    aria-hidden="true"
                  >
                    <i className="fas fa-user-check" />
                  </div>
                  <div className="flex-grow-1">
                    <div
                      style={{
                        fontSize: "0.75rem",
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        color: "#6b7280",
                        fontWeight: 700,
                        marginBottom: 2,
                      }}
                    >
                      Active User Accounts
                    </div>
                    <div
                      style={{
                        fontSize: "1.4rem",
                        fontWeight: 700,
                        color: "#0f766e",
                        lineHeight: 1.1,
                      }}
                    >
                      {stats.active}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                      Accounts currently enabled for system access.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <PortalModal
            isOpen={Boolean(activeSummaryModal)}
            onRequestClose={() => setActiveSummaryModal(null)}
            ariaLabelledby="manageusers-summary-title"
            overlayClassName="account-approvals-detail-overlay"
            backdropClassName="account-approvals-detail-backdrop"
            wrapClassName=""
            panelClassName="account-approvals-detail-modal"
            closeOnBackdrop
            closeOnEsc
          >
            <div className="account-approvals-detail-header">
              <div className="account-approvals-detail-header-text">
                <h5
                  id="manageusers-summary-title"
                  className="mb-0 fw-semibold"
                  style={{ fontFamily: interFamily }}
                >
                  {summaryModalType === "total" && "Total User Accounts"}
                  {summaryModalType === "active" && "Active User Accounts"}
                </h5>
                <div className="account-approvals-detail-subtitle">
                  <span className="account-approvals-detail-name">
                    Full count recorded in the system.
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="btn-close-custom"
                aria-label="Close"
                onClick={() => setActiveSummaryModal(null)}
              >
                ×
              </button>
            </div>
            <div
              className="account-approvals-detail-body d-flex flex-column align-items-center justify-content-center"
              style={{
                padding: "1.75rem 1.5rem 1.5rem",
                background: "radial-gradient(circle at top, #f3f4f6 0, #ffffff 45%, #f9fafb 100%)",
              }}
            >
              <div
                style={{
                  fontFamily: interFamily,
                  fontSize: "2.4rem",
                  fontWeight: 800,
                  color: "#111827",
                  lineHeight: 1.1,
                  marginBottom: "0.35rem",
                }}
              >
                {summaryModalType === "total" && stats.total}
                {summaryModalType === "active" && stats.active}
              </div>
              <div
                style={{
                  fontFamily: interFamily,
                  fontSize: "0.95rem",
                  color: "#4b5563",
                  textAlign: "center",
                }}
              >
                {summaryModalType === "total" && "Total user account records in the system."}
                {summaryModalType === "active" && "Accounts currently enabled for system access."}
              </div>
            </div>
            <div className="account-approvals-detail-footer">
              <button
                type="button"
                className="btn btn-light account-approvals-detail-close-btn"
                onClick={() => setActiveSummaryModal(null)}
                style={{ fontFamily: interFamily }}
              >
                Close
              </button>
            </div>
          </PortalModal>

          <PortalModal
            isOpen={Boolean(viewUser)}
            onRequestClose={() => setViewUser(null)}
            ariaLabelledby="manageusers-view-title"
            overlayClassName="account-approvals-detail-overlay"
            backdropClassName="account-approvals-detail-backdrop"
            wrapClassName=""
            panelClassName="account-approvals-detail-modal"
            closeOnBackdrop
            closeOnEsc
          >
            <div className="account-approvals-detail-header">
              <div className="account-approvals-detail-header-text">
                <h5 id="manageusers-view-title" className="mb-0 fw-semibold" style={{ fontFamily: interFamily }}>
                  User Details
                </h5>
                <div className="account-approvals-detail-subtitle">
                  <span className="account-approvals-detail-name">{viewUser?.name || "—"}</span>
                </div>
              </div>
              <button type="button" className="btn-close-custom" aria-label="Close" onClick={() => setViewUser(null)}>
                ×
              </button>
            </div>
            <div className="account-approvals-detail-body" style={{ fontFamily: interFamily }}>
              <div className="mb-2"><strong>User ID:</strong> {viewUser?.id ?? "—"}</div>
              <div className="mb-2"><strong>Email:</strong> {viewUser?.email || "—"}</div>
              <div className="mb-2"><strong>Role:</strong> {viewUser?.role === "admin" ? "Admin" : "Reporter"}</div>
              <div className="mb-0"><strong>Status:</strong> {viewUser?.is_active ? "Active" : "Inactive"}</div>
              {viewUser && !viewUser.is_active ? (
                <div className="mt-3">
                  <div className="mb-1"><strong>Deactivation remarks:</strong></div>
                  <div style={{ color: "#4b5563", whiteSpace: "pre-wrap" }}>
                    {viewUser.deactivation_remarks || "No remarks on file."}
                  </div>
                </div>
              ) : null}
            </div>
            <div className="account-approvals-detail-footer">
              <button type="button" className="btn btn-light account-approvals-detail-close-btn" onClick={() => setViewUser(null)}>
                Close
              </button>
            </div>
          </PortalModal>

          <PortalModal
            isOpen={Boolean(deleteTarget)}
            onRequestClose={() => setDeleteTarget(null)}
            ariaLabelledby="manageusers-delete-title"
            overlayClassName="account-approvals-detail-overlay"
            backdropClassName="account-approvals-detail-backdrop"
            wrapClassName=""
            panelClassName="account-approvals-detail-modal myreports-delete-modal"
            closeOnBackdrop={!deleteLoading}
            closeOnEsc={!deleteLoading}
          >
            <div className="account-approvals-detail-header">
              <div className="account-approvals-detail-header-text">
                <h5 id="manageusers-delete-title" className="mb-0 fw-semibold" style={{ fontFamily: interFamily }}>
                  Delete User Account
                </h5>
                <div className="account-approvals-detail-subtitle">
                  <span className="account-approvals-detail-name">{deleteTarget?.name || "—"}</span>
                </div>
              </div>
            </div>
            <div className="account-approvals-detail-body" style={{ fontFamily: interFamily }}>
              This user account will be permanently removed from the system.
            </div>
            <div className="account-approvals-detail-footer d-flex gap-2 justify-content-end">
              <button
                type="button"
                className="btn btn-light account-approvals-detail-close-btn"
                onClick={() => setDeleteTarget(null)}
                disabled={deleteLoading}
                style={{ fontFamily: interFamily }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => deleteTarget?.id && deleteUser(deleteTarget.id)}
                disabled={deleteLoading}
              >
                {deleteLoading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </PortalModal>

          <PortalModal
            isOpen={Boolean(deactivateTarget)}
            onRequestClose={() => {
              setDeactivateTarget(null);
              setDeactivateRemarks("");
            }}
            ariaLabelledby="manageusers-deactivate-title"
            overlayClassName="account-approvals-detail-overlay"
            backdropClassName="account-approvals-detail-backdrop"
            wrapClassName=""
            panelClassName="account-approvals-detail-modal"
            closeOnBackdrop={!deactivateLoading}
            closeOnEsc={!deactivateLoading}
            durationMs={220}
          >
            <div className="account-approvals-detail-header">
              <div className="account-approvals-detail-header-text">
                <h5
                  id="manageusers-deactivate-title"
                  className="mb-0 fw-semibold"
                  style={{ fontFamily: interFamily }}
                >
                  Deactivate account
                </h5>
                <div className="account-approvals-detail-subtitle">
                  <span className="account-approvals-detail-name">
                    {deactivateTarget?.name || "—"}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="btn-close-custom"
                aria-label="Close"
                onClick={() => {
                  setDeactivateTarget(null);
                  setDeactivateRemarks("");
                }}
              >
                ×
              </button>
            </div>

            <div className="account-approvals-detail-body" style={{ fontFamily: interFamily }}>
              <p className="mb-3" style={{ color: "#475569" }}>
                The user will be logged out immediately and will not be able to sign in until reactivated.
                This action cannot be undone from this screen.
              </p>

              <label
                htmlFor="manageusers_deactivate_remarks"
                className="form-label mb-1"
                style={{
                  fontFamily: interFamily,
                  fontWeight: 600,
                  fontSize: "0.8rem",
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  color: "#4b5563",
                }}
              >
                Remarks (optional)
              </label>

              <textarea
                id="manageusers_deactivate_remarks"
                className="form-control"
                rows={4}
                placeholder="Add remarks for the deactivation request..."
                value={deactivateRemarks}
                onChange={(e) => setDeactivateRemarks(e.target.value)}
                disabled={deactivateLoading}
                style={{
                  fontFamily: interFamily,
                  fontSize: "0.85rem",
                  borderColor: "#d1e2d6",
                  borderRadius: 8,
                  resize: "vertical",
                }}
              />
            </div>

            <div className="account-approvals-detail-footer">
              <div className="d-flex gap-2 justify-content-end">
                <button
                  type="button"
                  className="btn btn-light account-approvals-detail-close-btn"
                  onClick={() => {
                    setDeactivateTarget(null);
                    setDeactivateRemarks("");
                  }}
                  disabled={deactivateLoading}
                  style={{ fontFamily: interFamily }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={deactivateUserSubmit}
                  disabled={deactivateLoading}
                  style={{
                    fontFamily: interFamily,
                    borderRadius: 8,
                    minWidth: 140,
                    fontWeight: 700,
                  }}
                >
                  {deactivateLoading ? "Deactivating…" : "Deactivate"}
                </button>
              </div>
            </div>
          </PortalModal>

          <div
            className="d-flex flex-column flex-lg-row align-items-stretch align-items-lg-end gap-3 mb-3"
            style={{
              padding: "0.75rem 0.75rem 0.75rem 0.85rem",
              borderRadius: 10,
              background:
                "linear-gradient(90deg, rgba(236, 245, 239, 0.9), rgba(243, 249, 245, 0.9))",
              border: "1px solid #d1e2d6",
            }}
          >
            <div className="flex-grow-1">
              <label
                className="form-label mb-1"
                style={{
                  fontFamily: interFamily,
                  fontWeight: 600,
                  fontSize: "0.8rem",
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  color: "#4b5563",
                }}
              >
                Search
              </label>
              <div style={{ position: "relative" }}>
                <span
                  style={{
                    position: "absolute",
                    left: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#6b7280",
                  }}
                >
                  <i className="fas fa-search" />
                </span>
                <input
                  id="manageusers_query"
                  className="form-control"
                  placeholder="Search by ID, name, email, or role"
                  value={filters.query}
                  onChange={(e) => setFilters((prev) => ({ ...prev, query: e.target.value }))}
                  style={{
                    fontFamily: interFamily,
                    fontSize: "0.85rem",
                    borderColor: "#d1e2d6",
                    borderRadius: 6,
                    paddingLeft: 38,
                    paddingRight: filters.query?.trim() ? 36 : 12,
                    transition: "border-color 0.25s ease, box-shadow 0.25s ease",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#0C8A3B";
                    e.target.style.boxShadow = "0 0 0 0.2rem rgba(12, 138, 59, 0.25)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#d1e2d6";
                    e.target.style.boxShadow = "none";
                  }}
                />
                {filters.query.trim() ? (
                  <button
                    type="button"
                    onClick={() => setFilters((prev) => ({ ...prev, query: "" }))}
                    aria-label="Clear search"
                    style={{
                      position: "absolute",
                      right: 10,
                      top: "50%",
                      transform: "translateY(-50%)",
                      border: "none",
                      background: "transparent",
                      color: "#9ca3af",
                      padding: 0,
                      width: 20,
                      height: 20,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      borderRadius: "999px",
                      transition:
                        "background-color 0.18s ease-out, color 0.18s ease-out, transform 0.12s ease-out",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "#374151";
                      e.currentTarget.style.backgroundColor = "#e5e7eb";
                      e.currentTarget.style.transform = "translateY(-50%) scale(1.02)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "#9ca3af";
                      e.currentTarget.style.backgroundColor = "transparent";
                      e.currentTarget.style.transform = "translateY(-50%) scale(1)";
                    }}
                  >
                    <i className="fas fa-times" aria-hidden="true" style={{ fontSize: "0.7rem" }} />
                  </button>
                ) : null}
              </div>
            </div>

            <div style={{ minWidth: 180 }}>
              <label
                className="form-label mb-1"
                style={{
                  fontFamily: interFamily,
                  fontWeight: 600,
                  fontSize: "0.8rem",
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  color: "#4b5563",
                }}
              >
                Status
              </label>
              <select
                id="manageusers_status"
                className="form-select"
                value={filters.status}
                onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
                style={{
                  fontFamily: interFamily,
                  fontSize: "0.85rem",
                  borderColor: "#d1e2d6",
                  borderRadius: 6,
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#0C8A3B";
                  e.target.style.boxShadow = "0 0 0 0.2rem rgba(12, 138, 59, 0.25)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#d1e2d6";
                  e.target.style.boxShadow = "none";
                }}
              >
                {statusOptions.map((opt) => (
                  <option key={opt.value || "all"} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="d-flex justify-content-start justify-content-lg-end">
              <button
                type="button"
                className="btn btn-light btn-sm d-inline-flex align-items-center gap-1"
                onClick={() => setFilters({ query: "", status: "" })}
                style={{
                  alignSelf: "flex-end",
                  marginTop: "0.45rem",
                  fontFamily: interFamily,
                  fontSize: "0.8rem",
                  borderRadius: 999,
                  borderColor: "#cbd5e1",
                  color: "#166534",
                  backgroundColor: "#ecfdf3",
                  paddingInline: "0.9rem",
                  transition:
                    "background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease, transform 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#bbf7d0";
                  e.currentTarget.style.borderColor = "#22c55e";
                  e.currentTarget.style.color = "#14532d";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#ecfdf3";
                  e.currentTarget.style.borderColor = "#cbd5e1";
                  e.currentTarget.style.color = "#166534";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <i className="fas fa-rotate-left" />
                Reset filters
              </button>
            </div>
          </div>

          {filteredUsers.length === 0 ? (
            <div
              className="text-center py-4 border rounded-3"
              style={{
                borderColor: "#e5e7eb",
                background:
                  "repeating-linear-gradient(-45deg, #f9fafb, #f9fafb 6px, #f3f4f6 6px, #f3f4f6 12px)",
              }}
            >
              <p className="mb-1" style={{ fontFamily: interFamily, fontWeight: 600, color: "#374151" }}>
                No matching users
              </p>
              <p className="mb-0" style={{ fontFamily: interFamily, color: "#6b7280" }}>
                Try different keywords or clear filters.
              </p>
            </div>
          ) : (
            <div className="row g-3">
              {filteredUsers.map((u) => {
                const isActive = Boolean(u.is_active);
                const isSaving = savingId === u.id;
                return (
                  <div key={u.id} className="col-12 col-sm-6 col-lg-3">
                    <div className="manage-users-person-card">
                      <div className="manage-users-card-top-strip">
                        <div className="manage-users-card-top-initials">
                          <span className="manage-users-avatar-initials">{getInitials(u.name)}</span>
                        </div>
                      </div>

                      <div className="manage-users-card-actions">
                        <button
                          type="button"
                          className="manage-users-card-btn manage-users-card-btn-view"
                          onClick={() => setViewUser(u)}
                          aria-label={`View ${u.name}`}
                          title="View"
                        >
                          <i className="fas fa-eye" />
                        </button>
                        <button
                          type="button"
                          className={`manage-users-card-btn ${
                            isActive ? "manage-users-card-btn-deactivate" : "manage-users-card-btn-activate"
                          }`}
                          disabled={isSaving || (deactivateLoading && deactivateTarget?.id === u.id)}
                          onClick={() => {
                            if (isActive) {
                              setDeactivateTarget(u);
                              setDeactivateRemarks("");
                            } else {
                              updateUser(u.id, { is_active: true });
                            }
                          }}
                          aria-label={isActive ? `Deactivate ${u.name}` : `Activate ${u.name}`}
                          title={isActive ? "Deactivate" : "Activate"}
                        >
                          <i
                            className={`fas ${
                              isSaving || (deactivateLoading && deactivateTarget?.id === u.id)
                                ? "fa-spinner fa-spin"
                                : isActive
                                  ? "fa-user-slash"
                                  : "fa-user-check"
                            }`}
                          />
                        </button>
                        <button
                          type="button"
                          className="manage-users-card-btn manage-users-card-btn-delete"
                          onClick={() => setDeleteTarget(u)}
                          aria-label={`Delete ${u.name}`}
                          title="Delete"
                        >
                          <i className="fas fa-trash-alt" />
                        </button>
                      </div>

                      <div className="manage-users-card-body" style={{ fontFamily: interFamily }}>
                        <div className="manage-users-card-name">{u.name}</div>
                        <div className="manage-users-card-email">{u.email}</div>
                        <div className="manage-users-card-divider" />
                        <div className="manage-users-card-row">
                          <span className="manage-users-card-label">User ID</span>
                          <span className="manage-users-card-value">#{u.id}</span>
                        </div>
                        <div className="manage-users-card-row">
                          <span className="manage-users-card-label">Role</span>
                          <span className="manage-users-card-value">
                            {u.role === "admin" ? "Admin" : "Reporter"}
                          </span>
                        </div>
                        <div className="manage-users-card-row">
                          <span className="manage-users-card-label">Status</span>
                          <span className="manage-users-card-value">
                            {isActive ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

