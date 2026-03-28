import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import SearchableSelect from "../../components/SearchableSelect.jsx";
import PortalModal from "../../components/PortalModal";
import { api } from "../../lib/api";
import { showToast } from "../../services/notificationService";
import { compressImageFile } from "../../lib/imageCompression";

const interFamily =
  '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';

function toLocalInputValue(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export default function AdminEditReport() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [existingAttachmentPreviewUrls, setExistingAttachmentPreviewUrls] = useState({});
  const [newAttachments, setNewAttachments] = useState([]);
  const [newAttachmentPreviewUrls, setNewAttachmentPreviewUrls] = useState([]);
  const [imagePreview, setImagePreview] = useState(null); // { name, url }
  const [form, setForm] = useState({
    category_id: "",
    location_id: "",
    severity: "low",
    observed_at: "",
    description: "",
  });

  const categoryValue = useMemo(() => {
    if (!form.category_id) return "";
    return categories.find((c) => String(c.id) === String(form.category_id))?.name ?? "";
  }, [categories, form.category_id]);

  const locationValue = useMemo(() => {
    if (!form.location_id) return "";
    return locations.find((l) => String(l.id) === String(form.location_id))?.name ?? "";
  }, [locations, form.location_id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const [reportRes, catRes, locRes] = await Promise.all([
          api.get(`/hazards/${id}`),
          api.get("/categories"),
          api.get("/locations"),
        ]);
        if (cancelled) return;
        const r = reportRes.data?.data;
        setCategories(catRes.data?.data ?? []);
        setLocations(locRes.data?.data ?? []);
        setForm({
          category_id: r?.category_id ? String(r.category_id) : "",
          location_id: r?.location_id ? String(r.location_id) : "",
          severity: String(r?.severity || "low").toLowerCase(),
          observed_at: toLocalInputValue(r?.observed_at),
          description: String(r?.description || ""),
        });
        setAttachments(Array.isArray(r?.attachments) ? r.attachments : []);
      } catch (err) {
        if (!cancelled) {
          setError(err?.response?.data?.message || err?.message || "Failed to load report.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!loading) {
      const raf = requestAnimationFrame(() => setShowContent(true));
      return () => cancelAnimationFrame(raf);
    }
    setShowContent(false);
  }, [loading]);

  useEffect(() => {
    const urls = newAttachments.map((file) =>
      file?.type?.startsWith("image/") ? URL.createObjectURL(file) : null
    );
    setNewAttachmentPreviewUrls(urls);
    return () => {
      urls.forEach((u) => {
        if (u) URL.revokeObjectURL(u);
      });
    };
  }, [newAttachments]);

  useEffect(() => {
    let cancelled = false;
    const createdUrls = [];
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
          // Keep non-preview fallback if fetch fails.
        }
      }
      if (!cancelled) setExistingAttachmentPreviewUrls(next);
    })();
    return () => {
      cancelled = true;
      createdUrls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [attachments, id]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.patch(`/hazards/${id}`, {
        category_id: Number(form.category_id),
        location_id: Number(form.location_id),
        severity: form.severity,
        observed_at: form.observed_at ? new Date(form.observed_at).toISOString() : null,
        description: form.description,
      });
      if (newAttachments.length) {
        const formData = new FormData();
        newAttachments.forEach((f) => formData.append("attachments[]", f));
        await api.post(`/hazards/${id}/attachments`, formData);
      }
      navigate("/admin/inbox");
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          Object.values(err?.response?.data?.errors ?? {})?.[0]?.[0] ||
          err?.message ||
          "Failed to save report."
      );
    } finally {
      setSaving(false);
    }
  };

  const removeExistingAttachment = async (attachmentId) => {
    setSaving(true);
    setError("");
    try {
      await api.delete(`/hazards/${id}/attachments/${attachmentId}`);
      setAttachments((prev) => prev.filter((a) => Number(a?.id) !== Number(attachmentId)));
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to remove attachment.");
    } finally {
      setSaving(false);
    }
  };

  const openAttachment = async (attachment) => {
    const attachmentId = attachment?.id;
    if (!attachmentId) return;
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
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to download attachment.");
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
                <i className="fas fa-pen-to-square" />
              </div>
              <div className="flex-grow-1">
                <h2 className="mb-1" style={{ fontFamily: interFamily, fontWeight: 700, fontSize: "1.1rem" }}>
                  Edit Hazard Report
                </h2>
                <p className="mb-0" style={{ fontFamily: interFamily, fontSize: "0.875rem", color: "var(--text-secondary)", fontWeight: 600 }}>
                  Loading form... Please wait.
                </p>
              </div>
            </div>
          </div>
          <div className="card-body">
            <div className="d-flex flex-column align-items-center justify-content-center py-4">
              <div className="spinner-border" role="status" aria-label="Loading" style={{ width: "1.75rem", height: "1.75rem", color: "#0C8A3B" }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-transition-enter">
      <div className="card border-0 shadow-sm w-100" style={{ opacity: showContent ? 1 : 0, transition: "opacity 0.2s ease-out" }}>
        <div className="card-header border-0" style={{ backgroundColor: "#d3e9d7", borderBottom: "1px solid #b5d3ba", padding: "1.1rem 1.75rem" }}>
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
              <i className="fas fa-pen-to-square" />
            </div>
            <div className="flex-grow-1">
              <h2 className="mb-1" style={{ fontFamily: interFamily, fontWeight: 700, fontSize: "1.1rem" }}>
                Edit Hazard Report #{id}
              </h2>
              <p className="mb-0" style={{ fontFamily: interFamily, fontSize: "0.875rem", color: "var(--text-secondary)", fontWeight: 600 }}>
                Same form structure as Submit Hazard Report. Editing is allowed only while pending.
              </p>
            </div>
          </div>
        </div>

        <div className="card-body" style={{ backgroundColor: "#ffffff" }}>
          <form onSubmit={onSubmit} noValidate>
            {error ? (
              <div className="alert alert-danger py-2" role="alert" style={{ fontFamily: interFamily, marginBottom: "1rem" }}>
                {error}
              </div>
            ) : null}

            <div className="mb-3">
              <label className="form-label mb-1" style={{ fontFamily: interFamily, fontWeight: 600, fontSize: "0.9rem" }}>
                Category <span className="text-danger">*</span>
              </label>
              <SearchableSelect
                id="admin_edit_category"
                options={categories.map((c) => c.name)}
                value={categoryValue}
                onChange={(label) => {
                  const match = categories.find((c) => c.name === label);
                  setForm((p) => ({ ...p, category_id: match ? String(match.id) : "" }));
                }}
                disabled={saving}
                placeholder="Search or select category..."
                theme={{ primary: "#0C8A3B", borderColor: "#d1d5db", textPrimary: "#1a2a1a" }}
                inputStyle={{ paddingLeft: 42, paddingRight: 30, height: "38px" }}
              />
            </div>

            <div className="mb-3 mt-2">
              <label className="form-label mb-1" style={{ fontFamily: interFamily, fontWeight: 600, fontSize: "0.9rem" }}>
                Location <span className="text-danger">*</span>
              </label>
              <SearchableSelect
                id="admin_edit_location"
                options={locations.map((l) => l.name)}
                value={locationValue}
                onChange={(label) => {
                  const match = locations.find((l) => l.name === label);
                  setForm((p) => ({ ...p, location_id: match ? String(match.id) : "" }));
                }}
                disabled={saving}
                placeholder="Search or select location..."
                theme={{ primary: "#0C8A3B", borderColor: "#d1d5db", textPrimary: "#1a2a1a" }}
                inputStyle={{ paddingLeft: 42, paddingRight: 30, height: "38px" }}
              />
            </div>

            <div className="row g-3">
              <div className="col-12 col-md-6">
                <label className="form-label mb-1" style={{ fontFamily: interFamily, fontWeight: 600, fontSize: "0.9rem" }}>
                  Severity
                </label>
                <SearchableSelect
                  id="admin_edit_severity"
                  options={["Low", "Medium", "High", "Critical"]}
                  value={form.severity ? form.severity.charAt(0).toUpperCase() + form.severity.slice(1) : ""}
                  onChange={(label) => {
                    const v = String(label || "").toLowerCase();
                    setForm((p) => ({
                      ...p,
                      severity: ["low", "medium", "high", "critical"].includes(v) ? v : "low",
                    }));
                  }}
                  disabled={saving}
                  placeholder="Select severity level..."
                  theme={{ primary: "#0C8A3B", borderColor: "#d1d5db", textPrimary: "#1a2a1a" }}
                  inputStyle={{ paddingLeft: 42, paddingRight: 30, height: "38px" }}
                />
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label mb-1" style={{ fontFamily: interFamily, fontWeight: 600, fontSize: "0.9rem" }}>
                  Date/time observed (optional)
                </label>
                <input
                  type="datetime-local"
                  className="form-control"
                  value={form.observed_at}
                  onChange={(e) => setForm((p) => ({ ...p, observed_at: e.target.value }))}
                  disabled={saving}
                  style={{ borderRadius: 8, border: "1px solid #d1d5db", fontFamily: interFamily }}
                />
              </div>
            </div>

            <div className="mb-3 mt-3">
              <label className="form-label mb-1" style={{ fontFamily: interFamily, fontWeight: 600, fontSize: "0.9rem" }}>
                Description <span className="text-danger">*</span>
              </label>
              <textarea
                className="form-control"
                rows={4}
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                required
                minLength={10}
                disabled={saving}
                placeholder="Enter a clear and concise description of the hazard"
                style={{ borderRadius: 8, border: "1px solid #d1d5db", fontFamily: interFamily }}
              />
              <div className="form-text" style={{ fontFamily: interFamily }}>
                Minimum 10 characters.
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label mb-1" style={{ fontFamily: interFamily, fontWeight: 600, fontSize: "0.9rem" }}>
                Existing Attachments
              </label>
              {attachments.length ? (
                <div
                  className="border rounded p-3"
                  style={{
                    borderColor: "#d1d5db",
                    backgroundColor: "#f3f4f6",
                  }}
                >
                  <div className="d-flex flex-wrap gap-3">
                    {attachments.map((a) => {
                      const name = a?.original_name || a?.name || `Attachment #${a?.id ?? ""}`;
                      const size = a?.size_bytes ? `${(Number(a.size_bytes) / 1024).toFixed(1)} KB` : "";
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
                            e.currentTarget.style.borderColor = "#cbd5f5";
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
                              cursor: existingAttachmentPreviewUrls[String(a?.id)] ? "pointer" : "default",
                            }}
                            role="button"
                            tabIndex={0}
                            aria-label={`View ${name}`}
                            onClick={() => {
                              const url = existingAttachmentPreviewUrls[String(a?.id)];
                              if (!url) return;
                              setImagePreview({ name, url });
                            }}
                            onKeyDown={(e) => {
                              if (e.key !== "Enter" && e.key !== " ") return;
                              e.preventDefault();
                              const url = existingAttachmentPreviewUrls[String(a?.id)];
                              if (!url) return;
                              setImagePreview({ name, url });
                            }}
                          >
                            {existingAttachmentPreviewUrls[String(a?.id)] ? (
                              <img
                                src={existingAttachmentPreviewUrls[String(a?.id)]}
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
                          <div className="d-flex align-items-center gap-2">
                            <button
                              type="button"
                              className="btn btn-light btn-sm d-inline-flex align-items-center gap-1"
                              onClick={() => openAttachment(a)}
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
                            <button
                              type="button"
                              className="btn btn-light btn-sm"
                              onClick={() => removeExistingAttachment(a?.id)}
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
                              aria-label={`Remove ${name}`}
                            >
                              <i className="fas fa-times" aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="form-text" style={{ fontFamily: interFamily }}>
                  No attachments uploaded for this report.
                </div>
              )}
            </div>

            <div className="mb-3">
              <label
                htmlFor="admin_edit_attachments"
                className="form-label mb-1"
                style={{ fontFamily: interFamily, fontWeight: 600, fontSize: "0.9rem" }}
              >
                Add Attachments (optional)
              </label>
              <input
                id="admin_edit_attachments"
                type="file"
                className="form-control"
                multiple
                accept="image/*"
                onChange={(e) => {
                  const rawFiles = Array.from(e.target.files ?? []);
                  if (!rawFiles.length) return;
                  const imageFiles = rawFiles.filter((file) => file.type?.startsWith("image/"));
                  if (imageFiles.length === 0) {
                    showToast.error("Only image files (JPEG, PNG, GIF, etc.) are allowed as attachments.");
                    e.target.value = "";
                    return;
                  }
                  (async () => {
                    try {
                      const MAX_BYTES = 1800000;
                      const compressed = [];
                      for (const f of imageFiles) {
                        compressed.push(await compressImageFile(f, { maxSizeBytes: MAX_BYTES }));
                      }
                      setNewAttachments((prev) => [...prev, ...compressed]);
                    } catch {
                      setNewAttachments((prev) => [...prev, ...imageFiles]);
                      showToast.error("Could not compress attachments; trying original files.");
                    } finally {
                      e.target.value = "";
                    }
                  })();
                }}
                disabled={saving}
              />
              <div className="form-text" style={{ fontFamily: interFamily }}>
                You can upload multiple image files. They will be uploaded when you save changes.
              </div>
              {newAttachments.length > 0 && (
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
                      onClick={() => setNewAttachments([])}
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
                    {newAttachments.map((file, index) => {
                      const previewUrl = newAttachmentPreviewUrls[index];
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
                            e.currentTarget.style.boxShadow = "0 4px 10px rgba(15, 23, 42, 0.12)";
                            e.currentTarget.style.borderColor = "#cbd5f5";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "translateY(0)";
                            e.currentTarget.style.boxShadow =
                              "0 1px 2px rgba(15, 23, 42, 0.06), 0 0 0 1px rgba(148, 163, 184, 0.15)";
                            e.currentTarget.style.borderColor = "#e5e7eb";
                          }}
                        >
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
                            {previewUrl ? (
                              <img
                                src={previewUrl}
                                alt={file.name}
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "cover",
                                }}
                              />
                            ) : null}
                          </div>
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
                            <div style={{ color: "#6b7280" }}>{(file.size / 1024).toFixed(1)} KB</div>
                          </div>
                          <button
                            type="button"
                            className="btn btn-light btn-sm"
                            onClick={() =>
                              setNewAttachments((prev) => prev.filter((_, i) => i !== index))
                            }
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

            <hr className="my-4" />
            <PortalModal
              isOpen={Boolean(imagePreview)}
              onRequestClose={() => setImagePreview(null)}
              ariaLabelledby="admin-edit-attachment-preview-title"
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
                      <h5 id="admin-edit-attachment-preview-title" className="mb-0 fw-semibold">
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

            <div className="d-flex flex-wrap gap-2 justify-content-end">
              <Link
                to="/admin/inbox"
                className="btn btn-outline-secondary"
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
              </Link>
              <button
                type="submit"
                className="btn"
                disabled={saving}
                style={{
                  minWidth: 150,
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
                  transition: "background-color 0.2s ease, border-color 0.2s ease",
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
                {saving ? <span className="spinner-border spinner-border-sm" aria-hidden="true" /> : <i className="fas fa-save" aria-hidden="true" />}
                <span>{saving ? "Saving…" : "Save Changes"}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

