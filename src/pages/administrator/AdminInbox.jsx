import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PortalModal from "../../components/PortalModal";
import { api } from "../../lib/api";

const interFamily =
  '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';

export default function AdminInbox() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showContent, setShowContent] = useState(false);
  const [activeSummaryModal, setActiveSummaryModal] = useState(null);
  const [summaryModalType, setSummaryModalType] = useState(null);
  const [filters, setFilters] = useState({
    query: "",
    status: "",
    severity: "",
  });
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  async function loadInbox() {
    setLoading(true);
    try {
      const res = await api.get("/hazards");
      setData(res.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInbox();
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

  const rows = useMemo(() => data?.data ?? [], [data]);

  const totalReports = rows.length;
  const resolvedCount = rows.filter((r) => {
    const key = String(r.current_status?.key ?? r.currentStatus?.key ?? "").toLowerCase();
    const label = String(r.current_status?.label ?? r.currentStatus?.label ?? "").toLowerCase();
    if (key) return key === "resolved";
    return label === "resolved";
  }).length;
  const pendingCount = rows.filter((r) => {
    const status = String(r.current_status?.label ?? r.currentStatus?.label ?? "").toLowerCase();
    if (!status) return true;
    return !status.includes("resolved") && !status.includes("closed");
  }).length;

  const filteredRows = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    return rows.filter((r) => {
      if (filters.status) {
        const status = String(
          r.current_status?.key ??
            r.currentStatus?.key ??
            r.current_status?.label ??
            r.currentStatus?.label ??
            ""
        )
          .trim()
          .toLowerCase();
        const normalized = status === "new" ? "pending" : status;
        if (normalized !== filters.status) return false;
      }
      if (filters.severity) {
        if (String(r.severity || "").toLowerCase() !== String(filters.severity).toLowerCase()) {
          return false;
        }
      }
      if (q) {
        const haystack = [
          r.id,
          r.reporter?.name,
          r.reporter?.email,
          r.category?.name,
          r.location?.name,
          r.description,
          r.current_status?.label,
          r.currentStatus?.label,
        ]
          .filter(Boolean)
          .map((v) => String(v).toLowerCase())
          .join(" ");
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [rows, filters]);

  useEffect(() => {
    setPage(1);
  }, [filters.query, filters.status, filters.severity, perPage]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / perPage));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * perPage;
  const pageItems = filteredRows.slice(pageStart, pageStart + perPage);

  const paginationPages = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const list = [1];
    if (safePage > 3) list.push("ellipsis-left");
    const low = Math.max(2, safePage - 1);
    const high = Math.min(totalPages - 1, safePage + 1);
    for (let p = low; p <= high; p++) list.push(p);
    if (safePage < totalPages - 2) list.push("ellipsis-right");
    list.push(totalPages);
    return list;
  }, [safePage, totalPages]);

  const confirmDelete = (r) => {
    setDeleteError("");
    setDeleteConfirm({ id: r.id, label: `#${r.id}` });
  };

  const closeDeleteConfirm = () => {
    if (deleteLoading) return;
    setDeleteConfirm(null);
    setDeleteError("");
  };

  const performDelete = async () => {
    if (!deleteConfirm?.id) return;
    setDeleteLoading(true);
    setDeleteError("");
    try {
      await api.delete(`/hazards/${deleteConfirm.id}`);
      closeDeleteConfirm();
      await loadInbox();
    } catch (err) {
      setDeleteError(err?.response?.data?.message || err?.message || "Failed to delete report.");
    } finally {
      setDeleteLoading(false);
    }
  };

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
                <i className="fas fa-inbox" />
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
                  Report inbox
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
                  Loading reports…
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
              <p className="mt-3 mb-0 text-muted" style={{ fontFamily: interFamily, fontSize: "0.9rem" }}>
                Loading reports…
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
              <i className="fas fa-inbox" />
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
                Report inbox
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
                All submitted hazard reports. Use filters to find a report.
              </p>
            </div>

            <div className="d-flex flex-wrap gap-2 mt-2 mt-md-0">
              <button
                type="button"
                className="btn btn-light btn-sm d-inline-flex align-items-center justify-content-center"
                onClick={loadInbox}
                style={{
                  fontFamily: interFamily,
                  fontSize: "0.8rem",
                  padding: "0.4rem 1.1rem",
                  borderRadius: 8,
                  borderColor: "#d1e2d6",
                  color: "#166534",
                  backgroundColor: "#ffffff",
                  transition:
                    "background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease, transform 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#ecfdf3";
                  e.currentTarget.style.borderColor = "#86efac";
                  e.currentTarget.style.color = "#14532d";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#ffffff";
                  e.currentTarget.style.borderColor = "#d1e2d6";
                  e.currentTarget.style.color = "#166534";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <i className="fas fa-arrows-rotate me-2" aria-hidden="true" />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>

        <div className="card-body" style={{ backgroundColor: "#ffffff" }}>
          <div className="row g-3 mb-4">
            <div className="col-12 col-md-4">
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
                  >
                    <i className="fas fa-file-alt" />
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
                      Total Hazard Reports
                    </div>
                    <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "#111827", lineHeight: 1.1 }}>
                      {totalReports}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>All reported hazards in the inbox.</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-12 col-md-4">
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
                  e.currentTarget.style.backgroundColor = "#fff5f5";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#ffffff";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
                onClick={() => setActiveSummaryModal("resolved")}
              >
                <div className="d-flex align-items-start gap-3">
                  <div
                    className="d-inline-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                    style={{
                      width: 38,
                      height: 38,
                      minWidth: 38,
                      minHeight: 38,
                      backgroundColor: "#15803d",
                      color: "#ffffff",
                      boxShadow: "0 4px 14px rgba(21, 128, 61, 0.20)",
                      fontSize: "0.95rem",
                      marginTop: 2,
                    }}
                  >
                    <i className="fas fa-check-circle" />
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
                      Resolved Hazard Reports
                    </div>
                    <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "#15803d", lineHeight: 1.1 }}>
                      {resolvedCount}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>Reports marked as resolved/closed.</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-12 col-md-4">
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
                onClick={() => setActiveSummaryModal("pending")}
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
                  >
                    <i className="fas fa-folder-open" />
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
                      Pending Hazard Reports
                    </div>
                    <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "#0f766e", lineHeight: 1.1 }}>
                      {pendingCount}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>Active reports requiring action.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <PortalModal
            isOpen={Boolean(activeSummaryModal)}
            onRequestClose={() => setActiveSummaryModal(null)}
            ariaLabelledby="admin-inbox-summary-title"
            overlayClassName="account-approvals-detail-overlay"
            backdropClassName="account-approvals-detail-backdrop"
            wrapClassName=""
            panelClassName="account-approvals-detail-modal"
            closeOnBackdrop
            closeOnEsc
          >
            <div className="account-approvals-detail-header">
              <div className="account-approvals-detail-header-text">
                <h5 id="admin-inbox-summary-title" className="mb-0 fw-semibold" style={{ fontFamily: interFamily }}>
                  {summaryModalType === "total" && "Total Hazard Reports"}
                  {summaryModalType === "pending" && "Pending Hazard Reports"}
                  {summaryModalType === "resolved" && "Resolved Hazard Reports"}
                </h5>
                <div className="account-approvals-detail-subtitle">
                  <span className="account-approvals-detail-name">Full count recorded in the system.</span>
                </div>
              </div>
              <button type="button" className="btn-close-custom" aria-label="Close" onClick={() => setActiveSummaryModal(null)}>
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
              <div style={{ fontFamily: interFamily, fontSize: "2.4rem", fontWeight: 800, color: "#111827", lineHeight: 1.1, marginBottom: "0.35rem" }}>
                {summaryModalType === "total" && totalReports}
                {summaryModalType === "pending" && pendingCount}
                {summaryModalType === "resolved" && resolvedCount}
              </div>
              <div style={{ fontFamily: interFamily, fontSize: "0.95rem", color: "#4b5563", textAlign: "center" }}>
                {summaryModalType === "total" && "All hazard reports currently listed in the admin inbox."}
                {summaryModalType === "pending" && "Hazard reports awaiting closure or resolution."}
                {summaryModalType === "resolved" && "Hazard reports that have already been resolved."}
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

          <div
            className="d-flex flex-column flex-lg-row align-items-stretch align-items-lg-end gap-3 mb-3"
            style={{
              padding: "0.75rem 0.75rem 0.75rem 0.85rem",
              borderRadius: 10,
              background: "linear-gradient(90deg, rgba(236, 245, 239, 0.9), rgba(243, 249, 245, 0.9))",
              border: "1px solid #d1e2d6",
            }}
          >
            <div className="flex-grow-1">
              <label htmlFor="admin_inbox_query" className="form-label mb-1" style={{ fontFamily: interFamily, fontWeight: 600, fontSize: "0.8rem", letterSpacing: "0.04em", textTransform: "uppercase", color: "#4b5563" }}>
                Search
              </label>
              <div style={{ position: "relative" }}>
                <span
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    left: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#6b7280",
                    pointerEvents: "none",
                    fontSize: "0.9rem",
                  }}
                >
                  <i className="fas fa-search" />
                </span>
        <input
                  id="admin_inbox_query"
                  type="text"
                  className="form-control"
                  placeholder="Search by ID, reporter, category, location, or description"
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
                {filters.query?.trim() ? (
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
              <label htmlFor="admin_inbox_status" className="form-label mb-1" style={{ fontFamily: interFamily, fontWeight: 600, fontSize: "0.8rem", letterSpacing: "0.04em", textTransform: "uppercase", color: "#4b5563" }}>
                Status
              </label>
              <select
                id="admin_inbox_status"
                className="form-select"
                value={filters.status}
                onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
                style={{ fontFamily: interFamily, fontSize: "0.85rem", borderColor: "#d1e2d6", borderRadius: 6 }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#0C8A3B";
                  e.target.style.boxShadow = "0 0 0 0.2rem rgba(12, 138, 59, 0.25)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#d1e2d6";
                  e.target.style.boxShadow = "none";
                }}
              >
                <option value="">All statuses</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In progress</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
            <div style={{ minWidth: 180 }}>
              <label htmlFor="admin_inbox_severity" className="form-label mb-1" style={{ fontFamily: interFamily, fontWeight: 600, fontSize: "0.8rem", letterSpacing: "0.04em", textTransform: "uppercase", color: "#4b5563" }}>
                Severity
              </label>
              <select
                id="admin_inbox_severity"
                className="form-select"
                value={filters.severity}
                onChange={(e) => setFilters((prev) => ({ ...prev, severity: e.target.value }))}
                style={{ fontFamily: interFamily, fontSize: "0.85rem", borderColor: "#d1e2d6", borderRadius: 6 }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#0C8A3B";
                  e.target.style.boxShadow = "0 0 0 0.2rem rgba(12, 138, 59, 0.25)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#d1e2d6";
                  e.target.style.boxShadow = "none";
                }}
              >
                <option value="">All severities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div className="d-flex justify-content-start justify-content-lg-end">
              <button
                type="button"
                className="btn btn-light btn-sm d-inline-flex align-items-center gap-1"
                onClick={() =>
                  setFilters({
                    query: "",
                    status: "",
                    severity: "",
                  })
                }
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
                <i className="fas fa-rotate-left" aria-hidden="true" />
                Reset filters
        </button>
            </div>
      </div>

          {filteredRows.length === 0 ? (
            <div
              className="text-center py-4 border rounded-3"
              style={{
                borderColor: "#e5e7eb",
                background:
                  "repeating-linear-gradient(-45deg, #f9fafb, #f9fafb 6px, #f3f4f6 6px, #f3f4f6 12px)",
              }}
            >
              <p className="mb-1" style={{ fontFamily: interFamily, fontWeight: 600, color: "#374151" }}>
                No matching reports
              </p>
              <p className="mb-0 text-muted" style={{ fontFamily: interFamily, fontSize: "0.9rem" }}>
                No reports match the current search or filters.
              </p>
            </div>
          ) : (
            <>
              <div className="table-responsive myreports-results-responsive">
                <table className="table table-hover align-middle mb-0 myreports-results-table">
          <thead>
                    <tr
                      style={{
                        fontFamily: interFamily,
                        fontSize: "0.8rem",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                        color: "#6b7280",
                        borderBottom: "1px solid #e5e7eb",
                      }}
                    >
                      <th style={{ minWidth: 56 }}>#</th>
                      <th style={{ minWidth: 130 }}>Actions</th>
                      <th style={{ minWidth: 130 }}>Status</th>
                      <th style={{ minWidth: 110 }}>Severity</th>
                      <th style={{ minWidth: 170 }}>Reporter</th>
                      <th style={{ minWidth: 170 }}>Category</th>
                      <th style={{ minWidth: 170 }}>Location</th>
                      <th style={{ minWidth: 210 }}>Created</th>
            </tr>
          </thead>
          <tbody>
                    {pageItems.map((r, index) => {
                      const rowNumber = pageStart + index + 1;
                      const statusKey = String(
                        r.current_status?.key ??
                          r.currentStatus?.key ??
                          r.current_status?.label ??
                          r.currentStatus?.label ??
                          ""
                      )
                        .trim()
                        .toLowerCase();
                      const canMutate = statusKey === "pending" || statusKey === "new";
                      const statusLabel =
                        r.current_status?.label ?? r.currentStatus?.label ?? r.current_status_id ?? "Pending";
                      const created = new Date(r.created_at);
                      const truncateStyle = {
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        maxWidth: "100%",
                        width: "100%",
                        display: "block",
                      };

                      return (
                        <tr key={r.id}>
                          <td style={{ fontFamily: interFamily, fontSize: "0.85rem", fontWeight: 600, color: "#111827" }}>
                            {rowNumber}
                          </td>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              <Link
                                to={`/admin/reports/${r.id}`}
                                style={{
                                  borderRadius: 6,
                                  border: "1px solid #bbf7d0",
                                  backgroundColor: "#ffffff",
                                  color: "#166534",
                                  fontFamily: interFamily,
                                  fontWeight: 600,
                                  fontSize: "0.72rem",
                                  padding: "0.25rem 0.5rem",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 6,
                                  textDecoration: "none",
                                  transition:
                                    "background-color 0.18s ease, border-color 0.18s ease, color 0.18s ease, transform 0.15s ease",
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = "#ecfdf3";
                                  e.currentTarget.style.borderColor = "#86efac";
                                  e.currentTarget.style.color = "#14532d";
                                  e.currentTarget.style.transform = "translateY(-1px)";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = "#ffffff";
                                  e.currentTarget.style.borderColor = "#bbf7d0";
                                  e.currentTarget.style.color = "#166534";
                                  e.currentTarget.style.transform = "translateY(0)";
                                }}
                              >
                                <i className="fas fa-eye" aria-hidden="true" />
                                <span>View</span>
                              </Link>
                              <Link
                                to={canMutate ? `/admin/reports/${r.id}/edit` : "#"}
                                onClick={(e) => {
                                  if (!canMutate) e.preventDefault();
                                }}
                                title={!canMutate ? "Editing is allowed only while the report is pending." : undefined}
                                style={{
                                  borderRadius: 6,
                                  border: !canMutate ? "1px solid #e5e7eb" : "1px solid #a7f3d0",
                                  backgroundColor: "#ffffff",
                                  color: !canMutate ? "#9ca3af" : "#065f46",
                                  fontFamily: interFamily,
                                  fontWeight: 600,
                                  fontSize: "0.72rem",
                                  padding: "0.25rem 0.5rem",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 6,
                                  textDecoration: "none",
                                  transition:
                                    "background-color 0.18s ease, border-color 0.18s ease, color 0.18s ease, transform 0.15s ease",
                                }}
                                onMouseEnter={(e) => {
                                  if (!canMutate) return;
                                  e.currentTarget.style.backgroundColor = "#ecfdf5";
                                  e.currentTarget.style.borderColor = "#6ee7b7";
                                  e.currentTarget.style.color = "#064e3b";
                                  e.currentTarget.style.transform = "translateY(-1px)";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = "#ffffff";
                                  e.currentTarget.style.borderColor = !canMutate ? "#e5e7eb" : "#a7f3d0";
                                  e.currentTarget.style.color = !canMutate ? "#9ca3af" : "#065f46";
                                  e.currentTarget.style.transform = "translateY(0)";
                                }}
                              >
                                <i className="fas fa-pen" aria-hidden="true" />
                                <span>Edit</span>
                              </Link>
                              <button
                                type="button"
                                onClick={() => confirmDelete(r)}
                                disabled={!canMutate}
                                title={!canMutate ? "Deleting is allowed only while the report is pending." : undefined}
                                style={{
                                  borderRadius: 6,
                                  border: !canMutate ? "1px solid #e5e7eb" : "1px solid #fecaca",
                                  backgroundColor: "#ffffff",
                                  color: !canMutate ? "#9ca3af" : "#b91c1c",
                                  fontFamily: interFamily,
                                  fontWeight: 700,
                                  fontSize: "0.72rem",
                                  padding: "0.25rem 0.5rem",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 6,
                                  transition:
                                    "background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, transform 0.15s ease",
                                }}
                                onMouseEnter={(e) => {
                                  if (!canMutate) return;
                                  e.currentTarget.style.backgroundColor = "#fee2e2";
                                  e.currentTarget.style.borderColor = "#fca5a5";
                                  e.currentTarget.style.color = "#7f1d1d";
                                  e.currentTarget.style.transform = "translateY(-1px)";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = "#ffffff";
                                  e.currentTarget.style.borderColor = !canMutate ? "#e5e7eb" : "#fecaca";
                                  e.currentTarget.style.color = !canMutate ? "#9ca3af" : "#b91c1c";
                                  e.currentTarget.style.transform = "translateY(0)";
                                }}
                              >
                                <i className="fas fa-trash" aria-hidden="true" />
                                <span>Delete</span>
                              </button>
                            </div>
                          </td>
                          <td style={{ fontFamily: interFamily, fontSize: "0.85rem" }}>
                            <span style={truncateStyle} title={String(statusLabel)}>
                              {statusLabel}
                            </span>
                          </td>
                          <td style={{ fontFamily: interFamily, fontSize: "0.85rem", textTransform: "capitalize" }}>
                            {String(r.severity || "—").toLowerCase()}
                          </td>
                          <td style={{ fontFamily: interFamily, fontSize: "0.85rem" }}>
                            <span style={truncateStyle} title={r.reporter?.name ?? r.reporter?.email ?? ""}>
                              {r.reporter?.name ?? r.reporter?.email ?? "—"}
                            </span>
                          </td>
                          <td style={{ fontFamily: interFamily, fontSize: "0.85rem" }}>
                            <span style={truncateStyle} title={r.category?.name ?? ""}>
                              {r.category?.name ?? "—"}
                            </span>
                          </td>
                          <td style={{ fontFamily: interFamily, fontSize: "0.85rem" }}>
                            <span style={truncateStyle} title={r.location?.name ?? ""}>
                              {r.location?.name ?? "—"}
                            </span>
                          </td>
                          <td style={{ fontFamily: interFamily, fontSize: "0.85rem" }}>
                            <span style={truncateStyle} title={Number.isNaN(created.getTime()) ? "" : created.toLocaleString()}>
                              {Number.isNaN(created.getTime()) ? "—" : created.toLocaleString()}
                            </span>
                </td>
              </tr>
                      );
                    })}
          </tbody>
        </table>
              </div>

              <div
                className="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-3 mt-3"
                style={{
                  fontFamily: interFamily,
                  backgroundColor: "#ffffff",
                  border: "1px solid #e5e7eb",
                  borderRadius: 10,
                  padding: "0.75rem 0.85rem",
                }}
              >
                <div style={{ fontSize: "0.85rem", color: "#4b5563" }}>
                  Showing {pageStart + 1}-{Math.min(pageStart + pageItems.length, filteredRows.length)} of{" "}
                  {filteredRows.length}
                </div>

                <div className="d-flex flex-wrap align-items-center gap-2">
                  <div className="d-flex align-items-center gap-2">
                    <span style={{ fontSize: "0.85rem", color: "#4b5563" }}>Per page</span>
                    <select
                      value={perPage}
                      onChange={(e) => setPerPage(Number(e.target.value))}
                      className="form-select form-select-sm"
                      style={{ width: 92, borderRadius: 8, borderColor: "#d1e2d6", fontFamily: interFamily, fontSize: "0.85rem" }}
                    >
                      {[10, 15, 25, 50].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="btn-group" role="group" aria-label="Pagination">
                    <button
                      type="button"
                      className="btn btn-sm btn-light"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={safePage <= 1}
                      style={{ borderColor: "#d1d5db" }}
                    >
                      Prev
                    </button>
                    {paginationPages.map((p, idx) =>
                      typeof p === "string" ? (
                        <span key={`${p}-${idx}`} className="btn btn-sm btn-light disabled" style={{ borderColor: "#d1d5db" }}>
                          ...
                        </span>
                      ) : (
                        <button
                          key={p}
                          type="button"
                          className="btn btn-sm"
                          onClick={() => setPage(p)}
                          style={{
                            borderColor: "#d1d5db",
                            backgroundColor: p === safePage ? "#0C8A3B" : "#ffffff",
                            color: p === safePage ? "#ffffff" : "#374151",
                          }}
                        >
                          {p}
                        </button>
                      )
                    )}
                    <button
                      type="button"
                      className="btn btn-sm btn-light"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={safePage >= totalPages}
                      style={{ borderColor: "#d1d5db" }}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          <PortalModal
            isOpen={Boolean(deleteConfirm)}
            onRequestClose={closeDeleteConfirm}
            ariaLabelledby="admininbox-delete-title"
            overlayClassName="account-approvals-detail-overlay"
            backdropClassName="account-approvals-detail-backdrop"
            panelClassName="account-approvals-detail-modal myreports-delete-modal"
            durationMs={220}
            closeOnBackdrop
            closeOnEsc
          >
            <div className="account-approvals-detail-header">
              <div className="account-approvals-detail-header-text">
                <h5 id="admininbox-delete-title" className="mb-0 fw-semibold" style={{ fontFamily: interFamily }}>
                  Delete report?
                </h5>
                <div className="account-approvals-detail-subtitle">
                  <span className="account-approvals-detail-name">
                    This action permanently removes report {deleteConfirm?.label || ""}.
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="btn-close-custom"
                aria-label="Close"
                onClick={closeDeleteConfirm}
              >
                ×
              </button>
            </div>
            <div className="account-approvals-detail-body" style={{ fontFamily: interFamily }}>
              {deleteError ? (
                <div className="alert alert-danger py-2 mb-3" role="alert">
                  {deleteError}
                </div>
              ) : (
                <p className="mb-0" style={{ color: "#475569" }}>
                  This will permanently remove the report, its timeline entries, and any uploaded attachments.
                  Reports under review cannot be deleted.
                </p>
              )}
            </div>
            <div className="account-approvals-detail-footer">
              <button
                type="button"
                className="btn btn-light account-approvals-detail-close-btn"
                onClick={closeDeleteConfirm}
                disabled={deleteLoading}
                style={{ fontFamily: interFamily }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={performDelete}
                disabled={deleteLoading}
                style={{
                  fontFamily: interFamily,
                  borderRadius: 8,
                  minWidth: 120,
                  fontWeight: 700,
                }}
              >
                {deleteLoading ? "Deleting…" : "Delete"}
              </button>
            </div>
          </PortalModal>
        </div>
      </div>
    </div>
  );
}

