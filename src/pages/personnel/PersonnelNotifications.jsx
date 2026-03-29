import React, { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import ReporterHazardViewModal from "../../components/reporter/ReporterHazardViewModal";

const interFamily =
  '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';

export default function PersonnelNotifications() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showContent, setShowContent] = useState(false);
  const [viewReportId, setViewReportId] = useState(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);

  const canMarkAllRead = useMemo(() => unreadCount > 0, [unreadCount]);

  const load = async ({ showLoading = false } = {}) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const res = await api.get("/notifications");
      setNotifications(res.data?.data ?? []);
      setUnreadCount(res.data?.unread_count ?? 0);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loading) {
      const id = requestAnimationFrame(() => setShowContent(true));
      return () => cancelAnimationFrame(id);
    }
    setShowContent(false);
  }, [loading]);

  useEffect(() => {
    if (viewModalOpen) return;
    const t = setTimeout(() => setViewReportId(null), 220);
    return () => clearTimeout(t);
  }, [viewModalOpen]);

  const openReportModal = (hazardReportId) => {
    setViewReportId(hazardReportId);
    setViewModalOpen(true);
  };

  const closeReportModal = () => {
    setViewModalOpen(false);
  };

  const markAllRead = async () => {
    try {
      await api.patch("/notifications/read-all");
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to mark notifications as read.");
    }
  };

  const markRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to update notification.");
    }
  };

  const loadingHeader = (
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
          <i className="fas fa-bell" aria-hidden="true" />
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
            Notification Center
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
            Loading your alerts. Preparing records…
          </p>
        </div>
      </div>
    </div>
  );

  const loadedHeader = (
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
          <i className="fas fa-bell" aria-hidden="true" />
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
            Notification Center
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
            Updates on hazard reports you follow. Open a report or mark items as read when you are
            done.
          </p>
        </div>

        <div className="d-flex flex-wrap align-items-center gap-2 mt-2 mt-md-0">
          <span
            style={{
              fontFamily: interFamily,
              fontSize: "0.8rem",
              fontWeight: 700,
              color: unreadCount > 0 ? "#166534" : "#6b7280",
            }}
          >
            {unreadCount} unread
          </span>
          <button
            type="button"
            className="btn btn-outline-success btn-sm d-inline-flex align-items-center justify-content-center"
            onClick={markAllRead}
            disabled={!canMarkAllRead}
            style={{
              fontFamily: interFamily,
              fontSize: "0.8rem",
              padding: "0.4rem 1.1rem",
              borderRadius: 8,
            }}
          >
            <i className="fas fa-check-double me-2" aria-hidden="true" />
            <span>Mark all as read</span>
          </button>
          <button
            type="button"
            className="btn btn-light btn-sm d-inline-flex align-items-center justify-content-center"
            onClick={() => load({ showLoading: true })}
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
  );

  if (loading) {
    return (
      <div className="page-transition-enter">
        <div className="card border-0 shadow-sm w-100">
          {loadingHeader}
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
                Loading notifications… Please wait.
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
        {loadedHeader}
        <div className="card-body" style={{ backgroundColor: "#ffffff" }}>
          {error ? (
            <div
              className="alert alert-danger py-2 mb-3"
              role="alert"
              style={{ fontFamily: interFamily }}
            >
              {error}
            </div>
          ) : null}

          {!notifications.length ? (
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
                No notifications yet
              </p>
              <p
                className="mb-0 text-muted"
                style={{ fontFamily: interFamily, fontSize: "0.9rem" }}
              >
                When there are updates to reports you care about, they will appear here.
              </p>
            </div>
          ) : (
            <div className="d-flex flex-column gap-3">
              {notifications.map((n) => {
                const hazardId = n?.hazard_report_id;
                const isUnread = !n?.read_at;
                const createdAt = n?.created_at ? new Date(n.created_at).toLocaleString() : "";
                const statusKey = n?.status_key ? String(n.status_key) : "";
                const statusLabel = statusKey
                  ? statusKey.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
                  : "";

                return (
                  <div
                    key={n.id}
                    className="card border shadow-sm"
                    style={{
                      borderColor: "#e5e7eb",
                      backgroundColor: isUnread ? "#f0fdf4" : "#ffffff",
                    }}
                  >
                    <div className="card-body py-3">
                      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start gap-3">
                        <div className="min-w-0 flex-grow-1">
                          <div
                            style={{
                              fontFamily: interFamily,
                              fontWeight: 700,
                              fontSize: "0.95rem",
                              color: isUnread ? "#065f46" : "var(--text-primary)",
                            }}
                          >
                            {isUnread ? (
                              <i
                                className="fas fa-circle me-2"
                                style={{ color: "#16a34a", fontSize: 10 }}
                                aria-hidden="true"
                              />
                            ) : null}
                            {n?.title ?? "Notification"}
                          </div>
                          {n?.message ? (
                            <div
                              className="mt-1"
                              style={{
                                fontFamily: interFamily,
                                fontSize: "0.9rem",
                                color: "#374151",
                                whiteSpace: "pre-wrap",
                              }}
                            >
                              {n.message}
                            </div>
                          ) : null}
                          <div
                            className="mt-2"
                            style={{
                              fontFamily: interFamily,
                              color: "#6b7280",
                              fontSize: "0.8rem",
                              fontWeight: 600,
                            }}
                          >
                            {createdAt}
                            {statusLabel ? ` • ${statusLabel}` : ""}
                          </div>
                        </div>

                        <div className="d-flex flex-column flex-sm-row flex-md-column gap-2 flex-shrink-0 align-items-stretch align-items-sm-center align-items-md-end">
                          {hazardId ? (
                            <button
                              type="button"
                              className="btn btn-success btn-sm d-inline-flex align-items-center justify-content-center"
                              onClick={() => openReportModal(hazardId)}
                              style={{
                                fontFamily: interFamily,
                                fontSize: "0.8rem",
                                padding: "0.4rem 1rem",
                                borderRadius: 8,
                              }}
                            >
                              <i className="fas fa-file-alt me-2" aria-hidden="true" />
                              View report
                            </button>
                          ) : null}
                          {isUnread ? (
                            <button
                              type="button"
                              className="btn btn-outline-success btn-sm"
                              onClick={() => markRead(n.id)}
                              style={{
                                fontFamily: interFamily,
                                fontSize: "0.8rem",
                                padding: "0.4rem 1rem",
                                borderRadius: 8,
                              }}
                            >
                              Mark read
                            </button>
                          ) : null}
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

      <ReporterHazardViewModal
        isOpen={viewModalOpen}
        reportId={viewReportId}
        onClose={closeReportModal}
        ariaTitleId="notifications-hazard-view-title"
      />
    </div>
  );
}
