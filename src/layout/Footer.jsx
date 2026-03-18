import React from 'react'

const FOOTER_TAGLINE = 'SCC Hazard Reporting and Tracking System'

const Footer = () => {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="py-3 bg-light mt-auto">
      <div className="container-fluid">
        <div className="d-flex flex-column flex-md-row align-items-center justify-content-between small">
          <span className="text-muted">
            &copy; {currentYear} SCC HazTrack. {FOOTER_TAGLINE}. All rights reserved.
          </span>
        </div>
      </div>
    </footer>
  )
}

export default Footer