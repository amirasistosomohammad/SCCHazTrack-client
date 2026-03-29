import React, { useCallback, useEffect, useState } from "react";
import { api, ensureCsrfCookie } from "../../lib/api";
import { showToast } from "../../services/notificationService";
import PortalModal from "../../components/PortalModal";
import SystemManagerPageShell from "./SystemManagerPageShell";
import LookupRowActions from "./LookupRowActions";

const interFamily =
  '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';

const emptyForm = () => ({
  name: "",
  description: "",
  is_active: true,
});

export default function ManageCategories() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showContent, setShowContent] = useState(false);
  const [pageError, setPageError] = useState("");

  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState(emptyForm);
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState("");

  const [editRow, setEditRow] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setPageError("");
    try {
      const res = await api.get("/manager/categories");
      setRows(res.data?.data ?? []);
    } catch (err) {
      setPageError(err?.response?.data?.message || err?.message || "Failed to load categories");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!loading) {
      const id = requestAnimationFrame(() => setShowContent(true));
      return () => cancelAnimationFrame(id);
    }
    setShowContent(false);
  }, [loading]);

  const openAdd = () => {
    setAddForm(emptyForm());
    setAddError("");
    setAddOpen(true);
  };

  const closeAdd = () => {
    if (addSaving) return;
    setAddOpen(false);
  };

  const submitAdd = async (e) => {
    e.preventDefault();
    setAddError("");
    setAddSaving(true);
    try {
      await ensureCsrfCookie();
      await api.post("/manager/categories", {
        name: addForm.name.trim(),
        description: addForm.description?.trim() || null,
        is_active: Boolean(addForm.is_active),
      });
      showToast.success("Category added.");
      setAddOpen(false);
      await load();
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        Object.values(err?.response?.data?.errors ?? {})?.[0]?.[0] ||
        err?.message ||
        "Failed to add category";
      setAddError(message);
    } finally {
      setAddSaving(false);
    }
  };

  const openEdit = (row) => {
    setEditError("");
    setEditRow(row);
    setEditForm({
      name: row.name ?? "",
      description: row.description ?? "",
      is_active: Boolean(row.is_active),
    });
  };

  const closeEdit = () => {
    if (editSaving) return;
    setEditRow(null);
    setEditError("");
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    if (!editRow) return;
    setEditError("");
    setEditSaving(true);
    try {
      await ensureCsrfCookie();
      await api.patch(`/manager/categories/${editRow.id}`, {
        name: editForm.name.trim(),
        description: editForm.description?.trim() || null,
        is_active: Boolean(editForm.is_active),
      });
      showToast.success("Category updated.");
      setEditRow(null);
      await load();
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        Object.values(err?.response?.data?.errors ?? {})?.[0]?.[0] ||
        err?.message ||
        "Failed to update category";
      setEditError(message);
    } finally {
      setEditSaving(false);
    }
  };

  const openDelete = (row) => {
    setDeleteError("");
    setDeleteTarget({
      id: row.id,
      label: row.name ? `“${row.name}”` : `Category #${row.id}`,
    });
  };

  const closeDelete = () => {
    if (deleteLoading) return;
    setDeleteTarget(null);
    setDeleteError("");
  };

  const performDelete = async () => {
    const id = deleteTarget?.id;
    if (!id) return;
    setDeleteLoading(true);
    setDeleteError("");
    try {
      await ensureCsrfCookie();
      await api.delete(`/manager/categories/${id}`);
      showToast.success("Category deleted.");
      closeDelete();
      await load();
    } catch (err) {
      setDeleteError(
        err?.response?.data?.message || err?.message || "Unable to delete this category."
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  const modalFormFields = (form, setForm, disabled, idPrefix) => {
    const activeId = `${idPrefix}_is_active`;
    return (
      <div style={{ display: "grid", gap: 12 }}>
        <div>
          <label
            className="form-label mb-1"
            htmlFor={`${idPrefix}_name`}
            style={{ fontWeight: 700, fontSize: "0.85rem", fontFamily: interFamily }}
          >
            Name <span className="text-danger">*</span>
          </label>
          <input
            id={`${idPrefix}_name`}
            className="form-control"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            placeholder="Category name"
            required
            minLength={2}
            disabled={disabled}
            autoComplete="off"
          />
        </div>
        <div>
          <label
            className="form-label mb-1"
            htmlFor={`${idPrefix}_desc`}
            style={{ fontWeight: 700, fontSize: "0.85rem", fontFamily: interFamily }}
          >
            Description
          </label>
          <input
            id={`${idPrefix}_desc`}
            className="form-control"
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            placeholder="Optional"
            disabled={disabled}
            autoComplete="off"
          />
        </div>
        <div className="form-check">
          <input
            id={activeId}
            className="form-check-input"
            type="checkbox"
            checked={Boolean(form.is_active)}
            onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
            disabled={disabled}
          />
          <label className="form-check-label" htmlFor={activeId} style={{ fontFamily: interFamily }}>
            Active (available for new hazard reports)
          </label>
        </div>
      </div>
    );
  };

  return (
    <>
      <SystemManagerPageShell
        title="Hazard categories"
        subtitle="Add and edit categories used on hazard reports."
        iconClassName="fas fa-tags"
        loading={loading}
        showContent={showContent}
        loadingLabel="Loading categories…"
        error={pageError}
      >
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <div
            className="text-uppercase"
            style={{
              fontSize: "0.72rem",
              fontWeight: 800,
              letterSpacing: "0.06em",
              color: "#64748b",
              fontFamily: interFamily,
            }}
          >
            Category list
          </div>
          <button type="button" className="btn btn-success btn-sm" onClick={openAdd} style={{ fontFamily: interFamily }}>
            <i className="fas fa-plus me-2" />
            Add category
          </button>
        </div>

        <div
          className="manage-lookup-table-wrap rounded"
          style={{
            border: "1px solid rgba(148, 163, 184, 0.35)",
            boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06)",
          }}
        >
          <table
            className="table table-hover align-middle mb-0 manage-lookup-table"
            style={{ fontFamily: interFamily, fontSize: "0.9rem" }}
          >
            <colgroup>
              <col className="manage-lookup-col-num" />
              <col className="manage-lookup-col-actions" />
              <col className="manage-lookup-col-name" />
              <col className="manage-lookup-col-desc" />
              <col className="manage-lookup-col-status" />
            </colgroup>
            <thead style={{ backgroundColor: "rgba(13, 122, 58, 0.08)" }}>
              <tr>
                <th
                  scope="col"
                  className="px-3 py-2 text-center"
                  style={{ fontWeight: 700, color: "var(--text-primary)" }}
                >
                  #
                </th>
                <th
                  scope="col"
                  className="px-3 py-2 text-start"
                  style={{ fontWeight: 700, color: "var(--text-primary)" }}
                >
                  Actions
                </th>
                <th scope="col" className="px-3 py-2" style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                  Name
                </th>
                <th scope="col" className="px-3 py-2" style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                  Description
                </th>
                <th scope="col" className="px-3 py-2" style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={r.id}>
                  <td className="px-3 text-muted text-center fw-semibold">{idx + 1}</td>
                  <td className="px-3 text-start">
                    <LookupRowActions
                      onEdit={() => openEdit(r)}
                      onDelete={() => openDelete(r)}
                      ariaEdit={`Edit category ${r.name || idx + 1}`}
                      ariaDelete={`Delete category ${r.name || idx + 1}`}
                    />
                  </td>
                  <td className="px-3 fw-semibold text-break" style={{ color: "#1e293b" }}>
                    {r.name}
                  </td>
                  <td
                    className="px-3 text-muted small text-break"
                    title={r.description || undefined}
                  >
                    {r.description?.trim() ? r.description : "—"}
                  </td>
                  <td className="px-3">
                    {r.is_active ? (
                      <span className="badge rounded-pill bg-success">Active</span>
                    ) : (
                      <span className="badge rounded-pill bg-secondary">Inactive</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 ? (
          <p className="text-muted small mt-3 mb-0" style={{ fontFamily: interFamily }}>
            No categories yet. Use &quot;Add category&quot; to create one.
          </p>
        ) : null}
      </SystemManagerPageShell>

      {/* Add modal */}
      <PortalModal
        isOpen={addOpen}
        onRequestClose={closeAdd}
        ariaLabelledby="manage-cat-add-title"
        overlayClassName="account-approvals-detail-overlay"
        backdropClassName="account-approvals-detail-backdrop"
        wrapClassName="myreports-view-wrap"
        panelClassName="account-approvals-detail-modal myreports-view-modal"
        durationMs={220}
        closeOnBackdrop
        closeOnEsc
      >
        <form onSubmit={submitAdd} style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
          <div className="account-approvals-detail-header">
            <div className="account-approvals-detail-header-text">
              <h5 id="manage-cat-add-title" className="mb-0 fw-semibold" style={{ fontFamily: interFamily }}>
                Add category
              </h5>
              <div className="account-approvals-detail-subtitle">
                <span className="account-approvals-detail-name">Create a new hazard category for reporting.</span>
              </div>
            </div>
            <button type="button" className="btn-close-custom" aria-label="Close" onClick={closeAdd} disabled={addSaving}>
              ×
            </button>
          </div>
          <div className="account-approvals-detail-body" style={{ flex: 1, minHeight: 0, fontFamily: interFamily }}>
            {addError ? (
              <div className="alert alert-danger py-2 mb-3" role="alert">
                {addError}
              </div>
            ) : null}
            {modalFormFields(addForm, setAddForm, addSaving, "manage_cat_add")}
          </div>
          <div className="account-approvals-detail-footer">
            <button
              type="button"
              className="btn btn-light account-approvals-detail-close-btn"
              onClick={closeAdd}
              disabled={addSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary logout-confirm-signout-btn"
              disabled={addSaving}
              style={{ minWidth: 120 }}
            >
              {addSaving ? "Saving…" : "Add"}
            </button>
          </div>
        </form>
      </PortalModal>

      {/* Edit modal */}
      <PortalModal
        isOpen={Boolean(editRow)}
        onRequestClose={closeEdit}
        ariaLabelledby="manage-cat-edit-title"
        overlayClassName="account-approvals-detail-overlay"
        backdropClassName="account-approvals-detail-backdrop"
        wrapClassName="myreports-view-wrap"
        panelClassName="account-approvals-detail-modal myreports-view-modal"
        durationMs={220}
        closeOnBackdrop
        closeOnEsc
      >
        <form onSubmit={submitEdit} style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
          <div className="account-approvals-detail-header">
            <div className="account-approvals-detail-header-text">
              <h5 id="manage-cat-edit-title" className="mb-0 fw-semibold" style={{ fontFamily: interFamily }}>
                {editRow ? `Edit category #${editRow.id}` : "Edit category"}
              </h5>
              <div className="account-approvals-detail-subtitle">
                <span className="account-approvals-detail-name">Update name, description, or availability.</span>
              </div>
            </div>
            <button type="button" className="btn-close-custom" aria-label="Close" onClick={closeEdit} disabled={editSaving}>
              ×
            </button>
          </div>
          <div className="account-approvals-detail-body" style={{ flex: 1, minHeight: 0, fontFamily: interFamily }}>
            {editError ? (
              <div className="alert alert-danger py-2 mb-3" role="alert">
                {editError}
              </div>
            ) : null}
            {modalFormFields(editForm, setEditForm, editSaving, "manage_cat_edit")}
          </div>
          <div className="account-approvals-detail-footer">
            <button
              type="button"
              className="btn btn-light account-approvals-detail-close-btn"
              onClick={closeEdit}
              disabled={editSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary logout-confirm-signout-btn"
              disabled={editSaving}
              style={{ minWidth: 120 }}
            >
              {editSaving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </PortalModal>

      {/* Delete confirm */}
      <PortalModal
        isOpen={Boolean(deleteTarget)}
        onRequestClose={closeDelete}
        ariaLabelledby="manage-cat-delete-title"
        overlayClassName="account-approvals-detail-overlay"
        backdropClassName="account-approvals-detail-backdrop"
        panelClassName="account-approvals-detail-modal myreports-delete-modal"
        durationMs={220}
        closeOnBackdrop
        closeOnEsc
      >
        <div className="account-approvals-detail-header">
          <div className="account-approvals-detail-header-text">
            <h5 id="manage-cat-delete-title" className="mb-0 fw-semibold" style={{ fontFamily: interFamily }}>
              Delete category?
            </h5>
            <div className="account-approvals-detail-subtitle">
              <span className="account-approvals-detail-name" style={{ fontFamily: interFamily }}>
                {deleteTarget?.label || "This action cannot be undone."}
              </span>
            </div>
          </div>
          <button type="button" className="btn-close-custom" aria-label="Close" onClick={closeDelete}>
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
            Categories that are still used by hazard reports cannot be deleted. Remove or reassign those reports first.
          </p>
        </div>
        <div className="account-approvals-detail-footer">
          <button
            type="button"
            className="btn btn-light account-approvals-detail-close-btn"
            onClick={closeDelete}
            disabled={deleteLoading}
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
    </>
  );
}
