import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import PortalModal from "../../components/PortalModal";
import { api, ensureCsrfCookie } from "../../lib/api";

const interFamily =
  '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';

export default function AdminReportDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [toStatusKey, setToStatusKey] = useState("pending");
  const [note, setNote] = useState("");
  const [showContent, setShowContent] = useState(false);
  const [attachmentPreviewUrls, setAttachmentPreviewUrls] = useState({});
  const [imagePreview, setImagePreview] = useState(null);
  const [attachmentError, setAttachmentError] = useState("");

  const attachments = useMemo(
    () => (Array.isArray(report?.attachments) ? report.attachments : []),
    [report]
  );

  useEffect(() => {
    let cancelled = false;
    const createdUrls = [];
    if (!id || !attachments.length) {
      setAttachmentPreviewUrls({});
      return undefined;
    }
    (async () => {
      const next = {};
      for (const a of attachments) {
        const isImage = String(a?.mime_type || "").toLowerCase().startsWith("image/");
        if (!isImage || !a?.id) continue;
        try {
          const res = await api.get(`/hazards/${id}/attachments/${a.id}`, {
            responseType: "blob",
          });
          if (cancelled) return;
          const url = URL.createObjectURL(res.data);
          next[String(a.id)] = url;
          createdUrls.push(url);
        } catch {
          // Non-image or failed fetch: thumbnail area falls back to icon.
        }
      }
      if (!cancelled) setAttachmentPreviewUrls(next);
    })();
    return () => {
      cancelled = true;
      createdUrls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [attachments, id]);

  const downloadAttachment = useCallback(
    async (attachment) => {
      const attachmentId = attachment?.id;
      if (!attachmentId || !id) return;
      setAttachmentError("");
      try {
        const res = await api.get(`/hazards/${id}/attachments/${attachmentId}`, {
          responseType: "blob",
        });
        const blobUrl = URL.createObjectURL(res.data);
        const filename =
          attachment?.original_name ||
          attachment?.name ||
          `hazard-${id}-attachment-${attachmentId}`;
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1500);
      } catch {
        setAttachmentError("Unable to download this attachment.");
      }
    },
    [id]
  );

  const statusOptions = useMemo(() => {
    const allowed = new Set(["pending", "in_progress", "resolved"]);
    return (statuses ?? []).filter((s) => allowed.has(String(s?.key || "").toLowerCase()));
  }, [statuses]);

  useEffect(() => {
    if (!statusOptions.length) return;
    const exists = statusOptions.some(
      (s) => String(s?.key || "").toLowerCase() === String(toStatusKey || "").toLowerCase()
    );
    if (!exists) setToStatusKey(String(statusOptions[0]?.key || "pending"));
  }, [statusOptions, toStatusKey]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [reportRes, statusRes] = await Promise.all([
        api.get(`/hazards/${id}`),
        api.get("/statuses"),
      ]);
      setReport(reportRes.data?.data ?? null);
      setStatuses(statusRes.data?.data ?? []);
      setAttachmentError("");
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!loading) {
      const raf = requestAnimationFrame(() => setShowContent(true));
      return () => cancelAnimationFrame(raf);
    }
    setShowContent(false);
  }, [loading]);

  async function onChangeStatus(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await ensureCsrfCookie();
      await api.post(`/hazards/${id}/status`, {
        to_status_key: toStatusKey,
        note: note || null,
      });
      setNote("");
      navigate("/admin/inbox");
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        Object.values(err?.response?.data?.errors ?? {})?.[0]?.[0] ||
        err?.message ||
        "Failed to change status";
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
                <i className="fas fa-file-circle-check" />
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
                  Hazard Incident Record
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
                  Record ID: HZR-{String(id || "").padStart(5, "0")} • Loading details and timeline...
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
                Loading report... Please wait.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="page-transition-enter">
        <div className="card border-0 shadow-sm w-100">
          <div className="card-body py-4 text-center">
            <p
              className="mb-2"
              style={{ fontFamily: interFamily, fontSize: "1rem", fontWeight: 600, color: "#111827" }}
            >
              Report not found
            </p>
            <Link to="/admin/inbox" className="btn btn-success btn-sm">
              Back to Inbox
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const currentStatusLabel =
    report.current_status?.label ?? report.currentStatus?.label ?? "Pending";
  const created = new Date(report.created_at);
  const createdText = Number.isNaN(created.getTime()) ? "—" : created.toLocaleString();

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
              <i className="fas fa-file-circle-check" />
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
                Hazard Incident Record
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
                Record ID: HZR-{String(report.id).padStart(5, "0")} • Review details, update status,
                and audit timeline in one view.
              </p>
            </div>

            <div className="d-flex flex-wrap gap-2 mt-2 mt-md-0 ms-md-auto" />
          </div>
        </div>

        <div className="card-body" style={{ backgroundColor: "#ffffff" }}>
          {error ? (
            <div
              className="alert alert-danger py-2 px-3 mb-3"
              style={{ fontFamily: interFamily, fontSize: "0.88rem" }}
            >
              {error}
            </div>
          ) : null}

          <div className="row g-3 align-items-stretch mb-4">
            <div className="col-12 col-lg-8">
              <div
                className="h-100"
                style={{
                  borderRadius: 10,
                  padding: "1rem",
                  backgroundColor: "#ffffff",
                  boxShadow:
                    "0 1px 3px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(148, 163, 184, 0.18)",
                }}
              >
                <div
                  style={{
                    fontFamily: interFamily,
                    fontSize: "0.78rem",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "#6b7280",
                    fontWeight: 700,
                    marginBottom: "0.7rem",
                  }}
                >
                  Report Description
                </div>
                <div
                  style={{
                    fontFamily: interFamily,
                    fontSize: "0.92rem",
                    color: "#1f2937",
                    whiteSpace: "pre-wrap",
                    lineHeight: 1.55,
                    minHeight: 96,
                  }}
                >
                  {report.description || "—"}
                </div>
              </div>
            </div>

            <div className="col-12 col-lg-4">
              <div
                className="h-100"
                style={{
                  borderRadius: 10,
                  padding: "1rem",
                  backgroundColor: "#ffffff",
                  boxShadow:
                    "0 1px 3px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(148, 163, 184, 0.18)",
                }}
              >
                <div
                  style={{
                    fontFamily: interFamily,
                    fontSize: "0.78rem",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "#6b7280",
                    fontWeight: 700,
                    marginBottom: "0.7rem",
                  }}
                >
                  Record Information
                </div>
                <div className="d-grid" style={{ rowGap: "0.5rem" }}>
                  {[
                    ["Status", currentStatusLabel],
                    ["Severity", String(report.severity || "—").toLowerCase()],
                    ["Reporter", report.reporter?.name || report.reporter?.email || "—"],
                    ["Email", report.reporter?.email || "—"],
                    ["Category", report.category?.name || "—"],
                    ["Location", report.location?.name || "—"],
                    ["Created", createdText],
                  ].map(([k, v]) => (
                    <div key={k} className="d-flex align-items-start gap-2">
                      <span
                        style={{
                          minWidth: 72,
                          fontFamily: interFamily,
                          fontSize: "0.82rem",
                          color: "#6b7280",
                          fontWeight: 600,
                        }}
                      >
                        {k}:
                      </span>
                      <span
                        style={{
                          fontFamily: interFamily,
                          fontSize: "0.86rem",
                          color: "#111827",
                          fontWeight: 600,
                          lineHeight: 1.35,
                          wordBreak: "break-word",
                        }}
                      >
                        {v}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div
            className="mb-4"
            style={{
              borderRadius: 10,
              padding: "1rem",
              backgroundColor: "#ffffff",
              boxShadow:
                "0 1px 3px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(148, 163, 184, 0.18)",
            }}
          >
            <div
              style={{
                fontFamily: interFamily,
                fontSize: "0.78rem",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "#6b7280",
                fontWeight: 700,
                marginBottom: "0.65rem",
              }}
            >
              Uploaded attachments
            </div>
            {attachmentError ? (
              <div
                className="alert alert-warning py-2 px-3 mb-3"
                style={{ fontFamily: interFamily, fontSize: "0.85rem" }}
              >
                {attachmentError}
              </div>
            ) : null}
            {attachments.length ? (
              <div
                className="border rounded-3 p-3"
                style={{
                  borderColor: "#e5e7eb",
                  backgroundColor: "#f9fafb",
                }}
              >
                <div className="d-flex flex-wrap gap-3">
                  {attachments.map((a) => {
                    const name = a?.original_name || a?.name || `Attachment #${a?.id ?? ""}`;
                    const size = a?.size_bytes ? `${(Number(a.size_bytes) / 1024).toFixed(1)} KB` : "";
                    const previewUrl = attachmentPreviewUrls[String(a?.id)];
                    return (
                      <div
                        key={String(a?.id ?? name)}
                        className="d-flex align-items-center gap-3 border rounded-3 px-2 py-2"
                        style={{
                          borderColor: "#e5e7eb",
                          backgroundColor: "#ffffff",
                          maxWidth: 360,
                          minWidth: 260,
                          boxShadow:
                            "0 1px 2px rgba(15, 23, 42, 0.06), 0 0 0 1px rgba(148, 163, 184, 0.15)",
                          transition:
                            "transform 0.15s ease-out, box-shadow 0.15s ease-out, border-color 0.15s ease-out",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = "translateY(-1px)";
                          e.currentTarget.style.boxShadow = "0 4px 10px rgba(15, 23, 42, 0.12)";
                          e.currentTarget.style.borderColor = "#cbd5e1";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "translateY(0)";
                          e.currentTarget.style.boxShadow =
                            "0 1px 2px rgba(15, 23, 42, 0.06), 0 0 0 1px rgba(148, 163, 184, 0.15)";
                          e.currentTarget.style.borderColor = "#e5e7eb";
                        }}
                      >
                        <div
                          className="d-flex align-items-center justify-content-center rounded-2"
                          style={{
                            width: 64,
                            height: 64,
                            backgroundColor: "#e5e7eb",
                            flexShrink: 0,
                            overflow: "hidden",
                            cursor: previewUrl ? "pointer" : "default",
                          }}
                          role={previewUrl ? "button" : undefined}
                          tabIndex={previewUrl ? 0 : undefined}
                          aria-label={previewUrl ? `Preview ${name}` : undefined}
                          onClick={() => {
                            if (!previewUrl) return;
                            setImagePreview({ name, url: previewUrl });
                          }}
                          onKeyDown={(e) => {
                            if (e.key !== "Enter" && e.key !== " ") return;
                            e.preventDefault();
                            if (!previewUrl) return;
                            setImagePreview({ name, url: previewUrl });
                          }}
                        >
                          {previewUrl ? (
                            <img
                              src={previewUrl}
                              alt={name}
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />
                          ) : (
                            <i className="fas fa-paperclip" aria-hidden="true" style={{ color: "#166534" }} />
                          )}
                        </div>
                        <div style={{ fontFamily: interFamily, fontSize: "0.8rem", overflow: "hidden", flexGrow: 1 }}>
                          <div title={name} style={{ whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
                            {name}
                          </div>
                          <div style={{ color: "#6b7280" }}>{size}</div>
                        </div>
                        <button
                          type="button"
                          className="btn btn-light btn-sm d-inline-flex align-items-center gap-1"
                          onClick={() => downloadAttachment(a)}
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
              </div>
            ) : (
              <p className="mb-0 text-muted" style={{ fontFamily: interFamily, fontSize: "0.9rem" }}>
                No attachments were submitted with this report.
              </p>
            )}
          </div>

          <div
            className="mb-4"
            style={{
              borderRadius: 10,
              background: "linear-gradient(90deg, rgba(236, 245, 239, 0.9), rgba(243, 249, 245, 0.9))",
              border: "1px solid #d1e2d6",
              padding: "0.95rem 1rem",
            }}
          >
            <div
              className="mb-2"
              style={{
                fontFamily: interFamily,
                fontSize: "0.86rem",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: "#4b5563",
                fontWeight: 700,
              }}
            >
              Change Status
            </div>

            <form onSubmit={onChangeStatus} className="row g-3 align-items-end">
              <div className="col-12 col-md-4">
                <label
                  htmlFor="admin_status_key"
                  className="form-label mb-1"
                  style={{ fontFamily: interFamily, fontWeight: 600, fontSize: "0.82rem", color: "#374151" }}
                >
                  New status
                </label>
                <select
                  id="admin_status_key"
                  className="form-select"
                  value={toStatusKey}
                  onChange={(e) => setToStatusKey(e.target.value)}
                  style={{ fontFamily: interFamily, fontSize: "0.86rem", borderColor: "#cfe2d5", borderRadius: 8 }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#0C8A3B";
                    e.target.style.boxShadow = "0 0 0 0.2rem rgba(12, 138, 59, 0.25)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#cfe2d5";
                    e.target.style.boxShadow = "none";
                  }}
                >
                  {statusOptions.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-12 col-md-5">
                <label
                  htmlFor="admin_status_note"
                  className="form-label mb-1"
                  style={{ fontFamily: interFamily, fontWeight: 600, fontSize: "0.82rem", color: "#374151" }}
                >
                  Note (optional)
                </label>
                <textarea
                  id="admin_status_note"
                  className="form-control"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  placeholder="Add context for this status update"
                  style={{ fontFamily: interFamily, fontSize: "0.86rem", borderColor: "#cfe2d5", borderRadius: 8 }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#0C8A3B";
                    e.target.style.boxShadow = "0 0 0 0.2rem rgba(12, 138, 59, 0.25)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#cfe2d5";
                    e.target.style.boxShadow = "none";
                  }}
                />
              </div>

              <div className="col-12 col-md-3 d-flex flex-column justify-content-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="btn btn-success btn-sm w-100 d-inline-flex align-items-center justify-content-center"
                  style={{
                    fontFamily: interFamily,
                    fontWeight: 600,
                    fontSize: "0.84rem",
                    borderRadius: 8,
                    backgroundColor: "#0C8A3B",
                    borderColor: "#0C8A3B",
                    minHeight: 38,
                    transition:
                      "background-color 0.22s ease, border-color 0.22s ease, transform 0.16s ease, box-shadow 0.22s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (saving) return;
                    e.currentTarget.style.backgroundColor = "#0A6B2E";
                    e.currentTarget.style.borderColor = "#0A6B2E";
                    e.currentTarget.style.transform = "translateY(-1px)";
                  }}
                  onMouseLeave={(e) => {
                    if (saving) return;
                    e.currentTarget.style.backgroundColor = "#0C8A3B";
                    e.currentTarget.style.borderColor = "#0C8A3B";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  {saving ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-check me-2" style={{ fontSize: "0.85rem" }} />
                      Update status
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          <div
            style={{
              borderRadius: 10,
              backgroundColor: "#ffffff",
              boxShadow:
                "0 1px 3px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(148, 163, 184, 0.18)",
              padding: "0.95rem",
            }}
          >
            <div
              className="mb-2"
              style={{
                fontFamily: interFamily,
                fontSize: "0.86rem",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: "#4b5563",
                fontWeight: 700,
              }}
            >
              Timeline
            </div>

            {report.status_history?.length ? (
              <div className="table-responsive myreports-results-responsive">
                <table className="table table-hover align-middle mb-0 myreports-results-table">
                  <thead>
                    <tr
                      style={{
                        fontFamily: interFamily,
                        fontSize: "0.78rem",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                        color: "#6b7280",
                        borderBottom: "1px solid #e5e7eb",
                      }}
                    >
                      <th style={{ minWidth: 44, width: 52, textAlign: "center" }}>#</th>
                      <th style={{ minWidth: 190 }}>When</th>
                      <th style={{ minWidth: 150 }}>Status</th>
                      <th style={{ minWidth: 340 }}>Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.status_history.map((h, index) => {
                      const dt = new Date(h.created_at);
                      const dtText = Number.isNaN(dt.getTime()) ? "—" : dt.toLocaleString();
                      return (
                        <tr key={h.id}>
                          <td
                            style={{
                              fontFamily: interFamily,
                              fontSize: "0.82rem",
                              fontWeight: 600,
                              color: "#6b7280",
                              textAlign: "center",
                              verticalAlign: "middle",
                            }}
                          >
                            {index + 1}
                          </td>
                          <td style={{ fontFamily: interFamily, fontSize: "0.85rem", color: "#111827" }}>
                            {dtText}
                          </td>
                          <td style={{ fontFamily: interFamily, fontSize: "0.85rem", fontWeight: 600, color: "#166534" }}>
                            {h.to_status?.label ?? h.to_status_id ?? "—"}
                          </td>
                          <td
                            style={{
                              fontFamily: interFamily,
                              fontSize: "0.85rem",
                              color: "#374151",
                              whiteSpace: "pre-wrap",
                              lineHeight: 1.35,
                            }}
                          >
                            {h.note || "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div
                className="text-center py-4 border rounded-3"
                style={{
                  borderColor: "#e5e7eb",
                  background:
                    "repeating-linear-gradient(-45deg, #f9fafb, #f9fafb 6px, #f3f4f6 6px, #f3f4f6 12px)",
                }}
              >
                <p
                  className="mb-0"
                  style={{ fontFamily: interFamily, fontWeight: 600, color: "#374151" }}
                >
                  No history yet
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <PortalModal
        isOpen={Boolean(imagePreview)}
        onRequestClose={() => setImagePreview(null)}
        ariaLabelledby="admin-detail-attachment-preview-title"
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
                <h5 id="admin-detail-attachment-preview-title" className="mb-0 fw-semibold">
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

