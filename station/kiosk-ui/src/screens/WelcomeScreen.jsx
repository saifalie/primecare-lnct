import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import * as THREE from 'three'
import useStore from '../store'

function WelcomeScreen() {
  const navigate = useNavigate()
  const resetSession = useStore((s) => s.resetSession)
  const idleTimer = useRef(null)
  const mountRef = useRef(null)
  const animRef = useRef(null)
  const [time, setTime] = useState('')
  const [date, setDate] = useState('')

  useEffect(() => { resetSession() }, [])

  // Clock
  useEffect(() => {
    function tick() {
      const now = new Date()
      setTime(now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }))
      setDate(now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }))
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [])

  // Idle timer — reset to welcome after 5 min of inactivity
  useEffect(() => {
    function resetIdle() {
      clearTimeout(idleTimer.current)
      idleTimer.current = setTimeout(() => navigate('/'), 5 * 60 * 1000)
    }
    window.addEventListener('touchstart', resetIdle)
    window.addEventListener('click', resetIdle)
    resetIdle()
    return () => {
      clearTimeout(idleTimer.current)
      window.removeEventListener('touchstart', resetIdle)
      window.removeEventListener('click', resetIdle)
    }
  }, [])

  // Three.js particle background — unchanged from Grami
  useEffect(() => {
    const container = mountRef.current
    if (!container) return
    const W = container.clientWidth
    const H = container.clientHeight
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 1000)
    camera.position.z = 6
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(W, H)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0)
    container.appendChild(renderer.domElement)

    const count = 340
    const pos = new Float32Array(count * 3)
    const col = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      pos[i*3]   = (Math.random() - 0.5) * 30
      pos[i*3+1] = (Math.random() - 0.5) * 20
      pos[i*3+2] = (Math.random() - 0.5) * 8
      const p = Math.random()
      if (p < 0.45)      { col[i*3]=0.39; col[i*3+1]=0.40; col[i*3+2]=0.98 }
      else if (p < 0.72) { col[i*3]=0.65; col[i*3+1]=0.55; col[i*3+2]=0.98 }
      else               { col[i*3]=0.13; col[i*3+1]=0.77; col[i*3+2]=0.37 }
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3))
    const mat = new THREE.PointsMaterial({ size: 0.045, vertexColors: true, transparent: true, opacity: 0.7, sizeAttenuation: true })
    const points = new THREE.Points(geo, mat)
    scene.add(points)

    const mkRing = (r, thick, color, opacity) => {
      const g = new THREE.TorusGeometry(r, thick, 12, 120)
      const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity })
      return new THREE.Mesh(g, m)
    }
    const ring1 = mkRing(4.0, 0.006, 0x1e3a8a, 0.2)
    ring1.rotation.x = Math.PI / 3; ring1.rotation.y = 0.3; scene.add(ring1)
    const ring2 = mkRing(6.0, 0.004, 0x4c1d95, 0.12)
    ring2.rotation.x = -Math.PI / 4.5; ring2.rotation.z = 0.6; scene.add(ring2)
    const ring3 = mkRing(2.4, 0.005, 0x065f46, 0.16)
    ring3.rotation.y = Math.PI / 3.5; ring3.rotation.z = 0.4; scene.add(ring3)

    let tick = 0
    function animate() {
      animRef.current = requestAnimationFrame(animate)
      tick += 0.003
      points.rotation.y = tick * 0.05
      points.rotation.x = Math.sin(tick * 0.03) * 0.04
      ring1.rotation.z = tick * 0.1
      ring2.rotation.z = -tick * 0.06
      ring3.rotation.z = tick * 0.15
      mat.opacity = 0.55 + Math.sin(tick) * 0.15
      renderer.render(scene, camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(animRef.current)
      renderer.dispose(); geo.dispose(); mat.dispose()
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement)
    }
  }, [])

  return (
    <div
      onClick={() => navigate('/profile-selection')}
      style={{
        width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative',
        cursor: 'pointer',
        background: 'radial-gradient(ellipse at 25% 30%, #0d0d2b 0%, #0A0A0F 55%, #0a040f 100%)',
      }}
    >
      {/* Three.js background */}
      <div ref={mountRef} style={{ position: 'absolute', inset: 0, zIndex: 0 }} />

      {/* Glow orbs */}
      <div style={{
        position: 'absolute', width: 600, height: 600, borderRadius: '50%', pointerEvents: 'none',
        background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 65%)',
        top: -200, right: -150, zIndex: 1,
      }} />
      <div style={{
        position: 'absolute', width: 400, height: 400, borderRadius: '50%', pointerEvents: 'none',
        background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 65%)',
        bottom: -120, left: -80, zIndex: 1,
      }} />

      {/* Main layout — two columns */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 2,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        height: '100vh',
      }}>

        {/* LEFT PANEL */}
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.85, ease: [0.4, 0, 0.2, 1] }}
          style={{
            display: 'flex', flexDirection: 'column', justifyContent: 'center',
            padding: '60px 48px 60px 72px',
          }}
        >
          {/* Orbit icon */}
          <div style={{ position: 'relative', width: 100, height: 100, marginBottom: 32, flexShrink: 0 }}>
            {[
              { inset: 0,  color: 'rgba(99,102,241,0.25)',  dur: 11 },
              { inset: 13, color: 'rgba(129,140,248,0.30)', dur: 16 },
              { inset: 26, color: 'rgba(99,102,241,0.45)',  dur: 8  },
            ].map((ring, i) => (
              <motion.div key={i}
                style={{ position: 'absolute', inset: ring.inset, borderRadius: '50%', border: `1px solid ${ring.color}` }}
                animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
                transition={{ duration: ring.dur, repeat: Infinity, ease: 'linear' }}
              />
            ))}
            <div style={{
              position: 'absolute', inset: 33, borderRadius: '50%',
              background: 'rgba(99,102,241,0.20)',
              border: '1.5px solid rgba(129,140,248,0.75)',
              boxShadow: '0 0 24px rgba(99,102,241,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {/* Heart pulse icon */}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M3 12h3l2-7 4 14 3-7h6"
                  stroke="#818CF8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>

          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.7 }}
            style={{ fontSize: 96, fontWeight: 900, color: '#fff', letterSpacing: '-0.05em', lineHeight: 0.95, flexShrink: 0 }}
          >
            Prime
            <span style={{ color: '#6366F1' }}>Care</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.38, duration: 0.6 }}
            style={{
              fontSize: 13, color: 'rgba(255,255,255,0.28)',
              letterSpacing: '0.18em', marginTop: 16,
              textTransform: 'uppercase', fontWeight: 500, flexShrink: 0,
            }}
          >
            Family Health · Always Watching
          </motion.div>

          {/* Accent line */}
          <motion.div
            initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
            transition={{ delay: 0.55, duration: 0.8 }}
            style={{
              width: 56, height: 2.5,
              background: 'linear-gradient(90deg, #6366F1, #818CF8)',
              borderRadius: 99, marginTop: 32, marginBottom: 36,
              transformOrigin: 'left', flexShrink: 0,
            }}
          />

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.6 }}
            style={{ display: 'flex', gap: 44, flexShrink: 0 }}
          >
            {[
              { num: '24/7', label: 'Band\nMonitoring',  color: '#22C55E' },
              { num: '4m',   label: 'Full Health\nScan', color: '#818CF8' },
              { num: 'AI',   label: 'Silent\nAnalysis',  color: '#38BDF8' },
            ].map((s) => (
              <div key={s.label}>
                <div style={{ fontSize: 44, fontWeight: 900, color: s.color, letterSpacing: '-0.04em', lineHeight: 1 }}>
                  {s.num}
                </div>
                <div style={{
                  fontSize: 11, color: 'rgba(255,255,255,0.28)',
                  letterSpacing: '0.06em', textTransform: 'uppercase',
                  marginTop: 6, fontWeight: 500,
                  whiteSpace: 'pre-line', lineHeight: 1.4,
                }}>
                  {s.label}
                </div>
              </div>
            ))}
          </motion.div>

          {/* System ready indicator */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: 1.0, duration: 0.5 }}
            style={{ marginTop: 48, flexShrink: 0 }}
          >
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '10px 22px', borderRadius: 99,
                background: 'rgba(34,197,94,0.08)',
                border: '1px solid rgba(34,197,94,0.22)',
              }}
            >
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: '#22C55E', boxShadow: '0 0 10px #22C55E',
              }} />
              <span style={{ fontSize: 13, color: 'rgba(34,197,94,0.9)', letterSpacing: '0.07em', fontWeight: 600 }}>
                All Systems Ready
              </span>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* RIGHT PANEL — touch to start */}
        <motion.div
          initial={{ opacity: 0, x: 40, scale: 0.97 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ duration: 0.85, delay: 0.18, ease: [0.4, 0, 0.2, 1] }}
          style={{
            padding: '48px 64px 48px 32px',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <div style={{
            width: '100%', height: '100%',
            borderRadius: 32,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(40px)',
            WebkitBackdropFilter: 'blur(40px)',
            position: 'relative', overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 0,
          }}>
            {/* Sheen */}
            <div style={{
              position: 'absolute', inset: 0, borderRadius: 32, pointerEvents: 'none',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 52%)',
            }} />

            {/* Time */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.7 }}
              style={{
                fontSize: 72, fontWeight: 700, color: '#fff',
                letterSpacing: '-0.04em', lineHeight: 1,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {time}
            </motion.div>

            {/* Date */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.65, duration: 0.6 }}
              style={{
                fontSize: 16, color: 'rgba(255,255,255,0.35)',
                fontWeight: 500, marginTop: 8, letterSpacing: '0.04em',
              }}
            >
              {date}
            </motion.div>

            {/* Divider */}
            <div style={{
              width: 48, height: 1,
              background: 'rgba(255,255,255,0.1)',
              margin: '40px 0',
            }} />

            {/* Touch to start pulse */}
            <motion.div
              animate={{ scale: [1, 1.08, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
              style={{
                width: 140, height: 140, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(99,102,241,0.25) 0%, rgba(99,102,241,0.05) 70%)',
                border: '2px solid rgba(99,102,241,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 48px rgba(99,102,241,0.2)',
              }}
            >
              <div style={{
                width: 100, height: 100, borderRadius: '50%',
                background: 'rgba(99,102,241,0.15)',
                border: '1px solid rgba(99,102,241,0.5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2C8.5 2 5.5 4.5 5 8c-.5 3 1 5.5 3 7l4 5 4-5c2-1.5 3.5-4 3-7-.5-3.5-3.5-6-7-6z"
                    fill="rgba(99,102,241,0.8)" />
                  <circle cx="12" cy="9" r="2.5" fill="white" />
                </svg>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9, duration: 0.6 }}
              style={{
                marginTop: 32, fontSize: 18, fontWeight: 600,
                color: 'rgba(255,255,255,0.5)',
                letterSpacing: '0.12em', textTransform: 'uppercase',
              }}
            >
              Touch to Start
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.1, duration: 0.6 }}
              style={{
                marginTop: 8, fontSize: 13,
                color: 'rgba(255,255,255,0.2)',
                letterSpacing: '0.06em',
              }}
            >
              Select your profile to begin
            </motion.div>

          </div>
        </motion.div>

      </div>
    </div>
  )
}

export default WelcomeScreen
