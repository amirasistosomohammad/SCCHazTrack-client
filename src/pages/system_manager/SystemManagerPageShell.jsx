import React from "react";

const interFamily =
  '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';

/**
 * Shared layout for system manager pages (matches Manage Users header + card shell).
 */
export default function SystemManagerPageShell({
  title,
  subtitle,
  iconClassName,
  loading,
  showContent = true,
  error,
  loadingLabel = "Loading…",
  children,
}) {
  // Match Manage Users: no opacity fade while loading — header + spinner stay visible and the
  // page-transition-enter animation (slide from above in index.css) runs like other admin pages.
  return (
    <div className="page-transition-enter">
      <div
        className="card border-0 shadow-sm w-100"
        style={
          loading
            ? undefined
            : { opacity: showContent ? 1 : 0, transition: "opacity 0.2s ease-out" }
        }
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
              <i className={iconClassName} />
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
                {title}
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
                {subtitle}
              </p>
            </div>
          </div>
        </div>

        <div
          className={loading ? "card-body py-4 d-flex flex-column align-items-center" : "card-body"}
          style={{ backgroundColor: "#ffffff" }}
        >
          {loading ? (
            <>
              <div
                className="spinner-border"
                role="status"
                style={{ width: "1.75rem", height: "1.75rem", color: "#0C8A3B" }}
              />
              <p className="mt-3 mb-0 text-muted" style={{ fontFamily: interFamily }}>
                {loadingLabel}
              </p>
            </>
          ) : (
            <>
              {error ? (
                <div className="alert alert-danger py-2 mb-3" style={{ fontFamily: interFamily }}>
                  {error}
                </div>
              ) : null}
              {children}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
