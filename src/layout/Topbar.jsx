import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useBranding } from '../context/BrandingContext'
import { toast } from 'react-toastify'
import LogoutConfirmModal from '../components/LogoutConfirmModal'

const BRAND_TAGLINE = 'Hazard Reporting & Tracking System'

const Topbar = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth()
  const { appName, logoUrl, brandingLoaded } = useBranding()
  const navigate = useNavigate()
  const [showDropdown, setShowDropdown] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true)
  }

  const handleLogoutConfirm = async () => {
    setShowDropdown(false)
    setIsLoggingOut(true)
    try {
      await logout()
      setShowLogoutConfirm(false)
      toast.success('You have been logged out successfully')
      navigate('/', { replace: true })
    } catch (err) {
      setShowLogoutConfirm(false)
      toast.error(err?.message || 'Logout failed. Please try again.')
    } finally {
      setIsLoggingOut(false)
    }
  }

  const handleLogoutCancel = () => {
    setShowLogoutConfirm(false)
  }

  return (
    <>
      <nav className={`sb-topnav navbar navbar-expand navbar-dark${showDropdown ? ' dropdown-open' : ''}`}>
        <Link to="/dashboard" className="navbar-brand d-flex align-items-center text-decoration-none">
          <div className="sb-topnav-logo-circle sb-topnav-logo-gap flex-shrink-0">
            {brandingLoaded ? (
              <img
                key={logoUrl}
                src={logoUrl}
                alt={`${appName} logo`}
                className="sb-topnav-logo-img branding-fade-in"
              />
            ) : (
              <div
                className="branding-skeleton-logo"
                style={{ width: 40, height: 40 }}
              />
            )}
          </div>
          <div className="d-flex flex-column sb-topnav-brand-text">
            {brandingLoaded ? (
              <>
                <span className="sb-topnav-brand-name d-none d-lg-inline branding-fade-in">{appName}</span>
                <span className="sb-topnav-brand-name d-lg-none branding-fade-in">{appName}</span>
              </>
            ) : (
              <>
                <div
                  className="branding-skeleton-text"
                  style={{ width: 140, height: 16, marginBottom: 4 }}
                />
                <div
                  className="branding-skeleton-text d-none d-lg-block"
                  style={{ width: 120, height: 12 }}
                />
              </>
            )}
            <span className="sb-topnav-brand-tagline d-none d-sm-inline">{BRAND_TAGLINE}</span>
          </div>
        </Link>

        <button
          type="button"
          className="btn btn-link text-decoration-none order-2 order-lg-0"
          id="sidebarToggle"
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
        >
          <i className="fas fa-bars" />
        </button>

        <ul className="navbar-nav ms-auto align-items-center">
          <li className="nav-item dropdown" ref={dropdownRef}>
            <button
              type="button"
              className="nav-link dropdown-toggle d-flex align-items-center"
              onClick={(e) => {
                e.preventDefault()
                setShowDropdown(!showDropdown)
              }}
              aria-expanded={showDropdown}
              aria-haspopup="true"
              id="userDropdown"
            >
              <div className="sb-topnav-user-icon-circle me-2 flex-shrink-0">
                <div className="sb-topnav-user-icon-inner">
                  <i className="fas fa-user sb-topnav-user-icon" />
                </div>
              </div>
              <span className="d-none d-lg-inline">{user?.name || user?.email || 'User'}</span>
            </button>
            <ul
              className={`dropdown-menu dropdown-menu-end ${showDropdown ? 'show' : ''}`}
              aria-labelledby="userDropdown"
            >
              <li className="dropdown-header">
                {user?.name || user?.email || 'User'}
              </li>
              <li>
                <span className="dropdown-item small text-muted py-1">{user?.email}</span>
              </li>
              <li className="dropdown-separator" />
              <li>
                <button
                  type="button"
                  className="dropdown-item custom-dropdown-item logout-item"
                  onClick={handleLogoutClick}
                >
                  <i className="fas fa-sign-out-alt fa-fw me-2" />
                  Logout
                </button>
              </li>
            </ul>
          </li>
        </ul>
      </nav>

      <LogoutConfirmModal
        isOpen={showLogoutConfirm}
        onConfirm={handleLogoutConfirm}
        onCancel={handleLogoutCancel}
        loading={isLoggingOut}
      />

      <style>{`
        .custom-dropdown-item {
          background: none; border: none; width: 100%; text-align: left; cursor: pointer;
          padding: 0.375rem 1rem; color: #212529;
          transition: all 0.15s ease-in-out;
        }
        .custom-dropdown-item:hover {
          background-color: #f8f9fa; color: #16181b;
        }
        .logout-item { color: #dc3545 !important; }
        .logout-item:hover {
          background-color: rgba(220, 53, 69, 0.1) !important; color: #dc3545 !important;
        }
      `}</style>
    </>
  )
}

export default Topbar