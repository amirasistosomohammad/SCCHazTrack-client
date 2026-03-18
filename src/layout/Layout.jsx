import React, { useState, useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Topbar from './Topbar'
import Sidebar from './Sidebar'
import Footer from './Footer'

const Layout = () => {
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [sidebarToggled, setSidebarToggled] = useState(false)

  const toggleSidebar = () => setSidebarToggled((prev) => !prev)
  const closeSidebar = () => setSidebarToggled(false)

  const handleMainClick = () => {
    if (window.innerWidth < 768 && sidebarToggled) closeSidebar()
  }

  useEffect(() => {
    const body = document.body
    if (sidebarToggled) body.classList.add('sb-sidenav-toggled')
    else body.classList.remove('sb-sidenav-toggled')
    return () => body.classList.remove('sb-sidenav-toggled')
  }, [sidebarToggled])

  useEffect(() => {
    if (!isAuthenticated || !user) navigate('/', { replace: true })
  }, [isAuthenticated, user, navigate])

  if (!user) return null

  return (
    <div className="sb-nav-fixed">
      <Topbar onToggleSidebar={toggleSidebar} />
      <div id="layoutSidenav">
        <div id="layoutSidenav_nav">
          <Sidebar onCloseSidebar={closeSidebar} />
        </div>
        <div id="layoutSidenav_content" onClick={handleMainClick} role="presentation">
          <main>
            <div className="container-fluid page-enter">
              <Outlet />
            </div>
          </main>
          <Footer />
        </div>
      </div>
      {sidebarToggled && window.innerWidth < 768 && (
        <div
          className="mobile-sidebar-overlay"
          onClick={closeSidebar}
          onKeyDown={() => {}}
          role="button"
          tabIndex={0}
          aria-label="Close menu"
        />
      )}

      <style>{`
        .mobile-sidebar-overlay {
          position: fixed;
          top: 60px;
          left: 0;
          width: 100%;
          height: calc(100vh - 60px);
          background: rgba(0, 0, 0, 0.5);
          z-index: 1037;
          cursor: pointer;
          transition: opacity 0.3s ease;
        }
      `}</style>
    </div>
  )
}

export default Layout