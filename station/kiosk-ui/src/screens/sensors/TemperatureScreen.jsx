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

function thermoPoint(i, total) {
  const bulbCount = Math.floor(total * 0.45)
  if (i < bulbCount) {
    const th = Math.random() * Math.PI * 2
    const ph = Math.acos(2 * Math.random() - 1)
    const r = Math.pow(Math.random(), 0.4) * 1.05
    return [r * Math.sin(ph) * Math.cos(th), r * Math.sin(ph) * Math.sin(th) - 2.2, (Math.random() - 0.5) * 0.35]
  } else {
    const tubeT = (i - bulbCount) / (total - bulbCount)
    const angle = Math.random() * Math.PI * 2
    const tubeR = Math.random() < 0.75 ? (Math.random() * 0.22 + 0.18) : Math.random() * 0.38
    return [tubeR * Math.cos(angle) * 0.55, tubeT * 4.2 - 1.1, tubeR * Math.sin(angle) * 0.55]
  }
}

function ParticleThermo({ started, hasReading }) {
  const pointsRef = useRef()
  const linesRef = useRef()
  const tickRef = useRef(0)
  const phaseRef = useRef('galaxy')
  const phaseTimerRef = useRef(0)
  const prevStartedRef = useRef(false)
  const N = 1800
  const posArr = useRef(new Float32Array(N * 3))
  const velArr = useRef(new Float32Array(N * 3))
  const tgtArr = useRef(new Float32Array(N * 3))
  const linePos = useRef(new Float32Array(600 * 6))
  const stateRef = useRef({ started: false, hasReading: false })
  useEffect(() => { stateRef.current = { started, hasReading } }, [started, hasReading])
  const texture = useRef(null)
  if (!texture.current) texture.current = makeCircleTexture()

  useEffect(() => {
    for (let i = 0; i < N; i++) {
      const th = Math.random() * Math.PI * 2
      const ph = Math.acos(2 * Math.random() - 1)
      const r = Math.pow(Math.random(), 0.5) * 4.5
      posArr.current[i*3]   = r * Math.sin(ph) * Math.cos(th)
      posArr.current[i*3+1] = r * Math.sin(ph) * Math.sin(th)
      posArr.current[i*3+2] = (Math.random() - 0.5) * 1.5
      velArr.current[i*3]   = (Math.random() - 0.5) * 0.006
      velArr.current[i*3+1] = (Math.random() - 0.5) * 0.006
      velArr.current[i*3+2] = (Math.random() - 0.5) * 0.003
      const [tx, ty, tz] = thermoPoint(i, N)
      tgtArr.current[i*3] = tx + (Math.random()-0.5)*0.12
      tgtArr.current[i*3+1] = ty + (Math.random()-0.5)*0.12
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
    if (phaseRef.current === 'exploding' && phaseTimerRef.current > 0.65) phaseRef.current = 'thermo'
    const lerpSpeed = phaseRef.current === 'thermo' ? 0.026 : 0.006
    const heatPulse = s.hasReading ? 1.0 + Math.sin(tickRef.current * 3.5) * 0.18 : 1.0 + Math.sin(tickRef.current * 1.2) * 0.06
    const pos = posArr.current, vel = velArr.current, tgt = tgtArr.current
    for (let i = 0; i < N; i++) {
      const ix = i * 3
      if (phaseRef.current === 'exploding') {
        pos[ix] += vel[ix]; pos[ix+1] += vel[ix+1]; pos[ix+2] += vel[ix+2]
        vel[ix] *= 0.95; vel[ix+1] *= 0.95; vel[ix+2] *= 0.95
      } else if (phaseRef.current === 'thermo') {
        const isBulb = i < Math.floor(N * 0.45)
        const breathe = isBulb ? Math.sin(tickRef.current * 2.2 + i * 0.01) * 0.009 * heatPulse : Math.sin(tickRef.current * 1.1 + i * 0.005) * 0.004
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
    pointsRef.current.material.size = phaseRef.current === 'thermo' ? (s.hasReading ? 0.092 : 0.072) * heatPulse : 0.052
    pointsRef.current.material.opacity = s.hasReading ? 0.92 : 0.72
    const lp = linePos.current
    let li = 0
    const maxDist = phaseRef.current === 'thermo' ? 0.7 : 1.3
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
    linesRef.current.material.opacity = phaseRef.current === 'thermo' ? 0.12 : 0.05
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
        <pointsMaterial map={texture.current} size={0.052} sizeAttenuation color="#F59E0B" transparent opacity={0.72} depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>
      <lineSegments ref={linesRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[linePos.current, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color="#F59E0B" transparent opacity={0.05} blending={THREE.AdditiveBlending} depthWrite={false} />
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
        <meshBasicMaterial color="#F59E0B" transparent opacity={0.18} blending={THREE.AdditiveBlending} depthWrite={false}/>
      </mesh>
      <mesh ref={r2} rotation={[-Math.PI/5, Math.PI/4, 0.5]}>
        <torusGeometry args={[4.2, 0.003, 8, 100]} />
        <meshBasicMaterial color="#FB923C" transparent opacity={0.08} blending={THREE.AdditiveBlending} depthWrite={false}/>
      </mesh>
    </>
  )
}

function TemperatureScreen({ onNext }) {
  const setReading = useStore((s) => s.setReading)
  const [temp, setTemp] = useState(null)
  const [done, setDone] = useState(false)
  const doneRef = useRef(false)
  const [started, setStarted] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const intervalRef = useRef(null)
  const timeoutRef = useRef(null)

  function startReading() {
    setStarted(true); setTemp(null); setDone(false)
    intervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${config.LOCAL_URL}/api/sensors/live`)
        const data = await res.json()
        if (data.temperature && data.temperature >= 34 && data.temperature <= 42) {
          setTemp(data.temperature)
          setDone(true); doneRef.current = true
          clearInterval(intervalRef.current); clearTimeout(timeoutRef.current)
          setReading('temperature', data.temperature)
          setTimeout(onNext, 1800)
        }
      } catch (e) {}
    }, 500)
    timeoutRef.current = setTimeout(() => {
      clearInterval(intervalRef.current)
      if (!doneRef.current) {
        if (retryCount < 3) { setRetryCount((r) => r + 1); setStarted(false) }
        else { setReading('temperature', null); onNext() }
      }
    }, 20000)
  }

  useEffect(() => {
    return () => { clearInterval(intervalRef.current); clearTimeout(timeoutRef.current) }
  }, [])

  function handleSkip() {
    clearInterval(intervalRef.current); clearTimeout(timeoutRef.current)
    setReading('temperature', null); onNext()
  }

  return (
    <div style={{ width:'100vw', height:'100vh', position:'relative', overflow:'hidden', background:'#07040A' }}>

      <div style={{ position:'absolute', inset:0, zIndex:0 }}>
        <Canvas camera={{ position:[0,0,6], fov:55 }} gl={{ antialias:true, alpha:false }} style={{ width:'100%', height:'100%' }}>
          <color attach="background" args={['#07040A']} />
          <ParticleThermo started={started} hasReading={temp !== null} />
          <OrbitRings />
        </Canvas>
      </div>

      <div style={{ position:'absolute', inset:0, zIndex:1, pointerEvents:'none',
        background:'radial-gradient(ellipse at 50% 55%, rgba(180,90,0,0.13) 0%, transparent 65%)' }} />

      {/* TOP BAR */}
      <div style={{ position:'absolute', top:0, left:0, right:0, height:56, zIndex:20,
        background:'rgba(0,0,0,0.65)', backdropFilter:'blur(20px)',
        borderBottom:'1px solid rgba(245,158,11,0.12)',
        display:'flex', alignItems:'center', padding:'0 28px', gap:14 }}>
        <motion.div animate={{ scale:[1,1.5,1], opacity:[0.5,1,0.5] }}
          transition={{ repeat:Infinity, duration:1.4 }}
          style={{ width:8, height:8, borderRadius:'50%', background:'#F59E0B', boxShadow:'0 0 14px #F59E0B' }} />
        <div style={{ flex:1 }}>
          <div style={{ fontSize:14, fontWeight:700, color:'#fff', letterSpacing:'-0.02em' }}>Hold your wrist close to the sensor</div>
          <div style={{ fontSize:10, color:'rgba(245,158,11,0.45)' }}>2-3 cm from the infrared sensor · Keep still</div>
        </div>
        <div style={{ background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.22)',
          borderRadius:99, padding:'5px 14px', fontSize:11, fontWeight:700, color:'#F59E0B' }}>3 / 5</div>
      </div>

      {/* STEP TRACK */}
      <div style={{ position:'absolute', top:56, left:0, right:0, zIndex:20,
        display:'flex', gap:5, padding:'10px 28px 0' }}>
        {['#8B5CF6','#EF4444','#F59E0B','#22C55E','#6366F1'].map((c,i) => (
          <div key={i} style={{ flex:1, height:3, borderRadius:99,
            background: i < 2 ? 'rgba(255,255,255,0.3)' : i===2 ? '#F59E0B' : 'rgba(255,255,255,0.07)',
            boxShadow: i===2 ? '0 0 10px #F59E0B' : 'none' }} />
        ))}
      </div>

      {/* OVERLAY CONTENT */}
      <div style={{ position:'absolute', inset:0, zIndex:10,
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        paddingTop:80, pointerEvents: started ? 'none' : 'all' }}>
        <AnimatePresence mode="wait">

          {!started && (
            <motion.div key="ready"
              initial={{ opacity:0, y:20, scale:0.96 }} animate={{ opacity:1, y:0, scale:1 }}
              exit={{ opacity:0, y:-20 }} transition={{ duration:0.45 }}
              style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:14,
                background:'rgba(7,4,10,0.72)', backdropFilter:'blur(32px)',
                border:'1px solid rgba(245,158,11,0.18)', borderRadius:28,
                padding:'26px 36px', maxWidth:390, width:'90%',
                boxShadow:'0 0 80px rgba(180,90,0,0.12)' }}>

              <svg width="52" height="72" viewBox="0 0 52 72" fill="none">
                <rect x="20" y="4" width="12" height="44" rx="6" stroke="#F59E0B" strokeWidth="1.5" fill="rgba(245,158,11,0.06)" opacity="0.8"/>
                <circle cx="26" cy="56" r="10" stroke="#F59E0B" strokeWidth="1.5" fill="rgba(245,158,11,0.12)" opacity="0.9"/>
                <rect x="23" y="28" width="6" height="24" rx="3" fill="#F59E0B" opacity="0.5"/>
                <circle cx="26" cy="56" r="5" fill="#F59E0B" opacity="0.7"/>
                <line x1="32" y1="18" x2="38" y2="18" stroke="#F59E0B" strokeWidth="1.2" opacity="0.5"/>
                <line x1="32" y1="26" x2="36" y2="26" stroke="#F59E0B" strokeWidth="1.2" opacity="0.5"/>
                <line x1="32" y1="34" x2="38" y2="34" stroke="#F59E0B" strokeWidth="1.2" opacity="0.5"/>
              </svg>

              <div style={{ fontSize:10, fontWeight:700, color:'#F59E0B', letterSpacing:'0.12em', textTransform:'uppercase' }}>
                TEMPERATURE
              </div>
              <div style={{ fontSize:17, fontWeight:700, color:'#fff', textAlign:'center', lineHeight:1.4, letterSpacing:'-0.02em' }}>
                Hold your wrist 2-3 cm<br/>from the infrared sensor
              </div>
              <div style={{ fontSize:12, color:'rgba(245,158,11,0.45)', textAlign:'center', lineHeight:1.5 }}>
                Keep still · Reading takes about 3 seconds
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
              {retryCount > 0 && <div style={{ fontSize:11, color:'rgba(245,158,11,0.6)', fontWeight:600 }}>Retry {retryCount}/3</div>}
              {retryCount >= 3 && <button onClick={handleSkip} style={{ background:'none', border:'none', cursor:'pointer', fontSize:11, color:'rgba(255,255,255,0.2)', fontWeight:500 }}>Skip this step</button>}
            </motion.div>
          )}

          {started && (
            <motion.div key="reading"
              initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ duration:0.7 }}
              style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:18, pointerEvents:'none' }}>

              <motion.div
                animate={temp ? { scale:[1,1.04,1] } : {}}
                transition={{ repeat:Infinity, duration:1.5 }}
                style={{ fontSize:108, fontWeight:900, color:'#F59E0B',
                  letterSpacing:'-0.07em', lineHeight:1, textAlign:'center',
                  textShadow:'0 0 80px rgba(245,158,11,0.65), 0 0 40px rgba(245,158,11,0.4)' }}>
                {temp ? temp.toFixed(1) : '--'}
              </motion.div>
              <div style={{ fontSize:12, color:'rgba(245,158,11,0.5)', letterSpacing:'0.14em', fontWeight:600 }}>°C</div>

              <svg width="72" height="72" viewBox="0 0 72 72" style={{ transform:'rotate(-90deg)' }}>
                <circle cx="36" cy="36" r="28" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3"/>
                <motion.circle cx="36" cy="36" r="28" fill="none" stroke="#F59E0B" strokeWidth="3"
                  strokeDasharray={`${2*Math.PI*28}`}
                  animate={{ strokeDashoffset: temp ? 0 : 2*Math.PI*28 }}
                  transition={{ duration: 1.2, ease: 'easeOut' }}
                  strokeLinecap="round"
                  style={{ filter:'drop-shadow(0 0 6px #F59E0B)' }} />
              </svg>

              {!temp && (
                <motion.div animate={{ opacity:[0.4,1,0.4] }} transition={{ repeat:Infinity, duration:1.2 }}
                  style={{ padding:'8px 16px', borderRadius:9,
                    background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.22)',
                    fontSize:12, color:'#F59E0B', fontWeight:600 }}>
                  Reading temperature…
                </motion.div>
              )}

              {done && (
                <motion.div initial={{ scale:0 }} animate={{ scale:1 }} transition={{ type:'spring', stiffness:280 }}
                  style={{ width:60, height:60, borderRadius:'50%', background:'#22C55E',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    boxShadow:'0 0 50px rgba(34,197,94,0.7)' }}>
                  <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
                    <path d="M5 15l7 7L25 8" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </motion.div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}

export default TemperatureScreen
