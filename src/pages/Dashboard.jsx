import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../lib/api'
import PortalModal from '../components/PortalModal'

const interFamily =
  '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif'

export default function Dashboard() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [metrics, setMetrics] = useState({
    total_count: 0,
    pending_count: 0,
    resolved_count: 0,
    series: [],
  })

  const [activeSummaryModal, setActiveSummaryModal] = useState(null)
  const [summaryModalType, setSummaryModalType] = useState(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const res = await api.get('/metrics/dashboard')
        if (!cancelled) {
          setMetrics({
            total_count: res.data?.total_count ?? 0,
            pending_count: res.data?.pending_count ?? 0,
            resolved_count: res.data?.resolved_count ?? 0,
            series: Array.isArray(res.data?.series) ? res.data.series : [],
          })
        }
      } catch (e) {
        if (!cancelled) {
          setError('Unable to load dashboard metrics right now.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (activeSummaryModal) {
      setSummaryModalType(activeSummaryModal)
      return
    }
    if (!summaryModalType) return
    const t = setTimeout(() => setSummaryModalType(null), 220)
    return () => clearTimeout(t)
  }, [activeSummaryModal, summaryModalType])

  const stats = useMemo(
    () => [
      {
        label: 'Total hazards',
        value: metrics.total_count,
        icon: 'fas fa-exclamation-triangle',
      },
      {
        label: 'Pending',
        value: metrics.pending_count,
        icon: 'fas fa-hourglass-half',
      },
      {
        label: 'Resolved',
        value: metrics.resolved_count,
        icon: 'fas fa-check-circle',
      },
    ],
    [metrics.total_count, metrics.pending_count, metrics.resolved_count]
  )

  const chartData = useMemo(() => {
    if (metrics.series && metrics.series.length > 0) {
      return metrics.series
    }
    return [
      { name: 'Jan', submitted: 6, pending: 2, resolved: 4 },
      { name: 'Feb', submitted: 9, pending: 4, resolved: 5 },
      { name: 'Mar', submitted: 4, pending: 1, resolved: 3 },
      { name: 'Apr', submitted: 7, pending: 3, resolved: 4 },
      { name: 'May', submitted: 5, pending: 2, resolved: 3 },
      { name: 'Jun', submitted: 8, pending: 3, resolved: 5 },
    ]
  }, [metrics.series])

  const snapshotData = useMemo(() => {
    // Match the reference dashboard snapshot style (3 category bars) for non-admin users.
    if (isAdmin) return null
    return [
      { name: 'My hazards', value: metrics.total_count ?? 0 },
      { name: 'Pending', value: metrics.pending_count ?? 0 },
      { name: 'Resolved', value: metrics.resolved_count ?? 0 },
    ]
  }, [isAdmin, metrics.total_count, metrics.pending_count, metrics.resolved_count])

  const headerSubtitle = isAdmin
    ? 'System-wide overview of submitted hazards and current statuses.'
    : 'Hazard reporting overview of submitted hazard reports and current statuses. Use Submit Hazard Report to file a new record.'

  if (loading) {
    return (
      <>
        <div className="page-transition-enter">
          <div className="card border-0 shadow-sm w-100">
            <div
              className="card-header border-0"
              style={{
                backgroundColor: '#d3e9d7',
                borderBottom: '1px solid #b5d3ba',
                padding: '1.1rem 1.75rem',
              }}
            >
              <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center gap-2 gap-md-3">
                <div
                  className="d-inline-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                  style={{
                    width: 40,
                    height: 40,
                    minWidth: 40,
                    minHeight: 40,
                    backgroundColor: '#0C8A3B',
                    color: '#ffffff',
                    boxShadow: '0 4px 14px rgba(13, 122, 58, 0.28)',
                    fontSize: '1.05rem',
                  }}
                >
                  <i className="fas fa-chart-line" />
                </div>
                <div className="flex-grow-1">
                  <h2
                    className="mb-1"
                    style={{
                      fontFamily: interFamily,
                      fontWeight: 700,
                      fontSize: '1.1rem',
                      lineHeight: 1.3,
                      color: 'var(--text-primary)',
                    }}
                  >
                    System dashboard
                  </h2>
                  <p
                    className="mb-0"
                    style={{
                      fontFamily: interFamily,
                      fontSize: '0.875rem',
                      lineHeight: 1.4,
                      color: 'var(--text-secondary)',
                      fontWeight: 600,
                    }}
                  >
                    {headerSubtitle}
                  </p>
                </div>
              </div>
            </div>

            <div className="card-body">
              <div className="d-flex flex-column align-items-center justify-content-center py-4">
                <div
                  className="spinner-border"
                  role="status"
                  aria-label="Loading"
                  style={{ width: '1.75rem', height: '1.75rem', color: '#0C8A3B' }}
                />
                <p
                  className="mt-3 mb-0 text-muted"
                  style={{ fontFamily: interFamily, fontSize: '0.9rem' }}
                >
                  Loading your dashboard metrics… Please wait.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Summary count modal, matching MyReports style */}
        <PortalModal
          isOpen={Boolean(activeSummaryModal)}
          onRequestClose={() => setActiveSummaryModal(null)}
          ariaLabelledby="dashboard-summary-title"
          overlayClassName="account-approvals-detail-overlay"
          backdropClassName="account-approvals-detail-backdrop"
          wrapClassName=""
          panelClassName="account-approvals-detail-modal"
          closeOnBackdrop
          closeOnEsc
        >
          <div className="account-approvals-detail-header">
            <div className="account-approvals-detail-header-text">
              <h5
                id="dashboard-summary-title"
                className="mb-0 fw-semibold"
                style={{ fontFamily: interFamily }}
              >
                {summaryModalType === 'total' && 'Total hazards in system'}
                {summaryModalType === 'pending' && 'Pending hazards'}
                {summaryModalType === 'resolved' && 'Resolved hazards'}
              </h5>
              <div className="account-approvals-detail-subtitle">
                <span className="account-approvals-detail-name">
                  Full count recorded in the system.
                </span>
              </div>
            </div>

            <button
              type="button"
              className="btn-close-custom"
              aria-label="Close"
              onClick={() => setActiveSummaryModal(null)}
            >
              ×
            </button>
          </div>

          <div
            className="account-approvals-detail-body d-flex flex-column align-items-center justify-content-center"
            style={{
              padding: '1.75rem 1.5rem 1.5rem',
              background:
                'radial-gradient(circle at top, #f3f4f6 0, #ffffff 45%, #f9fafb 100%)',
            }}
          >
            <div
              style={{
                fontFamily: interFamily,
                fontSize: '2.4rem',
                fontWeight: 800,
                color: '#111827',
                lineHeight: 1.1,
                marginBottom: '0.35rem',
              }}
            >
              {summaryModalType === 'total' && metrics.total_count}
              {summaryModalType === 'pending' && metrics.pending_count}
              {summaryModalType === 'resolved' && metrics.resolved_count}
            </div>
            <div
              style={{
                fontFamily: interFamily,
                fontSize: '0.95rem',
                color: '#4b5563',
                textAlign: 'center',
              }}
            >
              {summaryModalType === 'total' &&
                'Total hazards currently recorded in the system.'}
              {summaryModalType === 'pending' &&
                'Hazards that are not yet marked as closed or resolved.'}
              {summaryModalType === 'resolved' &&
                'Hazards that have been marked as resolved.'}
            </div>
          </div>

          <div className="account-approvals-detail-footer">
            <button
              type="button"
              className="btn btn-light account-approvals-detail-close-btn"
              onClick={() => setActiveSummaryModal(null)}
              style={{ fontFamily: interFamily }}
            >
              Close
            </button>
          </div>
        </PortalModal>
      </>
    )
  }

  return (
    <>
      <div className="page-transition-enter">
        <div
          className="card border-0 shadow-sm w-100"
          style={{
            opacity: loading ? 1 : 1,
            transition: 'opacity 0.2s ease-out',
          }}
        >
        <div
          className="card-header border-0"
          style={{
            backgroundColor: '#d3e9d7',
            borderBottom: '1px solid #b5d3ba',
            padding: '1.1rem 1.75rem',
          }}
        >
          <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center gap-2 gap-md-3">
            <div
              className="d-inline-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
              style={{
                width: 40,
                height: 40,
                minWidth: 40,
                minHeight: 40,
                backgroundColor: '#0C8A3B',
                color: '#ffffff',
                boxShadow: '0 4px 14px rgba(13, 122, 58, 0.28)',
                fontSize: '1.05rem',
              }}
            >
              <i className="fas fa-chart-line" />
            </div>
            <div className="flex-grow-1">
              <h2
                className="mb-1"
                style={{
                  fontFamily: interFamily,
                  fontWeight: 700,
                  fontSize: '1.1rem',
                  lineHeight: 1.3,
                  color: 'var(--text-primary)',
                }}
              >
                System dashboard
              </h2>
              <p
                className="mb-0"
                style={{
                  fontFamily: interFamily,
                  fontSize: '0.875rem',
                  lineHeight: 1.4,
                  color: 'var(--text-secondary)',
                  fontWeight: 600,
                }}
              >
                {headerSubtitle}
              </p>
            </div>
            {!isAdmin && (
              <div className="mt-2 mt-md-0 ms-md-auto">
                <Link
                  to="/reporter/submit"
                  className="btn btn-success btn-sm d-inline-flex align-items-center justify-content-center"
                  style={{
                    fontFamily: interFamily,
                    fontSize: '0.8rem',
                    padding: '0.4rem 1.1rem',
                    borderRadius: 8,
                    backgroundColor: '#0C8A3B',
                    borderColor: '#0C8A3B',
                    transition:
                      'background-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease',
                    boxShadow: '0 4px 10px rgba(12, 138, 59, 0.14)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#0a6f31'
                    e.currentTarget.style.borderColor = '#0a6f31'
                    e.currentTarget.style.transform = 'translateY(-1px)'
                    e.currentTarget.style.boxShadow =
                      '0 7px 16px rgba(12, 138, 59, 0.2)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#0C8A3B'
                    e.currentTarget.style.borderColor = '#0C8A3B'
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow =
                      '0 4px 10px rgba(12, 138, 59, 0.14)'
                  }}
                >
                  <i className="fas fa-plus-circle me-2" />
                  Submit Hazard Report
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="card-body" style={{ backgroundColor: '#f8faf9' }}>
          <div className="row g-3">
            {stats.map((s) => (
              <div className="col-12 col-md-4" key={s.label}>
                <div
                  className="w-100 text-start"
                  style={{
                    borderRadius: 10,
                    padding: '0.9rem 1rem',
                    backgroundColor: '#ffffff',
                    boxShadow:
                      '0 1px 3px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(148, 163, 184, 0.18)',
                    fontFamily: interFamily,
                    transition:
                      'background-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    if (s.label === 'Pending') {
                      e.currentTarget.style.backgroundColor = '#f0fdfa'
                    } else if (s.label === 'Resolved') {
                      e.currentTarget.style.backgroundColor = '#ecfdf5'
                    } else {
                      e.currentTarget.style.backgroundColor = '#f0f7f3'
                    }
                    e.currentTarget.style.transform = 'translateY(-2px)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#ffffff'
                    e.currentTarget.style.transform = 'translateY(0)'
                  }}
                  onClick={() => {
                    if (s.label === 'Total hazards') setActiveSummaryModal('total')
                    if (s.label === 'Pending') setActiveSummaryModal('pending')
                    if (s.label === 'Resolved') setActiveSummaryModal('resolved')
                  }}
                >
                  <div className="d-flex align-items-start gap-3">
                    <div
                      className="d-inline-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                      style={{
                        width: 38,
                        height: 38,
                        minWidth: 38,
                        minHeight: 38,
                        backgroundColor:
                          s.label === 'Pending'
                            ? '#0f766e'
                            : s.label === 'Resolved'
                              ? '#15803d'
                              : '#0C8A3B',
                        color: '#ffffff',
                        boxShadow:
                          s.label === 'Pending'
                            ? '0 4px 14px rgba(15, 118, 110, 0.20)'
                            : s.label === 'Resolved'
                              ? '0 4px 14px rgba(22, 163, 74, 0.20)'
                              : '0 4px 14px rgba(12, 138, 59, 0.20)',
                        fontSize: '0.95rem',
                        marginTop: 2,
                      }}
                    >
                      <i className={s.icon} />
                    </div>
                    <div className="min-width-0">
                      <div
                        style={{
                          fontSize: '0.75rem',
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                          color: '#6b7280',
                          fontWeight: 700,
                          marginBottom: 2,
                        }}
                      >
                        {s.label}
                      </div>
                      <div
                        style={{
                          fontSize: '1.4rem',
                          fontWeight: 700,
                          color:
                            s.label === 'Pending'
                              ? '#0f766e'
                              : s.label === 'Resolved'
                                ? '#15803d'
                                : '#111827',
                          lineHeight: 1.1,
                        }}
                      >
                        {loading ? '—' : s.value}
                      </div>
                      <div
                        style={{
                          fontSize: '0.8rem',
                          color: '#6b7280',
                        }}
                      >
                        {s.label === 'Total hazards'
                          ? 'All hazards reported into the system.'
                          : s.label === 'Pending'
                            ? 'Reports awaiting triage or action.'
                            : 'Hazards closed and marked as resolved.'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="row g-3 mt-1">
            <div className={isAdmin ? 'col-12 col-lg-8' : 'col-12 col-lg-8'}>
              <div
                className="card border-0 shadow-sm h-100"
                style={{
                  borderRadius: 12,
                  border: '1px solid rgba(0, 0, 0, 0.08)',
                  backgroundColor: '#ffffff',
                }}
              >
                <div className="card-body" style={{ padding: 0 }}>
                  <div
                    style={{
                      padding: '0.75rem 1rem',
                      backgroundColor: 'rgba(13, 122, 58, 0.08)',
                      borderBottom: '1px solid rgba(229, 231, 235, 1)',
                      fontFamily: interFamily,
                      fontWeight: 900,
                      color: 'var(--text-primary)',
                      fontSize: '0.95rem',
                    }}
                  >
                    Document snapshot
                  </div>
                  <div style={{ width: '100%', height: 250, padding: '1rem' }}>
                    <ResponsiveContainer>
                      {isAdmin ? (
                        <BarChart data={chartData}>
                          <XAxis
                            dataKey="name"
                            stroke="rgba(15, 23, 42, 0.7)"
                            tick={{
                              fontFamily: interFamily,
                              fontSize: '0.75rem',
                              fontWeight: 800,
                              fill: 'rgba(15, 23, 42, 0.7)',
                            }}
                          />
                          <YAxis
                            allowDecimals={false}
                            stroke="rgba(15, 23, 42, 0.7)"
                            tick={{
                              fontFamily: interFamily,
                              fontSize: '0.75rem',
                              fontWeight: 800,
                              fill: 'rgba(15, 23, 42, 0.7)',
                            }}
                          />
                          <Tooltip
                            contentStyle={{
                              fontFamily: interFamily,
                              fontSize: '0.75rem',
                              fontWeight: 700,
                            }}
                            labelStyle={{
                              fontFamily: interFamily,
                              fontSize: '0.75rem',
                              fontWeight: 800,
                            }}
                            itemStyle={{
                              fontFamily: interFamily,
                              fontSize: '0.75rem',
                              fontWeight: 700,
                            }}
                          />
                          <Bar dataKey="submitted" name="Submitted" stackId="a" fill="#0C8A3B" />
                          <Bar dataKey="pending" name="Pending" stackId="a" fill="#0f766e" />
                          <Bar dataKey="resolved" name="Resolved" stackId="a" fill="#f59e0b" />
                        </BarChart>
                      ) : (
                        <BarChart data={snapshotData ?? []}>
                          <XAxis
                            dataKey="name"
                            stroke="rgba(15, 23, 42, 0.7)"
                            tick={{
                              fontFamily: interFamily,
                              fontSize: '0.75rem',
                              fontWeight: 800,
                              fill: 'rgba(15, 23, 42, 0.7)',
                            }}
                          />
                          <YAxis
                            allowDecimals={false}
                            stroke="rgba(15, 23, 42, 0.7)"
                            tick={{
                              fontFamily: interFamily,
                              fontSize: '0.75rem',
                              fontWeight: 800,
                              fill: 'rgba(15, 23, 42, 0.7)',
                            }}
                          />
                          <Tooltip
                            contentStyle={{
                              fontFamily: interFamily,
                              fontSize: '0.75rem',
                              fontWeight: 700,
                            }}
                            labelStyle={{
                              fontFamily: interFamily,
                              fontSize: '0.75rem',
                              fontWeight: 800,
                            }}
                            itemStyle={{
                              fontFamily: interFamily,
                              fontSize: '0.75rem',
                              fontWeight: 700,
                            }}
                          />
                          <Bar dataKey="value" name="Count" fill="#0C8A3B" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>

            {/* Reference UI keeps a right-side empty column for personnel */}
            <div className="col-12 col-lg-4">
              {isAdmin ? (
                <div
                  className="card border-0 shadow-sm h-100"
                  style={{
                    borderRadius: 12,
                    border: '1px solid rgba(0, 0, 0, 0.08)',
                    backgroundColor: '#ffffff',
                  }}
                >
                  <div className="card-body">
                    <div
                      style={{
                        fontFamily: interFamily,
                        fontWeight: 800,
                        color: 'var(--text-primary)',
                        marginBottom: '0.75rem',
                      }}
                    >
                      Administrative actions
                    </div>
                    <div className="d-flex flex-wrap gap-2">
                      <Link to="/manager/users" className="btn btn-outline-success btn-sm">
                        <i className="fas fa-users me-2" />
                        Manage users
                      </Link>
                      <Link to="/manager/categories" className="btn btn-outline-success btn-sm">
                        <i className="fas fa-tags me-2" />
                        Categories
                      </Link>
                      <Link to="/manager/locations" className="btn btn-outline-success btn-sm">
                        <i className="fas fa-map-marker-alt me-2" />
                        Locations
                      </Link>
                      <Link to="/admin/inbox" className="btn btn-outline-secondary btn-sm">
                        <i className="fas fa-inbox me-2" />
                        Inbox
                      </Link>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ minHeight: 1 }} />
              )}
            </div>

            <div className="col-12">
              <div
                className="card border-0 shadow-sm"
                style={{
                  borderRadius: 12,
                  border: '1px solid rgba(0, 0, 0, 0.08)',
                  backgroundColor: '#ffffff',
                }}
              >
                <div
                  style={{
                    padding: '0.75rem 1rem',
                  borderBottom: '1px solid rgba(229, 231, 235, 1)',
                  backgroundColor: 'rgba(13, 122, 58, 0.08)',
                    borderTopLeftRadius: 12,
                    borderTopRightRadius: 12,
                    fontFamily: interFamily,
                  fontWeight: 900,
                    color: 'var(--text-primary)',
                  fontSize: '0.95rem',
                  }}
                >
                  Quick actions
                </div>
                <div className="card-body" style={{ padding: '0.85rem 1rem' }}>
                  <div
                    style={{
                      border: '1px solid rgba(0, 0, 0, 0.10)',
                      borderRadius: 10,
                      padding: '0.75rem',
                      backgroundColor: '#ffffff',
                    }}
                  >
                    <div className="d-flex flex-wrap gap-2">
                      {isAdmin ? (
                        <>
                          <Link to="/admin/inbox" className="btn btn-success btn-sm">
                            <i className="fas fa-inbox me-2" />
                            Inbox
                          </Link>
                          <Link to="/manager/users" className="btn btn-outline-secondary btn-sm">
                            <i className="fas fa-users me-2" />
                            Users
                          </Link>
                          <Link to="/manager/categories" className="btn btn-outline-secondary btn-sm">
                            <i className="fas fa-tags me-2" />
                            Categories
                          </Link>
                          <Link to="/manager/locations" className="btn btn-outline-secondary btn-sm">
                            <i className="fas fa-map-marker-alt me-2" />
                            Locations
                          </Link>
                        </>
                      ) : (
                        <>
                          <Link to="/reporter/submit" className="btn btn-outline-secondary btn-sm">
                            <i className="fas fa-plus-circle me-2" />
                            Submit Hazard Report
                          </Link>
                          <Link to="/reporter/my-reports" className="btn btn-outline-secondary btn-sm">
                            <i className="fas fa-clipboard-list me-2" />
                            My Hazard Reports
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* Summary count modal, matching MyReports style */}
      <PortalModal
        isOpen={Boolean(activeSummaryModal)}
        onRequestClose={() => setActiveSummaryModal(null)}
        ariaLabelledby="dashboard-summary-title"
        overlayClassName="account-approvals-detail-overlay"
        backdropClassName="account-approvals-detail-backdrop"
        wrapClassName=""
        panelClassName="account-approvals-detail-modal"
        closeOnBackdrop
        closeOnEsc
      >
        <div className="account-approvals-detail-header">
          <div className="account-approvals-detail-header-text">
            <h5
              id="dashboard-summary-title"
              className="mb-0 fw-semibold"
              style={{ fontFamily: interFamily }}
            >
              {summaryModalType === 'total' && 'Total hazards in system'}
              {summaryModalType === 'pending' && 'Pending hazards'}
              {summaryModalType === 'resolved' && 'Resolved hazards'}
            </h5>
            <div className="account-approvals-detail-subtitle">
              <span className="account-approvals-detail-name">
                Full count recorded in the system.
              </span>
            </div>
          </div>

          <button
            type="button"
            className="btn-close-custom"
            aria-label="Close"
            onClick={() => setActiveSummaryModal(null)}
          >
            ×
          </button>
        </div>

        <div
          className="account-approvals-detail-body d-flex flex-column align-items-center justify-content-center"
          style={{
            padding: '1.75rem 1.5rem 1.5rem',
            background:
              'radial-gradient(circle at top, #f3f4f6 0, #ffffff 45%, #f9fafb 100%)',
          }}
        >
          <div
            style={{
              fontFamily: interFamily,
              fontSize: '2.4rem',
              fontWeight: 800,
              color: '#111827',
              lineHeight: 1.1,
              marginBottom: '0.35rem',
            }}
          >
            {summaryModalType === 'total' && metrics.total_count}
            {summaryModalType === 'pending' && metrics.pending_count}
            {summaryModalType === 'resolved' && metrics.resolved_count}
          </div>
          <div
            style={{
              fontFamily: interFamily,
              fontSize: '0.95rem',
              color: '#4b5563',
              textAlign: 'center',
            }}
          >
            {summaryModalType === 'total' &&
              'Total hazards currently recorded in the system.'}
            {summaryModalType === 'pending' &&
              'Hazards that are not yet marked as closed or resolved.'}
            {summaryModalType === 'resolved' &&
              'Hazards that have been marked as resolved.'}
          </div>
        </div>

        <div className="account-approvals-detail-footer">
          <button
            type="button"
            className="btn btn-light account-approvals-detail-close-btn"
            onClick={() => setActiveSummaryModal(null)}
            style={{ fontFamily: interFamily }}
          >
            Close
          </button>
        </div>
      </PortalModal>
    </>
  )
}

