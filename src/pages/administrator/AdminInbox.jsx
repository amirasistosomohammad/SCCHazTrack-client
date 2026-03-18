import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";

export default function AdminInbox() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await api.get("/hazards", { params: q ? { q } : {} });
      setData(res.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rows = data?.data ?? [];

  return (
    <div style={{ maxWidth: 1100, margin: "24px auto", padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <h2>Admin Inbox</h2>
        <div style={{ display: "flex", gap: 12 }}>
          <Link to="/admin">Home</Link>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search description or reporter..."
          style={{ flex: 1, padding: 8 }}
        />
        <button onClick={load} disabled={loading}>
          {loading ? "Loading..." : "Search"}
        </button>
      </div>

      {rows.length === 0 ? (
        <div>No reports found.</div>
      ) : (
        <table width="100%" cellPadding="8" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
              <th>ID</th>
              <th>Status</th>
              <th>Severity</th>
              <th>Reporter</th>
              <th>Category</th>
              <th>Location</th>
              <th>Assigned</th>
              <th>Created</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                <td>{r.id}</td>
                <td>{r.current_status?.label}</td>
                <td>{r.severity}</td>
                <td>{r.reporter?.name ?? r.reporter?.email}</td>
                <td>{r.category?.name}</td>
                <td>{r.location?.name}</td>
                <td>{r.assigned_to?.name ?? "-"}</td>
                <td>{new Date(r.created_at).toLocaleString()}</td>
                <td>
                  <Link to={`/admin/reports/${r.id}`}>View</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

