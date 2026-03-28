import React, { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../lib/api";
import PortalModal from "../../components/PortalModal";

const interFamily =
  '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';

export default function HazardEvidenceViewer() {
  const [pageData, setPageData] = useState(null);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [showContent, setShowContent] = useState(false);

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(15);

  const rows = useMemo(() => pageData?.data ?? [], [pageData]);
  const totalPages = useMemo(() => Number(pageData?.last_page ?? 1), [pageData]);

  const [selectedReportId, setSelectedReportId] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState("");
  const [viewReport, setViewReport] = useState(null);
  const [viewReportSnapshot, setViewReportSnapshot] = useState(null);

  const [imagePreview, setImagePreview] = useState(null); // { name: string, url: string }
  const [imagePreviewSnapshot, setImagePreviewSnapshot] = useState(null); // preserves content during exit animation

  const [attachmentObjectUrls, setAttachmentObjectUrls] = useState({}); // { [key: string]: string }
  const [attachmentObjectUrlErrors, setAttachmentObjectUrlErrors] = useState({}); // { [key: string]: string }
  const [attachmentLoadStates, setAttachmentLoadStates] = useState({}); // { [key: string]: 'idle'|'loading'|'loaded'|'error' }
  const attachmentObjectUrlsRef = useRef({});
  const [attachmentDownloadError, setAttachmentDownloadError] = useState("");

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

  const buildAttachmentCandidates = (raw, reportId, attachmentId) => {
    const v = raw ? String(raw).trim() : "";
    const apiCandidates = [];
    if (reportId && attachmentId) {
      // Prefer authenticated API streaming (works even when storage is private).
      apiCandidates.push(`hazards/${reportId}/attachments/${attachmentId}`);
    }
    if (!v) return apiCandidates;
    if (/^https?:\/\//i.test(v) || v.startsWith("/")) return [...apiCandidates, v];
    // Filename or relative path; try common Laravel public storage routes.
    return [...apiCandidates, v, `/storage/${v}`, `/uploads/${v}`];
  };

  const getAttachmentRaw = (attachment) => {
    if (!attachment) return "";
    if (typeof attachment === "string") return attachment;
    return (
      attachment?.url ??
      attachment?.public_url ??
      attachment?.publicUrl ??
      attachment?.path ??
      attachment?.file_url ??
      attachment?.fileUrl ??
      attachment?.original_name ??
      attachment?.originalName ??
      attachment?.name ??
      ""
    );
  };

  const isProbablyImage = (nameOrUrl) => {
    const v = nameOrUrl ? String(nameOrUrl).toLowerCase() : "";
    return /\.(png|jpe?g|gif|webp|bmp|svg)(\?.*)?$/.test(v);
  };

  const isApiAttachmentCandidate = (candidate) => {
    const v = candidate ? String(candidate).trim() : "";
    return v.startsWith("hazards/") || v.startsWith("/hazards/");
  };

  const normalizeAttachmentUrl = (value) => {
    const raw = value ? String(value).trim() : "";
    if (!raw) return "";
    // Keep API candidates relative so Axios uses `api.defaults.baseURL` (e.g. `/api`).
    if (isApiAttachmentCandidate(raw)) return raw.replace(/^\/+/, "");
    // Prefer same-origin relative URLs so Vite can proxy them in dev (avoids CORS).
    if (raw.startsWith("/")) return raw;
    if (/^https?:\/\//i.test(raw)) {
      try {
        const u = new URL(raw);
        const backendBase = getBackendBase();
        if (backendBase) {
          const b = new URL(backendBase);
          if (u.origin === b.origin) return `${u.pathname}${u.search || ""}`;
        }
        return raw;
      } catch {
        return raw;
      }
    }
    return `/${raw}`;
  };

  const getAttachmentKey = (a, fallbackIndex) =>
    String(a?.id ?? a?.original_name ?? a?.originalName ?? a?.name ?? fallbackIndex ?? "");

  const fetchAttachmentObjectUrl = async (attachment, fallbackIndex = 0) => {
    const key = getAttachmentKey(attachment, fallbackIndex);
    if (!key) return "";
    if (attachmentObjectUrls[key]) return attachmentObjectUrls[key];
    if (attachmentLoadStates[key] === "loading") return "";

    const raw = getAttachmentRaw(attachment);
    const reportId = typeof attachment === "object"
      ? attachment?.hazard_report_id ?? viewReport?.id ?? viewReportSnapshot?.id ?? null
      : viewReport?.id ?? viewReportSnapshot?.id ?? null;

    const candidates = buildAttachmentCandidates(
      raw,
      reportId,
      typeof attachment === "object" ? attachment?.id : null,
    ).map(normalizeAttachmentUrl);

    if (!candidates.length) return "";

    let lastError = "";
    setAttachmentLoadStates((prev) => ({ ...prev, [key]: "loading" }));
    for (const candidate of candidates) {
      try {
        const isApi = isApiAttachmentCandidate(candidate);
        const backendBase = getBackendBase();
        const res = await api.request({
          url: candidate,
          // API candidates must use Axios baseURL (e.g. `${BACKEND}/api`).
          // Public candidates like `/storage/...` should prefer the backend origin in prod.
          baseURL: isApi ? undefined : backendBase || "",
          responseType: "blob",
          withCredentials: true,
        });

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
        setAttachmentLoadStates((prev) => ({ ...prev, [key]: "loaded" }));
        return objectUrl;
      } catch (err) {
        lastError =
          err?.response?.data?.message || err?.message || `Failed to load ${candidate}`;
      }
    }

    setAttachmentObjectUrlErrors((prev) => ({ ...prev, [key]: lastError || "Failed to load image" }));
    setAttachmentLoadStates((prev) => ({ ...prev, [key]: "error" }));
    return "";
  };

  const downloadAttachment = async (attachment) => {
    const reportId = selectedReportId ?? report?.id ?? viewReport?.id ?? null;
    const attachmentId = typeof attachment === "object" ? attachment?.id : null;
    const fallbackName =
      attachment?.original_name ||
      attachment?.originalName ||
      attachment?.name ||
      `hazard-${reportId}-attachment-${attachmentId}`;

    if (!reportId || !attachmentId) {
      setAttachmentDownloadError("Unable to download this attachment.");
      return;
    }

    setAttachmentDownloadError("");
    try {
      const res = await api.get(`/hazards/${reportId}/attachments/${attachmentId}`, {
        responseType: "blob",
      });
      const blobUrl = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = fallbackName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1500);
    } catch (err) {
      setAttachmentDownloadError(
        err?.response?.data?.message || err?.message || "Unable to download attachment."
      );
    }
  };

  const openReport = (id) => {
    if (!id) return;
    if (String(id) === String(selectedReportId)) return;

    // Reset report-specific state so previews are always consistent.
    setSelectedReportId(id);
    setViewError("");
    setViewReport(null);
    setViewReportSnapshot(null);
    setAttachmentObjectUrls({});
    setAttachmentObjectUrlErrors({});
    setAttachmentLoadStates({});
    setImagePreview(null);
    setImagePreviewSnapshot(null);
  };

  // Fetch personnel-relevant report list.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setListLoading(true);
      setListError("");
      try {
        const res = await api.get("/hazards/my", {
          params: { page, per_page: perPage },
        });
        if (cancelled) return;
        setPageData(res.data ?? null);
      } catch (err) {
        if (cancelled) return;
        setListError(
          err?.response?.data?.message || err?.message || "Unable to load your hazard reports."
        );
      } finally {
        if (!cancelled) setListLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page, perPage]);

  // Content fade-in to match existing pages.
  useEffect(() => {
    if (!listLoading) {
      const id = requestAnimationFrame(() => setShowContent(true));
      return () => cancelAnimationFrame(id);
    }
    setShowContent(false);
  }, [listLoading]);

  // Default selection: first report on the current page.
  useEffect(() => {
    if (listLoading) return;
    if (!rows.length) {
      setSelectedReportId(null);
      setViewReport(null);
      setViewReportSnapshot(null);
      return;
    }
    if (selectedReportId && rows.some((r) => String(r.id) === String(selectedReportId))) return;
    openReport(rows[0]?.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listLoading, rows]);

  // Fetch selected report details (includes attachments).
  useEffect(() => {
    if (!selectedReportId) return;
    let cancelled = false;
    (async () => {
      setViewLoading(true);
      setViewError("");
      try {
        const res = await api.get(`/hazards/${selectedReportId}`);
        if (cancelled) return;
        const payload = res.data?.data ?? null;
        setViewReport(payload);
        setViewReportSnapshot(payload);
      } catch (err) {
        if (cancelled) return;
        setViewError(
          err?.response?.data?.message || err?.message || "Unable to load report details."
        );
        setViewReport(null);
        setViewReportSnapshot(null);
      } finally {
        if (!cancelled) setViewLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedReportId]);

  // Preserve attachment preview content during exit animation.
  useEffect(() => {
    if (imagePreview) {
      setImagePreviewSnapshot(imagePreview);
      return;
    }
    if (!imagePreviewSnapshot) return;
    const t = setTimeout(() => setImagePreviewSnapshot(null), 220);
    return () => clearTimeout(t);
  }, [imagePreview, imagePreviewSnapshot]);

  // Preload image thumbnails for the selected report.
  useEffect(() => {
    const report = viewReport || viewReportSnapshot;
    if (!report) return;
    const attachments = Array.isArray(report.attachments) ? report.attachments : [];
    attachments.slice(0, 6).forEach((att, idx) => {
      const name =
        (typeof att === "string"
          ? String(att).split("/").pop()
          : att?.original_name ?? att?.originalName ?? att?.name) || `Attachment ${idx + 1}`;
      const key = getAttachmentKey(att, name);
      if (!key) return;
      if (attachmentObjectUrls[key] || attachmentObjectUrlErrors[key]) return;
      if (attachmentLoadStates[key] === "loading") return;
      const raw = getAttachmentRaw(att);
      if (!isProbablyImage(name) && !isProbablyImage(raw)) return;
      fetchAttachmentObjectUrl(att, name);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedReportId, viewReport, viewReportSnapshot]);

  // Revoke blob URLs when switching reports.
  useEffect(() => {
    const existing = attachmentObjectUrls;
    const ids = Object.keys(existing || {});
    if (!ids.length) return;
    ids.forEach((k) => {
      const u = existing[k];
      if (u) URL.revokeObjectURL(u);
    });
    setAttachmentObjectUrls({});
    setAttachmentObjectUrlErrors({});
    setAttachmentLoadStates({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedReportId]);

  // Revoke blob URLs on unmount.
  useEffect(() => {
    attachmentObjectUrlsRef.current = attachmentObjectUrls;
  }, [attachmentObjectUrls]);

  useEffect(() => {
    return () => {
      const existing = attachmentObjectUrlsRef.current;
      const ids = Object.keys(existing || {});
      ids.forEach((k) => {
        const u = existing[k];
        if (u) URL.revokeObjectURL(u);
      });
    };
  }, []);

  const report = viewReport || viewReportSnapshot;
  const attachments = Array.isArray(report?.attachments) ? report.attachments : [];

  const statusLabel =
    report?.current_status?.label ??
    report?.currentStatus?.label ??
    report?.current_status_id ??
    "—";
  const severityLabel = String(report?.severity || "—");

  const severityColor = (() => {
    const v = String(severityLabel || "").toLowerCase();
    if (v === "critical") return { bg: "#7f1d1d", fg: "#fff" };
    if (v === "high") return { bg: "#b91c1c", fg: "#fff" };
    if (v === "medium") return { bg: "#b45309", fg: "#fff" };
    if (v === "low") return { bg: "#0f766e", fg: "#fff" };
    return { bg: "#334155", fg: "#fff" };
  })();

  const observedAt = report?.observed_at ?? report?.observedAt ?? null;
  const createdAt = report?.created_at ?? report?.createdAt ?? null;
  const updatedAt = report?.updated_at ?? report?.updatedAt ?? null;

  if (listLoading) {
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
                <i className="fas fa-images" />
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
                  Report Attachments
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
                  Review the images you submitted with each hazard report.
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
                Loading attachments… Please wait.
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
              <i className="fas fa-images" />
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
                Report Attachments
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
                Select a report to view submitted images and report details.
              </p>
            </div>
          </div>
        </div>

        <div className="card-body" style={{ backgroundColor: "#ffffff" }}>
          {listError ? (
            <div className="alert alert-danger py-2 mb-3" role="alert" style={{ fontFamily: interFamily }}>
              {listError}
            </div>
          ) : null}

          <div className="row g-3">
            <div className="col-12 col-lg-4">
              <div
                className="border rounded-3 p-3"
                style={{
                  borderColor: "#e5e7eb",
                  backgroundColor: "#ffffff",
                  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06), 0 0 0 1px rgba(148, 163, 184, 0.14)",
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
                    marginBottom: "0.85rem",
                  }}
                >
                  Reports (Tabs)
                </div>

                {rows.length ? (
                  <div className="d-flex flex-column gap-2">
                    {rows.map((r) => {
                      const isActive = String(r.id) === String(selectedReportId);
                      const labelA = r.category?.name ?? "—";
                      const labelB = r.location?.name ?? "—";
                      return (
                        <button
                          key={r.id}
                          type="button"
                          className="text-start"
                          onClick={() => openReport(r.id)}
                          style={{
                            borderRadius: 10,
                            border: `1px solid ${isActive ? "#0C8A3B" : "#e5e7eb"}`,
                            backgroundColor: isActive ? "#f0f7f3" : "#ffffff",
                            padding: "0.75rem 0.85rem",
                            transition: "background-color 0.2s ease, transform 0.15s ease, border-color 0.2s ease",
                          }}
                          onMouseEnter={(e) => {
                            if (isActive) return;
                            e.currentTarget.style.transform = "translateY(-1px)";
                            e.currentTarget.style.backgroundColor = "#f8fafc";
                          }}
                          onMouseLeave={(e) => {
                            if (isActive) return;
                            e.currentTarget.style.transform = "translateY(0)";
                            e.currentTarget.style.backgroundColor = "#ffffff";
                          }}
                        >
                          <div style={{ fontFamily: interFamily, fontWeight: 900, fontSize: "0.9rem", color: "#0f172a" }}>
                            {labelA}
                          </div>
                          <div style={{ fontFamily: interFamily, fontSize: "0.8rem", color: "#6b7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {labelB}
                          </div>
                          <div style={{ fontFamily: interFamily, fontSize: "0.75rem", color: "#64748b", marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <span style={{ fontWeight: 700 }}>
                              <i className="fas fa-id-badge me-1" aria-hidden="true" />
                              #{r.id}
                            </span>
                            <span style={{ fontWeight: 700 }}>
                              <i className="fas fa-signal me-1" aria-hidden="true" />
                              {String(r.severity || "—")}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-muted" style={{ fontFamily: interFamily, fontSize: "0.9rem" }}>
                    No hazard reports found for your account.
                  </div>
                )}

                {pageData ? (
                  <div className="d-flex align-items-center justify-content-between mt-3">
                    <button
                      type="button"
                      className="btn btn-light btn-sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      style={{
                        borderRadius: 8,
                        fontFamily: interFamily,
                        borderColor: "#d1d5db",
                        backgroundColor: "#f9fafb",
                        color: "#374151",
                      }}
                    >
                      Previous
                    </button>
                    <div style={{ fontFamily: interFamily, fontWeight: 700, color: "#64748b", fontSize: "0.85rem" }}>
                      Page {page} of {totalPages}
                    </div>
                    <button
                      type="button"
                      className="btn btn-light btn-sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                      style={{
                        borderRadius: 8,
                        fontFamily: interFamily,
                        borderColor: "#d1d5db",
                        backgroundColor: "#f9fafb",
                        color: "#374151",
                      }}
                    >
                      Next
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="col-12 col-lg-8">
              <div
                style={{
                  borderRadius: 16,
                  border: "1px solid #e5e7eb",
                  backgroundColor: "#ffffff",
                  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06), 0 0 0 1px rgba(148, 163, 184, 0.14)",
                  padding: 14,
                }}
              >
                {viewError ? (
                  <div className="alert alert-danger py-2 mb-3" role="alert" style={{ fontFamily: interFamily }}>
                    {viewError}
                  </div>
                ) : null}

                {!selectedReportId ? (
                  <div className="text-muted" style={{ fontFamily: interFamily, fontSize: "0.9rem" }}>
                    Select a report tab to view hazard details and attachments.
                  </div>
                ) : viewLoading && !viewReportSnapshot ? (
                  <div className="d-flex flex-column align-items-center justify-content-center py-4">
                    <div
                      className="spinner-border"
                      role="status"
                      aria-label="Loading"
                      style={{ width: "1.6rem", height: "1.6rem", color: "#0C8A3B" }}
                    />
                    <p className="mt-3 mb-0 text-muted" style={{ fontFamily: interFamily, fontSize: "0.9rem" }}>
                      Loading report evidence…
                    </p>
                  </div>
                ) : report ? (
                  <div key={String(selectedReportId)} className="tab-transition-enter">
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
                      <span
                        className="badge"
                        style={{
                          fontFamily: interFamily,
                          fontWeight: 800,
                          backgroundColor: "#f1f5f9",
                          color: "#0f172a",
                          border: "1px solid #e2e8f0",
                          padding: "0.4rem 0.55rem",
                          borderRadius: 999,
                        }}
                      >
                        <i className="fas fa-file-alt me-1" aria-hidden="true" />
                        Hazard Report #{report.id}
                      </span>
                    </div>

                    <div style={{ display: "grid", gap: "0.85rem" }}>
                      {/* Report information */}
                      <div
                        className="border rounded-3 p-3"
                        style={{
                          borderColor: "#e5e7eb",
                          backgroundColor: "#ffffff",
                          boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06), 0 0 0 1px rgba(148, 163, 184, 0.14)",
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
                          boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06), 0 0 0 1px rgba(148, 163, 184, 0.14)",
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
                          boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06), 0 0 0 1px rgba(148, 163, 184, 0.14)",
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

                        {attachmentDownloadError ? (
                          <div
                            className="alert alert-warning py-2 px-3 mb-3"
                            style={{ fontFamily: interFamily, fontSize: "0.85rem" }}
                          >
                            {attachmentDownloadError}
                          </div>
                        ) : null}

                        {attachments.length ? (
                          <div
                            className="d-grid"
                            style={{
                              gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                              gap: 12,
                            }}
                          >
                            {attachments.map((a, idx) => {
                              const name =
                                (typeof a === "string"
                                  ? String(a).split("/").pop()
                                  : a.original_name ?? a.originalName ?? a.name) ||
                                `Attachment ${idx + 1}`;
                              const raw = getAttachmentRaw(a);
                              const key = getAttachmentKey(a, name);

                              const objectUrl = attachmentObjectUrls[key] || "";
                              const loadState = attachmentLoadStates[key] || "idle";

                              const isImage = isProbablyImage(name) || isProbablyImage(raw);

                              return (
                                <div
                                  key={String(typeof a === "object" ? a?.id ?? name : name)}
                                  className="border rounded-3 p-2"
                                  style={{
                                    borderColor: "#e5e7eb",
                                    background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
                                    transition:
                                      "transform 0.15s ease-out, box-shadow 0.15s ease-out, border-color 0.15s ease-out",
                                    cursor: isImage ? "pointer" : "default",
                                  }}
                                  role={isImage ? "button" : undefined}
                                  tabIndex={isImage ? 0 : undefined}
                                  aria-label={isImage ? `Preview ${name}` : undefined}
                                  onClick={() => {
                                    if (!isImage) return;
                                    (async () => {
                                      const url = objectUrl || (await fetchAttachmentObjectUrl(a, name));
                                      if (!url) return;
                                      setImagePreview({ name, url });
                                    })();
                                  }}
                                  onKeyDown={(e) => {
                                    if (!isImage) return;
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
                                    {isImage && (loadState === "loading" || (!objectUrl && loadState !== "error")) ? (
                                      <div
                                        aria-label="Loading attachment"
                                        style={{
                                          width: "100%",
                                          height: "100%",
                                          background:
                                            "linear-gradient(90deg, rgba(226,232,240,0.85) 0%, rgba(241,245,249,0.95) 35%, rgba(226,232,240,0.85) 70%)",
                                          backgroundSize: "200% 100%",
                                          animation: "myreportsShimmer 1.2s ease-in-out infinite",
                                        }}
                                      />
                                    ) : objectUrl && isImage ? (
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
                                      <div
                                        style={{
                                          width: "100%",
                                          height: "100%",
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          color: "#9ca3af",
                                        }}
                                      >
                                        <i className="fas fa-image" aria-hidden="true" />
                                      </div>
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
                                    {a?.size_bytes
                                      ? `${Math.round((a.size_bytes / 1024) * 10) / 10} KB`
                                      : " "}
                                  </div>

                                  <button
                                    type="button"
                                    className="btn btn-light btn-sm d-inline-flex align-items-center gap-1"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      downloadAttachment(a);
                                    }}
                                    style={{
                                      borderRadius: 999,
                                      borderColor: "#bbf7d0",
                                      color: "#166534",
                                      fontFamily: interFamily,
                                      fontSize: "0.75rem",
                                      paddingInline: "0.55rem",
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
                                    <i className="fas fa-download" aria-hidden="true" />
                                    <span>Download</span>
                                  </button>
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
                          boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06), 0 0 0 1px rgba(148, 163, 184, 0.14)",
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
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Attachment preview modal */}
      <PortalModal
        isOpen={Boolean(imagePreview)}
        onRequestClose={() => setImagePreview(null)}
        ariaLabelledby="hazard-evidence-attachment-title"
        overlayClassName="account-approvals-detail-overlay"
        backdropClassName="account-approvals-detail-backdrop"
        wrapClassName="myreports-attachment-wrap"
        panelClassName="account-approvals-detail-modal myreports-attachment-modal"
        durationMs={220}
        closeOnBackdrop
        closeOnEsc
      >
        {imagePreviewSnapshot ? (
          <>
            <div className="account-approvals-detail-header">
              <div className="account-approvals-detail-header-text">
                <h5
                  id="hazard-evidence-attachment-title"
                  className="mb-0 fw-semibold"
                  style={{ fontFamily: interFamily }}
                >
                  Attachment preview
                </h5>
                <div className="account-approvals-detail-subtitle">
                  <span className="account-approvals-detail-name">{imagePreviewSnapshot.name}</span>
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

            <div className="account-approvals-detail-body myreports-attachment-body" style={{ backgroundColor: "#f9fafb" }}>
              <div className="myreports-attachment-media">
                <img
                  src={imagePreviewSnapshot.url}
                  alt={imagePreviewSnapshot.name}
                  className="myreports-attachment-img"
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

      {/* Local keyframes (scoped to this page) */}
      <style>{`
        @keyframes myreportsShimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        .tab-transition-enter {
          animation: profileTabEnter 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
        }

        @keyframes profileTabEnter {
          from { opacity: 0; transform: translateY(-12px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @media (prefers-reduced-motion: reduce) {
          .tab-transition-enter { animation: none !important; }
        }
      `}</style>
    </div>
  );
}

