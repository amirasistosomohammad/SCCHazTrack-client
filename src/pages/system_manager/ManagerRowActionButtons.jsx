import React from "react";

/**
 * Edit / Delete actions styled like My Hazard Reports table actions.
 */
export default function ManagerRowActionButtons({
  interFamily,
  onEdit,
  onDelete,
  editLabel = "Edit",
  deleteLabel = "Delete",
  editAriaLabel,
  deleteAriaLabel,
}) {
  return (
    <div className="d-flex align-items-center gap-2 flex-wrap">
      <button
        type="button"
        onClick={onEdit}
        style={{
          borderRadius: 6,
          border: "1px solid #a7f3d0",
          backgroundColor: "#ffffff",
          color: "#065f46",
          fontFamily: interFamily,
          fontWeight: 600,
          fontSize: "0.72rem",
          padding: "0.25rem 0.5rem",
          minWidth: 0,
          flex: "0 0 auto",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          transition: "background-color 0.18s ease, border-color 0.18s ease, color 0.18s ease, transform 0.15s ease",
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
        aria-label={editAriaLabel}
      >
        <i className="fas fa-pen" aria-hidden="true" />
        <span>{editLabel}</span>
      </button>
      <button
        type="button"
        onClick={onDelete}
        style={{
          borderRadius: 6,
          border: "1px solid #fecaca",
          backgroundColor: "#ffffff",
          color: "#b91c1c",
          fontFamily: interFamily,
          fontWeight: 700,
          fontSize: "0.72rem",
          padding: "0.25rem 0.5rem",
          minWidth: 0,
          flex: "0 0 auto",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          transition: "background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, transform 0.15s ease",
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
        aria-label={deleteAriaLabel}
      >
        <i className="fas fa-trash" aria-hidden="true" />
        <span>{deleteLabel}</span>
      </button>
    </div>
  );
}
