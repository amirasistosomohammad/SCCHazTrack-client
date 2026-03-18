import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ensureCsrfCookie } from "../../lib/api";

export default function ManageCategories() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/categories");
      setRows(res.data?.data ?? []);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to load categories");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function addCategory(e) {
    e.preventDefault();
    setError("");
    try {
      await ensureCsrfCookie();
      await api.post("/manager/categories", { name, description: description || null, is_active: true });
      setName("");
      setDescription("");
      await load();
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        Object.values(err?.response?.data?.errors ?? {})?.[0]?.[0] ||
        err?.message ||
        "Failed to add category";
      setError(message);
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: "24px auto", padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <h2>Manage Categories</h2>
        <div style={{ display: "flex", gap: 12 }}>
          <Link to="/manager">Home</Link>
        </div>
      </div>

      {error ? <div style={{ color: "crimson", marginBottom: 12 }}>{error}</div> : null}

      <form onSubmit={addCategory} style={{ display: "grid", gap: 8, marginBottom: 16 }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Category name"
          required
          style={{ padding: 8 }}
        />
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
          style={{ padding: 8 }}
        />
        <button type="submit">Add category</button>
      </form>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <table width="100%" cellPadding="8" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
              <th>ID</th>
              <th>Name</th>
              <th>Active</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                <td>{r.id}</td>
                <td>{r.name}</td>
                <td>{String(r.is_active)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

