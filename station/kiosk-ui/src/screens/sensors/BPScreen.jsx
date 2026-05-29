import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import useStore from '../../store'
import config from '../../config'

function makeCircleTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 64; canvas.height = 64
  const ctx = canvas.getContext('2d')
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  gradient.addColorStop(0, 'rgba(255,255,255,1)')
  gradient.addColorStop(0.4, 'rgba(255,255,255,0.8)')
  gradient.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 64, 64)
  return new THREE.CanvasTexture(canvas)
}

function bpPoint(i, total) {
  const outerArc = Math.floor(total * 0.30)
  const innerArc = Math.floor(total * 0.25)
  const needle   = Math.floor(total * 0.12)
  if (i < outerArc) {
    const t = (i / outerArc) * Math.PI
    const r = 2.4 + (Math.random() - 0.5) * 0.18
    return [r * Math.cos(Math.PI + t), r * Math.sin(Math.PI + t) + 0.4, (Math.random()-0.5)*0.3]
  }
  if (i < outerArc + innerArc) {
    const j = i - outerArc
    const t = (j / innerArc) * Math.PI
    const r = 1.55 + (Math.random() - 0.5) * 0.14
    return [r * Math.cos(Math.PI + t), r * Math.sin(Math.PI + t) + 0.4, (Math.random()-0.5)*0.3]
  }
  if (i < outerArc + innerArc + needle) {
    const j = i - outerArc - innerArc
    const t = j / needle
    return [t * 2.0 * Math.cos(Math.PI*1.5) + (Math.random()-0.5)*0.06,
            t * 2.0 * Math.sin(Math.PI*1.5) + 0.4 + (Math.random()-0.5)*0.06,
            (Math.random()-0.5)*0.1]
  }
  const th = Math.random() * Math.PI * 2
  const r  = Math.random() * 0.38
  return [r * Math.cos(th), r * Math.sin(th) + 0.4, (Math.random()-0.5)*0.2]
}

