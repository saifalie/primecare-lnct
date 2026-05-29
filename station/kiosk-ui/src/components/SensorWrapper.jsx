import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const STEP_LABELS = [
  { key: 'temp',   label: 'तापमान',   color: '#F59E0B' },
  { key: 'hr',     label: 'हृदय गति', color: '#DC2626' },
  { key: 'ecg',    label: 'ECG',      color: '#22C55E' },
  { key: 'eye',    label: 'आँख',      color: '#8B5CF6' },
  { key: 'bp',     label: 'BP',       color: '#1C4ED8' },
  { key: 'height', label: 'ऊँचाई',    color: '#06B6D4' },
  { key: 'weight', label: 'वज़न',     color: '#EC4899' },
  { key: 'phq9',   label: 'मानसिक',   color: '#A78BFA' },
]

// Animated background canvas — flowing wave
function SensorBgCanvas({ accentColor, accentRgb }) {
  const canvasRef = useRef(null)
  const animRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight
    const W = canvas.width
    const H = canvas.height
    let t = 0

    // ECG-like pulse data


    // Floating particles
    const particles = Array.from({length: 40}, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 1.5 + 0.4,
      alpha: Math.random() * 0.4 + 0.1,
    }))

    function draw() {
      animRef.current = requestAnimationFrame(draw)
      ctx.clearRect(0, 0, W, H)
      t += 0.015

      // Pulsing rings from center
      for (let i = 0; i < 4; i++) {
        const phase = (t * 0.8 + i * 0.7) % 3
        const r = phase * Math.max(W, H) * 0.35
        const alpha = Math.max(0, 0.12 - phase * 0.04)
        ctx.beginPath()
        ctx.arc(W * 0.5, H * 0.5, r, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(${accentRgb},${alpha})`
        ctx.lineWidth = 1.5
        ctx.stroke()
      }

      // Floating particles
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy
        if (p.x < 0 || p.x > W) p.vx *= -1
        if (p.y < 0 || p.y > H) p.vy *= -1
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${accentRgb},${p.alpha})`
        ctx.fill()
      })
    }
    draw()
    return () => {
      cancelAnimationFrame(animRef.current)
    }
  }, [accentRgb])

  return (
    <canvas ref={canvasRef} style={{
      position: 'absolute', inset: 0,
      width: '100%', height: '100%',
      zIndex: 0, pointerEvents: 'none',
    }} />
  )
}

