import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../lib/api";

export default function ReportDetail() {
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get(`/hazards/${id}`);
        setReport(res.data?.data ?? null);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <div style={{ padding: 16 }}>Loading...</div>;
  if (!report) return <div style={{ padding: 16 }}>Not found.</div>;

  return (
    <div style={{ maxWidth: 900, margin: "24px auto", padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <h2>Report #{report.id}</h2>
        <div style={{ display: "flex", gap: 12 }}>
          <Link to="/reporter">Home</Link>
          <Link to="/reporter/my-reports">My Reports</Link>
        </div>
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        <div>
          <b>Status:</b> {report.current_status?.label ?? report.currentStatus?.label ?? "-"}
        </div>
        <div>
          <b>Severity:</b> {report.severity}
        </div>
        <div>
          <b>Category:</b> {report.category?.name}
        </div>
        <div>
          <b>Location:</b> {report.location?.name}
        </div>
        <div>
          <b>Observed:</b>{" "}
          {report.observed_at ? new Date(report.observed_at).toLocaleString() : "-"}
        </div>
        <div>
          <b>Created:</b> {new Date(report.created_at).toLocaleString()}
        </div>
        <div>
          <b>Description:</b>
          <div style={{ whiteSpace: "pre-wrap", marginTop: 4 }}>{report.description}</div>
        </div>
      </div>

      <h3 style={{ marginTop: 20 }}>Timeline</h3>
      {report.status_history?.length ? (
        <ul>
          {report.status_history.map((h) => (
            <li key={h.id}>
              {new Date(h.created_at).toLocaleString()} —{" "}
              <b>{h.to_status?.label ?? h.toStatus?.label ?? h.to_status_id}</b>
              {h.note ? ` — ${h.note}` : ""}
            </li>
          ))}
        </ul>
      ) : (
        <div>No history yet.</div>
      )}

      <h3 style={{ marginTop: 20 }}>Attachments</h3>
      {report.attachments?.length ? (
        <ul>
          {report.attachments.map((a) => (
            <li key={a.id}>
              {a.original_name} ({Math.round((a.size_bytes / 1024) * 10) / 10} KB)
            </li>
          ))}
        </ul>
      ) : (
        <div>No attachments.</div>
      )}
    </div>
  );
}

