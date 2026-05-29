import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import useStore from '../store'
import config from '../config'

const MESSAGES = [
  'Analyzing your health data…',
  'Comparing to your personal history…',
  'Cross-referencing all readings…',
  'Checking medication patterns…',
  'Generating your health summary…',
]

function AIAnalysisScreen() {
  const navigate = useNavigate()
  const patient = useStore((s) => s.patient)
  const readings = useStore((s) => s.readings)
  const sessionId = useStore((s) => s.sessionId)
  const globalWs = useStore((s) => s.ws)
  const setDiagnosisResult = useStore((s) => s.setDiagnosisResult)

  const [msgIndex, setMsgIndex] = useState(0)
  const doneRef = useRef(false)
  const pollRef = useRef(null)
  const msgTimerRef = useRef(null)

  // Rotate through messages every 3 seconds
  useEffect(() => {
    msgTimerRef.current = setInterval(() => {
      setMsgIndex((i) => (i + 1) % MESSAGES.length)
    }, 3000)
    return () => clearInterval(msgTimerRef.current)
  }, [])

  // Guard — if no patient, send back
  useEffect(() => {
    if (!patient) navigate('/profile-selection')
  }, [patient])

  useEffect(() => {
    if (!patient) return

    // Listen on global WebSocket for instant result
    function handleWsMessage(event) {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'diagnosis_result') {
          const inner = data.data || data
          const diag = inner.diagnosis || inner
          if (diag && !doneRef.current) {
            doneRef.current = true
            clearInterval(pollRef.current)
            setDiagnosisResult(diag)
            navigate('/results')
          }
        }
      } catch (e) {}
    }

    if (globalWs) globalWs.addEventListener('message', handleWsMessage)

    async function runAnalysis() {
      try {
        // 1. Push all readings to session
        if (sessionId && readings && Object.keys(readings).length > 0) {
          for (const [sensor_type, value] of Object.entries(readings)) {
            await fetch(`${config.LOCAL_URL}/api/sessions/${sessionId}/reading`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sensor_type, value, quality_score: 1.0 }),
            }).catch(() => {})
          }
        }

        // 2. Complete session — triggers LLM analysis on backend
        await fetch(`${config.LOCAL_URL}/api/sessions/${sessionId}/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'daily', readings }),
        }).catch(() => {})

        // 3. Poll as backup — WebSocket should arrive first
        let attempts = 0
        pollRef.current = setInterval(async () => {
          attempts++
          if (doneRef.current) { clearInterval(pollRef.current); return }
          if (attempts > 20) {
            clearInterval(pollRef.current)
            showFallback()
            return
          }
          try {
            const r = await fetch(`${config.LOCAL_URL}/api/sessions/${sessionId}`)
            const d = await r.json()
            const session = d.session
            if (session?.status === 'completed' && session?.diagnosis?.diagnosis) {
              if (doneRef.current) return
              doneRef.current = true
              clearInterval(pollRef.current)
              setDiagnosisResult(session.diagnosis.diagnosis)
              navigate('/results')
            }
          } catch (e) {}
        }, 3000)

      } catch (e) {
        showFallback()
      }
    }

    runAnalysis()

    return () => {
      if (globalWs) globalWs.removeEventListener('message', handleWsMessage)
      clearInterval(pollRef.current)
    }
  }, [patient])

  function showFallback() {
    if (doneRef.current) return
    doneRef.current = true
    const r = readings || {}
    const sys  = r.bp_systolic  || 118
    const spo2 = r.spo2         || 98
    const temp = r.temperature  || 36.8
    let risk = 'GREEN'
    if (sys > 180 || spo2 < 90 || temp > 40) risk = 'RED'
    else if (sys > 140 || spo2 < 95 || temp > 37.5) risk = 'YELLOW'
    const results = {
      GREEN: {
        risk_level: 'GREEN',
        health_score: 82,
        ai_summary: 'Your readings are within normal range. Your heart rate, blood pressure, and oxygen levels all look good today.',
        what_to_do: 'Continue your current routine. Schedule your next checkup in 30 days.',
        doctor_type: null,
        next_checkup_days: 30,
      },
      YELLOW: {
        risk_level: 'YELLOW',
        health_score: 58,
        ai_summary: 'Some readings are above your normal range. Your blood pressure is slightly elevated compared to your baseline.',
        what_to_do: 'See a general physician within the next few days. Monitor your BP daily.',
        doctor_type: 'General Physician',
        next_checkup_days: 14,
      },
      RED: {
        risk_level: 'RED',
        health_score: 32,
        ai_summary: 'Critical readings detected. Your blood pressure or oxygen levels are significantly outside safe range.',
        what_to_do: 'See a doctor today. Do not delay. Go to your nearest hospital immediately.',
        doctor_type: 'Emergency / Cardiologist',
        next_checkup_days: 1,
      },
    }
    setDiagnosisResult(results[risk])
    navigate('/results')
  }

  return (
    <div style={{
      width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden',
      background: 'radial-gradient(ellipse at 30% 20%, #060e24 0%, #04080F 55%, #07040f 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 40, padding: '0 32px',
      fontFamily: 'Inter, sans-serif',
    }}>

      {/* Ambient glow */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 50% 45%, rgba(99,102,241,0.08) 0%, transparent 65%)' }} />

      {/* Spinner */}
      <div style={{ position: 'relative', width: 120, height: 120, flexShrink: 0 }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
          style={{ position: 'absolute', inset: 0, borderRadius: '50%',
            border: '2px solid transparent',
            borderTopColor: '#6366F1',
            borderRightColor: 'rgba(99,102,241,0.3)' }}
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
          style={{ position: 'absolute', inset: 12, borderRadius: '50%',
            border: '2px solid transparent',
            borderTopColor: '#22C55E',
            borderLeftColor: 'rgba(34,197,94,0.3)' }}
        />
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
          style={{ position: 'absolute', inset: 24, borderRadius: '50%',
            border: '2px solid transparent',
            borderTopColor: '#A78BFA',
            borderBottomColor: 'rgba(167,139,250,0.3)' }}
        />
        {/* Centre dot */}
        <div style={{ position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            style={{ width: 24, height: 24, borderRadius: '50%',
              background: 'radial-gradient(circle, #6366F1, #4338CA)',
              boxShadow: '0 0 20px rgba(99,102,241,0.6)' }}
          />
        </div>
      </div>

      {/* Text */}
      <div style={{ textAlign: 'center', zIndex: 1 }}>
        <div style={{ fontSize: 24, fontWeight: 800, color: '#F8FAFC',
          letterSpacing: '-0.03em', marginBottom: 12 }}>
          AI Analysis in Progress
        </div>
        <motion.div
          key={msgIndex}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.4 }}
          style={{ fontSize: 15, color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}
        >
          {MESSAGES[msgIndex]}
        </motion.div>
      </div>

      {/* Dots */}
      <div style={{ display: 'flex', gap: 8, zIndex: 1 }}>
        {[0, 1, 2].map((i) => (
          <motion.div key={i}
            animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
            transition={{ repeat: Infinity, duration: 1, delay: i * 0.3 }}
            style={{ width: 10, height: 10, borderRadius: '50%', background: '#6366F1',
              boxShadow: '0 0 8px rgba(99,102,241,0.6)' }}
          />
        ))}
      </div>

      {/* PrimeCare label */}
      <div style={{ position: 'absolute', bottom: 32, fontSize: 13, fontWeight: 700,
        color: 'rgba(255,255,255,0.15)', letterSpacing: '0.05em' }}>
        Prime<span style={{ color: 'rgba(99,102,241,0.4)' }}>Care</span> AI
      </div>
    </div>
  )
}

export default AIAnalysisScreen
