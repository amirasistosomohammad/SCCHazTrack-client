import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ensureCsrfCookie } from "../../lib/api";

export default function ManageUsers() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("reporter");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/manager/users");
      setData(res.data);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function createUser(e) {
    e.preventDefault();
    setError("");
    try {
      await ensureCsrfCookie();
      await api.post("/manager/users", { name, email, password, role, is_active: true });
      setName("");
      setEmail("");
      setPassword("");
      setRole("reporter");
      await load();
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        Object.values(err?.response?.data?.errors ?? {})?.[0]?.[0] ||
        err?.message ||
        "Failed to create user";
      setError(message);
    }
  }

  const rows = data?.data ?? [];

  return (
    <div style={{ maxWidth: 1100, margin: "24px auto", padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <h2>Manage Users</h2>
        <div style={{ display: "flex", gap: 12 }}>
          <Link to="/manager">Home</Link>
        </div>
      </div>

      {error ? <div style={{ color: "crimson", marginBottom: 12 }}>{error}</div> : null}

      <form onSubmit={createUser} style={{ display: "grid", gap: 8, marginBottom: 16, maxWidth: 520 }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Full name"
          required
          style={{ padding: 8 }}
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          type="email"
          required
          style={{ padding: 8 }}
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password (min 8)"
          type="password"
          required
          style={{ padding: 8 }}
        />
        <select value={role} onChange={(e) => setRole(e.target.value)} style={{ padding: 8 }}>
          <option value="reporter">Reporter</option>
          <option value="admin">Admin</option>
        </select>
        <button type="submit">Create user</button>
      </form>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <table width="100%" cellPadding="8" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Active</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                <td>{u.id}</td>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>{u.role}</td>
                <td>{String(u.is_active)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

