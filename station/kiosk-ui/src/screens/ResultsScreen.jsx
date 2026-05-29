import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import useStore from '../store'
import config from '../config'

const RISK_CONFIG = {
  GREEN: {
    label: 'GOOD',
    color: '#22C55E',
    bg: 'radial-gradient(ellipse at 50% 0%, #052e16 0%, #0A0A0F 60%)',
    cardBorder: 'rgba(34,197,94,0.2)',
    glow: 'rgba(34,197,94,0.15)',
  },
  YELLOW: {
    label: 'ATTENTION',
    color: '#F59E0B',
    bg: 'radial-gradient(ellipse at 50% 0%, #2d1a00 0%, #0A0A0F 60%)',
    cardBorder: 'rgba(245,158,11,0.2)',
    glow: 'rgba(245,158,11,0.15)',
  },
  RED: {
    label: 'URGENT',
    color: '#EF4444',
    bg: 'radial-gradient(ellipse at 50% 0%, #2d0000 0%, #0A0A0F 60%)',
    cardBorder: 'rgba(239,68,68,0.2)',
    glow: 'rgba(239,68,68,0.15)',
  },
}

function ResultsScreen() {
  const navigate = useNavigate()
  const patient = useStore((s) => s.patient)
  const readings = useStore((s) => s.readings)
  const sessionId = useStore((s) => s.sessionId)
  const diagnosisResult = useStore((s) => s.diagnosisResult)
  const [printing, setPrinting] = useState(true)

  const result = diagnosisResult || {
    risk_level: 'GREEN',
    health_score: 80,
    ai_summary: 'Your health readings are within normal range.',
    what_to_do: 'Continue your current routine. Schedule your next checkup in 30 days.',
    doctor_type: null,
    next_checkup_days: 30,
  }

  const risk = result.risk_level || 'GREEN'
  const cfg = RISK_CONFIG[risk] || RISK_CONFIG.GREEN
  const score = result.health_score || null

  // Trigger print on mount
  useEffect(() => {
    if (patient && sessionId) {
      fetch(`${config.LOCAL_URL}/api/printer/print`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient, readings, result, session_id: sessionId }),
      })
        .then(() => setPrinting(false))
        .catch(() => setPrinting(false))
    } else {
      setPrinting(false)
    }
  }, [])

  // Parse what_to_do into bullet points if it contains sentences
  const bulletPoints = result.what_to_do
    ? result.what_to_do.split(/[.·\n]/).map((s) => s.trim()).filter((s) => s.length > 4)
    : []

  // All readings for display
  const readingItems = [
    { label: 'Blood Pressure', value: readings?.bp_systolic && readings?.bp_diastolic ? `${readings.bp_systolic}/${readings.bp_diastolic}` : null, unit: 'mmHg' },
    { label: 'Heart Rate',     value: readings?.hr,          unit: 'BPM' },
    { label: 'SpO₂',           value: readings?.spo2,         unit: '%' },
    { label: 'Temperature',    value: readings?.temperature ? Number(readings.temperature).toFixed(1) : null, unit: '°C' },
    { label: 'ECG',            value: readings?.ecg,          unit: '' },
    { label: 'Mood',           value: readings?.mood_score ? `${readings.mood_score}/5` : null, unit: '' },
  ].filter((r) => r.value !== null && r.value !== undefined)

  return (
    <div style={{
      width: '100vw', height: '100vh', overflow: 'hidden',
      background: cfg.bg,
      display: 'flex', flexDirection: 'column',
      fontFamily: 'Inter, sans-serif',
    }}>

      {/* Ambient glow */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `radial-gradient(ellipse at 50% 20%, ${cfg.glow} 0%, transparent 60%)` }} />

      {/* Scrollable content */}
      <div style={{
        flex: 1, overflowY: 'auto',
        padding: '40px 64px 32px',
        display: 'flex', flexDirection: 'column', gap: 24,
        position: 'relative', zIndex: 1,
      }}>

        {/* TOP ROW — score + label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 32, flexShrink: 0 }}>

          {/* Health score circle */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            style={{ position: 'relative', width: 140, height: 140, flexShrink: 0 }}
          >
            <motion.div
              animate={{ boxShadow: [`0 0 0px ${cfg.color}`, `0 0 40px ${cfg.color}80`, `0 0 0px ${cfg.color}`] }}
              transition={{ repeat: Infinity, duration: 2.5 }}
              style={{ position: 'absolute', inset: 0 }}
            />
            <svg width="140" height="140" viewBox="0 0 140 140">
              <circle cx="70" cy="70" r="58" fill="none"
                stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
              <circle cx="70" cy="70" r="58" fill="none"
                stroke={cfg.color} strokeWidth="10" strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 58}`}
                strokeDashoffset={`${2 * Math.PI * 58 * (1 - (score || 0) / 100)}`}
                transform="rotate(-90 70 70)"
                style={{ transition: 'stroke-dashoffset 1.2s ease',
                  filter: `drop-shadow(0 0 8px ${cfg.color})` }}
              />
            </svg>
            <div style={{ position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: 36, fontWeight: 900, color: cfg.color, lineHeight: 1 }}>
                {score || '—'}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)',
                fontWeight: 600, marginTop: 2 }}>/100</div>
            </div>
          </motion.div>

          {/* Label + patient name */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <div style={{ fontSize: 11, fontWeight: 700,
              color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em',
              textTransform: 'uppercase', marginBottom: 8 }}>
              Health Assessment
            </div>
            <div style={{ fontSize: 48, fontWeight: 900, color: cfg.color,
              letterSpacing: '-0.03em', lineHeight: 1,
              textShadow: `0 0 40px ${cfg.color}60` }}>
              {cfg.label}
            </div>
            {patient && (
              <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.4)',
                marginTop: 8, fontWeight: 500 }}>
                {patient.name} · {patient.age} years
              </div>
            )}
          </motion.div>

          {/* PrimeCare logo top right */}
          <div style={{ marginLeft: 'auto', fontSize: 18, fontWeight: 800,
            color: '#fff', letterSpacing: '-0.03em', alignSelf: 'flex-start' }}>
            Prime<span style={{ color: cfg.color }}>Care</span>
          </div>
        </div>

        {/* AI SUMMARY */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5 }}
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${cfg.cardBorder}`,
            borderRadius: 20, padding: '20px 24px',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700,
            color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em',
            textTransform: 'uppercase', marginBottom: 10 }}>
            AI Summary
          </div>
          <div style={{ fontSize: 16, lineHeight: 1.7,
            color: 'rgba(255,255,255,0.8)', fontWeight: 400 }}>
            {result.ai_summary || result.summary_english || result.summary_hindi || 'Analysis complete.'}
          </div>
        </motion.div>

        {/* TWO COLUMN — readings + what to do */}
        <div style={{ display: 'flex', gap: 20, flex: 1 }}>

          {/* Readings */}
          {readingItems.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.5 }}
              style={{
                flex: 1,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 20, padding: '20px 24px',
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700,
                color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em',
                textTransform: 'uppercase', marginBottom: 14 }}>
                Today's Readings
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {readingItems.map((item) => (
                  <div key={item.label} style={{
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 0',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                  }}>
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)',
                      fontWeight: 500 }}>
                      {item.label}
                    </span>
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#F8FAFC' }}>
                      {item.value}
                      {item.unit && (
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)',
                          marginLeft: 4, fontWeight: 500 }}>
                          {item.unit}
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* What to do */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            style={{
              flex: 1,
              background: 'rgba(255,255,255,0.03)',
              border: `1px solid ${cfg.cardBorder}`,
              borderRadius: 20, padding: '20px 24px',
              display: 'flex', flexDirection: 'column', gap: 12,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700,
              color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em',
              textTransform: 'uppercase' }}>
              What To Do Next
            </div>

            {bulletPoints.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {bulletPoints.map((point, i) => (
                  <motion.div key={i}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.55 + i * 0.08, duration: 0.35 }}
                    style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}
                  >
                    <div style={{ width: 6, height: 6, borderRadius: '50%',
                      background: cfg.color, flexShrink: 0, marginTop: 6 }} />
                    <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)',
                      lineHeight: 1.5, fontWeight: 400 }}>
                      {point}
                    </span>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
                {result.what_to_do}
              </div>
            )}

            {result.doctor_type && (
              <div style={{ marginTop: 4, padding: '10px 14px', borderRadius: 12,
                background: `${cfg.color}15`,
                border: `1px solid ${cfg.color}30`,
                fontSize: 13, color: cfg.color, fontWeight: 600 }}>
                👨‍⚕️ See a {result.doctor_type}
              </div>
            )}

            {result.next_checkup_days && (
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)',
                fontWeight: 500, marginTop: 'auto', paddingTop: 8 }}>
                Next checkup recommended in {result.next_checkup_days} days
              </div>
            )}
          </motion.div>
        </div>

        {/* BOTTOM — print status + buttons */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          style={{ display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', flexShrink: 0, gap: 16 }}
        >
          {/* Print status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {printing ? (
              <>
                <motion.span
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}>
                  🖨️
                </motion.span>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)',
                  fontWeight: 500 }}>
                  Printing report…
                </span>
              </>
            ) : (
              <>
                <span>✅</span>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)',
                  fontWeight: 500 }}>
                  Report printed
                </span>
              </>
            )}
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 12 }}>
            {/* Reprint */}
            <motion.button
              whileHover={{ background: 'rgba(255,255,255,0.08)' }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                if (patient && sessionId) {
                  fetch(`${config.LOCAL_URL}/api/printer/print`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ patient, readings, result, session_id: sessionId }),
                  }).catch(() => {})
                }
              }}
              style={{
                padding: '14px 28px', borderRadius: 14,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: 'rgba(255,255,255,0.6)', fontSize: 14,
                fontWeight: 600, cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              🖨️ Print Report
            </motion.button>

            {/* Done */}
            <motion.button
              whileHover={{ background: cfg.color }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/thankyou')}
              style={{
                padding: '14px 36px', borderRadius: 14,
                background: `${cfg.color}CC`,
                border: `1px solid ${cfg.color}`,
                color: '#fff', fontSize: 15,
                fontWeight: 700, cursor: 'pointer',
                fontFamily: 'inherit',
                boxShadow: `0 4px 20px ${cfg.color}40`,
              }}
            >
              Done →
            </motion.button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default ResultsScreen