function ParticleBP({ started, hasReading }) {
  const pointsRef = useRef()
  const linesRef  = useRef()
  const tickRef   = useRef(0)
  const phaseRef  = useRef('galaxy')
  const phaseTimerRef  = useRef(0)
  const prevStartedRef = useRef(false)
  const N = 1800
  const posArr  = useRef(new Float32Array(N * 3))
  const velArr  = useRef(new Float32Array(N * 3))
  const tgtArr  = useRef(new Float32Array(N * 3))
  const linePos = useRef(new Float32Array(600 * 6))
  const stateRef = useRef({ started: false, hasReading: false })
  useEffect(() => { stateRef.current = { started, hasReading } }, [started, hasReading])
  const texture = useRef(null)
  if (!texture.current) texture.current = makeCircleTexture()

  useEffect(() => {
    for (let i = 0; i < N; i++) {
      const th = Math.random() * Math.PI * 2
      const ph = Math.acos(2 * Math.random() - 1)
      const r  = Math.pow(Math.random(), 0.5) * 4.5
      posArr.current[i*3]   = r * Math.sin(ph) * Math.cos(th)
      posArr.current[i*3+1] = r * Math.sin(ph) * Math.sin(th)
      posArr.current[i*3+2] = (Math.random() - 0.5) * 1.5
      velArr.current[i*3]   = (Math.random() - 0.5) * 0.006
      velArr.current[i*3+1] = (Math.random() - 0.5) * 0.006
      velArr.current[i*3+2] = (Math.random() - 0.5) * 0.003
      const [tx, ty, tz] = bpPoint(i, N)
      tgtArr.current[i*3]   = tx + (Math.random()-0.5)*0.1
      tgtArr.current[i*3+1] = ty + (Math.random()-0.5)*0.1
      tgtArr.current[i*3+2] = tz
    }
  }, [])

  useFrame((state, delta) => {
    if (!pointsRef.current || !linesRef.current) return
    const s = stateRef.current
    tickRef.current += delta
    if (s.started && !prevStartedRef.current) {
      phaseRef.current = 'exploding'
      phaseTimerRef.current = 0
      for (let i = 0; i < N; i++) {
        const th = Math.random() * Math.PI * 2
        const ph = Math.acos(2 * Math.random() - 1)
        const spd = Math.random() * 0.18 + 0.05
        velArr.current[i*3]   = Math.sin(ph)*Math.cos(th)*spd
        velArr.current[i*3+1] = Math.sin(ph)*Math.sin(th)*spd
        velArr.current[i*3+2] = Math.cos(ph)*spd*0.4
      }
    }
    prevStartedRef.current = s.started
    phaseTimerRef.current += delta
    if (phaseRef.current === 'exploding' && phaseTimerRef.current > 0.65) phaseRef.current = 'bp'
    const lerpSpeed  = phaseRef.current === 'bp' ? 0.026 : 0.006
    const pressurePulse = s.hasReading
      ? 1.0 + Math.sin(tickRef.current * 2.8) * 0.16
      : 1.0 + Math.sin(tickRef.current * 1.0) * 0.05
    const pos = posArr.current, vel = velArr.current, tgt = tgtArr.current
    for (let i = 0; i < N; i++) {
      const ix = i * 3
      if (phaseRef.current === 'exploding') {
        pos[ix] += vel[ix]; pos[ix+1] += vel[ix+1]; pos[ix+2] += vel[ix+2]
        vel[ix] *= 0.95; vel[ix+1] *= 0.95; vel[ix+2] *= 0.95
      } else if (phaseRef.current === 'bp') {
        const breathe = Math.sin(tickRef.current * 1.8 + i * 0.007) * 0.006 * pressurePulse
        pos[ix]   += (tgt[ix]   - pos[ix])   * lerpSpeed + vel[ix]
        pos[ix+1] += (tgt[ix+1] - pos[ix+1]) * lerpSpeed + vel[ix+1] + breathe
        pos[ix+2] += (tgt[ix+2] - pos[ix+2]) * lerpSpeed + vel[ix+2]
        vel[ix] *= 0.88; vel[ix+1] *= 0.88; vel[ix+2] *= 0.88
      } else {
        const angle = tickRef.current * 0.1 + (i / N) * Math.PI * 2
        const rx = pos[ix], ry = pos[ix+1]
        const r = Math.sqrt(rx*rx + ry*ry) || 0.1
        pos[ix]   += (r * Math.cos(angle) - rx) * 0.002 + vel[ix]
        pos[ix+1] += (r * Math.sin(angle) - ry) * 0.002 + vel[ix+1]
        vel[ix] *= 0.99; vel[ix+1] *= 0.99
        if (r > 5) { pos[ix] *= 0.98; pos[ix+1] *= 0.98 }
      }
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true
    pointsRef.current.material.size    = phaseRef.current === 'bp' ? (s.hasReading ? 0.088 : 0.068) * pressurePulse : 0.052
    pointsRef.current.material.opacity = s.hasReading ? 0.92 : 0.72
    const lp = linePos.current
    let li = 0
    const maxDist = phaseRef.current === 'bp' ? 0.72 : 1.3
    outer: for (let i = 0; i < N; i += 10) {
      for (let j = i + 10; j < N; j += 10) {
        if (li >= 300) break outer
        const dx=pos[i*3]-pos[j*3], dy=pos[i*3+1]-pos[j*3+1], dz=pos[i*3+2]-pos[j*3+2]
        if (Math.sqrt(dx*dx+dy*dy+dz*dz) < maxDist) {
          lp[li*6]=pos[i*3]; lp[li*6+1]=pos[i*3+1]; lp[li*6+2]=pos[i*3+2]
          lp[li*6+3]=pos[j*3]; lp[li*6+4]=pos[j*3+1]; lp[li*6+5]=pos[j*3+2]
          li++
        }
      }
    }
    for (let i = li; i < 300; i++) { for(let k=0;k<6;k++) lp[i*6+k]=0 }
    linesRef.current.geometry.attributes.position.needsUpdate = true
    linesRef.current.geometry.setDrawRange(0, li * 2)
    linesRef.current.material.opacity = phaseRef.current === 'bp' ? 0.13 : 0.05
    state.camera.position.x = Math.sin(tickRef.current * 0.06) * 0.3
    state.camera.position.y = Math.cos(tickRef.current * 0.05) * 0.15
    state.camera.lookAt(0, 0, 0)
  })

  return (
    <>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[posArr.current, 3]} />
        </bufferGeometry>
        <pointsMaterial map={texture.current} size={0.052} sizeAttenuation color="#8B5CF6" transparent opacity={0.72} depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>
      <lineSegments ref={linesRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[linePos.current, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color="#8B5CF6" transparent opacity={0.05} blending={THREE.AdditiveBlending} depthWrite={false} />
      </lineSegments>
    </>
  )
}

function OrbitRings() {
  const r1 = useRef(), r2 = useRef()
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (r1.current) { r1.current.rotation.z = t*0.1; r1.current.rotation.y = Math.sin(t*0.07)*0.3 }
    if (r2.current) { r2.current.rotation.z = -t*0.07; r2.current.rotation.x = -Math.PI/5+Math.cos(t*0.05)*0.15 }
  })
  return (
    <>
      <mesh ref={r1} rotation={[Math.PI/3.5, 0, 0]}>
        <torusGeometry args={[3.0, 0.005, 8, 100]} />
        <meshBasicMaterial color="#8B5CF6" transparent opacity={0.18} blending={THREE.AdditiveBlending} depthWrite={false}/>
      </mesh>
      <mesh ref={r2} rotation={[-Math.PI/5, Math.PI/4, 0.5]}>
        <torusGeometry args={[4.2, 0.003, 8, 100]} />
        <meshBasicMaterial color="#A78BFA" transparent opacity={0.08} blending={THREE.AdditiveBlending} depthWrite={false}/>
      </mesh>
    </>
  )
}