function SensorWrapper({
  title, subtitle, guideContent, readyHint,
  onStart, hasPresence, onSkip, retryCount = 0,
  stepIndex = 0, accentColor = '#1C4ED8', accentRgb = '28,78,216',
  fullscreen = false, children,
}) {
  const [phase, setPhase] = useState('ready')
  const presenceTimer = useRef(null)

  useEffect(() => {
    if (phase !== 'reading') return
    clearTimeout(presenceTimer.current)
    if (hasPresence) return
    presenceTimer.current = setTimeout(() => setPhase('confirming'), 6000)
    return () => clearTimeout(presenceTimer.current)
  }, [phase, hasPresence])

  useEffect(() => {
    if (phase === 'confirming' && hasPresence) setPhase('reading')
  }, [hasPresence, phase])

  function handleReady() { setPhase('reading'); onStart() }

  return (
    <div style={{
      width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative',
      background: 'radial-gradient(ellipse at 30% 20%, #060e24 0%, #04080F 55%, #07040f 100%)',
      display: 'flex', flexDirection: 'column',
    }}>

      {/* Animated background */}
      <SensorBgCanvas accentColor={accentColor} accentRgb={accentRgb} />

      {/* Static glows */}
      <div style={{
        position: 'absolute', width: 500, height: 500, borderRadius: '50%',
        background: `radial-gradient(circle, rgba(${accentRgb},0.1) 0%, transparent 65%)`,
        top: -150, right: -120, pointerEvents: 'none', zIndex: 0,
      }} />
      <div style={{
        position: 'absolute', width: 350, height: 350, borderRadius: '50%',
        background: `radial-gradient(circle, rgba(${accentRgb},0.07) 0%, transparent 65%)`,
        bottom: -80, left: -80, pointerEvents: 'none', zIndex: 0,
      }} />

      {/* Top bar */}
      <div style={{
        height: 56, position: 'relative', zIndex: 2,
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center',
        padding: '0 28px', gap: 14, flexShrink: 0,
        background: 'rgba(4,8,15,0.6)', backdropFilter: 'blur(20px)',
      }}>
        <motion.div
          animate={{ scale: [1, 1.4, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ repeat: Infinity, duration: 1.2 }}
          style={{
            width: 9, height: 9, borderRadius: '50%',
            background: accentColor, boxShadow: `0 0 12px ${accentColor}`,
          }}
        />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>{title}</div>
          {subtitle && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>{subtitle}</div>}
        </div>
        <div style={{
          background: `rgba(${accentRgb},0.12)`,
          border: `1px solid rgba(${accentRgb},0.3)`,
          borderRadius: 99, padding: '5px 14px',
          fontSize: 11, fontWeight: 700, color: accentColor, letterSpacing: '0.06em',
        }}>
          {stepIndex + 1} / 8
        </div>
      </div>

      {/* Step track */}
      <div style={{ display: 'flex', gap: 5, padding: '10px 28px 0', flexShrink: 0, position: 'relative', zIndex: 2 }}>
        {STEP_LABELS.map((s, i) => (
          <div key={s.key} style={{
            flex: 1, height: 3, borderRadius: 99,
            background: i < stepIndex ? 'rgba(255,255,255,0.3)' : i === stepIndex ? accentColor : 'rgba(255,255,255,0.08)',
            transition: 'background 0.4s',
            boxShadow: i === stepIndex ? `0 0 8px ${accentColor}` : 'none',
          }} />
        ))}
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative', zIndex: 2 }}>
        <AnimatePresence mode="wait">

          {/* READY */}
          {phase === 'ready' && (
            <motion.div key="ready"
              initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.45 }}
              style={{
                width: '100%', height: '100%',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                padding: '24px 60px', gap: 18,
              }}
            >
              {retryCount > 0 && (
                <div style={{
                  padding: '7px 16px', borderRadius: 99,
                  background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
                  fontSize: 12, color: '#F59E0B', fontWeight: 600,
                }}>
                  दोबारा कोशिश ({retryCount}/3)
                </div>
              )}

              {guideContent}

              <div style={{
                background: 'rgba(255,255,255,0.05)',
                border: `1px solid rgba(${accentRgb},0.25)`,
                borderRadius: 22, padding: '20px 28px',
                width: '100%', maxWidth: 520,
                backdropFilter: 'blur(20px)',
              }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: accentColor, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 7 }}>
                  अभी करें · Do this now
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.35 }}>
                  {title}
                </div>
                {readyHint && (
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 7, lineHeight: 1.5 }}>
                    {readyHint}
                  </div>
                )}
              </div>

              <motion.button
                whileTap={{ scale: 0.97 }} whileHover={{ scale: 1.01 }}
                onClick={handleReady}
                style={{
                  width: '100%', maxWidth: 520,
                  padding: '20px 24px', borderRadius: 18,
                  background: '#fff', border: 'none',
                  fontSize: 17, fontWeight: 700, color: '#04080F',
                  cursor: 'pointer', letterSpacing: '-0.01em',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
                  boxShadow: '0 8px 32px rgba(255,255,255,0.12)',
                }}
              >
                <motion.div
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  style={{ width: 10, height: 10, borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 10px #22C55E' }}
                />
                मैं तैयार हूँ · I'm Ready
              </motion.button>

              {retryCount >= 3 && (
                <button onClick={onSkip} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 13, color: 'rgba(255,255,255,0.25)', fontWeight: 500,
                }}>
                  छोड़ें · Skip
                </button>
              )}
            </motion.div>
          )}

          {/* READING */}
          {phase === 'reading' && (
            <motion.div key="reading"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{
                width: '100%', height: '100%',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                padding: '28px 60px', gap: 20,
              }}
            >
              {children}
            </motion.div>
          )}

          {/* CONFIRMING */}
          {phase === 'confirming' && (
            <motion.div key="confirming"
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              style={{
                width: '100%', height: '100%',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                padding: '28px 60px', gap: 20,
              }}
            >
              <div style={{
                width: 88, height: 88, borderRadius: '50%',
                background: 'rgba(245,158,11,0.1)', border: '2px solid rgba(245,158,11,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
                  <path d="M19 12v10M19 24v2" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', textAlign: 'center' }}>
                क्या सेंसर पर लगाया?
              </div>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>{title}</div>
              <div style={{ display: 'flex', gap: 12, width: '100%', maxWidth: 520 }}>
                <motion.button whileTap={{ scale: 0.97 }} onClick={() => setPhase('reading')}
                  style={{
                    flex: 1, padding: '20px', borderRadius: 16,
                    background: '#fff', border: 'none',
                    fontSize: 16, fontWeight: 700, color: '#04080F', cursor: 'pointer',
                  }}>हाँ, लगा दिया ✓
                </motion.button>
                <motion.button whileTap={{ scale: 0.97 }} onClick={() => setPhase('ready')}
                  style={{
                    flex: 1, padding: '20px', borderRadius: 16,
                    background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
                    fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.8)', cursor: 'pointer',
                  }}>फिर से करें
                </motion.button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}

export default SensorWrapper
