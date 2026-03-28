import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'

export default function PersonnelNotifications() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)

  const canMarkAllRead = useMemo(() => unreadCount > 0, [unreadCount])

  const load = async () => {
    setError(null)
    try {
      const res = await api.get('/notifications')
      setNotifications(res.data?.data ?? [])
      setUnreadCount(res.data?.unread_count ?? 0)
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to load notifications.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/read-all')
      await load()
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to mark notifications as read.')
    }
  }

  const markRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`)
      await load()
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to update notification.')
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: '24px auto', padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <h2 style={{ margin: 0 }}>Notification Center</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: unreadCount > 0 ? '#0C8A3B' : '#6b7280', fontWeight: 600 }}>
            {unreadCount} unread
          </span>
          <button
            className="btn btn-outline-success btn-sm"
            onClick={markAllRead}
            disabled={!canMarkAllRead}
          >
            Mark all as read
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ paddingTop: 16 }}>Loading...</div>
      ) : error ? (
        <div style={{ paddingTop: 16, color: '#b91c1c', fontWeight: 600 }}>{error}</div>
      ) : notifications.length ? (
        <div className="mt-3" style={{ display: 'grid', gap: 10 }}>
          {notifications.map((n) => {
            const hazardId = n?.hazard_report_id
            const isUnread = !n?.read_at
            const createdAt = n?.created_at ? new Date(n.created_at).toLocaleString() : ''
            const statusKey = n?.status_key ? String(n.status_key) : ''
            const statusLabel = statusKey
              ? statusKey
                  .replace(/_/g, ' ')
                  .replace(/\b\w/g, (c) => c.toUpperCase())
              : ''

            return (
              <div
                key={n.id}
                className="card border-0 shadow-sm"
                style={{
                  padding: 12,
                  backgroundColor: isUnread ? '#f0fdf4' : '#ffffff',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 800, color: '#065f46' }}>
                      {isUnread ? <i className="fas fa-circle me-2" style={{ color: '#16a34a', fontSize: 10 }} /> : null}
                      {n?.title ?? 'Notification'}
                    </div>
                    {n?.message ? <div style={{ whiteSpace: 'pre-wrap' }}>{n.message}</div> : null}
                    <div style={{ marginTop: 6, color: '#6b7280', fontSize: 12 }}>
                      {createdAt}
                      {statusLabel ? ` • ${statusLabel}` : ''}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                    {hazardId ? (
                      <Link to={`/reporter/reports/${hazardId}`} className="btn btn-success btn-sm">
                        View report
                      </Link>
                    ) : null}
                    {isUnread ? (
                      <button className="btn btn-outline-success btn-sm" onClick={() => markRead(n.id)}>
                        Mark read
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div style={{ paddingTop: 16 }}>No notifications yet.</div>
      )}
    </div>
  )
}

