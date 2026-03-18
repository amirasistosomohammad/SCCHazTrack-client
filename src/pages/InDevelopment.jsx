import React from 'react'

export default function InDevelopment({ title = 'In development', description = 'This page is being built.' }) {
  return (
    <div className="in-development-placeholder page-transition-enter">
      <div className="in-development-card">
        <div className="in-development-icon-wrap" aria-hidden>
          <i className="fas fa-tools in-development-icon" />
        </div>
        <h2 className="in-development-title">{title}</h2>
        <p className="in-development-desc">{description}</p>
        <p className="in-development-note">Check back soon.</p>
      </div>
    </div>
  )
}