function BPScreen({ onNext }) {
  const setReading = useStore((s) => s.setReading)
  const [systolic, setSystolic]   = useState(null)
  const [diastolic, setDiastolic] = useState(null)
  const [status, setStatus]       = useState('waiting')
  const [countdown, setCountdown] = useState(45)
  const [done, setDone]           = useState(false)
  const [started, setStarted]     = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [manualMode, setManualMode] = useState(false)
  const [manualInput, setManualInput] = useState('')
  const timerRef   = useRef(null)
  const pollRef    = useRef(null)
  const timeoutRef = useRef(null)

  const statusMessages = [
    { at: 45, msg: 'Preparing cuff…' },
    { at: 35, msg: 'Inflating cuff…' },
    { at: 20, msg: 'Measuring…' },
    { at: 5,  msg: 'Reading result…' },
  ]

  function startReading() {
    setStarted(true)
    setDone(false); setSystolic(null); setDiastolic(null)
    setCountdown(45); setManualMode(false); setStatus('Preparing cuff…')

    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        const msg = statusMessages.find((s) => c <= s.at)
        if (msg) setStatus(msg.msg)
        if (c <= 1) { clearInterval(timerRef.current); return 0 }
        return c - 1
      })
    }, 1000)

    pollRef.current = setInterval(async () => {
      try {
        const res  = await fetch(`${config.LOCAL_URL}/api/ocr/bp/latest`)
        const data = await res.json()
        if (data.systolic >= 70 && data.diastolic >= 40) {
          clearInterval(pollRef.current); clearInterval(timerRef.current); clearTimeout(timeoutRef.current)
          setSystolic(data.systolic); setDiastolic(data.diastolic); setDone(true)
          setReading('bp_systolic', data.systolic); setReading('bp_diastolic', data.diastolic)
          setTimeout(onNext, 2000)
        }
      } catch (e) {}
    }, 3000)

    timeoutRef.current = setTimeout(() => {
      clearInterval(pollRef.current); clearInterval(timerRef.current)
      setManualMode(true)
    }, 50000)
  }

  function handleManualSubmit() {
    const parts = manualInput.split('/')
    if (parts.length === 2) {
      const sys = parseInt(parts[0]), dia = parseInt(parts[1])
      if (sys >= 70 && sys <= 220 && dia >= 40 && dia <= 130) {
        setSystolic(sys); setDiastolic(dia); setDone(true)
        setReading('bp_systolic', sys); setReading('bp_diastolic', dia)
        setTimeout(onNext, 1500); return
      }
    }
    alert('Please enter in correct format: 120/80')
  }

  useEffect(() => {
    return () => { clearInterval(timerRef.current); clearInterval(pollRef.current); clearTimeout(timeoutRef.current) }
  }, [])

  function handleSkip() {
    clearInterval(timerRef.current); clearInterval(pollRef.current); clearTimeout(timeoutRef.current)
    setReading('bp_systolic', null); setReading('bp_diastolic', null); onNext()
  }

  return (
    <div style={{ width:'100vw', height:'100vh', position:'relative', overflow:'hidden', background:'#050308' }}>

      <div style={{ position:'absolute', inset:0, zIndex:0 }}>
        <Canvas camera={{ position:[0,0,6], fov:55 }} gl={{ antialias:true, alpha:false }} style={{ width:'100%', height:'100%' }}>
          <color attach="background" args={['#050308']} />
          <ParticleBP started={started} hasReading={systolic !== null} />
          <OrbitRings />
        </Canvas>
      </div>

      <div style={{ position:'absolute', inset:0, zIndex:1, pointerEvents:'none',
        background:'radial-gradient(ellipse at 50% 45%, rgba(100,50,200,0.13) 0%, transparent 65%)' }} />

      {/* TOP BAR */}
      <div style={{ position:'absolute', top:0, left:0, right:0, height:56, zIndex:20,
        background:'rgba(0,0,0,0.65)', backdropFilter:'blur(20px)',
        borderBottom:'1px solid rgba(139,92,246,0.12)',
        display:'flex', alignItems:'center', padding:'0 28px', gap:14 }}>
        <motion.div animate={{ scale:[1,1.5,1], opacity:[0.5,1,0.5] }}
          transition={{ repeat:Infinity, duration:1.4 }}
          style={{ width:8, height:8, borderRadius:'50%', background:'#8B5CF6', boxShadow:'0 0 14px #8B5CF6' }} />
        <div style={{ flex:1 }}>
          <div style={{ fontSize:14, fontWeight:700, color:'#fff', letterSpacing:'-0.02em' }}>Wrap the BP cuff on your left arm</div>
          <div style={{ fontSize:10, color:'rgba(139,92,246,0.5)' }}>Place cuff 2cm above elbow · Sit still</div>
        </div>
        <div style={{ background:'rgba(139,92,246,0.1)', border:'1px solid rgba(139,92,246,0.22)',
          borderRadius:99, padding:'5px 14px', fontSize:11, fontWeight:700, color:'#8B5CF6' }}>1 / 5</div>
      </div>

      {/* STEP TRACK */}
      <div style={{ position:'absolute', top:56, left:0, right:0, zIndex:20,
        display:'flex', gap:5, padding:'10px 28px 0' }}>
        {['#8B5CF6','#EF4444','#F59E0B','#22C55E','#6366F1'].map((c,i) => (
          <div key={i} style={{ flex:1, height:3, borderRadius:99,
            background: i===0 ? '#8B5CF6' : 'rgba(255,255,255,0.07)',
            boxShadow: i===0 ? '0 0 10px #8B5CF6' : 'none' }} />
        ))}
      </div>

      {/* OVERLAY CONTENT */}
      <div style={{ position:'absolute', inset:0, zIndex:10,
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        paddingTop:80, pointerEvents: started && !manualMode ? 'none' : 'all' }}>
        <AnimatePresence mode="wait">

          {!started && (
            <motion.div key="ready"
              initial={{ opacity:0, y:20, scale:0.96 }} animate={{ opacity:1, y:0, scale:1 }}
              exit={{ opacity:0, y:-20 }} transition={{ duration:0.45 }}
              style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:14,
                background:'rgba(5,3,8,0.72)', backdropFilter:'blur(32px)',
                border:'1px solid rgba(139,92,246,0.18)', borderRadius:28,
                padding:'26px 36px', maxWidth:390, width:'90%',
                boxShadow:'0 0 80px rgba(100,50,200,0.12)' }}>

              <svg width="64" height="56" viewBox="0 0 64 56" fill="none">
                <rect x="8" y="16" width="48" height="28" rx="14" stroke="#8B5CF6" strokeWidth="1.5" fill="rgba(139,92,246,0.06)" opacity="0.85"/>
                <path d="M8 30 C8 22 14 16 22 16" stroke="#A78BFA" strokeWidth="1.2" strokeDasharray="3,2" opacity="0.5"/>
                <path d="M56 30 C56 22 50 16 42 16" stroke="#A78BFA" strokeWidth="1.2" strokeDasharray="3,2" opacity="0.5"/>
                <rect x="28" y="22" width="8" height="12" rx="4" fill="#8B5CF6" opacity="0.5"/>
                <circle cx="32" cy="44" r="4" fill="#8B5CF6" opacity="0.4"/>
                <line x1="32" y1="40" x2="32" y2="36" stroke="#8B5CF6" strokeWidth="1" opacity="0.4"/>
              </svg>

              <div style={{ fontSize:10, fontWeight:700, color:'#8B5CF6', letterSpacing:'0.12em', textTransform:'uppercase' }}>
                BLOOD PRESSURE
              </div>
              <div style={{ fontSize:17, fontWeight:700, color:'#fff', textAlign:'center', lineHeight:1.4, letterSpacing:'-0.02em' }}>
                Wrap cuff on your left arm<br/>and sit still
              </div>
              <div style={{ fontSize:12, color:'rgba(139,92,246,0.45)', textAlign:'center', lineHeight:1.5 }}>
                Cuff 2cm above elbow · Sit still for 45 seconds
              </div>

              <motion.button whileTap={{ scale:0.97 }} onClick={startReading}
                style={{ pointerEvents:'all', width:'100%', padding:'16px 24px', borderRadius:14,
                  background:'#fff', border:'none', cursor:'pointer',
                  fontSize:16, fontWeight:700, color:'#0A0A0F',
                  display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
                <motion.div animate={{ scale:[1,1.3,1] }} transition={{ repeat:Infinity, duration:1.3 }}
                  style={{ width:9, height:9, borderRadius:'50%', background:'#22C55E', boxShadow:'0 0 10px #22C55E' }} />
                I'm Ready
              </motion.button>
            </motion.div>
          )}

          {started && !manualMode && !done && (
            <motion.div key="reading"
              initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ duration:0.7 }}
              style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:18, pointerEvents:'none' }}>

              <motion.div
                animate={{ scale:[1,1.03,1] }} transition={{ repeat:Infinity, duration:2 }}
                style={{ fontSize:22, fontWeight:700, color:'#8B5CF6', letterSpacing:'0.04em',
                  textShadow:'0 0 40px rgba(139,92,246,0.6)' }}>
                {status}
              </motion.div>

              <div style={{ position:'relative', width:110, height:110 }}>
                <svg width="110" height="110" viewBox="0 0 110 110" style={{ transform:'rotate(-90deg)', position:'absolute', inset:0 }}>
                  <circle cx="55" cy="55" r="46" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4"/>
                  <circle cx="55" cy="55" r="46" fill="none" stroke="#8B5CF6" strokeWidth="4"
                    strokeDasharray={`${2*Math.PI*46}`}
                    strokeDashoffset={`${2*Math.PI*46*(countdown/45)}`}
                    strokeLinecap="round"
                    style={{ transition:'stroke-dashoffset 1s linear', filter:'drop-shadow(0 0 8px #8B5CF6)' }} />
                </svg>
                <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column',
                  alignItems:'center', justifyContent:'center' }}>
                  <span style={{ fontSize:32, fontWeight:900, color:'#8B5CF6',
                    textShadow:'0 0 20px rgba(139,92,246,0.6)' }}>{countdown}</span>
                  <span style={{ fontSize:10, color:'rgba(139,92,246,0.5)', fontWeight:600, letterSpacing:'0.08em' }}>sec</span>
                </div>
              </div>

              <motion.button whileTap={{ scale:0.97 }} onClick={() => setManualMode(true)}
                style={{ pointerEvents:'all',
                  padding:'10px 22px', borderRadius:10,
                  background:'rgba(139,92,246,0.08)', border:'1px solid rgba(139,92,246,0.22)',
                  fontSize:13, color:'rgba(139,92,246,0.7)', fontWeight:600, cursor:'pointer' }}>
                Enter reading manually
              </motion.button>
            </motion.div>
          )}

          {done && (
            <motion.div key="done"
              initial={{ opacity:0, scale:0.8 }} animate={{ opacity:1, scale:1 }}
              transition={{ type:'spring', stiffness:280 }}
              style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:14 }}>
              <div style={{ fontSize:64, fontWeight:900, color:'#8B5CF6', letterSpacing:'-0.04em',
                textShadow:'0 0 60px rgba(139,92,246,0.7)' }}>
                {systolic}/{diastolic}
              </div>
              <div style={{ fontSize:14, color:'rgba(139,92,246,0.6)', letterSpacing:'0.1em', fontWeight:600 }}>mmHg</div>
              <motion.div initial={{ scale:0 }} animate={{ scale:1 }} transition={{ type:'spring', stiffness:280 }}
                style={{ width:60, height:60, borderRadius:'50%', background:'#22C55E',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  boxShadow:'0 0 50px rgba(34,197,94,0.7)' }}>
                <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
                  <path d="M5 15l7 7L25 8" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </motion.div>
            </motion.div>
          )}

          {manualMode && !done && (
            <motion.div key="manual"
              initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.4 }}
              style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:16,
                background:'rgba(5,3,8,0.80)', backdropFilter:'blur(32px)',
                border:'1px solid rgba(139,92,246,0.22)', borderRadius:28,
                padding:'28px 32px', maxWidth:380, width:'90%' }}>

              <div style={{ fontSize:10, fontWeight:700, color:'#8B5CF6', letterSpacing:'0.12em', textTransform:'uppercase' }}>
                MANUAL ENTRY
              </div>
              <div style={{ fontSize:17, fontWeight:700, color:'#fff', textAlign:'center' }}>
                Enter the reading from your BP machine
              </div>
              <div style={{ fontSize:12, color:'rgba(139,92,246,0.5)', textAlign:'center' }}>
                Format: 120/80
              </div>

              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="120/80"
                style={{ width:'100%', padding:'14px 20px', borderRadius:14,
                  background:'rgba(139,92,246,0.08)', border:'1px solid rgba(139,92,246,0.3)',
                  color:'#fff', fontSize:28, fontWeight:700, textAlign:'center',
                  outline:'none', letterSpacing:'0.05em' }}
              />

              <motion.button whileTap={{ scale:0.97 }} onClick={handleManualSubmit}
                style={{ width:'100%', padding:'16px', borderRadius:14,
                  background:'#8B5CF6', border:'none', cursor:'pointer',
                  fontSize:16, fontWeight:700, color:'#fff' }}>
                Submit Reading
              </motion.button>

              <button onClick={handleSkip}
                style={{ background:'none', border:'none', cursor:'pointer',
                  fontSize:12, color:'rgba(255,255,255,0.2)', fontWeight:500 }}>
                Skip this step
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}

export default BPScreen
