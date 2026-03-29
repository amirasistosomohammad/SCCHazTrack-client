import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";

export default function ManagerHome() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/metrics/summary");
        setMetrics(res.data);
      } catch {
        setMetrics(null);
      }
    })();
  }, []);

  return (
    <div style={{ maxWidth: 900, margin: "24px auto", padding: 16 }}>
      <h2>System Manager</h2>
      <div style={{ marginBottom: 12, color: "#444" }}>
        Signed in as <b>{user?.name}</b> ({user?.email})
      </div>

      <h3>Quick Metrics</h3>
      {metrics ? (
        <ul>
          <li>
            <b>Pending:</b> {metrics.pending_count}
          </li>
          <li>
            <b>Closed:</b> {metrics.closed_count}
          </li>
          <li>
            <b>Avg resolution (hours):</b> {metrics.avg_resolution_hours ?? "-"}
          </li>
        </ul>
      ) : (
        <div>Metrics unavailable.</div>
      )}

      <h3>Lists</h3>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Link to="/manager/categories">Hazard categories</Link>
        <Link to="/manager/locations">Manage campus</Link>
      </div>
      <h3 style={{ marginTop: 16 }}>Admin tools</h3>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Link to="/manager/users">User accounts</Link>
      </div>
    </div>
  );
}

