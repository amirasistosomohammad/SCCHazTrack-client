import React from 'react'

export default function AuthLoadingScreen({ text = 'Loading…' }) {
  return (
    <div className="auth-loading-screen" role="status" aria-live="polite">
      <span className="auth-loading-spinner" aria-hidden>
        <span className="loader-ring" />
      </span>
      <span className="auth-loading-text">{text}</span>
    </div>
  )
}

