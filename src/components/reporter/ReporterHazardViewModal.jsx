import React, { useEffect, useState } from "react";
import PortalModal from "../PortalModal";
import { api } from "../../lib/api";

const interFamily =
  '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';

function formatDateTime(value) {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function getBackendBase() {
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
}

function buildAttachmentCandidates(raw, reportId, attachmentId) {
  const v = raw ? String(raw).trim() : "";
  const apiCandidates = [];
  if (reportId && attachmentId) {
    apiCandidates.push(`hazards/${reportId}/attachments/${attachmentId}`);
  }
  if (!v) return apiCandidates;
  if (/^https?:\/\//i.test(v) || v.startsWith("/")) return [...apiCandidates, v];
  return [...apiCandidates, v, `/storage/${v}`, `/storage/attachments/${v}`, `/uploads/${v}`];
}

function getAttachmentRaw(attachment) {
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
}

function isProbablyImage(nameOrUrl) {
  const v = nameOrUrl ? String(nameOrUrl).toLowerCase() : "";
  return /\.(png|jpe?g|gif|webp|bmp|svg)(\?.*)?$/.test(v);
}

function isApiAttachmentCandidate(candidate) {
  const v = candidate ? String(candidate).trim() : "";
  return v.startsWith("hazards/") || v.startsWith("/hazards/");
}

function normalizeAttachmentUrl(value) {
  const raw = value ? String(value).trim() : "";
  if (!raw) return "";
  if (isApiAttachmentCandidate(raw)) return raw.replace(/^\/+/, "");
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
}

function getAttachmentKey(a, fallbackIndex) {
  return String(a?.id ?? a?.original_name ?? a?.originalName ?? a?.name ?? fallbackIndex ?? "");
}

/**
 * Hazard report details in the same modal shell used on My Hazard Reports (view action).
 */
export default function ReporterHazardViewModal({
  isOpen,
  reportId,
  onClose,
  dataRevision = 0,
  ariaTitleId = "reporter-hazard-view-title",
}) {
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState("");
  const [viewReport, setViewReport] = useState(null);
  const [viewReportSnapshot, setViewReportSnapshot] = useState(null);
  const [attachmentObjectUrls, setAttachmentObjectUrls] = useState({});
  const [attachmentObjectUrlErrors, setAttachmentObjectUrlErrors] = useState({});
  const [attachmentLoadStates, setAttachmentLoadStates] = useState({});
  const [imagePreview, setImagePreview] = useState(null);
  const [imagePreviewSnapshot, setImagePreviewSnapshot] = useState(null);

  const fetchAttachmentObjectUrl = async (attachment, fallbackIndex = 0) => {
    const key = getAttachmentKey(attachment, fallbackIndex);
    if (!key) return "";
    if (attachmentObjectUrls[key]) return attachmentObjectUrls[key];
    if (attachmentLoadStates[key] === "loading") return "";

    const raw = getAttachmentRaw(attachment);
    const propId = reportId != null && reportId !== "" ? reportId : null;
    const rid =
      typeof attachment === "object"
        ? attachment?.hazard_report_id ?? viewReport?.id ?? viewReportSnapshot?.id ?? propId
        : viewReport?.id ?? viewReportSnapshot?.id ?? propId;
    const candidates = buildAttachmentCandidates(
      raw,
      rid,
      typeof attachment === "object" ? attachment?.id : null
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

  useEffect(() => {
    if (imagePreview) {
      setImagePreviewSnapshot(imagePreview);
      return;
    }
    if (!imagePreviewSnapshot) return;
    const t = setTimeout(() => setImagePreviewSnapshot(null), 220);
    return () => clearTimeout(t);
  }, [imagePreview, imagePreviewSnapshot]);

  useEffect(() => {
    if (!isOpen || reportId == null || reportId === "") return;
    let cancelled = false;
    (async () => {
      setViewLoading(true);
      setViewError("");
      setViewReport(null);
      setViewReportSnapshot(null);
      try {
        const res = await api.get(`/hazards/${reportId}`);
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
      } finally {
        if (!cancelled) setViewLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, reportId, dataRevision]);

  useEffect(() => {
    if (!isOpen) return;
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
  }, [isOpen, viewReport, viewReportSnapshot, attachmentLoadStates]);

  useEffect(() => {
    if (isOpen) return;
    if (!viewReportSnapshot) return;
    const t = setTimeout(() => {
      setViewReport(null);
      setViewError("");
    }, 220);
    return () => clearTimeout(t);
  }, [isOpen, viewReportSnapshot]);

  useEffect(() => {
    if (isOpen) return;
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
      setAttachmentLoadStates({});
    }, 260);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    const ids = Object.keys(attachmentObjectUrls || {});
    if (!ids.length) return;
    ids.forEach((k) => {
      const u = attachmentObjectUrls[k];
      if (u) URL.revokeObjectURL(u);
    });
    setAttachmentObjectUrls({});
    setAttachmentObjectUrlErrors({});
    setAttachmentLoadStates({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId]);

  useEffect(() => {
    if (!isOpen) setImagePreview(null);
  }, [isOpen]);

  if (!reportId && !isOpen) return null;

  return (
    <>
      <PortalModal
        isOpen={isOpen && reportId != null && reportId !== ""}
        onRequestClose={onClose}
        ariaLabelledby={ariaTitleId}
        overlayClassName="account-approvals-detail-overlay"
        backdropClassName="account-approvals-detail-backdrop"
        wrapClassName="myreports-view-wrap"
        panelClassName="account-approvals-detail-modal myreports-view-modal"
        durationMs={220}
        closeOnBackdrop
        closeOnEsc
      >
        <div
          style={{
            fontFamily: interFamily,
            display: "flex",
            flexDirection: "column",
            height: "100%",
            minHeight: 0,
          }}
        >
          <div className="account-approvals-detail-header">
            <div className="account-approvals-detail-header-text">
              <h5
                id={ariaTitleId}
                className="mb-0 fw-semibold"
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {(() => {
                  const id = (viewReportSnapshot || viewReport)?.id ?? null;
                  return id ? `Hazard Report #${id}` : "Hazard report details";
                })()}
              </h5>
              <div className="account-approvals-detail-subtitle">
                {(() => {
                  const r = viewReportSnapshot || viewReport;
                  const category = r?.category?.name ?? "";
                  const location = r?.location?.name ?? "";
                  const summary = [category, location].filter(Boolean).join(" • ");
                  return (
                    <span className="account-approvals-detail-name">
                      {summary ||
                        "Review the details, timeline, and attachments for this submission."}
                    </span>
                  );
                })()}
              </div>
            </div>

            <button type="button" className="btn-close-custom" aria-label="Close" onClick={onClose}>
              ×
            </button>
          </div>

          <div
            className="account-approvals-detail-body"
            style={{
              padding: "1.25rem 1.25rem",
              background:
                "radial-gradient(circle at top, #f3f4f6 0, #ffffff 48%, #f9fafb 100%)",
              flex: 1,
              minHeight: 0,
            }}
          >
            {viewError ? (
              <div className="alert alert-danger py-2 mb-3" role="alert">
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
                    <div className="text-muted" style={{ fontSize: "0.9rem" }}>
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

                    <div style={{ display: "grid", gap: "0.85rem" }}>
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
                          <div
                            className="text-muted"
                            style={{ fontFamily: interFamily, fontSize: "0.8rem" }}
                          >
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
                              const name =
                                (typeof a === "string"
                                  ? String(a).split("/").pop()
                                  : a.original_name ?? a.originalName ?? a.name) || "Attachment";
                              const key = getAttachmentKey(a, name);
                              const objectUrl = attachmentObjectUrls[key] || "";
                              const loadState = attachmentLoadStates[key] || "idle";
                              const raw = getAttachmentRaw(a);
                              const reportIdForAtt = report?.id ?? null;
                              const candidates = buildAttachmentCandidates(
                                raw,
                                reportIdForAtt,
                                typeof a === "object" ? a?.id : null
                              ).map(normalizeAttachmentUrl);
                              const publicCandidates = candidates.filter((c) => !isApiAttachmentCandidate(c));
                              const directPublicUrl = publicCandidates[0] || "";
                              const imgSrc = objectUrl || "";
                              const isImage =
                                isProbablyImage(name) ||
                                isProbablyImage(directPublicUrl) ||
                                isProbablyImage(raw);
                              const canPreview = Boolean(objectUrl) && isImage;
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
                                    e.currentTarget.style.boxShadow =
                                      "0 8px 16px rgba(15, 23, 42, 0.12)";
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
                                    {isImage &&
                                    (loadState === "loading" ||
                                      (!objectUrl && loadState !== "error")) ? (
                                      <div
                                        aria-label="Loading attachment"
                                        style={{
                                          width: "100%",
                                          height: "100%",
                                          background:
                                            "linear-gradient(90deg, rgba(226,232,240,0.85) 0%, rgba(241,245,249,0.95) 35%, rgba(226,232,240,0.85) 70%)",
                                          backgroundSize: "200% 100%",
                                          animation: "reporterHazardViewShimmer 1.2s ease-in-out infinite",
                                        }}
                                      />
                                    ) : imgSrc && isImage ? (
                                      <img
                                        src={imgSrc}
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
                                        <i className="fas fa-image me-1" aria-hidden="true" />
                                        {isImage
                                          ? loadState === "error"
                                            ? "Retry preview"
                                            : "Load preview"
                                          : "Load"}
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
                                  <div
                                    style={{ fontFamily: interFamily, fontSize: "0.75rem", color: "#64748b" }}
                                  >
                                    {a.size_bytes ? `${Math.round((a.size_bytes / 1024) * 10) / 10} KB` : " "}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div
                            className="text-muted"
                            style={{ fontFamily: interFamily, fontSize: "0.9rem" }}
                          >
                            No attachments were submitted with this report.
                          </div>
                        )}
                      </div>

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
                          <div
                            className="text-muted"
                            style={{ fontFamily: interFamily, fontSize: "0.9rem" }}
                          >
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
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </PortalModal>

      <PortalModal
        isOpen={Boolean(imagePreview)}
        onRequestClose={() => setImagePreview(null)}
        ariaLabelledby="reporter-hazard-attachment-title"
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
                  id="reporter-hazard-attachment-title"
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
            <div
              className="account-approvals-detail-body myreports-attachment-body"
              style={{ backgroundColor: "#f9fafb" }}
            >
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

      <style>{`
        @keyframes reporterHazardViewShimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </>
  );
}
