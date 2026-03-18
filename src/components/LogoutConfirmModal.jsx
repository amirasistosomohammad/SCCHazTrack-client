import React, { useCallback } from 'react'
import PortalModal from './PortalModal'

const APP_NAME = 'SCC HazTrack'

const LogoutConfirmModal = ({ isOpen, onConfirm, onCancel, loading = false }) => {
  const handleClose = useCallback(() => {
    if (loading) return
    onCancel?.()
  }, [onCancel, loading])

  const handleConfirm = useCallback(() => {
    if (loading) return
    onConfirm?.()
  }, [onConfirm, loading])

  return (
    <PortalModal
      isOpen={isOpen}
      onRequestClose={handleClose}
      ariaLabelledby="logout-confirm-title"
      overlayClassName="account-approvals-detail-overlay"
      backdropClassName={`account-approvals-detail-backdrop${loading ? ' logout-backdrop-loading' : ''}`}
      wrapClassName=""
      panelClassName="account-approvals-detail-modal"
      closeOnBackdrop={!loading}
      closeOnEsc={!loading}
    >
      <div className="account-approvals-detail-header">
        <div className="account-approvals-detail-header-text">
          <h5 id="logout-confirm-title" className="mb-0 fw-semibold">
            Sign out?
          </h5>
          <div className="account-approvals-detail-subtitle">
            <span className="account-approvals-detail-name">Confirm sign out from your account</span>
          </div>
        </div>

        <button
          type="button"
          className="btn-close-custom"
          onClick={handleClose}
          aria-label="Close"
          disabled={loading}
        >
          ×
        </button>
      </div>

      <div className="account-approvals-detail-body">
        <p className="account-approvals-action-help mb-0">
          Are you sure you want to sign out? You will need to sign in again to access {APP_NAME}.
        </p>
      </div>

      <div className="account-approvals-detail-footer">
        <button
          type="button"
          className="btn btn-light account-approvals-detail-close-btn"
          onClick={handleClose}
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-primary account-approvals-detail-close-btn logout-confirm-signout-btn"
          onClick={handleConfirm}
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden />
              Signing out...
            </>
          ) : (
            'Yes, sign out'
          )}
        </button>
      </div>
    </PortalModal>
  )
}

export default LogoutConfirmModal

