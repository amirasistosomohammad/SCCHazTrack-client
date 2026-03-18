import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ensureCsrfCookie } from "../../lib/api";

export default function ManageLocations() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [parentId, setParentId] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/locations");
      setRows(res.data?.data ?? []);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to load locations");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function addLocation(e) {
    e.preventDefault();
    setError("");
    try {
      await ensureCsrfCookie();
      await api.post("/manager/locations", {
        name,
        description: description || null,
        parent_id: parentId ? Number(parentId) : null,
        is_active: true,
      });
      setName("");
      setDescription("");
      setParentId("");
      await load();
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        Object.values(err?.response?.data?.errors ?? {})?.[0]?.[0] ||
        err?.message ||
        "Failed to add location";
      setError(message);
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: "24px auto", padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <h2>Manage Locations</h2>
        <div style={{ display: "flex", gap: 12 }}>
          <Link to="/manager">Home</Link>
        </div>
      </div>

      {error ? <div style={{ color: "crimson", marginBottom: 12 }}>{error}</div> : null}

      <form onSubmit={addLocation} style={{ display: "grid", gap: 8, marginBottom: 16 }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Location name"
          required
          style={{ padding: 8 }}
        />
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
          style={{ padding: 8 }}
        />
        <select
          value={parentId}
          onChange={(e) => setParentId(e.target.value)}
          style={{ padding: 8 }}
        >
          <option value="">No parent (top level)</option>
          {rows.map((l) => (
            <option key={l.id} value={l.id}>
              Parent: {l.name}
            </option>
          ))}
        </select>
        <button type="submit">Add location</button>
      </form>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <table width="100%" cellPadding="8" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
              <th>ID</th>
              <th>Name</th>
              <th>Parent</th>
              <th>Active</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                <td>{r.id}</td>
                <td>{r.name}</td>
                <td>{r.parent_id ?? "-"}</td>
                <td>{String(r.is_active)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

