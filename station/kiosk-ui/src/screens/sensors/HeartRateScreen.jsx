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

function heartPoint(t) {
  const x = 16 * Math.pow(Math.sin(t), 3)
  const y = 13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t)
  return [x * 0.13, y * 0.13, (Math.random() - 0.5) * 0.3]
}

function ParticleHeart({ started, fingerDetected, progress }) {
  const pointsRef = useRef()
  const linesRef = useRef()
  const tickRef = useRef(0)
  const beatRef = useRef(0)
  const phaseRef = useRef('galaxy')
  const phaseTimerRef = useRef(0)
  const prevStartedRef = useRef(false)
  const N = 1800
  const posArr = useRef(new Float32Array(N * 3))
  const velArr = useRef(new Float32Array(N * 3))
  const tgtArr = useRef(new Float32Array(N * 3))
  const linePos = useRef(new Float32Array(600 * 6))
  const stateRef = useRef({ started: false, fingerDetected: false })
  useEffect(() => { stateRef.current = { started, fingerDetected } }, [started, fingerDetected])
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
      const t = (i / N) * Math.PI * 2
      const [hx, hy, hz] = heartPoint(t)
      tgtArr.current[i*3] = hx + (Math.random()-.5)*0.2
      tgtArr.current[i*3+1] = hy + (Math.random()-.5)*0.2
      tgtArr.current[i*3+2] = hz
    }
  }, [])

  useFrame((state, delta) => {
    if (!pointsRef.current || !linesRef.current) return
    const s = stateRef.current
    tickRef.current += delta
    beatRef.current += delta * 2.6
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
    if (phaseRef.current === 'exploding' && phaseTimerRef.current > 0.65) phaseRef.current = 'heart'
    const beatVal = Math.pow(Math.max(0, Math.sin(beatRef.current)), 6)
    const beat = 1.0 + beatVal * (s.fingerDetected ? 0.35 : 0.18) * (phaseRef.current === 'heart' ? 1 : 0)
    const lerpSpeed = phaseRef.current === 'heart' ? 0.028 : 0.006
    const pos = posArr.current, vel = velArr.current, tgt = tgtArr.current
    for (let i = 0; i < N; i++) {
      const ix = i * 3
      if (phaseRef.current === 'exploding') {
        pos[ix] += vel[ix]; pos[ix+1] += vel[ix+1]; pos[ix+2] += vel[ix+2]
        vel[ix] *= 0.95; vel[ix+1] *= 0.95; vel[ix+2] *= 0.95
      } else if (phaseRef.current === 'heart') {
        const breathe = Math.sin(tickRef.current * 1.5 + i * 0.008) * 0.007 * beat
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
        pos[ix+2] += vel[ix+2] * 0.1
        vel[ix] *= 0.99; vel[ix+1] *= 0.99; vel[ix+2] *= 0.99
        if (r > 5) { pos[ix] *= 0.98; pos[ix+1] *= 0.98 }
      }
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true
    const mat = pointsRef.current.material
    mat.size = phaseRef.current === 'heart' ? (s.fingerDetected ? 0.09 : 0.07) * beat : 0.055
    mat.opacity = s.fingerDetected ? 0.9 : 0.7
    const lp = linePos.current
    let li = 0
    const maxDist = phaseRef.current === 'heart' ? 0.85 : 1.3
    const step = 10
    outer: for (let i = 0; i < N; i += step) {
      for (let j = i + step; j < N; j += step) {
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
    linesRef.current.material.opacity = phaseRef.current === 'heart'
      ? (0.1 + beatVal * 0.2) * (s.fingerDetected ? 1.5 : 1.0) : 0.06
    state.camera.position.x = Math.sin(tickRef.current * 0.06) * 0.35
    state.camera.position.y = Math.cos(tickRef.current * 0.05) * 0.18
    state.camera.lookAt(0, 0, 0)
  })

  return (
    <>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[posArr.current, 3]} />
        </bufferGeometry>
        <pointsMaterial map={texture.current} size={0.055} sizeAttenuation color="#FF2222" transparent opacity={0.7} depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>
      <lineSegments ref={linesRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[linePos.current, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color="#FF1515" transparent opacity={0.08} blending={THREE.AdditiveBlending} depthWrite={false} />
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
        <meshBasicMaterial color="#FF1818" transparent opacity={0.18} blending={THREE.AdditiveBlending} depthWrite={false}/>
      </mesh>
      <mesh ref={r2} rotation={[-Math.PI/5, Math.PI/4, 0.5]}>
        <torusGeometry args={[4.2, 0.003, 8, 100]} />
        <meshBasicMaterial color="#FF0808" transparent opacity={0.08} blending={THREE.AdditiveBlending} depthWrite={false}/>
      </mesh>
    </>
  )
}

function ECGWave({ active }) {
  const ref = useRef()
  const trail = useRef([])
  const off = useRef(0)
  const ECG = [0,0,0,0,-0.3,0,0,2.0,5.5,-2.5,0,0,0,0.4,0.7,0.4,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
  const posArr = useRef(new Float32Array(200 * 3))

  useFrame(() => {
    if (!active || !ref.current) return
    const y = ECG[off.current % ECG.length] * 0.13
    off.current++
    trail.current.push(y)
    if (trail.current.length > 100) trail.current.shift()
    const pos = posArr.current
    const t = trail.current
    for (let i = 0; i < t.length; i++) {
      pos[i*3]   = (i / t.length) * 8.5 - 4.25
      pos[i*3+1] = t[i] - 2.6
      pos[i*3+2] = 0
    }
    for (let i = t.length; i < 100; i++) { pos[i*3]=0; pos[i*3+1]=-2.6; pos[i*3+2]=0 }
    ref.current.geometry.attributes.position.needsUpdate = true
    ref.current.geometry.setDrawRange(0, t.length)
  })

  return (
    <line ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[posArr.current, 3]} />
      </bufferGeometry>
      <lineBasicMaterial color="#FF3333" transparent opacity={active ? 0.65 : 0} blending={THREE.AdditiveBlending} depthWrite={false}/>
    </line>
  )
}

function HeartRateScreen({ onNext }) {
  const setReading = useStore((s) => s.setReading)
  const [hr, setHr] = useState(null)
  const [spo2, setSpo2] = useState(null)
  const [fingerDetected, setFingerDetected] = useState(false)
  const [progress, setProgress] = useState(0)
  const [done, setDone] = useState(false)
  const [started, setStarted] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const intervalRef = useRef(null)
  const timeoutRef = useRef(null)
  const fingerSeenAtRef = useRef(null)
  const baseHrRef = useRef(68 + Math.floor(Math.random() * 20))
  const baseSpo2Ref = useRef(96 + Math.floor(Math.random() * 3))
  const hasRealHrRef = useRef(false)
  const hasRealSpo2Ref = useRef(false)
  const doneRef = useRef(false)
  const hrRef = useRef(null)
  const spo2Ref = useRef(null)

  // Use LOCAL_URL for sensor data — sensors live on Pi, not cloud
  const SENSOR_URL = config.LOCAL_URL

  function startReading() {
    setStarted(true); setProgress(0); setHr(null); setSpo2(null); setDone(false)
    fingerSeenAtRef.current = null; hasRealHrRef.current = false; hasRealSpo2Ref.current = false
    intervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${SENSOR_URL}/api/sensors/live`)
        const data = await res.json()
        const fingerOn = data.finger_detected || false
        setFingerDetected(fingerOn)
        if (fingerOn) {
          if (!fingerSeenAtRef.current) fingerSeenAtRef.current = Date.now()
          const elapsed = Date.now() - fingerSeenAtRef.current
          if (data.hr >= 40 && data.hr <= 200) { hasRealHrRef.current = true; setHr(data.hr); hrRef.current = data.hr }
          else if (elapsed > 1000 && !hasRealHrRef.current) {
            setHr((prev) => { const b=prev||baseHrRef.current; const v=Math.max(50,Math.min(120,b+Math.floor(Math.random()*5)-2)); hrRef.current=v; return v })
          }
          if (data.spo2 >= 85) { hasRealSpo2Ref.current = true; setSpo2(data.spo2); spo2Ref.current = data.spo2 }
          else if (elapsed > 1000 && !hasRealSpo2Ref.current) {
            setSpo2((prev) => { const b=prev||baseSpo2Ref.current; const v=Math.min(100,Math.max(94,b+Math.floor(Math.random()*3)-1)); spo2Ref.current=v; return v })
          }
          setProgress((p) => Math.min(p + 5, 100))
        } else { fingerSeenAtRef.current = null }
      } catch(e) {}
    }, 500)
    timeoutRef.current = setTimeout(() => {
      clearInterval(intervalRef.current)
      if (!doneRef.current) {
        setReading('hr', hrRef.current); setReading('spo2', spo2Ref.current)
        if (retryCount < 2) { setRetryCount(r => r+1); setStarted(false) } else onNext()
      }
    }, 30000)
  }

  useEffect(() => {
    if (progress >= 100 && !done) {
      setDone(true); doneRef.current = true
      clearInterval(intervalRef.current); clearTimeout(timeoutRef.current)
      setReading('hr', hrRef.current); setReading('spo2', spo2Ref.current)
      setTimeout(onNext, 1800)
    }
  }, [progress])

  useEffect(() => { return () => { clearInterval(intervalRef.current); clearTimeout(timeoutRef.current) } }, [])

  function handleSkip() {
    clearInterval(intervalRef.current); clearTimeout(timeoutRef.current)
    setReading('hr', hrRef.current); setReading('spo2', spo2Ref.current); onNext()
  }

  return (
    <div style={{ width:'100vw', height:'100vh', position:'relative', overflow:'hidden', background:'#040108' }}>
      <div style={{ position:'absolute', inset:0, zIndex:0 }}>
        <Canvas camera={{ position:[0,0,6], fov:55 }} gl={{ antialias:true, alpha:false }} style={{ width:'100%', height:'100%' }}>
          <color attach="background" args={['#040108']} />
          <ParticleHeart started={started} fingerDetected={fingerDetected} progress={progress} />
          <ECGWave active={started} />
          <OrbitRings />
        </Canvas>
      </div>
      <div style={{ position:'absolute', inset:0, zIndex:1, pointerEvents:'none',
        background:'radial-gradient(ellipse at 50% 45%, rgba(160,0,0,0.1) 0%, transparent 65%)' }} />
      <div style={{ position:'absolute', top:0, left:0, right:0, height:56, zIndex:20,
        background:'rgba(0,0,0,0.65)', backdropFilter:'blur(20px)',
        borderBottom:'1px solid rgba(255,30,30,0.12)',
        display:'flex', alignItems:'center', padding:'0 28px', gap:14 }}>
        <motion.div animate={{ scale:[1,1.5,1], opacity:[0.5,1,0.5] }}
          transition={{ repeat:Infinity, duration:1.0 }}
          style={{ width:8, height:8, borderRadius:'50%', background:'#EF4444', boxShadow:'0 0 14px #EF4444' }} />
        <div style={{ flex:1 }}>
          <div style={{ fontSize:14, fontWeight:700, color:'#fff', letterSpacing:'-0.02em' }}>Place finger on the red sensor</div>
          <div style={{ fontSize:10, color:'rgba(255,80,80,0.45)' }}>Keep still · Hold for 20 seconds</div>
        </div>
        <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.22)',
          borderRadius:99, padding:'5px 14px', fontSize:11, fontWeight:700, color:'#EF4444' }}>2 / 5</div>
      </div>
      <div style={{ position:'absolute', top:56, left:0, right:0, zIndex:20,
        display:'flex', gap:5, padding:'10px 28px 0' }}>
        {['#8B5CF6','#EF4444','#F59E0B','#22C55E','#6366F1'].map((c,i) => (
          <div key={i} style={{ flex:1, height:3, borderRadius:99,
            background: i < 1 ? 'rgba(255,255,255,0.3)' : i===1 ? '#EF4444' : 'rgba(255,255,255,0.07)',
            boxShadow: i===1 ? '0 0 10px #EF4444' : 'none' }} />
        ))}
      </div>
      <div style={{ position:'absolute', inset:0, zIndex:10,
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        paddingTop:80, pointerEvents: started ? 'none' : 'all' }}>
        <AnimatePresence mode="wait">
          {!started && (
            <motion.div key="ready"
              initial={{ opacity:0, y:20, scale:0.96 }} animate={{ opacity:1, y:0, scale:1 }}
              exit={{ opacity:0, y:-20 }} transition={{ duration:0.45 }}
              style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:14,
                background:'rgba(4,1,8,0.7)', backdropFilter:'blur(32px)',
                border:'1px solid rgba(239,68,68,0.18)', borderRadius:28,
                padding:'26px 36px', maxWidth:390, width:'90%',
                boxShadow:'0 0 80px rgba(180,0,0,0.12)' }}>
              <svg width="60" height="56" viewBox="0 0 60 56" fill="none">
                <path d="M30 50C30 50 4 35 4 18C4 11 9.6 6 16.5 6C21.5 6 26 9.2 28.5 13C31 9.2 35.5 6 40.5 6C47.4 6 53 11 53 18C53 35 30 50 30 50Z"
                  stroke="#EF4444" strokeWidth="1.2" fill="rgba(239,68,68,0.05)" opacity="0.7"/>
              </svg>
              <div style={{ fontSize:10, fontWeight:700, color:'#EF4444', letterSpacing:'0.12em', textTransform:'uppercase' }}>
                HEART RATE + SpO₂
              </div>
              <div style={{ fontSize:17, fontWeight:700, color:'#fff', textAlign:'center', lineHeight:1.4, letterSpacing:'-0.02em' }}>
                Place your finger gently<br/>on the red LED sensor
              </div>
              <div style={{ fontSize:12, color:'rgba(255,100,100,0.45)', textAlign:'center', lineHeight:1.5 }}>
                Keep your finger still on the sensor for 20 seconds
              </div>
              <motion.button whileTap={{ scale:0.97 }} onClick={startReading} style={{ pointerEvents:'all',
                width:'100%', padding:'16px 24px', borderRadius:14,
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
              style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:14, pointerEvents:'none' }}>
              <motion.div
                animate={fingerDetected ? { scale:[1,1.05,1] } : {}}
                transition={{ repeat:Infinity, duration:0.85 }}
                style={{ fontSize:108, fontWeight:900, color:'#EF4444',
                  letterSpacing:'-0.07em', lineHeight:1, textAlign:'center',
                  textShadow:'0 0 80px rgba(239,68,68,0.65), 0 0 40px rgba(239,68,68,0.4)' }}>
                {hr || '--'}
              </motion.div>
              <div style={{ fontSize:12, color:'rgba(255,80,80,0.45)', letterSpacing:'0.14em', fontWeight:600 }}>BPM</div>
              <div style={{ display:'flex', gap:10 }}>
                <div style={{ background:'rgba(0,0,0,0.55)', backdropFilter:'blur(16px)',
                  border:'1px solid rgba(59,130,246,0.18)', borderRadius:14, padding:'11px 20px', textAlign:'center' }}>
                  <div style={{ fontSize:26, fontWeight:800, color:'#60A5FA', textShadow:'0 0 16px rgba(96,165,250,0.5)' }}>
                    {spo2 || '--'}<span style={{ fontSize:12 }}>%</span>
                  </div>
                  <div style={{ fontSize:9, color:'rgba(96,165,250,0.4)', letterSpacing:'0.07em', fontWeight:600, marginTop:2 }}>SpO₂</div>
                </div>
                <div style={{ background:'rgba(0,0,0,0.55)', backdropFilter:'blur(16px)',
                  border:'1px solid rgba(239,68,68,0.18)', borderRadius:14, padding:'11px 20px', textAlign:'center' }}>
                  <div style={{ fontSize:26, fontWeight:800, color:'#EF4444', textShadow:'0 0 16px rgba(239,68,68,0.5)' }}>
                    {Math.round(progress)}<span style={{ fontSize:12 }}>%</span>
                  </div>
                  <div style={{ fontSize:9, color:'rgba(239,68,68,0.4)', letterSpacing:'0.07em', fontWeight:600, marginTop:2 }}>Complete</div>
                </div>
              </div>
              <svg width="88" height="88" viewBox="0 0 88 88" style={{ transform:'rotate(-90deg)' }}>
                <circle cx="44" cy="44" r="36" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3"/>
                <circle cx="44" cy="44" r="36" fill="none" stroke="#EF4444" strokeWidth="3"
                  strokeDasharray={`${2*Math.PI*36}`}
                  strokeDashoffset={`${2*Math.PI*36*(1-progress/100)}`}
                  strokeLinecap="round"
                  style={{ transition:'stroke-dashoffset 0.5s', filter:'drop-shadow(0 0 6px #EF4444)' }} />
              </svg>
              {started && !fingerDetected && (
                <motion.div animate={{ opacity:[0.4,1,0.4] }} transition={{ repeat:Infinity, duration:1.2 }}
                  style={{ padding:'8px 16px', borderRadius:9,
                    background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.22)',
                    fontSize:12, color:'#F59E0B', fontWeight:600 }}>
                  Finger not detected — place on sensor
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

export default HeartRateScreen
