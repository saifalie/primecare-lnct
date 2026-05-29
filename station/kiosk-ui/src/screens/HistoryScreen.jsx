import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import useStore from '../store'
import config from '../config'

const TABS = ['All', 'Checkups', 'Alerts']

function timeAgo(dateStr) {
  if (!dateStr) return '—'
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}

function formatDateTime(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

function getRiskColor(level) {
  if (level === 'GREEN') return '#22C55E'
  if (level === 'RED') return '#EF4444'
  if (level === 'YELLOW') return '#F59E0B'
  return '#64748B'
}

function getRiskLabel(level) {
  if (level === 'GREEN') return 'Good'
  if (level === 'RED') return 'Urgent'
  if (level === 'YELLOW') return 'Attention'
  return 'Unknown'
}

function getSeverityColor(severity) {
  if (severity === 'CRITICAL') return '#EF4444'
  if (severity === 'WARNING') return '#F59E0B'
  return '#6366F1'
}

function HistoryScreen() {
  const navigate = useNavigate()
  const patient = useStore((s) => s.patient)

  const [visits, setVisits] = useState([])
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('All')
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    if (!patient) { navigate('/profile-selection'); return }
    fetchAll()
  }, [patient])

  async function fetchAll() {
    setLoading(true)
    try {
      const [visitsRes, alertsRes] = await Promise.all([
        fetch(`${config.API_URL}/api/visits/${patient.id}`),
        fetch(`${config.API_URL}/api/alerts/${patient.id}`),
      ])
      if (visitsRes.ok) {
        const d = await visitsRes.json()
        setVisits(d.visits || d || [])
      }
      if (alertsRes.ok) {
        const d = await alertsRes.json()
        setAlerts(d.alerts || d || [])
      }
    } catch (e) {}
    setLoading(false)
  }

  const allEvents = [
    ...visits.map((v) => ({
      id: `visit-${v.id || v._id}`,
      type: 'checkup',
      category: 'Checkups',
      date: v.completed_at || v.completedAt || v.started_at,
      icon: '🩺',
      title: `Health Checkup — ${getRiskLabel(v.risk_level)}`,
      subtitle: v.ai_summary
        ? v.ai_summary.slice(0, 80) + (v.ai_summary.length > 80 ? '…' : '')
        : 'Checkup completed',
      color: getRiskColor(v.risk_level),
      raw: v,
    })),
    ...alerts.map((a) => ({
      id: `alert-${a.id || a._id}`,
      type: a.type,
      category: 'Alerts',
      date: a.created_at || a.createdAt,
      icon: a.type === 'fall' ? '⚠️' : a.type === 'sos' ? '🚨' : '📊',
      title: a.type === 'fall' ? 'Fall Detected'
           : a.type === 'sos' ? 'SOS Triggered'
           : 'Health Alert',
      subtitle: a.message || a.type,
      color: getSeverityColor(a.severity),
      resolved: a.resolved,
      raw: a,
    })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date))

  const filtered = tab === 'All'
    ? allEvents
    : allEvents.filter((e) => e.category === tab)

  return (
    <div style={{
      width: '100vw', height: '100vh', overflow: 'hidden',
      background: 'radial-gradient(ellipse at 50% 0%, #0d0d2b 0%, #0A0A0F 60%)',
      display: 'flex', flexDirection: 'column',
      fontFamily: 'Inter, sans-serif',
    }}>

      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{
          padding: '28px 48px 0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <motion.button
            whileHover={{ background: 'rgba(255,255,255,0.08)' }}
            whileTap={{ scale: 0.96 }}
            onClick={() => navigate('/dashboard')}
            style={{
              padding: '8px 18px', borderRadius: 10,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.5)', fontSize: 13,
              fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >← Dashboard</motion.button>
          <div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#F8FAFC', letterSpacing: '-0.02em' }}>
              📋 History
            </div>
            {patient && (
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
                {patient.name} · {allEvents.length} events
              </div>
            )}
          </div>
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em' }}>
          Prime<span style={{ color: '#6366F1' }}>Care</span>
        </div>
      </motion.div>

      <div style={{ padding: '16px 48px 0', flexShrink: 0, display: 'flex', gap: 8 }}>
        {TABS.map((t) => {
          const count = t === 'All' ? allEvents.length
            : allEvents.filter((e) => e.category === t).length
          return (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '8px 16px', borderRadius: 10,
              background: tab === t ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${tab === t ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.08)'}`,
              color: tab === t ? '#818CF8' : 'rgba(255,255,255,0.4)',
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
              fontFamily: 'inherit', transition: 'all 0.15s',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              {t}
              {count > 0 && (
                <span style={{
                  background: tab === t ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.1)',
                  borderRadius: 99, padding: '1px 7px',
                  fontSize: 11, fontWeight: 700,
                  color: tab === t ? '#C7D2FE' : 'rgba(255,255,255,0.3)',
                }}>{count}</span>
              )}
            </button>
          )
        })}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 48px 40px' }}>

        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[0,1,2,3].map((i) => (
              <motion.div key={i}
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.12 }}
                style={{ height: 72, borderRadius: 14, background: 'rgba(255,255,255,0.05)' }}
              />
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 16, paddingTop: 80 }}>
            <div style={{ fontSize: 48 }}>📭</div>
            <div style={{ fontSize: 18, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
              No {tab === 'All' ? 'events' : tab.toLowerCase()} yet
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)',
              textAlign: 'center', maxWidth: 280 }}>
              {tab === 'Checkups'
                ? 'Complete your first health checkup to see results here'
                : 'Events will appear here as they happen'}
            </div>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map((event, i) => (
              <motion.div key={event.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.3 }}
                onClick={() => setSelected(event)}
                style={{
                  background: 'rgba(30,30,46,0.9)',
                  border: `1px solid ${event.resolved === false
                    ? `${event.color}30` : 'rgba(255,255,255,0.07)'}`,
                  borderRadius: 16, padding: '14px 20px',
                  display: 'flex', alignItems: 'center', gap: 14,
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
                whileHover={{ borderColor: `${event.color}40`, background: 'rgba(40,40,60,0.95)' }}
              >
                <div style={{ width: 4, height: 40, borderRadius: 2,
                  background: event.color, flexShrink: 0 }} />
                <div style={{ fontSize: 22, flexShrink: 0, width: 32, textAlign: 'center' }}>
                  {event.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#F8FAFC',
                    marginBottom: 3, display: 'flex', alignItems: 'center', gap: 8 }}>
                    {event.title}
                    {event.resolved === false && (
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 7px',
                        borderRadius: 99, background: `${event.color}20`,
                        color: event.color, letterSpacing: '0.05em',
                      }}>UNRESOLVED</span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {event.subtitle}
                  </div>
                </div>
                <div style={{ flexShrink: 0, textAlign: 'right' }}>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>
                    {timeAgo(event.date)}
                  </div>
                </div>
                <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.2)', flexShrink: 0 }}>›</div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setSelected(null)}
            style={{
              position: 'fixed', inset: 0, zIndex: 100,
              background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40,
            }}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: '#141420',
                border: `1px solid ${selected.color}30`,
                borderRadius: 24, padding: '32px',
                maxWidth: 520, width: '100%',
                display: 'flex', flexDirection: 'column', gap: 16,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 28 }}>{selected.icon}</span>
                  <div>
                    <div style={{ fontSize: 17, fontWeight: 800, color: '#F8FAFC' }}>
                      {selected.title}
                    </div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
                      {formatDateTime(selected.date)}
                    </div>
                  </div>
                </div>
                <button onClick={() => setSelected(null)} style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8, width: 32, height: 32,
                  color: 'rgba(255,255,255,0.5)', fontSize: 16,
                  cursor: 'pointer', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>✕</button>
              </div>

              {selected.type === 'checkup' && selected.raw && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {selected.raw.risk_level && (
                    <div style={{
                      padding: '8px 14px', borderRadius: 10,
                      background: `${getRiskColor(selected.raw.risk_level)}18`,
                      border: `1px solid ${getRiskColor(selected.raw.risk_level)}30`,
                      fontSize: 13, fontWeight: 700,
                      color: getRiskColor(selected.raw.risk_level),
                      display: 'inline-block', alignSelf: 'flex-start',
                    }}>
                      {getRiskLabel(selected.raw.risk_level)} — Score: {selected.raw.health_score || '—'}/100
                    </div>
                  )}
                  {selected.raw.ai_summary && (
                    <div style={{ fontSize: 14, lineHeight: 1.65, color: 'rgba(255,255,255,0.65)' }}>
                      {selected.raw.ai_summary}
                    </div>
                  )}
                  {selected.raw.what_to_do && (
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>
                      <span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>What to do: </span>
                      {selected.raw.what_to_do}
                    </div>
                  )}
                </div>
              )}

              {selected.type !== 'checkup' && selected.raw && (
                <div style={{ fontSize: 14, lineHeight: 1.65, color: 'rgba(255,255,255,0.65)' }}>
                  {selected.raw.message || selected.subtitle}
                </div>
              )}

              <button onClick={() => setSelected(null)} style={{
                marginTop: 4, padding: '12px', borderRadius: 12,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.6)', fontSize: 14,
                fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}>Close</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default HistoryScreen
