import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import PortalModal from "../../components/PortalModal";
import ReporterHazardViewModal from "../../components/reporter/ReporterHazardViewModal";
import SearchableSelect from "../../components/SearchableSelect.jsx";
import { showToast } from "../../services/notificationService";
import { compressImageFile } from "../../lib/imageCompression";

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
  const [viewModalDataRevision, setViewModalDataRevision] = useState(0);
  const [attachmentObjectUrls, setAttachmentObjectUrls] = useState({}); // { [key: string]: string }
  const [attachmentObjectUrlErrors, setAttachmentObjectUrlErrors] = useState({}); // { [key: string]: string }
  const [attachmentLoadStates, setAttachmentLoadStates] = useState({}); // { [key: string]: 'idle'|'loading'|'loaded'|'error' }

  // Edit/Delete
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editReportId, setEditReportId] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [editForm, setEditForm] = useState({
    category_id: "",
    location_id: "",
    severity: "low",
    observed_at: "",
    description: "",
  });
  const [editAttachments, setEditAttachments] = useState([]);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { id, label }
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

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
        const [res, catRes, locRes] = await Promise.all([
          api.get("/hazards/my"),
          api.get("/categories"),
          api.get("/locations"),
        ]);
        if (!cancelled) {
          setData(res.data);
          setCategories(catRes.data?.data ?? []);
          setLocations(locRes.data?.data ?? []);
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
  const resolvedCount = rows.filter((r) => {
    const key =
      r.currentStatus?.key ??
      r.current_status?.key ??
      r.currentStatus?.key ??
      "";
    const label =
      r.currentStatus?.label ?? r.current_status?.label ?? String(r.current_status_id || "");
    const normKey = String(key || "").toLowerCase();
    const normLabel = String(label || "").toLowerCase();
    if (normKey) return normKey === "resolved";
    return normLabel === "resolved";
  }).length;
  const pendingCount = rows.filter((r) => {
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
        const normalizedKey = statusKey === "new" ? "pending" : statusKey;
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

  const buildAttachmentCandidates = (raw, reportId, attachmentId) => {
    const v = raw ? String(raw).trim() : "";
    const apiCandidates = [];
    if (reportId && attachmentId) {
      // Prefer authenticated API streaming (works even when storage is private).
      apiCandidates.push(`hazards/${reportId}/attachments/${attachmentId}`);
    }
    if (!v) return apiCandidates;
    if (/^https?:\/\//i.test(v) || v.startsWith("/")) return [...apiCandidates, v];
    // filename or relative path; try common Laravel public storage routes
    return [
      ...apiCandidates,
      v,
      `/storage/${v}`,
      `/storage/attachments/${v}`,
      `/uploads/${v}`,
    ];
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
    // A leading `/` would make us treat it like a public same-origin path.
    if (isApiAttachmentCandidate(raw)) return raw.replace(/^\/+/, "");
    // Prefer same-origin relative URLs so Vite can proxy them in dev (avoids CORS).
    if (raw.startsWith("/")) return raw;
    if (/^https?:\/\//i.test(raw)) {
      try {
        const u = new URL(raw);
        // If this absolute URL points to our configured backend, strip to a relative path.
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
    const reportId =
      typeof attachment === "object"
        ? attachment?.hazard_report_id ?? editReportId ?? null
        : editReportId ?? null;
    const candidates = buildAttachmentCandidates(
      raw,
      reportId,
      typeof attachment === "object" ? attachment?.id : null
    ).map(normalizeAttachmentUrl);
    if (!candidates.length) return "";

    // Try candidates until one works (auth-aware via Axios instance).
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
          err?.response?.data?.message ||
          err?.message ||
          `Failed to load ${candidate}`;
      }
    }

    setAttachmentObjectUrlErrors((prev) => ({ ...prev, [key]: lastError || "Failed to load image" }));
    setAttachmentLoadStates((prev) => ({ ...prev, [key]: "error" }));
    return "";
  };

  const openViewModal = (id) => {
    setActiveViewReportId(id);
    setIsViewModalOpen(true);
  };

  const closeViewModal = () => {
    setIsViewModalOpen(false);
  };

  const toDatetimeLocal = (value) => {
    if (!value) return "";
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
      d.getHours()
    )}:${pad(d.getMinutes())}`;
  };

  const openEditModal = (id) => {
    setEditError("");
    setEditReportId(id);
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
  };

  useEffect(() => {
    if (!isEditModalOpen || !editReportId) return;
    let cancelled = false;
    (async () => {
      setEditLoading(true);
      setEditError("");
      try {
        const res = await api.get(`/hazards/${editReportId}`);
        if (cancelled) return;
        const r = res.data?.data ?? null;
        setEditForm({
          category_id: r?.category_id ? String(r.category_id) : String(r?.category?.id ?? ""),
          location_id: r?.location_id ? String(r.location_id) : String(r?.location?.id ?? ""),
          severity: String(r?.severity ?? "low").toLowerCase(),
          observed_at: toDatetimeLocal(r?.observed_at ?? r?.observedAt ?? ""),
          description: String(r?.description ?? ""),
        });
        setEditAttachments(Array.isArray(r?.attachments) ? r.attachments : []);
      } catch (err) {
        if (cancelled) return;
        setEditError(
          err?.response?.data?.message || err?.message || "Unable to load report for editing."
        );
      } finally {
        if (!cancelled) setEditLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isEditModalOpen, editReportId]);

  const patchRowInList = (updated) => {
    if (!updated?.id) return;
    setData((prev) => {
      const rows = prev?.data;
      if (!Array.isArray(rows)) return prev;
      const nextRows = rows.map((r) => (String(r.id) === String(updated.id) ? { ...r, ...updated } : r));
      return { ...(prev || {}), data: nextRows };
    });
  };

  const patchAttachmentsForReport = (id, attachments) => {
    setData((prev) => {
      const rows = prev?.data;
      if (!Array.isArray(rows)) return prev;
      const nextRows = rows.map((r) =>
        String(r.id) === String(id) ? { ...r, attachments: Array.isArray(attachments) ? attachments : [] } : r
      );
      return { ...(prev || {}), data: nextRows };
    });
    if (String(activeViewReportId || "") === String(id)) {
      setViewModalDataRevision((n) => n + 1);
    }
  };

  const uploadEditAttachments = async (files) => {
    if (!editReportId || !files.length) return;
    const imageFiles = files.filter((file) => file.type?.startsWith("image/"));
    if (!imageFiles.length) return;

    // Deployed servers may have stricter upload limits; compress before upload.
    const MAX_BYTES = 1800000; // ~1.8MB safety buffer
    const compressedFiles = [];
    try {
      for (const f of imageFiles) {
        compressedFiles.push(await compressImageFile(f, { maxSizeBytes: MAX_BYTES }));
      }
    } catch {
      // If compression fails, fall back to original.
      compressedFiles.push(...imageFiles);
      showToast.error("Could not compress attachments; trying original files.");
    }

    const form = new FormData();
    compressedFiles.forEach((f) => form.append("attachments[]", f));
    setEditSaving(true);
    try {
      // Let Axios/browser set the correct multipart boundary.
      const res = await api.post(`/hazards/${editReportId}/attachments`, form);
      const list = res.data?.data ?? [];
      setEditAttachments(list);
      patchAttachmentsForReport(editReportId, list);
    } catch (err) {
      setEditError(
        err?.response?.data?.message ||
          Object.values(err?.response?.data?.errors ?? {})?.[0]?.[0] ||
          err?.message ||
          "Failed to upload attachments."
      );
    } finally {
      setEditSaving(false);
    }
  };

  const removeEditAttachment = async (attachmentId) => {
    if (!editReportId || !attachmentId) return;
    setEditSaving(true);
    try {
      const res = await api.delete(`/hazards/${editReportId}/attachments/${attachmentId}`);
      const list = res.data?.data ?? [];
      setEditAttachments(list);
      patchAttachmentsForReport(editReportId, list);
    } catch (err) {
      setEditError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to remove attachment. It may have already been deleted."
      );
    } finally {
      setEditSaving(false);
    }
  };

  // Preload image thumbnails for the edit modal when opened.
  useEffect(() => {
    if (!isEditModalOpen) return;
    if (!editReportId) return;
    if (!editAttachments.length) return;
    editAttachments.slice(0, 6).forEach((att, idx) => {
      const name =
        (typeof att === "string"
          ? String(att).split("/").pop()
          : att?.original_name ?? att?.originalName ?? att?.name) || `Attachment ${idx + 1}`;
      const key = getAttachmentKey(att, name);
      if (!key) return;
      if (attachmentObjectUrls[key] || attachmentObjectUrlErrors[key]) return;
      const raw = getAttachmentRaw(att);
      if (!isProbablyImage(name) && !isProbablyImage(raw)) return;
      fetchAttachmentObjectUrl(att, name);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditModalOpen, editReportId, editAttachments]);

  const removeRowFromList = (id) => {
    setData((prev) => {
      const rows = prev?.data;
      if (!Array.isArray(rows)) return prev;
      const nextRows = rows.filter((r) => String(r.id) !== String(id));
      return { ...(prev || {}), data: nextRows };
    });
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    if (!editReportId) return;
    setEditSaving(true);
    setEditError("");
    try {
      const payload = {
        category_id: editForm.category_id ? Number(editForm.category_id) : undefined,
        location_id: editForm.location_id ? Number(editForm.location_id) : undefined,
        severity: editForm.severity || undefined,
        observed_at: editForm.observed_at ? new Date(editForm.observed_at).toISOString() : null,
        description: editForm.description,
      };
      const res = await api.patch(`/hazards/${editReportId}`, payload);
      const updated = res.data?.data ?? null;
      patchRowInList(updated);
      if (String(activeViewReportId || "") === String(editReportId || "")) {
        setViewModalDataRevision((n) => n + 1);
      }
      showToast.success("Report updated successfully.");
      setIsEditModalOpen(false);
      setEditReportId(null);
    } catch (err) {
      setEditError(
        err?.response?.data?.message ||
          Object.values(err?.response?.data?.errors ?? {})?.[0]?.[0] ||
          err?.message ||
          "Failed to save changes."
      );
    } finally {
      setEditSaving(false);
    }
  };

  const confirmDelete = (r) => {
    setDeleteError("");
    setDeleteConfirm({
      id: r?.id,
      label: `Hazard Report #${r?.id ?? ""}`,
    });
  };

  const closeDeleteConfirm = () => {
    setDeleteConfirm(null);
    setDeleteError("");
  };

  const performDelete = async () => {
    const id = deleteConfirm?.id;
    if (!id) return;
    setDeleteLoading(true);
    setDeleteError("");
    try {
      await api.delete(`/hazards/${id}`);
      // If modal was open for this report, close it.
      if (String(activeViewReportId || "") === String(id)) {
        closeViewModal();
      }
      removeRowFromList(id);
      closeDeleteConfirm();
      showToast.success("Report deleted successfully.");
    } catch (err) {
      setDeleteError(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to delete this report. It may already be under review."
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  useEffect(() => {
    if (isViewModalOpen) return;
    const t = setTimeout(() => setActiveViewReportId(null), 220);
    return () => clearTimeout(t);
  }, [isViewModalOpen]);

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
                  My Hazard Reports
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
                  Hazard reports you submitted. Use the table below to review status and open
                  full records.
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
                My Hazard Reports
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
                <span>Submit Hazard Report</span>
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
                      Hazard reports you have submitted.
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
                    aria-hidden="true"
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
                    <div
                      style={{
                        fontSize: "1.4rem",
                        fontWeight: 700,
                        color: "#15803d",
                        lineHeight: 1.1,
                      }}
                    >
                      {resolvedCount}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                      Hazard reports that have been resolved.
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
                      Pending Hazard Reports
                    </div>
                    <div
                      style={{
                        fontSize: "1.4rem",
                        fontWeight: 700,
                        color: "#0f766e",
                        lineHeight: 1.1,
                      }}
                    >
                      {pendingCount}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                      Hazard reports awaiting closure or resolution.
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
                  {summaryModalType === "total" && "Total Hazard Reports"}
                  {summaryModalType === "pending" && "Pending Hazard Reports"}
                  {summaryModalType === "resolved" && "Resolved Hazard Reports"}
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
                {summaryModalType === "pending" && pendingCount}
                {summaryModalType === "resolved" && resolvedCount}
              </div>
              <div
                style={{
                  fontFamily: interFamily,
                  fontSize: "0.95rem",
                  color: "#4b5563",
                  textAlign: "center",
                }}
              >
                {summaryModalType === "total" && "Total Hazard Reports you have submitted."}
                {summaryModalType === "pending" &&
                  "Hazard reports awaiting closure or resolution."}
                {summaryModalType === "resolved" && "Hazard reports that have been resolved."}
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
                <option value="pending">Pending</option>
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
                      <th style={{ minWidth: 190 }}>Actions</th>
                      <th style={{ minWidth: 180 }}>Category</th>
                      <th style={{ minWidth: 190 }}>Location</th>
                      <th style={{ minWidth: 120 }}>Severity</th>
                      <th style={{ minWidth: 150 }}>Status</th>
                      <th style={{ minWidth: 210 }}>Created</th>
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
                          .toLowerCase() || "pending";
                      const canMutate = statusKey === "pending" || statusKey === "new";

                      const statusLabelRaw =
                      r.currentStatus?.label ??
                        r.current_status?.label ??
                        r.current_status_id ??
                        null;
                      const statusLabel =
                        statusKey === "new" || !statusLabelRaw ? "Pending" : String(statusLabelRaw);
                    const created =
                        r.created_at instanceof Date ? r.created_at : new Date(r.created_at);
                      const rowNumber = pageStart + index + 1;
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
                                  border: "1px solid #bbf7d0",
                                  backgroundColor: "#ffffff",
                                  color: "#166534",
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
                                aria-label={`View report ${r.id}`}
                              >
                                <i className="fas fa-eye" aria-hidden="true" />
                                <span>View</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => openEditModal(r.id)}
                                disabled={!canMutate}
                                title={!canMutate ? "Editing is allowed only while the report is open." : undefined}
                                style={{
                                  borderRadius: 6,
                                  border: !canMutate ? "1px solid #e5e7eb" : "1px solid #a7f3d0",
                                  backgroundColor: "#ffffff",
                                  color: !canMutate ? "#9ca3af" : "#065f46",
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
                                aria-label={`Edit report ${r.id}`}
                              >
                                <i className="fas fa-pen" aria-hidden="true" />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => confirmDelete(r)}
                                disabled={!canMutate}
                                title={!canMutate ? "Deleting is allowed only while the report is open." : undefined}
                                style={{
                                  borderRadius: 6,
                                  border: !canMutate ? "1px solid #e5e7eb" : "1px solid #fecaca",
                                  backgroundColor: "#ffffff",
                                  color: !canMutate ? "#9ca3af" : "#b91c1c",
                                  fontFamily: interFamily,
                                  fontWeight: 700,
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
                                aria-label={`Delete report ${r.id}`}
                              >
                                <i className="fas fa-trash" aria-hidden="true" />
                                <span>Delete</span>
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
                            <span
                              style={truncateStyle}
                              title={Number.isNaN(created.getTime()) ? "" : created.toLocaleString()}
                            >
                              {Number.isNaN(created.getTime()) ? "—" : created.toLocaleString()}
                            </span>
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

      <ReporterHazardViewModal
        isOpen={isViewModalOpen}
        reportId={activeViewReportId}
        onClose={closeViewModal}
        dataRevision={viewModalDataRevision}
        ariaTitleId="myreports-view-title"
      />

      {/* Edit report modal */}
      <PortalModal
        isOpen={isEditModalOpen}
        onRequestClose={closeEditModal}
        ariaLabelledby="myreports-edit-title"
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
                id="myreports-edit-title"
                className="mb-0 fw-semibold"
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {editReportId ? `Edit Hazard Report #${editReportId}` : "Edit hazard report"}
              </h5>
              <div className="account-approvals-detail-subtitle">
                <span className="account-approvals-detail-name">
                  You can edit reports only while they are still pending.
                </span>
              </div>
            </div>
            <button type="button" className="btn-close-custom" aria-label="Close" onClick={closeEditModal}>
              ×
            </button>
          </div>

          <form
            onSubmit={submitEdit}
            style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}
          >
            <div className="account-approvals-detail-body" style={{ flex: 1, minHeight: 0 }}>
              {editError ? (
                <div className="alert alert-danger py-2 mb-3" role="alert">
                  {editError}
                </div>
              ) : null}

              {editLoading ? (
                <div className="d-flex flex-column align-items-center justify-content-center py-4">
                  <div
                    className="spinner-border"
                    role="status"
                    aria-label="Loading"
                    style={{ width: "1.6rem", height: "1.6rem", color: "#0C8A3B" }}
                  />
                  <p className="mt-3 mb-0 text-muted" style={{ fontSize: "0.9rem" }}>
                    Loading report…
                  </p>
                </div>
              ) : (
                <div style={{ display: "grid", gap: 12 }}>
                <div>
                  <label className="form-label mb-1" style={{ fontWeight: 700, fontSize: "0.85rem" }}>
                    Category
                  </label>
                  <SearchableSelect
                    id="myreports_edit_category"
                    options={categories.map((c) => c.name)}
                    value={
                      editForm.category_id
                        ? categories.find((c) => String(c.id) === String(editForm.category_id))?.name ?? ""
                        : ""
                    }
                    onChange={(label) => {
                      const match = categories.find((c) => c.name === label);
                      setEditForm((p) => ({
                        ...p,
                        category_id: match ? String(match.id) : "",
                      }));
                    }}
                    disabled={editSaving}
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

                <div>
                  <label className="form-label mb-1" style={{ fontWeight: 700, fontSize: "0.85rem" }}>
                    Location
                  </label>
                  <SearchableSelect
                    id="myreports_edit_location"
                    options={locations.map((l) => l.name)}
                    value={
                      editForm.location_id
                        ? locations.find((l) => String(l.id) === String(editForm.location_id))?.name ?? ""
                        : ""
                    }
                    onChange={(label) => {
                      const match = locations.find((l) => l.name === label);
                      setEditForm((p) => ({
                        ...p,
                        location_id: match ? String(match.id) : "",
                      }));
                    }}
                    disabled={editSaving}
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

                <div>
                  <label className="form-label mb-1" style={{ fontWeight: 700, fontSize: "0.85rem" }}>
                    Severity
                  </label>
                  <SearchableSelect
                    id="myreports_edit_severity"
                    options={["Low", "Medium", "High", "Critical"]}
                    value={
                      editForm.severity
                        ? String(editForm.severity).charAt(0).toUpperCase() +
                          String(editForm.severity).slice(1)
                        : ""
                    }
                    onChange={(label) => {
                      const v = String(label || "").toLowerCase();
                      setEditForm((p) => ({
                        ...p,
                        severity: ["low", "medium", "high", "critical"].includes(v) ? v : "low",
                      }));
                    }}
                    disabled={editSaving}
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

                <div>
                  <label className="form-label mb-1" style={{ fontWeight: 700, fontSize: "0.85rem" }}>
                    Date/time observed (optional)
                  </label>
                  <input
                    type="datetime-local"
                    className="form-control"
                    value={editForm.observed_at}
                    onChange={(e) => setEditForm((p) => ({ ...p, observed_at: e.target.value }))}
                    disabled={editSaving}
                    style={{
                      borderRadius: 8,
                      border: "1px solid #d1d5db",
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

                <div>
                  <label className="form-label mb-1" style={{ fontWeight: 700, fontSize: "0.85rem" }}>
                    Description
                  </label>
                  <textarea
                    className="form-control"
                    rows={4}
                    value={editForm.description}
                    onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                    disabled={editSaving}
                    minLength={10}
                    required
                    style={{
                      borderRadius: 8,
                      border: "1px solid #d1d5db",
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
                  <div className="form-text">Minimum 10 characters.</div>
                </div>

                <div>
                  <label className="form-label mb-1" style={{ fontWeight: 700, fontSize: "0.85rem" }}>
                    Attachments
                  </label>
                  <input
                    id="myreports_edit_attachments"
                    type="file"
                    className="form-control"
                    multiple
                    accept="image/*"
                    disabled={editSaving}
                    onChange={(e) => {
                      const rawFiles = Array.from(e.target.files ?? []);
                      if (!rawFiles.length) return;
                      const nonImageFiles = rawFiles.filter(
                        (file) => !file.type?.startsWith("image/")
                      );
                      if (nonImageFiles.length) {
                        const msg = "Only image files are allowed for attachments.";
                        showToast.error(msg);
                        e.target.value = "";
                        return;
                      }

                      uploadEditAttachments(rawFiles);
                      e.target.value = "";
                    }}
                  />
                  <div className="form-text">You can upload additional image files (JPEG, PNG, etc.).</div>
                  {editAttachments.length > 0 && (
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
                            fontWeight: 600,
                            fontSize: "0.8rem",
                            letterSpacing: "0.04em",
                            textTransform: "uppercase",
                            color: "#4b5563",
                          }}
                        >
                          Existing attachments
                        </div>
                      </div>
                      <div className="d-flex flex-wrap gap-3">
                        {editAttachments.map((a) => {
                          const name =
                            (typeof a === "string"
                              ? String(a).split("/").pop()
                              : a.original_name ?? a.originalName ?? a.name) || "Attachment";
                          const key = getAttachmentKey(a, name);
                          const raw = getAttachmentRaw(a);
                          const reportId = editReportId ?? a.hazard_report_id;
                          const objectUrl = attachmentObjectUrls[key] || "";
                          const imgSrc = objectUrl;
                          const isImage =
                            isProbablyImage(name) || isProbablyImage(raw);
                          return (
                            <div
                              key={String(a.id ?? name)}
                              className="d-flex align-items-center gap-3 border rounded-3 px-2 py-2"
                              style={{
                                borderColor: "#e5e7eb",
                                backgroundColor: "#ffffff",
                                maxWidth: 320,
                                minWidth: 260,
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
                                  cursor: imgSrc && isImage ? "pointer" : "default",
                                }}
                                role="button"
                                tabIndex={0}
                                aria-label={`Preview ${name}`}
                                onClick={async () => {
                                  const url =
                                    objectUrl ||
                                    directPublicUrl ||
                                    (await fetchAttachmentObjectUrl(a, name));
                                  if (!url) return;
                                  setImagePreview({ name, url });
                                }}
                                onKeyDown={(e) => {
                                  if (e.key !== "Enter" && e.key !== " ") return;
                                  e.preventDefault();
                                  (async () => {
                                    const url =
                                      objectUrl ||
                                      directPublicUrl ||
                                      (await fetchAttachmentObjectUrl(a, name));
                                    if (!url) return;
                                    setImagePreview({ name, url });
                                  })();
                                }}
                              >
                                {imgSrc && isImage ? (
                                  <img
                                    src={imgSrc}
                                    alt={name}
                                    style={{
                                      width: "100%",
                                      height: "100%",
                                      objectFit: "cover",
                                    }}
                                  />
                                ) : (
                                  <i
                                    className="fas fa-image"
                                    aria-hidden="true"
                                    style={{
                                      width: "100%",
                                      height: "100%",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      color: "#9ca3af",
                                    }}
                                  />
                                )}
                              </div>
                              <div
                                style={{
                                  fontSize: "0.8rem",
                                  overflow: "hidden",
                                  flexGrow: 1,
                                }}
                              >
                                <div
                                  title={name}
                                  style={{
                                    whiteSpace: "nowrap",
                                    textOverflow: "ellipsis",
                                    overflow: "hidden",
                                  }}
                                >
                                  {name}
                                </div>
                                <div style={{ color: "#6b7280" }}>
                                  {a.size_bytes ? `${Math.round((a.size_bytes / 1024) * 10) / 10} KB` : ""}
                                </div>
                              </div>
                              <button
                                type="button"
                                className="btn btn-light btn-sm"
                                onClick={() => removeEditAttachment(a.id)}
                                disabled={editSaving}
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
                </div>
              )}
            </div>

            <div className="account-approvals-detail-footer">
              <button
                type="button"
                className="btn btn-light account-approvals-detail-close-btn"
                onClick={closeEditModal}
                disabled={editSaving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary logout-confirm-signout-btn"
                disabled={editSaving || editLoading}
                style={{ minWidth: 120 }}
              >
                {editSaving ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        </div>
      </PortalModal>

      {/* Delete confirm modal */}
      <PortalModal
        isOpen={Boolean(deleteConfirm)}
        onRequestClose={closeDeleteConfirm}
        ariaLabelledby="myreports-delete-title"
        overlayClassName="account-approvals-detail-overlay"
        backdropClassName="account-approvals-detail-backdrop"
        panelClassName="account-approvals-detail-modal myreports-delete-modal"
        durationMs={220}
        closeOnBackdrop
        closeOnEsc
      >
        <div className="account-approvals-detail-header">
          <div className="account-approvals-detail-header-text">
            <h5 id="myreports-delete-title" className="mb-0 fw-semibold" style={{ fontFamily: interFamily }}>
              Delete report?
            </h5>
            <div className="account-approvals-detail-subtitle">
              <span className="account-approvals-detail-name" style={{ fontFamily: interFamily }}>
                {deleteConfirm?.label || "This action cannot be undone."}
              </span>
            </div>
          </div>
          <button type="button" className="btn-close-custom" aria-label="Close" onClick={closeDeleteConfirm}>
            ×
          </button>
        </div>
        <div className="account-approvals-detail-body" style={{ fontFamily: interFamily }}>
          {deleteError ? (
            <div className="alert alert-danger py-2 mb-3" role="alert">
              {deleteError}
            </div>
          ) : null}
          <p className="mb-0" style={{ color: "#475569" }}>
            This will permanently remove the report, its timeline entries, and any uploaded attachments.
            Reports under review cannot be deleted.
          </p>
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
  );
}

