// Copied from DATravelApp-client – same structure, ATIn menu only
import React from 'react'
import { useLocation, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const Sidebar = ({ onCloseSidebar }) => {
  const { user } = useAuth()
  const location = useLocation()

  const isActiveLink = (href) => {
    const normalize = (p) => (p || '').replace(/\/+$/, '') || '/'
    const current = normalize(location.pathname)
    const target = normalize(href)
    return current === target
  }

  const closeSidebarOnMobile = () => {
    if (window.innerWidth < 768 && onCloseSidebar) onCloseSidebar()
  }

  const role = user?.role
  const isAdmin = role === 'admin'
  const isReporter = !isAdmin
  // In the current codebase, "personnel" is not a first-class role yet.
  // For now, we treat all non-admin users (reporter flow) as the personnel-side user experience.
  const isPersonnel = !isAdmin

  const menuSections = [
    {
      heading: 'OVERVIEW',
      items: [
        { icon: 'fas fa-tachometer-alt', label: 'System Dashboard', href: '/dashboard' },
      ],
    },
    ...(isPersonnel
      ? [
          {
            heading: 'HAZARD REPORTING PORTAL',
            items: [
              {
                icon: 'fas fa-plus-circle',
                label: 'Submit Hazard Report',
                href: '/reporter/submit',
              },
              {
                icon: 'fas fa-clipboard-list',
                label: 'My Hazard Reports',
                href: '/reporter/my-reports',
              },
            ],
          },
          {
            heading: 'REPORT ATTACHMENTS',
            items: [
              {
                icon: 'fas fa-images',
                label: 'Report Attachments',
                href: '/reporter/hazard-evidence',
              },
            ],
          },
          {
            heading: 'NOTIFICATIONS',
            items: [
              { icon: 'fas fa-bell', label: 'Notification Center', href: '/personnel/notifications' },
            ],
          },
          {
            heading: 'ACCOUNT MANAGEMENT',
            items: [
              { icon: 'fas fa-user', label: 'My Profile', href: '/profile' },
            ],
          },
        ]
      : []),
    ...(isAdmin
      ? [
          {
            heading: 'ADMINISTRATION',
            items: [
              { icon: 'fas fa-inbox', label: 'Admin Inbox', href: '/admin/inbox' },
              { icon: 'fas fa-users', label: 'Manage Users', href: '/manager/users' },
              { icon: 'fas fa-tags', label: 'Manage Categories', href: '/manager/categories' },
              { icon: 'fas fa-map-marker-alt', label: 'Manage Locations', href: '/manager/locations' },
            ],
          },
          {
            heading: 'REPORTING',
            items: [
              { icon: 'fas fa-chart-bar', label: 'Reports', href: '/reports' },
            ],
          },
        ]
      : []),
  ]

  return (
    <nav className="sb-sidenav accordion sb-sidenav-dark" id="sidenavAccordion">
      <div className="sb-sidenav-menu">
        {menuSections.map((section) => (
          <React.Fragment key={section.heading}>
            <div className="sb-sidenav-menu-heading">{section.heading}</div>
            <ul className="nav">
              {section.items.map((item) => {
                const isActive = isActiveLink(item.href)
                return (
                  <li className="nav-item" key={item.href}>
                    <Link
                      className={`nav-link ${isActive ? 'active' : ''}`}
                      to={item.href}
                      onClick={closeSidebarOnMobile}
                    >
                      <i className={`sb-nav-link-icon ${item.icon}`} />
                      <span className="sb-nav-link-label">{item.label}</span>
                      {isActive && (
                        <i className="fas fa-chevron-right sb-nav-link-arrow" aria-hidden />
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </React.Fragment>
        ))}
      </div>
      <div className="sb-sidenav-footer">
        <div className="small">Logged in as</div>
        <div className="user-name">{user?.name || user?.email || 'User'}</div>
        <div className="small text-white-50">
          {role === 'admin'
            ? 'Administrator'
            : 'Reporter'}
        </div>
      </div>
    </nav>
  )
}

export default Sidebar