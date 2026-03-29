import React from "react";

const interFamily =
  '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';

const btnBase = {
  borderRadius: 6,
  backgroundColor: "#ffffff",
  fontFamily: interFamily,
  fontSize: "0.72rem",
  padding: "0.25rem 0.5rem",
  minWidth: 0,
  flex: "0 0 auto",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  transition:
    "background-color 0.18s ease, border-color 0.18s ease, color 0.18s ease, transform 0.15s ease",
};

/**
 * Edit + Delete actions styled like My Hazard Reports table row actions.
 */
export default function LookupRowActions({ onEdit, onDelete, ariaEdit, ariaDelete }) {
  return (
    <div
      className="d-flex flex-wrap gap-2 justify-content-start"
      style={{ alignItems: "center" }}
    >
      <button
        type="button"
        onClick={onEdit}
        style={{
          ...btnBase,
          border: "1px solid #a7f3d0",
          color: "#065f46",
          fontWeight: 600,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "#ecfdf5";
          e.currentTarget.style.borderColor = "#6ee7b7";
          e.currentTarget.style.color = "#064e3b";
          e.currentTarget.style.transform = "translateY(-1px)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "#ffffff";
          e.currentTarget.style.borderColor = "#a7f3d0";
          e.currentTarget.style.color = "#065f46";
          e.currentTarget.style.transform = "translateY(0)";
        }}
        aria-label={ariaEdit}
      >
        <i className="fas fa-pen" aria-hidden="true" />
        <span>Edit</span>
      </button>
      <button
        type="button"
        onClick={onDelete}
        style={{
          ...btnBase,
          border: "1px solid #fecaca",
          color: "#b91c1c",
          fontWeight: 700,
          transition:
            "background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, transform 0.15s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "#fee2e2";
          e.currentTarget.style.borderColor = "#fca5a5";
          e.currentTarget.style.color = "#7f1d1d";
          e.currentTarget.style.transform = "translateY(-1px)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "#ffffff";
          e.currentTarget.style.borderColor = "#fecaca";
          e.currentTarget.style.color = "#b91c1c";
          e.currentTarget.style.transform = "translateY(0)";
        }}
        aria-label={ariaDelete}
      >
        <i className="fas fa-trash" aria-hidden="true" />
        <span>Delete</span>
      </button>
    </div>
  );
}
