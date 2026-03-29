import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ReporterHazardViewModal from "../../components/reporter/ReporterHazardViewModal";

/**
 * Deep link for a single hazard report: opens the same details modal as My Hazard Reports,
 * then returns to the list when closed.
 */
export default function ReportDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(true);

  const handleClose = () => {
    setModalOpen(false);
  };

  useEffect(() => {
    if (modalOpen) return;
    const t = setTimeout(() => {
      navigate("/reporter/my-reports", { replace: true });
    }, 220);
    return () => clearTimeout(t);
  }, [modalOpen, navigate]);

  return (
    <ReporterHazardViewModal
      isOpen={modalOpen}
      reportId={id}
      onClose={handleClose}
      ariaTitleId="myreports-view-title"
    />
  );
}
