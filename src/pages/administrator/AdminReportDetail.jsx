import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, ensureCsrfCookie } from "../../lib/api";

export default function AdminReportDetail() {
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [toStatusKey, setToStatusKey] = useState("under_review");
  const [note, setNote] = useState("");
  const [isPublic, setIsPublic] = useState(true);

  const statusOptions = useMemo(() => statuses ?? [], [statuses]);

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

  async function onChangeStatus(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await ensureCsrfCookie();
      await api.post(`/hazards/${id}/status`, {
        to_status_key: toStatusKey,
        note: note || null,
        is_public: isPublic,
      });
      setNote("");
      await load();
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

  if (loading) return <div style={{ padding: 16 }}>Loading...</div>;
  if (!report) return <div style={{ padding: 16 }}>Not found.</div>;

  return (
    <div style={{ maxWidth: 1100, margin: "24px auto", padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <h2>Admin – Report #{report.id}</h2>
        <div style={{ display: "flex", gap: 12 }}>
          <Link to="/admin">Home</Link>
          <Link to="/admin/inbox">Inbox</Link>
        </div>
      </div>

      {error ? <div style={{ color: "crimson", marginBottom: 12 }}>{error}</div> : null}

      <div style={{ display: "grid", gap: 6, marginBottom: 16 }}>
        <div>
          <b>Status:</b> {report.current_status?.label ?? "-"}
        </div>
        <div>
          <b>Severity:</b> {report.severity}
        </div>
        <div>
          <b>Reporter:</b> {report.reporter?.name} ({report.reporter?.email})
        </div>
        <div>
          <b>Category:</b> {report.category?.name}
        </div>
        <div>
          <b>Location:</b> {report.location?.name}
        </div>
        <div>
          <b>Created:</b> {new Date(report.created_at).toLocaleString()}
        </div>
        <div>
          <b>Description:</b>
          <div style={{ whiteSpace: "pre-wrap", marginTop: 4 }}>{report.description}</div>
        </div>
      </div>

      <h3>Change Status</h3>
      <form onSubmit={onChangeStatus} style={{ display: "grid", gap: 10, maxWidth: 520 }}>
        <label>
          New status
          <select
            value={toStatusKey}
            onChange={(e) => setToStatusKey(e.target.value)}
            style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}
          >
            {statusOptions.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Note (optional)
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}
          />
        </label>
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
          />
          Visible to reporter
        </label>
        <button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Update status"}
        </button>
      </form>

      <h3 style={{ marginTop: 20 }}>Timeline</h3>
      {report.status_history?.length ? (
        <ul>
          {report.status_history.map((h) => (
            <li key={h.id}>
              {new Date(h.created_at).toLocaleString()} —{" "}
              <b>{h.to_status?.label ?? h.to_status_id}</b>
              {h.note ? ` — ${h.note}` : ""}
              {h.is_public === false ? " (internal)" : ""}
            </li>
          ))}
        </ul>
      ) : (
        <div>No history yet.</div>
      )}
    </div>
  );
}

