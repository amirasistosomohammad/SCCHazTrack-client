import React, { useCallback, useEffect, useMemo, useState } from "react";
import { api, ensureCsrfCookie } from "../../lib/api";
import { showToast } from "../../services/notificationService";
import PortalModal from "../../components/PortalModal";
import SystemManagerPageShell from "./SystemManagerPageShell";
import LookupRowActions from "./LookupRowActions";

const interFamily =
  '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';

function getDescendantIds(allRows, rootId) {
  const childrenByParent = new Map();
  for (const r of allRows) {
    const p = r.parent_id ?? null;
    if (!childrenByParent.has(p)) childrenByParent.set(p, []);
    childrenByParent.get(p).push(r.id);
  }
  const out = new Set();
  const stack = [...(childrenByParent.get(rootId) || [])];
  while (stack.length) {
    const id = stack.pop();
    if (out.has(id)) continue;
    out.add(id);
    const kids = childrenByParent.get(id) || [];
    kids.forEach((k) => stack.push(k));
  }
  return out;
}

const emptyForm = () => ({
  name: "",
  description: "",
  parent_id: "",
  is_active: true,
});

export default function ManageLocations() {
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
      const res = await api.get("/manager/locations");
      setRows(res.data?.data ?? []);
    } catch (err) {
      setPageError(err?.response?.data?.message || err?.message || "Failed to load site directory");
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

  const editParentOptions = useMemo(() => {
    if (!editRow) return [];
    const banned = getDescendantIds(rows, editRow.id);
    banned.add(editRow.id);
    return rows.filter((r) => !banned.has(r.id)).sort((a, b) => String(a.name).localeCompare(String(b.name)));
  }, [rows, editRow]);

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
      await api.post("/manager/locations", {
        name: addForm.name.trim(),
        description: addForm.description?.trim() || null,
        parent_id: null,
        is_active: Boolean(addForm.is_active),
      });
      showToast.success("Site added.");
      setAddOpen(false);
      await load();
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        Object.values(err?.response?.data?.errors ?? {})?.[0]?.[0] ||
        err?.message ||
        "Failed to add site";
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
      parent_id: row.parent_id != null ? String(row.parent_id) : "",
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
      await api.patch(`/manager/locations/${editRow.id}`, {
        name: editForm.name.trim(),
        description: editForm.description?.trim() || null,
        parent_id: editForm.parent_id ? Number(editForm.parent_id) : null,
        is_active: Boolean(editForm.is_active),
      });
      showToast.success("Site updated.");
      setEditRow(null);
      await load();
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        Object.values(err?.response?.data?.errors ?? {})?.[0]?.[0] ||
        err?.message ||
        "Failed to update site";
      setEditError(message);
    } finally {
      setEditSaving(false);
    }
  };

  const openDelete = (row) => {
    setDeleteError("");
    setDeleteTarget({
      id: row.id,
      label: row.name ? `“${row.name}”` : `Site #${row.id}`,
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
      await api.delete(`/manager/locations/${id}`);
      showToast.success("Site deleted.");
      closeDelete();
      await load();
    } catch (err) {
      setDeleteError(
        err?.response?.data?.message || err?.message || "Unable to delete this site."
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  const parentSelect = (form, setForm, options, disabled, idPrefix) => (
    <div>
      <label
        className="form-label mb-1"
        htmlFor={`${idPrefix}_parent`}
        style={{ fontWeight: 700, fontSize: "0.85rem", fontFamily: interFamily }}
      >
        Parent
      </label>
      <select
        id={`${idPrefix}_parent`}
        className="form-select"
        value={form.parent_id}
        onChange={(e) => setForm((p) => ({ ...p, parent_id: e.target.value }))}
        disabled={disabled}
      >
        <option value="">None (top level)</option>
        {options.map((l) => (
          <option key={l.id} value={String(l.id)}>
            {l.name}
          </option>
        ))}
      </select>
    </div>
  );

  const modalFormFields = (form, setForm, optionsForParent, disabled, mode, includeParent) => (
    <div style={{ display: "grid", gap: 12 }}>
      <div>
        <label className="form-label mb-1" style={{ fontWeight: 700, fontSize: "0.85rem", fontFamily: interFamily }}>
          Name <span className="text-danger">*</span>
        </label>
        <input
          className="form-control"
          value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          placeholder="Site name"
          required
          minLength={2}
          disabled={disabled}
          autoComplete="off"
        />
      </div>
      <div>
        <label className="form-label mb-1" style={{ fontWeight: 700, fontSize: "0.85rem", fontFamily: interFamily }}>
          Description
        </label>
        <input
          className="form-control"
          value={form.description}
          onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
          placeholder="Optional"
          disabled={disabled}
          autoComplete="off"
        />
      </div>
      {includeParent ? parentSelect(form, setForm, optionsForParent, disabled, mode) : null}
      <div className="form-check">
        <input
          id={`lookup_loc_active_${mode}`}
          className="form-check-input"
          type="checkbox"
          checked={Boolean(form.is_active)}
          onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
          disabled={disabled}
        />
        <label className="form-check-label" htmlFor={`lookup_loc_active_${mode}`} style={{ fontFamily: interFamily }}>
          Active (available for hazard reports and profiles)
        </label>
      </div>
    </div>
  );

  return (
    <>
      <SystemManagerPageShell
        title="Manage campus"
        subtitle="Add and edit campus locations used on reports, registration, and profiles."
        iconClassName="fas fa-map-marker-alt"
        loading={loading}
        showContent={showContent}
        loadingLabel="Loading locations…"
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
            Campus list
          </div>
          <button type="button" className="btn btn-success btn-sm" onClick={openAdd} style={{ fontFamily: interFamily }}>
            <i className="fas fa-plus me-2" />
            Add site
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
                      ariaEdit={`Edit site ${r.name || idx + 1}`}
                      ariaDelete={`Delete site ${r.name || idx + 1}`}
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
            No sites yet. Use &quot;Add site&quot; to create one.
          </p>
        ) : null}
      </SystemManagerPageShell>

      <PortalModal
        isOpen={addOpen}
        onRequestClose={closeAdd}
        ariaLabelledby="manage-loc-add-title"
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
              <h5 id="manage-loc-add-title" className="mb-0 fw-semibold" style={{ fontFamily: interFamily }}>
                Add site
              </h5>
              <div className="account-approvals-detail-subtitle">
                <span className="account-approvals-detail-name">Register a new site or building.</span>
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
            {modalFormFields(addForm, setAddForm, [], addSaving, "add", false)}
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

      <PortalModal
        isOpen={Boolean(editRow)}
        onRequestClose={closeEdit}
        ariaLabelledby="manage-loc-edit-title"
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
              <h5 id="manage-loc-edit-title" className="mb-0 fw-semibold" style={{ fontFamily: interFamily }}>
                {editRow ? `Edit site #${editRow.id}` : "Edit site"}
              </h5>
              <div className="account-approvals-detail-subtitle">
                <span className="account-approvals-detail-name">Update site details or hierarchy.</span>
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
            {modalFormFields(editForm, setEditForm, editParentOptions, editSaving, "edit", true)}
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

      <PortalModal
        isOpen={Boolean(deleteTarget)}
        onRequestClose={closeDelete}
        ariaLabelledby="manage-loc-delete-title"
        overlayClassName="account-approvals-detail-overlay"
        backdropClassName="account-approvals-detail-backdrop"
        panelClassName="account-approvals-detail-modal myreports-delete-modal"
        durationMs={220}
        closeOnBackdrop
        closeOnEsc
      >
        <div className="account-approvals-detail-header">
          <div className="account-approvals-detail-header-text">
            <h5 id="manage-loc-delete-title" className="mb-0 fw-semibold" style={{ fontFamily: interFamily }}>
              Delete site?
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
            You cannot delete a site that still has child sites or hazard reports assigned. Remove dependents first.
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
