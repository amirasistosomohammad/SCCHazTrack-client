import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import PortalModal from "../../components/PortalModal";

const interFamily =
  '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';

export default function MyReports() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showContent, setShowContent] = useState(false);
  const [activeSummaryModal, setActiveSummaryModal] = useState(null);
  const [summaryModalType, setSummaryModalType] = useState(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const [activeViewReportId, setActiveViewReportId] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewReport, setViewReport] = useState(null);
  const [viewReportSnapshot, setViewReportSnapshot] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState("");
  const [imagePreview, setImagePreview] = useState(null); // { name: string, url: string }
  const [attachmentObjectUrls, setAttachmentObjectUrls] = useState({}); // { [key: string]: string }
  const [attachmentObjectUrlErrors, setAttachmentObjectUrlErrors] = useState({}); // { [key: string]: string }

  const [filters, setFilters] = useState({
    query: "",
    status: "",
    severity: "",
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await api.get("/hazards/my");
        if (!cancelled) {
          setData(res.data);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!loading) {
      const id = requestAnimationFrame(() => setShowContent(true));
      return () => cancelAnimationFrame(id);
    }
    setShowContent(false);
  }, [loading]);

  const rows = useMemo(() => data?.data ?? [], [data]);

  const totalReports = rows.length;
  const highSeverityCount = rows.filter(
    (r) => String(r.severity || "").toLowerCase() === "high"
  ).length;
  const openCount = rows.filter((r) => {
    const label =
      r.current_status?.label ??
      r.currentStatus?.label ??
      String(r.current_status_id || "");
    const value = String(label || "").toLowerCase();
    if (!value) return false;
    if (value.includes("closed") || value.includes("resolved")) return false;
    return true;
  }).length;

  const filteredRows = useMemo(() => {
    if (!rows.length) return [];
    const q = filters.query.trim().toLowerCase();
    return rows.filter((r) => {
      if (filters.status) {
        const statusKeyRaw =
          r.currentStatus?.key ??
          r.current_status?.key ??
          r.current_status?.label ??
          r.currentStatus?.label ??
          "";
        const statusKey = String(statusKeyRaw || "").trim().toLowerCase();
        const normalizedKey = statusKey === "new" ? "open" : statusKey;
        if (normalizedKey !== filters.status) return false;
      }
      if (filters.severity) {
        if (
          String(r.severity || "").toLowerCase() !==
          String(filters.severity || "").toLowerCase()
        ) {
          return false;
        }
      }
      if (q) {
        const haystack = [
          r.id,
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

  // Reset pagination when filters/per-page change
  useEffect(() => {
    setPage(1);
  }, [filters.query, filters.severity, filters.status, perPage]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / perPage));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * perPage;
  const pageItems = filteredRows.slice(pageStart, pageStart + perPage);

  const paginationPages = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const list = [1];
    if (safePage > 3) list.push("ellipsis");
    const low = Math.max(2, safePage - 1);
    const high = Math.min(totalPages - 1, safePage + 1);
    for (let p = low; p <= high; p++) if (!list.includes(p)) list.push(p);
    if (safePage < totalPages - 2) list.push("ellipsis");
    if (totalPages > 1) list.push(totalPages);
    return list;
  }, [safePage, totalPages]);

  // Preserve the last selected modal content during exit animation,
  // matching the behavior of fixed-content modals like Sign out.
  useEffect(() => {
    if (activeSummaryModal) {
      setSummaryModalType(activeSummaryModal);
      return;
    }
    if (!summaryModalType) return;
    const t = setTimeout(() => setSummaryModalType(null), 220);
    return () => clearTimeout(t);
  }, [activeSummaryModal, summaryModalType]);

  const formatDateTime = (value) => {
    if (!value) return "—";
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString();
  };

  const getBackendBase = () => {
    const baseURL = api?.defaults?.baseURL ? String(api.defaults.baseURL) : "";
    if (!baseURL) return "";
    try {
      const u = new URL(baseURL);
      const path = u.pathname.replace(/\/+$/, "");
      const withoutApi = path.endsWith("/api") ? path.slice(0, -4) : path;
      return `${u.origin}${withoutApi}`;
    } catch {
      return "";
    }
  };

  const buildAttachmentCandidates = (raw) => {
    const v = raw ? String(raw).trim() : "";
    if (!v) return [];
    if (/^https?:\/\//i.test(v) || v.startsWith("/")) return [v];
    // filename or relative path; try common Laravel public storage routes
    return [
      v,
      `/storage/${v}`,
      `/storage/attachments/${v}`,
      `/uploads/${v}`,
    ];
  };

  const normalizeAttachmentUrl = (value) => {
    const raw = value ? String(value).trim() : "";
    if (!raw) return "";
    if (/^https?:\/\//i.test(raw)) return raw;
    const backendBase = getBackendBase();
    if (!backendBase) return raw.startsWith("/") ? raw : `/${raw}`;
    if (raw.startsWith("/")) return `${backendBase}${raw}`;
    return `${backendBase}/${raw}`;
  };

  const getAttachmentKey = (a, fallbackIndex) =>
    String(a?.id ?? a?.original_name ?? a?.originalName ?? a?.name ?? fallbackIndex ?? "");

  const fetchAttachmentObjectUrl = async (attachment, fallbackIndex = 0) => {
    const key = getAttachmentKey(attachment, fallbackIndex);
    if (!key) return "";
    if (attachmentObjectUrls[key]) return attachmentObjectUrls[key];

    const raw =
      attachment?.url ??
      attachment?.public_url ??
      attachment?.publicUrl ??
      attachment?.path ??
      attachment?.file_url ??
      attachment?.fileUrl ??
      attachment?.original_name ??
      attachment?.originalName ??
      attachment?.name ??
      "";

    const candidates = buildAttachmentCandidates(raw).map(normalizeAttachmentUrl);
    if (!candidates.length) return "";

    // Try candidates until one works (auth-aware via Axios instance).
    let lastError = "";
    for (const candidate of candidates) {
      try {
        const res = await api.get(candidate, { responseType: "blob" });
        const blob = res?.data;
        if (!blob || !(blob instanceof Blob) || blob.size === 0) {
          lastError = "Empty image";
          continue;
        }
        const objectUrl = URL.createObjectURL(blob);
        setAttachmentObjectUrls((prev) => ({ ...prev, [key]: objectUrl }));
        setAttachmentObjectUrlErrors((prev) => {
          if (!prev[key]) return prev;
          const next = { ...prev };
          delete next[key];
          return next;
        });
        return objectUrl;
      } catch (err) {
        lastError =
          err?.response?.data?.message ||
          err?.message ||
          `Failed to load ${candidate}`;
      }
    }

    setAttachmentObjectUrlErrors((prev) => ({ ...prev, [key]: lastError || "Failed to load image" }));
    return "";
  };

  const openViewModal = (id) => {
    setViewError("");
    setActiveViewReportId(id);
    setIsViewModalOpen(true);
  };

  const closeViewModal = () => {
    setIsViewModalOpen(false);
    setImagePreview(null);
  };

  useEffect(() => {
    if (!isViewModalOpen || !activeViewReportId) return;
    let cancelled = false;
    (async () => {
      setViewLoading(true);
      setViewError("");
      try {
        const res = await api.get(`/hazards/${activeViewReportId}`);
        if (cancelled) return;
        const payload = res.data?.data ?? null;
        setViewReport(payload);
        setViewReportSnapshot(payload);
      } catch (err) {
        if (cancelled) return;
        setViewError(
          err?.response?.data?.message ||
            err?.message ||
            "Unable to load report details."
        );
        setViewReport(null);
      } finally {
        if (!cancelled) setViewLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeViewReportId, isViewModalOpen]);

  useEffect(() => {
    if (isViewModalOpen) return;
    if (!viewReportSnapshot) return;
    const t = setTimeout(() => {
      setActiveViewReportId(null);
      setViewReport(null);
      setViewError("");
    }, 220);
    return () => clearTimeout(t);
  }, [isViewModalOpen, viewReportSnapshot]);

  // Revoke blob URLs when modal closes / report changes.
  useEffect(() => {
    if (isViewModalOpen) return;
    const existing = attachmentObjectUrls;
    const ids = Object.keys(existing || {});
    if (!ids.length) return;
    const t = setTimeout(() => {
      ids.forEach((k) => {
        const u = existing[k];
        if (u) URL.revokeObjectURL(u);
      });
      setAttachmentObjectUrls({});
      setAttachmentObjectUrlErrors({});
    }, 260);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isViewModalOpen]);

  useEffect(() => {
    // If a new report opens, clear old blob URLs.
    const ids = Object.keys(attachmentObjectUrls || {});
    if (!ids.length) return;
    ids.forEach((k) => {
      const u = attachmentObjectUrls[k];
      if (u) URL.revokeObjectURL(u);
    });
    setAttachmentObjectUrls({});
    setAttachmentObjectUrlErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeViewReportId]);

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
                <i className="fas fa-list-alt" />
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
                  My reports
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
                  Hazard reports you submitted. Use the table below to review statuses and open
                  details.
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
                Loading your reports… Please wait.
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
              <i className="fas fa-list-alt" />
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
                My reports
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
                Hazard reports you submitted. Use Actions to open the full record.
              </p>
            </div>

            <div className="d-flex flex-wrap gap-2 mt-2 mt-md-0">
              <Link
                to="/reporter/submit"
                className="btn btn-success btn-sm d-inline-flex align-items-center justify-content-center"
                style={{
                  fontFamily: interFamily,
                  fontSize: "0.8rem",
                  padding: "0.4rem 1.1rem",
                  borderRadius: 8,
                  backgroundColor: "#0C8A3B",
                  borderColor: "#0C8A3B",
                  transition:
                    "background-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease",
                  boxShadow: "0 4px 10px rgba(12, 138, 59, 0.14)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#0a6f31";
                  e.currentTarget.style.borderColor = "#0a6f31";
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow =
                    "0 7px 16px rgba(12, 138, 59, 0.2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#0C8A3B";
                  e.currentTarget.style.borderColor = "#0C8A3B";
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow =
                    "0 4px 10px rgba(12, 138, 59, 0.14)";
                }}
              >
                <i className="fas fa-plus-circle me-2" aria-hidden="true" />
                <span>Submit hazard</span>
              </Link>
            </div>
          </div>
        </div>

        <div className="card-body" style={{ backgroundColor: "#ffffff" }}>
          {/* Summary cards row */}
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
                      Total reports
                    </div>
                    <div
                      style={{
                        fontSize: "1.4rem",
                        fontWeight: 700,
                        color: "#111827",
                        lineHeight: 1.1,
                      }}
                    >
                      {totalReports}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                      Hazard records you have submitted.
                    </div>
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
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#fff5f5";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#ffffff";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
                onClick={() => setActiveSummaryModal("high")}
              >
                <div className="d-flex align-items-start gap-3">
                  <div
                    className="d-inline-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                    style={{
                      width: 38,
                      height: 38,
                      minWidth: 38,
                      minHeight: 38,
                      backgroundColor: "#b91c1c",
                      color: "#ffffff",
                      boxShadow: "0 4px 14px rgba(185, 28, 28, 0.20)",
                      fontSize: "0.95rem",
                      marginTop: 2,
                    }}
                    aria-hidden="true"
                  >
                    <i className="fas fa-exclamation-triangle" />
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
                      High severity
                    </div>
                    <div
                      style={{
                        fontSize: "1.4rem",
                        fontWeight: 700,
                        color: "#b91c1c",
                        lineHeight: 1.1,
                      }}
                    >
                      {highSeverityCount}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                      Reports marked as high severity.
                    </div>
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
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#f0fdfa";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#ffffff";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
                onClick={() => setActiveSummaryModal("open")}
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
                      Open items
                    </div>
                    <div
                      style={{
                        fontSize: "1.4rem",
                        fontWeight: 700,
                        color: "#0f766e",
                        lineHeight: 1.1,
                      }}
                    >
                      {openCount}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                      Reports not yet closed or resolved.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Summary count modal (keep component mounted like LogoutConfirmModal) */}
          <PortalModal
            isOpen={Boolean(activeSummaryModal)}
            onRequestClose={() => setActiveSummaryModal(null)}
            ariaLabelledby="myreports-summary-title"
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
                  id="myreports-summary-title"
                  className="mb-0 fw-semibold"
                  style={{ fontFamily: interFamily }}
                >
                  {summaryModalType === "total" && "Total hazard reports"}
                  {summaryModalType === "high" && "High severity reports"}
                  {summaryModalType === "open" && "Open hazard reports"}
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
                background:
                  "radial-gradient(circle at top, #f3f4f6 0, #ffffff 45%, #f9fafb 100%)",
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
                {summaryModalType === "total" && totalReports}
                {summaryModalType === "high" && highSeverityCount}
                {summaryModalType === "open" && openCount}
              </div>
              <div
                style={{
                  fontFamily: interFamily,
                  fontSize: "0.95rem",
                  color: "#4b5563",
                  textAlign: "center",
                }}
              >
                {summaryModalType === "total" && "Total hazard reports you have submitted."}
                {summaryModalType === "high" && "Reports currently marked with high severity."}
                {summaryModalType === "open" &&
                  "Reports that are not yet marked as closed or resolved."}
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

          {/* Filter/search toolbar */}
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
                htmlFor="myreports_query"
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
                  id="myreports_query"
                  type="text"
                  className="form-control"
                  placeholder="Search by ID, category, location, or description"
                  value={filters.query}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, query: e.target.value }))
                  }
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
              <label
                htmlFor="myreports_status"
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
                id="myreports_status"
                className="form-select"
                value={filters.status}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, status: e.target.value }))
                }
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
                <option value="">All statuses</option>
                <option value="open">Open</option>
                <option value="in_progress">In progress</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>

            <div style={{ minWidth: 180 }}>
              <label
                htmlFor="myreports_severity"
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
                Severity
              </label>
              <select
                id="myreports_severity"
                className="form-select"
                value={filters.severity}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, severity: e.target.value }))
                }
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

          {/* Results table */}
          {filteredRows.length === 0 ? (
            <div
              className="text-center py-4 border rounded-3"
              style={{
                borderColor: "#e5e7eb",
                background:
                  "repeating-linear-gradient(-45deg, #f9fafb, #f9fafb 6px, #f3f4f6 6px, #f3f4f6 12px)",
              }}
            >
              <p
                className="mb-1"
                style={{
                  fontFamily: interFamily,
                  fontWeight: 600,
                  color: "#374151",
                }}
              >
                No matching reports
              </p>
              <p
                className="mb-0 text-muted"
                style={{ fontFamily: interFamily, fontSize: "0.9rem" }}
              >
                No reports match the current search or filters.
              </p>
            </div>
          ) : (
            <>
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
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
                      <th style={{ width: "5%" }}>#</th>
                      <th style={{ width: "16%" }}>Actions</th>
                      <th style={{ width: "19%" }}>Category</th>
                      <th style={{ width: "19%" }}>Location</th>
                      <th style={{ width: "12%" }}>Severity</th>
                      <th style={{ width: "15%" }}>Status</th>
                      <th style={{ width: "14%" }}>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map((r, index) => {
                      const statusKey =
                        String(
                          r.currentStatus?.key ??
                            r.current_status?.key ??
                            r.currentStatus?.label ??
                            r.current_status?.label ??
                            ""
                        )
                          .trim()
                          .toLowerCase() || "open";

                      const statusLabelRaw =
                        r.currentStatus?.label ??
                        r.current_status?.label ??
                        r.current_status_id ??
                        null;
                      const statusLabel =
                        statusKey === "new" || !statusLabelRaw ? "Open" : String(statusLabelRaw);
                      const created =
                        r.created_at instanceof Date ? r.created_at : new Date(r.created_at);
                      const rowNumber = pageStart + index + 1;
                      const truncateStyle = {
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        maxWidth: "100%",
                        display: "block",
                      };

                      return (
                        <tr key={r.id}>
                          <td
                            style={{
                              fontFamily: interFamily,
                              fontSize: "0.85rem",
                              fontWeight: 600,
                              color: "#111827",
                            }}
                          >
                            {rowNumber}
                          </td>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              <button
                                type="button"
                                onClick={() => openViewModal(r.id)}
                                style={{
                                  borderRadius: 6,
                                  border: "1px solid #d1d5db",
                                  backgroundColor: "#ffffff",
                                  color: "#374151",
                                  fontFamily: interFamily,
                                  fontWeight: 600,
                                  fontSize: "0.72rem",
                                  padding: "0.25rem 0.5rem",
                                  minWidth: 0,
                                  flex: "0 0 auto",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 6,
                                  transition:
                                    "background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, transform 0.15s ease",
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = "#f9fafb";
                                  e.currentTarget.style.borderColor = "#cbd5e1";
                                  e.currentTarget.style.color = "#111827";
                                  e.currentTarget.style.transform = "translateY(-1px)";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = "#ffffff";
                                  e.currentTarget.style.borderColor = "#d1d5db";
                                  e.currentTarget.style.color = "#374151";
                                  e.currentTarget.style.transform = "translateY(0)";
                                }}
                                aria-label={`View report ${r.id}`}
                              >
                                <i className="fas fa-eye" aria-hidden="true" />
                                <span>View</span>
                              </button>
                            </div>
                          </td>
                          <td style={{ fontFamily: interFamily, fontSize: "0.85rem" }}>
                            <span style={truncateStyle} title={r.category?.name ?? ""}>
                              {r.category?.name || "—"}
                            </span>
                          </td>
                          <td style={{ fontFamily: interFamily, fontSize: "0.85rem" }}>
                            <span style={truncateStyle} title={r.location?.name ?? ""}>
                              {r.location?.name || "—"}
                            </span>
                          </td>
                          <td
                            style={{
                              fontFamily: interFamily,
                              fontSize: "0.85rem",
                              textTransform: "capitalize",
                            }}
                          >
                            {String(r.severity || "—").toLowerCase()}
                          </td>
                          <td
                            style={{
                              fontFamily: interFamily,
                              fontSize: "0.85rem",
                              color: "#111827",
                            }}
                          >
                            <span style={truncateStyle} title={String(statusLabel ?? "")}>
                              {statusLabel || "—"}
                            </span>
                          </td>
                          <td style={{ fontFamily: interFamily, fontSize: "0.85rem" }}>
                            {Number.isNaN(created.getTime()) ? "—" : created.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {filteredRows.length > 0 && (
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
                  Showing {pageStart + 1}–{Math.min(pageStart + pageItems.length, filteredRows.length)}{" "}
                  of {filteredRows.length}
                </div>

                <div className="d-flex flex-wrap align-items-center gap-2">
                  <div className="d-flex align-items-center gap-2">
                    <span style={{ fontSize: "0.85rem", color: "#4b5563" }}>Per page</span>
                    <select
                      value={perPage}
                      onChange={(e) => setPerPage(Number(e.target.value))}
                      aria-label="Items per page"
                      className="form-select form-select-sm"
                      style={{
                        width: 92,
                        borderRadius: 8,
                        borderColor: "#d1e2d6",
                        fontFamily: interFamily,
                        fontSize: "0.85rem",
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
                      {[10, 15, 25, 50].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="d-flex flex-wrap align-items-center gap-1">
                    <button
                      type="button"
                      className="btn btn-light btn-sm"
                      onClick={() => setPage(1)}
                      disabled={safePage <= 1}
                      aria-label="First page"
                      style={{ borderRadius: 8 }}
                    >
                      «
                    </button>
                    <button
                      type="button"
                      className="btn btn-light btn-sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={safePage <= 1}
                      aria-label="Previous page"
                      style={{ borderRadius: 8 }}
                    >
                      ‹
                    </button>

                    {paginationPages.map((p, i) =>
                      p === "ellipsis" ? (
                        <span key={`e-${i}`} className="px-2" style={{ color: "#9ca3af" }}>
                          …
                        </span>
                      ) : (
                        <button
                          key={p}
                          type="button"
                          className={`btn btn-sm ${safePage === p ? "btn-success" : "btn-light"}`}
                          onClick={() => setPage(p)}
                          aria-label={`Page ${p}`}
                          aria-current={safePage === p ? "page" : undefined}
                          style={{
                            borderRadius: 8,
                            minWidth: 34,
                            fontFamily: interFamily,
                            fontWeight: 600,
                            backgroundColor: safePage === p ? "#0C8A3B" : undefined,
                            borderColor: safePage === p ? "#0C8A3B" : undefined,
                          }}
                        >
                          {p}
                        </button>
                      )
                    )}

                    <button
                      type="button"
                      className="btn btn-light btn-sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={safePage >= totalPages}
                      aria-label="Next page"
                      style={{ borderRadius: 8 }}
                    >
                      ›
                    </button>
                    <button
                      type="button"
                      className="btn btn-light btn-sm"
                      onClick={() => setPage(totalPages)}
                      disabled={safePage >= totalPages}
                      aria-label="Last page"
                      style={{ borderRadius: 8 }}
                    >
                      »
                    </button>
                  </div>
                </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* View details modal (Portal) */}
      <PortalModal
        isOpen={isViewModalOpen}
        onRequestClose={closeViewModal}
        ariaLabelledby="myreports-view-title"
        overlayClassName="account-approvals-detail-overlay"
        backdropClassName="account-approvals-detail-backdrop"
        wrapClassName=""
        panelClassName="account-approvals-detail-modal myreports-view-modal"
        durationMs={220}
        closeOnBackdrop
        closeOnEsc
      >
        <div className="account-approvals-detail-header">
          <div className="account-approvals-detail-header-text">
            <h5
              id="myreports-view-title"
              className="mb-0 fw-semibold"
              style={{ fontFamily: interFamily }}
            >
              {viewReportSnapshot?.id
                ? `Report #${viewReportSnapshot.id}`
                : "Report details"}
            </h5>
            <div className="account-approvals-detail-subtitle">
              <span className="account-approvals-detail-name">
                Review your submitted hazard record
              </span>
            </div>
          </div>

          <button
            type="button"
            className="btn-close-custom"
            aria-label="Close"
            onClick={closeViewModal}
          >
            ×
          </button>
        </div>

        <div
          className="account-approvals-detail-body"
          style={{
            padding: "1.25rem 1.25rem",
            background:
              "radial-gradient(circle at top, #f3f4f6 0, #ffffff 48%, #f9fafb 100%)",
          }}
        >
          {viewError ? (
            <div
              className="alert alert-danger py-2 mb-3"
              role="alert"
              style={{ fontFamily: interFamily }}
            >
              {viewError}
            </div>
          ) : null}

          {viewLoading && !viewReportSnapshot ? (
            <div className="d-flex flex-column align-items-center justify-content-center py-4">
              <div
                className="spinner-border"
                role="status"
                aria-label="Loading"
                style={{ width: "1.6rem", height: "1.6rem", color: "#0C8A3B" }}
              />
              <p
                className="mt-3 mb-0 text-muted"
                style={{ fontFamily: interFamily, fontSize: "0.9rem" }}
              >
                Loading report details…
              </p>
            </div>
          ) : (
            (() => {
              const report = viewReport || viewReportSnapshot;
              if (!report) {
                return (
                  <div
                    className="text-muted"
                    style={{ fontFamily: interFamily, fontSize: "0.9rem" }}
                  >
                    No report details available.
                  </div>
                );
              }

              const statusLabel =
                report.current_status?.label ??
                report.currentStatus?.label ??
                report.current_status_id ??
                "—";
              const severityLabel = String(report.severity || "—");

              const observedAt = report.observed_at ?? report.observedAt ?? null;
              const createdAt = report.created_at ?? report.createdAt ?? null;
              const updatedAt = report.updated_at ?? report.updatedAt ?? null;

              const attachments = report.attachments ?? [];

              const severityColor = (() => {
                const v = String(severityLabel || "").toLowerCase();
                if (v === "critical") return { bg: "#7f1d1d", fg: "#fff" };
                if (v === "high") return { bg: "#b91c1c", fg: "#fff" };
                if (v === "medium") return { bg: "#b45309", fg: "#fff" };
                if (v === "low") return { bg: "#0f766e", fg: "#fff" };
                return { bg: "#334155", fg: "#fff" };
              })();

              return (
                <div className="d-flex flex-column gap-3">
                  <div className="d-flex flex-wrap align-items-center gap-2">
                    <span
                      className="badge"
                      style={{
                        fontFamily: interFamily,
                        fontWeight: 700,
                        letterSpacing: "0.02em",
                        backgroundColor: "#e2e8f0",
                        color: "#0f172a",
                        border: "1px solid #cbd5e1",
                        padding: "0.4rem 0.55rem",
                        borderRadius: 999,
                      }}
                    >
                      <i className="fas fa-info-circle me-1" aria-hidden="true" />
                      {statusLabel}
                    </span>
                    <span
                      className="badge"
                      style={{
                        fontFamily: interFamily,
                        fontWeight: 700,
                        textTransform: "capitalize",
                        backgroundColor: severityColor.bg,
                        color: severityColor.fg,
                        padding: "0.4rem 0.55rem",
                        borderRadius: 999,
                      }}
                    >
                      <i className="fas fa-signal me-1" aria-hidden="true" />
                      {severityLabel}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gap: "0.85rem",
                    }}
                  >
                    {/* Report information */}
                    <div
                      className="border rounded-3 p-3"
                      style={{
                        borderColor: "#e5e7eb",
                        backgroundColor: "#ffffff",
                        boxShadow:
                          "0 1px 2px rgba(15, 23, 42, 0.06), 0 0 0 1px rgba(148, 163, 184, 0.14)",
                      }}
                    >
                      <div
                        style={{
                          fontFamily: interFamily,
                          fontWeight: 800,
                          fontSize: "0.75rem",
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: "#64748b",
                          marginBottom: "0.6rem",
                        }}
                      >
                        Report information
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "110px 1fr",
                          columnGap: "0.85rem",
                          rowGap: "0.6rem",
                          alignItems: "start",
                          fontFamily: interFamily,
                        }}
                      >
                        <div style={{ color: "#64748b", fontWeight: 800 }}>Category</div>
                        <div
                          style={{
                            color: "#0f172a",
                            fontWeight: 700,
                            textAlign: "right",
                            wordBreak: "break-word",
                            overflowWrap: "anywhere",
                          }}
                        >
                          {report.category?.name ?? "—"}
                        </div>

                        <div style={{ color: "#64748b", fontWeight: 800 }}>Location</div>
                        <div
                          style={{
                            color: "#0f172a",
                            fontWeight: 700,
                            textAlign: "right",
                            wordBreak: "break-word",
                            overflowWrap: "anywhere",
                          }}
                        >
                          {report.location?.name ?? "—"}
                        </div>

                        <div style={{ color: "#64748b", fontWeight: 800 }}>Observed</div>
                        <div style={{ color: "#0f172a", fontWeight: 700, textAlign: "right" }}>
                          {formatDateTime(observedAt)}
                        </div>

                        <div style={{ color: "#64748b", fontWeight: 800 }}>Created</div>
                        <div style={{ color: "#0f172a", fontWeight: 700, textAlign: "right" }}>
                          {formatDateTime(createdAt)}
                        </div>

                        <div style={{ color: "#64748b", fontWeight: 800 }}>Last updated</div>
                        <div style={{ color: "#0f172a", fontWeight: 700, textAlign: "right" }}>
                          {formatDateTime(updatedAt)}
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    <div
                      className="border rounded-3 p-3"
                      style={{
                        borderColor: "#e5e7eb",
                        backgroundColor: "#ffffff",
                        boxShadow:
                          "0 1px 2px rgba(15, 23, 42, 0.06), 0 0 0 1px rgba(148, 163, 184, 0.14)",
                      }}
                    >
                      <div
                        style={{
                          fontFamily: interFamily,
                          fontWeight: 800,
                          fontSize: "0.75rem",
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: "#64748b",
                          marginBottom: "0.6rem",
                        }}
                      >
                        Description
                      </div>
                      <div
                        style={{
                          fontFamily: interFamily,
                          fontSize: "0.95rem",
                          color: "#0f172a",
                          whiteSpace: "pre-wrap",
                          lineHeight: 1.5,
                        }}
                      >
                        {report.description || "—"}
                      </div>
                    </div>

                    {/* Attachments */}
                    <div
                      className="border rounded-3 p-3"
                      style={{
                        borderColor: "#e5e7eb",
                        backgroundColor: "#ffffff",
                        boxShadow:
                          "0 1px 2px rgba(15, 23, 42, 0.06), 0 0 0 1px rgba(148, 163, 184, 0.14)",
                      }}
                    >
                      <div className="d-flex align-items-center justify-content-between gap-2 mb-2">
                        <div
                          style={{
                            fontFamily: interFamily,
                            fontWeight: 800,
                            fontSize: "0.75rem",
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            color: "#64748b",
                          }}
                        >
                          Attachments
                        </div>
                        <div className="text-muted" style={{ fontFamily: interFamily, fontSize: "0.8rem" }}>
                          {attachments.length ? `${attachments.length} file(s)` : "None"}
                        </div>
                      </div>

                      {attachments.length ? (
                        <div
                          className="d-grid"
                          style={{
                            gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                            gap: 12,
                          }}
                        >
                          {attachments.map((a) => {
                            const name = a.original_name ?? a.originalName ?? a.name ?? "Attachment";
                            const key = getAttachmentKey(a, name);
                            const objectUrl = attachmentObjectUrls[key] || "";
                            const canPreview = Boolean(objectUrl) || !attachmentObjectUrlErrors[key];
                            return (
                              <div
                                key={String(a.id ?? name)}
                                className="border rounded-3 p-2"
                                style={{
                                  borderColor: "#e5e7eb",
                                  background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
                                  transition:
                                    "transform 0.15s ease-out, box-shadow 0.15s ease-out, border-color 0.15s ease-out",
                                cursor: canPreview ? "pointer" : "default",
                                }}
                                role={canPreview ? "button" : undefined}
                                tabIndex={canPreview ? 0 : undefined}
                                aria-label={canPreview ? `Preview ${name}` : undefined}
                                onClick={() => {
                                if (!canPreview) return;
                                (async () => {
                                  const url = objectUrl || (await fetchAttachmentObjectUrl(a, name));
                                  if (!url) return;
                                  setImagePreview({ name, url });
                                })();
                                }}
                                onKeyDown={(e) => {
                                  if (!canPreview) return;
                                  if (e.key !== "Enter" && e.key !== " ") return;
                                  e.preventDefault();
                                (async () => {
                                  const url = objectUrl || (await fetchAttachmentObjectUrl(a, name));
                                  if (!url) return;
                                  setImagePreview({ name, url });
                                })();
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.transform = "translateY(-1px)";
                                  e.currentTarget.style.boxShadow = "0 8px 16px rgba(15, 23, 42, 0.12)";
                                  e.currentTarget.style.borderColor = "#cbd5e1";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.transform = "translateY(0)";
                                  e.currentTarget.style.boxShadow = "none";
                                  e.currentTarget.style.borderColor = "#e5e7eb";
                                }}
                              >
                                <div
                                  className="d-flex align-items-center justify-content-center rounded-2"
                                  style={{
                                    height: 90,
                                    background:
                                      "radial-gradient(circle at top, rgba(12, 138, 59, 0.10) 0, rgba(255,255,255,1) 60%)",
                                    border: "1px solid rgba(148, 163, 184, 0.22)",
                                    overflow: "hidden",
                                  }}
                                >
                                {objectUrl ? (
                                  <img
                                    src={objectUrl}
                                    alt={name}
                                    loading="lazy"
                                    style={{
                                      width: "100%",
                                      height: "100%",
                                      objectFit: "cover",
                                      display: "block",
                                    }}
                                  />
                                ) : (
                                  <button
                                    type="button"
                                    className="btn btn-light btn-sm"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      fetchAttachmentObjectUrl(a, name);
                                    }}
                                    style={{
                                      borderRadius: 999,
                                      fontFamily: interFamily,
                                      fontSize: "0.75rem",
                                      borderColor: "#d1d5db",
                                      color: "#374151",
                                      backgroundColor: "#ffffff",
                                    }}
                                  >
                                    <i className="fas fa-download me-1" aria-hidden="true" />
                                    Load
                                  </button>
                                )}
                                </div>
                                <div
                                  className="mt-2"
                                  style={{
                                    fontFamily: interFamily,
                                    fontSize: "0.8rem",
                                    fontWeight: 700,
                                    color: "#0f172a",
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                  }}
                                  title={name}
                                >
                                  {name}
                                </div>
                                <div style={{ fontFamily: interFamily, fontSize: "0.75rem", color: "#64748b" }}>
                                  {a.size_bytes ? `${Math.round((a.size_bytes / 1024) * 10) / 10} KB` : " "}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-muted" style={{ fontFamily: interFamily, fontSize: "0.9rem" }}>
                          No attachments were submitted with this report.
                        </div>
                      )}
                    </div>

                    {/* Status timeline */}
                    <div
                      className="border rounded-3 p-3"
                      style={{
                        borderColor: "#e5e7eb",
                        backgroundColor: "#ffffff",
                        boxShadow:
                          "0 1px 2px rgba(15, 23, 42, 0.06), 0 0 0 1px rgba(148, 163, 184, 0.14)",
                      }}
                    >
                      <div
                        style={{
                          fontFamily: interFamily,
                          fontWeight: 800,
                          fontSize: "0.75rem",
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: "#64748b",
                          marginBottom: "0.6rem",
                        }}
                      >
                        Status timeline
                      </div>
                      {report.status_history?.length ? (
                        <div className="d-grid" style={{ gap: "0.55rem", fontFamily: interFamily }}>
                          {report.status_history.slice(0, 6).map((h) => (
                            <div
                              key={h.id}
                              className="d-flex align-items-start gap-2"
                              style={{ borderLeft: "3px solid #cbd5e1", paddingLeft: 10 }}
                            >
                              <div style={{ minWidth: 0, width: "100%" }}>
                                <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#0f172a" }}>
                                  {h.to_status?.label ?? h.toStatus?.label ?? h.to_status_id ?? "—"}
                                </div>
                                <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
                                  {formatDateTime(h.created_at)}
                                  {h.note ? ` — ${h.note}` : ""}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-muted" style={{ fontFamily: interFamily, fontSize: "0.9rem" }}>
                          No timeline entries yet.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()
          )}
        </div>

        <div className="account-approvals-detail-footer">
          <button
            type="button"
            className="btn btn-light account-approvals-detail-close-btn"
            onClick={closeViewModal}
            style={{ fontFamily: interFamily }}
          >
            Close
          </button>
        </div>
      </PortalModal>

      {/* Attachment preview modal */}
      <PortalModal
        isOpen={Boolean(imagePreview)}
        onRequestClose={() => setImagePreview(null)}
        ariaLabelledby="myreports-attachment-title"
        overlayClassName="account-approvals-detail-overlay"
        backdropClassName="account-approvals-detail-backdrop"
        wrapClassName=""
        panelClassName="account-approvals-detail-modal"
        durationMs={260}
      >
        {imagePreview ? (
          <>
            <div className="account-approvals-detail-header">
              <div className="account-approvals-detail-header-text">
                <h5
                  id="myreports-attachment-title"
                  className="mb-0 fw-semibold"
                  style={{ fontFamily: interFamily }}
                >
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
              style={{ backgroundColor: "#f9fafb", padding: "1.5rem" }}
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
                style={{ fontFamily: interFamily }}
              >
                Close
              </button>
            </div>
          </>
        ) : null}
      </PortalModal>
    </div>
  );
}

