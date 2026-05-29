import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import useStore from '../store'
import config from '../config'

function DashboardScreen() {
  const navigate = useNavigate()
  const patient = useStore((s) => s.patient)
  const ws = useStore((s) => s.ws)

  const [patientData, setPatientData] = useState(null)
  const [bandVitals, setBandVitals] = useState(null)
  const [bandConnected, setBandConnected] = useState(false)
  const [alertCount, setAlertCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const bandTimeoutRef = useRef(null)

  // If no patient in store, send back to profile selection
  useEffect(() => {
    if (!patient) {
      navigate('/profile-selection')
    }
  }, [patient])

  // Fetch patient full profile + alerts on mount
  useEffect(() => {
    if (!patient) return
    fetchPatientData()
    fetchAlerts()
  }, [patient])

  // Listen to WebSocket for live band vitals
  useEffect(() => {
    if (!ws) return

    function handleMessage(event) {
      try {
        const msg = JSON.parse(event.data)
        if (msg.type === 'band_vitals' && msg.patient_id === patient?.id) {
          setBandVitals(msg.data)
          setBandConnected(true)
          // Reset band timeout — if no message in 15s, mark offline
          if (bandTimeoutRef.current) clearTimeout(bandTimeoutRef.current)
          bandTimeoutRef.current = setTimeout(() => {
            setBandConnected(false)
          }, 15000)
        }
      } catch (e) {
        // ignore parse errors
      }
    }

    ws.addEventListener('message', handleMessage)
    return () => {
      ws.removeEventListener('message', handleMessage)
      if (bandTimeoutRef.current) clearTimeout(bandTimeoutRef.current)
    }
  }, [ws, patient])

  async function fetchPatientData() {
    try {
      setLoading(true)
      const res = await fetch(`${config.API_URL}/api/patients/${patient.id}`)
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setPatientData(data)
    } catch (e) {
      // Use what we already have from store
      setPatientData(patient)
    } finally {
      setLoading(false)
    }
  }

  async function fetchAlerts() {
    try {
      const res = await fetch(`${config.API_URL}/api/patients/${patient.id}/alerts`)
      if (!res.ok) return
      const data = await res.json()
      const alerts = data.alerts || data || []
      const unread = alerts.filter((a) => !a.resolved).length
      setAlertCount(unread)
    } catch (e) {
      // no alerts available
    }
  }

  function getScoreColor(score) {
    if (!score) return '#64748B'
    if (score >= 70) return '#22C55E'
    if (score >= 45) return '#F59E0B'
    return '#EF4444'
  }

  function getScoreLabel(score) {
    if (!score) return 'No Data'
    if (score >= 70) return 'Good'
    if (score >= 45) return 'Attention'
    return 'Urgent'
  }

  function getInitials(name) {
    if (!name) return '??'
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const displayData = patientData || patient
  const score = displayData?.health_score || null
  const scoreColor = getScoreColor(score)
  const scoreLabel = getScoreLabel(score)
  const aiSummary = displayData?.last_summary || displayData?.ai_summary || null

  if (!patient) return null

  return (
    <div style={{
      width: '100vw', height: '100vh', overflow: 'hidden',
      background: 'radial-gradient(ellipse at 30% 0%, #0d0d2b 0%, #0A0A0F 60%)',
      display: 'flex', flexDirection: 'column',
      fontFamily: 'Inter, sans-serif',
    }}>

      {/* Top bar */}
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
        {/* Patient identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Avatar */}
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            overflow: 'hidden', flexShrink: 0,
            border: '2px solid rgba(99,102,241,0.5)',
            background: 'rgba(99,102,241,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {patient.profile_photo ? (
              <img
                src={patient.profile_photo}
                alt={patient.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => { e.target.style.display = 'none' }}
              />
            ) : (
              <span style={{ fontSize: 18, fontWeight: 700, color: '#818CF8' }}>
                {getInitials(patient.name)}
              </span>
            )}
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#F8FAFC', letterSpacing: '-0.02em' }}>
              {patient.name}
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
              {patient.age} years · {patient.gender}
            </div>
          </div>
        </div>

        {/* Right: logo + back */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <motion.button
            whileHover={{ background: 'rgba(255,255,255,0.08)' }}
            whileTap={{ scale: 0.96 }}
            onClick={() => navigate('/profile-selection')}
            style={{
              padding: '8px 18px', borderRadius: 10,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.5)', fontSize: 13,
              fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            ← Switch Profile
          </motion.button>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em' }}>
            Prime<span style={{ color: '#6366F1' }}>Care</span>
          </div>
        </div>
      </motion.div>

      {/* Main content */}
      <div style={{
        flex: 1, overflow: 'hidden',
        padding: '24px 48px 32px',
        display: 'flex', gap: 24,
      }}>

        {/* LEFT COLUMN — score + summary */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 20,
          flex: '0 0 340px',
        }}>

          {/* Health Score Card */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            style={{
              background: 'rgba(30,30,46,0.9)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 24, padding: '28px 28px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.35)',
              letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Health Score
            </div>

            {/* Score circle */}
            <div style={{ position: 'relative', width: 140, height: 140 }}>
              <svg width="140" height="140" viewBox="0 0 140 140">
                {/* Track */}
                <circle cx="70" cy="70" r="58"
                  fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
                {/* Progress */}
                <circle cx="70" cy="70" r="58"
                  fill="none"
                  stroke={score ? scoreColor : 'rgba(255,255,255,0.1)'}
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 58}`}
                  strokeDashoffset={`${2 * Math.PI * 58 * (1 - (score || 0) / 100)}`}
                  transform="rotate(-90 70 70)"
                  style={{ transition: 'stroke-dashoffset 1s ease' }}
                />
              </svg>
              {/* Number inside */}
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
              }}>
                {loading ? (
                  <motion.div
                    animate={{ opacity: [0.3, 0.7, 0.3] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                    style={{ width: 40, height: 12, borderRadius: 6,
                      background: 'rgba(255,255,255,0.1)' }}
                  />
                ) : (
                  <>
                    <div style={{ fontSize: 38, fontWeight: 900, color: scoreColor, lineHeight: 1 }}>
                      {score || '—'}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)',
                      marginTop: 4, letterSpacing: '0.05em' }}>
                      / 100
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Label pill */}
            <div style={{
              padding: '5px 18px', borderRadius: 99,
              background: score ? `${scoreColor}18` : 'rgba(255,255,255,0.05)',
              border: `1px solid ${score ? scoreColor + '40' : 'rgba(255,255,255,0.1)'}`,
              fontSize: 13, fontWeight: 700, color: score ? scoreColor : 'rgba(255,255,255,0.3)',
              letterSpacing: '0.05em',
            }}>
              {scoreLabel}
            </div>
          </motion.div>

          {/* AI Summary Card */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            style={{
              flex: 1,
              background: 'rgba(30,30,46,0.9)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 24, padding: '24px',
              display: 'flex', flexDirection: 'column', gap: 12,
              overflow: 'hidden',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)',
              letterSpacing: '0.1em', textTransform: 'uppercase', flexShrink: 0 }}>
              Last AI Summary
            </div>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[1, 0.7, 0.5].map((w, i) => (
                  <motion.div key={i}
                    animate={{ opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.15 }}
                    style={{ height: 12, borderRadius: 6,
                      width: `${w * 100}%`,
                      background: 'rgba(255,255,255,0.08)' }}
                  />
                ))}
              </div>
            ) : aiSummary ? (
              <div style={{
                fontSize: 14, lineHeight: 1.65,
                color: 'rgba(255,255,255,0.6)',
                overflowY: 'auto', flex: 1,
              }}>
                {aiSummary}
              </div>
            ) : (
              <div style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
                <div style={{ fontSize: 32 }}>🩺</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)',
                  textAlign: 'center', lineHeight: 1.5 }}>
                  No checkup yet. Start your first checkup to see an AI summary.
                </div>
              </div>
            )}
          </motion.div>
        </div>

        {/* RIGHT COLUMN — band vitals + actions */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column', gap: 20,
        }}>

          {/* Band Vitals Row */}
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            style={{
              background: 'rgba(30,30,46,0.9)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 24, padding: '20px 28px',
            }}
          >
            {/* Band header */}
            <div style={{ display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700,
                color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em',
                textTransform: 'uppercase' }}>
                PrimeBand — Live Vitals
              </div>
              {/* Connection dot */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <motion.div
                  animate={bandConnected ? { opacity: [1, 0.4, 1] } : { opacity: 0.3 }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: bandConnected ? '#22C55E' : '#EF4444',
                  }}
                />
                <span style={{ fontSize: 12, fontWeight: 600,
                  color: bandConnected ? '#22C55E' : 'rgba(255,255,255,0.25)' }}>
                  {bandConnected ? 'Connected' : 'Band offline'}
                </span>
              </div>
            </div>

            {/* Vitals grid */}
            <div style={{ display: 'flex', gap: 16 }}>
              {[
                { icon: '❤️', label: 'Heart Rate', value: bandVitals?.hr, unit: 'BPM', color: '#EF4444' },
                { icon: '🫁', label: 'SpO2', value: bandVitals?.spo2, unit: '%', color: '#6366F1' },
                { icon: '🌡️', label: 'Temperature', value: bandVitals?.temperature, unit: '°C', color: '#F59E0B' },
                { icon: '🔋', label: 'Battery', value: bandVitals?.battery, unit: '%', color: '#22C55E' },
              ].map((vital) => (
                <div key={vital.label} style={{
                  flex: 1,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 16, padding: '14px 16px',
                  display: 'flex', flexDirection: 'column', gap: 6,
                }}>
                  <div style={{ fontSize: 20 }}>{vital.icon}</div>
                  <div style={{
                    fontSize: bandVitals ? 26 : 22, fontWeight: 800,
                    color: bandVitals ? vital.color : 'rgba(255,255,255,0.15)',
                    letterSpacing: '-0.02em', lineHeight: 1,
                  }}>
                    {bandVitals ? vital.value ?? '—' : '—'}
                    {bandVitals && vital.value != null && (
                      <span style={{ fontSize: 12, fontWeight: 600,
                        color: 'rgba(255,255,255,0.35)', marginLeft: 4 }}>
                        {vital.unit}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)',
                    fontWeight: 600, letterSpacing: '0.04em' }}>
                    {vital.label}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Three Action Buttons */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Start Checkup — primary action */}
            <motion.button
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              whileHover={{ background: 'rgba(99,102,241,0.85)', boxShadow: '0 8px 32px rgba(99,102,241,0.4)' }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/sensors')}
              style={{
                flex: 1,
                background: 'rgba(99,102,241,0.75)',
                border: '1px solid rgba(99,102,241,0.6)',
                borderRadius: 24, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 20,
                padding: '0 36px',
                transition: 'all 0.2s ease',
                fontFamily: 'inherit',
              }}
            >
              <div style={{ fontSize: 44 }}>🩺</div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#F8FAFC',
                  letterSpacing: '-0.02em' }}>
                  Start Checkup
                </div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 3 }}>
                  Full health scan with AI analysis
                </div>
              </div>
              <div style={{ marginLeft: 'auto', fontSize: 24,
                color: 'rgba(255,255,255,0.4)' }}>→</div>
            </motion.button>

            {/* Bottom row — Medications + History */}
            <div style={{ flex: 1, display: 'flex', gap: 16 }}>

              {/* Medications */}
              <motion.button
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.4 }}
                whileHover={{
                  background: 'rgba(34,197,94,0.15)',
                  borderColor: 'rgba(34,197,94,0.4)',
                  boxShadow: '0 4px 20px rgba(34,197,94,0.15)',
                }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/medications')}
                style={{
                  flex: 1,
                  background: 'rgba(30,30,46,0.9)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 24, cursor: 'pointer',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 10,
                  transition: 'all 0.2s ease',
                  fontFamily: 'inherit',
                }}
              >
                <div style={{ fontSize: 36 }}>💊</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: '#F8FAFC' }}>
                  Medications
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>
                  Schedule & reminders
                </div>
              </motion.button>

              {/* History — with alert badge */}
              <motion.button
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.4 }}
                whileHover={{
                  background: 'rgba(99,102,241,0.15)',
                  borderColor: 'rgba(99,102,241,0.4)',
                  boxShadow: '0 4px 20px rgba(99,102,241,0.15)',
                }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/history')}
                style={{
                  flex: 1, position: 'relative',
                  background: 'rgba(30,30,46,0.9)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 24, cursor: 'pointer',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 10,
                  transition: 'all 0.2s ease',
                  fontFamily: 'inherit',
                }}
              >
                {/* Alert badge */}
                {alertCount > 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    style={{
                      position: 'absolute', top: 16, right: 16,
                      background: '#EF4444', color: 'white',
                      width: 24, height: 24, borderRadius: '50%',
                      fontSize: 11, fontWeight: 800,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    {alertCount > 9 ? '9+' : alertCount}
                  </motion.div>
                )}
                <div style={{ fontSize: 36 }}>📋</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: '#F8FAFC' }}>
                  History
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>
                  Visits & alerts
                </div>
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardScreen
