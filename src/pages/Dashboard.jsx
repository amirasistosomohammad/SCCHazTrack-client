import React, { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts'
import { useAuth } from '../contexts/AuthContext'

const interFamily =
  '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif'

export default function Dashboard() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const stats = useMemo(
    () => [
      { label: 'Total hazards', value: 0, icon: 'fas fa-exclamation-triangle' },
      { label: 'Open / pending', value: 0, icon: 'fas fa-hourglass-half' },
      { label: 'Resolved', value: 0, icon: 'fas fa-check-circle' },
    ],
    []
  )

  const chartData = useMemo(
    () => [
      { name: 'Jan', submitted: 6, open: 2, resolved: 4 },
      { name: 'Feb', submitted: 9, open: 4, resolved: 5 },
      { name: 'Mar', submitted: 4, open: 1, resolved: 3 },
      { name: 'Apr', submitted: 7, open: 3, resolved: 4 },
      { name: 'May', submitted: 5, open: 2, resolved: 3 },
      { name: 'Jun', submitted: 8, open: 3, resolved: 5 },
    ],
    []
  )

  return (
    <div className="page-transition-enter">
      <div className="card border-0 shadow-sm w-100">
        <div
          className="card-header border-0"
          style={{
            backgroundColor: 'rgba(13, 122, 58, 0.12)',
            borderBottom: '1px solid rgba(13, 122, 58, 0.22)',
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
                backgroundColor: 'var(--primary-color)',
                color: '#ffffff',
                boxShadow: '0 6px 18px rgba(13, 122, 58, 0.22)',
              }}
            >
              <i className="fas fa-chart-line" />
            </div>
            <div className="flex-grow-1">
              <h2
                className="mb-1"
                style={{
                  fontFamily: interFamily,
                  fontWeight: 800,
                  fontSize: '1.05rem',
                  color: 'var(--text-primary)',
                }}
              >
                System dashboard
              </h2>
              <p
                className="mb-0"
                style={{
                  fontFamily: interFamily,
                  fontSize: '0.85rem',
                  color: 'var(--text-secondary)',
                }}
              >
                Reporter overview of submitted hazards and current statuses. Use{' '}
                <span className="fw-semibold">Submit hazard</span> to file a new report.
              </p>
            </div>
            {!isAdmin && (
              <div className="mt-2 mt-md-0 ms-md-auto">
                <Link
                  to="/reporter/submit"
                  className="btn btn-success btn-sm d-inline-flex align-items-center"
                  style={{ fontFamily: interFamily, fontWeight: 600 }}
                >
                  <i className="fas fa-plus-circle me-2" />
                  Submit hazard
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
                  className="card h-100 border-0 shadow-sm"
                  style={{
                    borderRadius: 12,
                    background: '#ffffff',
                    border: '1px solid rgba(13, 122, 58, 0.12)',
                  }}
                >
                  <div className="card-body d-flex align-items-center gap-3">
                    <div
                      className="rounded-circle d-inline-flex align-items-center justify-content-center flex-shrink-0"
                      style={{
                        width: 40,
                        height: 40,
                        background: 'rgba(255, 179, 0, 0.14)',
                        color: 'var(--primary-color)',
                      }}
                    >
                      <i className={s.icon} />
                    </div>
                    <div className="min-width-0">
                      <div
                        className="text-uppercase"
                        style={{
                          fontFamily: interFamily,
                          fontSize: '0.7rem',
                          letterSpacing: '0.08em',
                          color: 'var(--text-muted)',
                          fontWeight: 700,
                        }}
                      >
                        {s.label}
                      </div>
                      <div
                        style={{
                          fontFamily: interFamily,
                          fontSize: '1.4rem',
                          fontWeight: 900,
                          color: 'var(--text-primary)',
                          lineHeight: 1.15,
                        }}
                      >
                        {s.value}
                      </div>
                      <div
                        style={{
                          fontFamily: interFamily,
                          fontSize: '0.8rem',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        {s.label === 'Total hazards'
                          ? 'All hazards reported into the system.'
                          : s.label === 'Open / pending'
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
            <div className="col-12 col-lg-8">
              <div
                className="card border-0 shadow-sm h-100"
                style={{
                  borderRadius: 12,
                  border: '1px solid rgba(13, 122, 58, 0.12)',
                }}
              >
                <div
                  className="card-header bg-white border-0"
                  style={{
                    borderBottom: '1px solid rgba(13, 122, 58, 0.12)',
                    borderTopLeftRadius: 12,
                    borderTopRightRadius: 12,
                    padding: '0.9rem 1rem',
                  }}
                >
                  <div
                    style={{
                      fontFamily: interFamily,
                      fontWeight: 800,
                      color: 'var(--text-primary)',
                    }}
                  >
                    Reporter activity snapshot
                  </div>
                  <div
                    className="small text-muted"
                    style={{ fontFamily: interFamily, marginTop: 2 }}
                  >
                    Monthly view of submitted, open, and resolved hazards.
                  </div>
                </div>
                <div className="card-body">
                  <div style={{ width: '100%', height: 260 }}>
                    <ResponsiveContainer>
                      <BarChart data={chartData}>
                        <XAxis dataKey="name" stroke="rgba(15, 23, 42, 0.7)" />
                        <YAxis
                          allowDecimals={false}
                          stroke="rgba(15, 23, 42, 0.7)"
                        />
                        <Tooltip
                          contentStyle={{
                            fontFamily: interFamily,
                            fontSize: '0.8rem',
                          }}
                        />
                        <Bar
                          dataKey="submitted"
                          name="Submitted"
                          stackId="a"
                          fill="var(--primary-color)"
                          radius={[6, 6, 0, 0]}
                        />
                        <Bar
                          dataKey="open"
                          name="Open"
                          stackId="a"
                          fill="#f59e0b"
                          radius={[6, 6, 0, 0]}
                        />
                        <Bar
                          dataKey="resolved"
                          name="Resolved"
                          stackId="a"
                          fill="#10b981"
                          radius={[6, 6, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div
                    className="small text-muted mt-3"
                    style={{ fontFamily: interFamily }}
                  >
                    These sample figures will be replaced with real data once the
                    dashboard is wired to your reporting API.
                  </div>
                </div>
              </div>
            </div>

            <div className="col-12 col-lg-4">
              <div
                className="card border-0 shadow-sm"
                style={{
                  borderRadius: 12,
                  border: '1px solid rgba(13, 122, 58, 0.12)',
                }}
              >
                <div
                  className="card-header bg-white border-0"
                  style={{
                    borderBottom: '1px solid rgba(13, 122, 58, 0.12)',
                    borderTopLeftRadius: 12,
                    borderTopRightRadius: 12,
                    padding: '0.9rem 1rem',
                  }}
                >
                  <div style={{ fontFamily: interFamily, fontWeight: 800, color: 'var(--text-primary)' }}>
                    Administrative actions
                  </div>
                </div>
                <div className="card-body">
                  <div className="d-flex flex-wrap gap-2">
                    {isAdmin ? (
                      <>
                        <Link className="btn btn-outline-success btn-sm" to="/manager/users">
                          <i className="fas fa-users me-2" />
                          Manage users
                        </Link>
                        <Link className="btn btn-outline-success btn-sm" to="/manager/categories">
                          <i className="fas fa-tags me-2" />
                          Categories
                        </Link>
                        <Link className="btn btn-outline-success btn-sm" to="/manager/locations">
                          <i className="fas fa-map-marker-alt me-2" />
                          Locations
                        </Link>
                        <Link className="btn btn-outline-secondary btn-sm" to="/admin/inbox">
                          <i className="fas fa-inbox me-2" />
                          Inbox
                        </Link>
                      </>
                    ) : (
                      <>
                        <Link className="btn btn-success btn-sm" to="/reporter/submit">
                          <i className="fas fa-plus-circle me-2" />
                          Submit hazard
                        </Link>
                        <Link className="btn btn-outline-secondary btn-sm" to="/reporter/my-reports">
                          <i className="fas fa-clipboard-list me-2" />
                          My reports
                        </Link>
                      </>
                    )}
                  </div>

                  <div className="mt-3 p-3 rounded-3" style={{ background: 'rgba(13, 122, 58, 0.06)' }}>
                    <div className="small text-muted" style={{ fontFamily: interFamily }}>
                      Logged in as
                    </div>
                    <div style={{ fontFamily: interFamily, fontWeight: 800, color: 'var(--text-primary)' }}>
                      {user?.name || user?.email || 'User'}
                    </div>
                    <div className="small" style={{ fontFamily: interFamily, color: 'var(--text-secondary)' }}>
                      Role: {isAdmin ? 'Administrator' : 'Reporter'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

