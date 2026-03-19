import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

export default function ReporterHome() {
  const { user } = useAuth();

  return (
    <div style={{ maxWidth: 900, margin: "24px auto", padding: 16 }}>
      <h2>Hazard Reporting Dashboard</h2>
      <div style={{ marginBottom: 12, color: "#444" }}>
        Signed in as <b>{user?.name}</b> ({user?.email})
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Link to="/reporter/submit">Submit Hazard Report</Link>
        <Link to="/reporter/my-reports">My Hazard Reports</Link>
      </div>
    </div>
  );
}

