import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import useStore from '../store'

function ThankYouScreen() {
  const navigate = useNavigate()
  const patient = useStore((s) => s.patient)
  const resetSession = useStore((s) => s.resetSession)
  const [countdown, setCountdown] = useState(30)

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer)
          resetSession()
          navigate('/')
          return 0
        }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div style={{
      width: '100vw', height: '100vh', overflow: 'hidden',
      background: 'radial-gradient(ellipse at 50% 30%, #0d1a0d 0%, #0A0A0F 60%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 32, fontFamily: 'Inter, sans-serif',
    }}>

      {/* Ambient glow */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 50% 40%, rgba(34,197,94,0.08) 0%, transparent 60%)' }} />

      {/* Checkmark */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        style={{
          width: 100, height: 100, borderRadius: '50%',
          background: 'rgba(34,197,94,0.15)',
          border: '2px solid rgba(34,197,94,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 60px rgba(34,197,94,0.2)',
        }}
      >
        <motion.svg
          width="48" height="48" viewBox="0 0 48 48" fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          <motion.path
            d="M8 24l12 12L40 12"
            stroke="#22C55E" strokeWidth="4"
            strokeLinecap="round" strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          />
        </motion.svg>
      </motion.div>

      {/* Message */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        style={{ textAlign: 'center', zIndex: 1 }}
      >
        <div style={{ fontSize: 36, fontWeight: 900, color: '#F8FAFC',
          letterSpacing: '-0.03em', marginBottom: 8 }}>
          {patient?.name ? `Thank you, ${patient.name}!` : 'Thank you!'}
        </div>
        <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.45)', fontWeight: 400 }}>
          Your health checkup is complete
        </div>
      </motion.div>

      {/* Receipt notice */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
          background: 'rgba(30,30,46,0.8)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 20, padding: '24px 40px',
          zIndex: 1,
        }}
      >
        <span style={{ fontSize: 36 }}>🖨️</span>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#22C55E' }}>
          Report printed. Please take your receipt.
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>
          Your health report has been printed at the station
        </div>
      </motion.div>

      {/* Countdown */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        style={{ display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: 10, zIndex: 1 }}
      >
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)', fontWeight: 500 }}>
          Returning to home screen in {countdown}s
        </div>
        {/* Progress bar */}
        <div style={{ width: 200, height: 3, borderRadius: 99,
          background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
          <motion.div
            initial={{ width: '100%' }}
            animate={{ width: '0%' }}
            transition={{ duration: 30, ease: 'linear' }}
            style={{ height: '100%', background: '#22C55E', borderRadius: 99 }}
          />
        </div>
      </motion.div>

      {/* Go back now button */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        whileHover={{ background: 'rgba(255,255,255,0.08)' }}
        whileTap={{ scale: 0.97 }}
        onClick={() => { resetSession(); navigate('/') }}
        style={{
          padding: '10px 24px', borderRadius: 12,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.1)',
          color: 'rgba(255,255,255,0.4)', fontSize: 13,
          fontWeight: 600, cursor: 'pointer',
          fontFamily: 'inherit', zIndex: 1,
        }}
      >
        Return to Home Now
      </motion.button>

      {/* PrimeCare watermark */}
      <div style={{ position: 'absolute', bottom: 24, fontSize: 13, fontWeight: 700,
        color: 'rgba(255,255,255,0.1)', letterSpacing: '0.05em' }}>
        Prime<span style={{ color: 'rgba(34,197,94,0.3)' }}>Care</span>
      </div>
    </div>
  )
}

export default ThankYouScreen
