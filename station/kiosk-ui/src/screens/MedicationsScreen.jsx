import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import useStore from '../store'
import config from '../config'

function MedicationsScreen() {
  const navigate = useNavigate()
  const patient = useStore((s) => s.patient)

  const [medications, setMedications] = useState([])
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState(null)
  const [tab, setTab] = useState('today')

  useEffect(() => {
    if (!patient) { navigate('/profile-selection'); return }
    fetchMedications()
  }, [patient])

  async function fetchMedications() {
    try {
      setLoading(true)
      // Read from cloud MongoDB
      const res = await fetch(`${config.API_URL}/api/medications/${patient.id}`)
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      const meds = Array.isArray(data) ? data : (data.medications || [])
      setMedications(meds)
      buildTodayLogs(meds)
    } catch (e) {
      setMedications([])
      setLogs([])
    } finally {
      setLoading(false)
    }
  }

  function buildTodayLogs(meds) {
    const now = new Date()
    const nowMinutes = now.getHours() * 60 + now.getMinutes()
    const todayLogs = []

    meds.forEach((med) => {
      if (!med.active) return
      const times = parseTimes(med.times)
      times.forEach((time) => {
        const [h, m] = time.split(':').map(Number)
        const scheduleMinutes = h * 60 + m
        const diffMinutes = nowMinutes - scheduleMinutes
        let status = 'upcoming'
        if (diffMinutes > 60) status = 'missed'
        else if (diffMinutes >= -15) status = 'due'
        if (med.last_confirmed_today) status = 'taken'
        todayLogs.push({ ...med, scheduled_time: time, status, scheduleMinutes })
      })
    })

    todayLogs.sort((a, b) => a.scheduleMinutes - b.scheduleMinutes)
    setLogs(todayLogs)
  }

  function parseTimes(times) {
    if (!times) return []
    if (Array.isArray(times)) return times
    try { return JSON.parse(times) } catch { return [] }
  }

  async function confirmMedication(med) {
    setConfirming(med.id)
    try {
      // Confirm on cloud via patient-service proxy
      await fetch(`${config.API_URL}/api/medications/${med._id || med.id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmed_by: 'patient', scheduled_time: med.scheduled_time }),
      })
      setLogs((prev) => prev.map((l) =>
        l.id === med.id && l.scheduled_time === med.scheduled_time
          ? { ...l, status: 'taken' }
          : l
      ))
    } catch (e) {}
    setConfirming(null)
  }

  const takenToday = logs.filter((l) => l.status === 'taken').length
  const totalToday = logs.length
  const compliance = totalToday > 0 ? Math.round((takenToday / totalToday) * 100) : null

  function getStatusColor(status) {
    if (status === 'taken')  return '#22C55E'
    if (status === 'due')    return '#F59E0B'
    if (status === 'missed') return '#EF4444'
    return 'rgba(255,255,255,0.2)'
  }

  function getStatusLabel(status) {
    if (status === 'taken')  return '✓ Taken'
    if (status === 'due')    return 'Due Now'
    if (status === 'missed') return 'Missed'
    return 'Upcoming'
  }

  function getStatusIcon(status) {
    if (status === 'taken')  return '✅'
    if (status === 'due')    return '⏰'
    if (status === 'missed') return '❌'
    return '○'
  }

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
              💊 Medications
            </div>
            {patient && (
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
                {patient.name}
              </div>
            )}
          </div>
        </div>

        {compliance !== null && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3 }}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              background: 'rgba(34,197,94,0.1)',
              border: '1px solid rgba(34,197,94,0.25)',
              borderRadius: 16, padding: '12px 20px',
            }}
          >
            <div style={{ fontSize: 28, fontWeight: 900, color: '#22C55E', lineHeight: 1 }}>
              {compliance}%
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)',
              fontWeight: 600, letterSpacing: '0.06em', marginTop: 3 }}>
              TODAY
            </div>
          </motion.div>
        )}
      </motion.div>

      <div style={{ padding: '20px 48px 0', flexShrink: 0, display: 'flex', gap: 8 }}>
        {['today', 'all'].map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '8px 20px', borderRadius: 10,
            background: tab === t ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${tab === t ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.08)'}`,
            color: tab === t ? '#818CF8' : 'rgba(255,255,255,0.4)',
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
            fontFamily: 'inherit', transition: 'all 0.15s', textTransform: 'capitalize',
          }}>
            {t === 'today' ? "Today's Schedule" : 'All Medications'}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 48px 40px' }}>

        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[0,1,2].map((i) => (
              <motion.div key={i}
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.15 }}
                style={{ height: 80, borderRadius: 16, background: 'rgba(255,255,255,0.05)' }}
              />
            ))}
          </div>
        )}

        {!loading && tab === 'today' && (
          <AnimatePresence>
            {logs.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                style={{ display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 16, paddingTop: 60 }}>
                <div style={{ fontSize: 48 }}>💊</div>
                <div style={{ fontSize: 18, color: 'rgba(255,255,255,0.4)',
                  fontWeight: 600, textAlign: 'center' }}>
                  No medications scheduled for today
                </div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)',
                  textAlign: 'center', maxWidth: 280 }}>
                  Add medications from the PrimeCare app on your family member's phone
                </div>
              </motion.div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {logs.map((med, i) => (
                  <motion.div key={`${med._id || med.id}-${med.scheduled_time}`}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06, duration: 0.35 }}
                    style={{
                      background: 'rgba(30,30,46,0.9)',
                      border: `1px solid ${med.status === 'due' ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.07)'}`,
                      borderRadius: 18, padding: '18px 24px',
                      display: 'flex', alignItems: 'center', gap: 16,
                      boxShadow: med.status === 'due' ? '0 0 20px rgba(245,158,11,0.1)' : 'none',
                    }}
                  >
                    <div style={{ flexShrink: 0, textAlign: 'center', minWidth: 52 }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#F8FAFC' }}>
                        {med.scheduled_time}
                      </div>
                    </div>
                    <div style={{ width: 1, height: 40, background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: '#F8FAFC', marginBottom: 3 }}>
                        {med.name}
                      </div>
                      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
                        {med.dose}{med.purpose ? ` · ${med.purpose}` : ''}
                      </div>
                    </div>
                    <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        padding: '4px 12px', borderRadius: 99,
                        background: `${getStatusColor(med.status)}18`,
                        border: `1px solid ${getStatusColor(med.status)}40`,
                        fontSize: 12, fontWeight: 700, color: getStatusColor(med.status),
                      }}>
                        {getStatusIcon(med.status)} {getStatusLabel(med.status)}
                      </div>
                      {med.status === 'due' && (
                        <motion.button
                          whileHover={{ background: 'rgba(34,197,94,0.25)' }}
                          whileTap={{ scale: 0.96 }}
                          onClick={() => confirmMedication(med)}
                          disabled={confirming === (med._id || med.id)}
                          style={{
                            padding: '10px 20px', borderRadius: 12,
                            background: 'rgba(34,197,94,0.15)',
                            border: '1px solid rgba(34,197,94,0.4)',
                            color: '#22C55E', fontSize: 13, fontWeight: 700,
                            cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                          }}
                        >
                          {confirming === (med._id || med.id) ? 'Saving…' : '✓ Confirm Taken'}
                        </motion.button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>
        )}

        {!loading && tab === 'all' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {medications.filter((m) => m.active).length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column',
                alignItems: 'center', paddingTop: 60, gap: 16 }}>
                <div style={{ fontSize: 48 }}>📋</div>
                <div style={{ fontSize: 18, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
                  No active medications
                </div>
              </div>
            ) : (
              medications.filter((m) => m.active).map((med, i) => (
                <motion.div key={med._id || med.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  style={{
                    background: 'rgba(30,30,46,0.9)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 18, padding: '18px 24px',
                    display: 'flex', alignItems: 'center', gap: 16,
                  }}
                >
                  <div style={{ fontSize: 28, flexShrink: 0 }}>💊</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#F8FAFC', marginBottom: 3 }}>
                      {med.name}
                    </div>
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
                      {med.dose} · {med.frequency}{med.purpose ? ` · ${med.purpose}` : ''}
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>
                    {parseTimes(med.times).join(', ')}
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default MedicationsScreen
