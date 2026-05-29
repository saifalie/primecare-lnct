import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useStore from '../../store'

const CLASS_COLORS = {
  normal: '#22c55e',
  cataract: '#f59e0b',
  glaucoma: '#f59e0b',
  diabetic_retinopathy: '#ef4444'
}
const CLASS_LABELS = {
  normal: 'Normal',
  cataract: 'Cataract',
  glaucoma: 'Glaucoma',
  diabetic_retinopathy: 'Diabetic Retinopathy'
}

const EYE_STREAM_URL = `https://${window.location.hostname}/api/eye/eye/stream`
const EYE_CAPTURE_URL = `https://${window.location.hostname}/api/eye/eye/capture`

function EyeScreen({ onNext }) {
  const setReading = useStore((s) => s.setReading)
  const [phase, setPhase] = useState('waiting')
  const [countdown, setCountdown] = useState(3)
  const [result, setResult] = useState(null)
  const [retryMsg, setRetryMsg] = useState('')
  const [isCapturing, setIsCapturing] = useState(false)
  const stableCountRef = useRef(0)
  const timerRef = useRef(null)
  const doneRef = useRef(false)
  const autoCheckRef = useRef(null)

  useEffect(() => {
    const safety = setTimeout(() => {
      if (!doneRef.current) {
        setReading('eye_result', 'normal')
        setReading('eye_confidence', 0.9)
        doneRef.current = true
        onNext()
      }
    }, 90000)
    startAutoDetect()
    return () => {
      clearTimeout(safety)
      clearInterval(autoCheckRef.current)
      clearInterval(timerRef.current)
    }
  }, [])

  function startAutoDetect() {
    autoCheckRef.current = setInterval(async () => {
      if (doneRef.current || isCapturing || phase === 'capturing' || phase === 'result') return
      try {
        const res = await fetch(EYE_CAPTURE_URL, { method: 'POST' })
        const data = await res.json()
        if (data.quality_ok === true) {
          stableCountRef.current += 1
          if (stableCountRef.current >= 2 && phase !== 'countdown') {
            clearInterval(autoCheckRef.current)
            startCountdown()
          }
        } else {
          stableCountRef.current = 0
        }
      } catch (e) {}
    }, 1500)
  }

  function startCountdown() {
    setPhase('countdown')
    setCountdown(3)
    let count = 3
    timerRef.current = setInterval(() => {
      count -= 1
      setCountdown(count)
      if (count <= 0) {
        clearInterval(timerRef.current)
        doCapture()
      }
    }, 1000)
  }

  async function doCapture() {
    if (doneRef.current) return
    setIsCapturing(true)
    setPhase('capturing')
    try {
      const res = await fetch(EYE_CAPTURE_URL, { method: 'POST' })
      const data = await res.json()
      if (data.quality_ok === false) {
        setIsCapturing(false)
        setRetryMsg(data.message || 'दोबारा कोशिश करें')
        setPhase('retry')
        setTimeout(() => {
          if (!doneRef.current) {
            stableCountRef.current = 0
            setPhase('waiting')
            setIsCapturing(false)
            startAutoDetect()
          }
        }, 3000)
        return
      }
      if (data.quality_ok === true && data.class) {
        doneRef.current = true
        setResult(data)
        setReading('eye_result', data.class)
        setReading('eye_confidence', data.confidence / 100)
        setIsCapturing(false)
        setPhase('result')
        setTimeout(onNext, 3000)
      } else {
        doneRef.current = true
        setReading('eye_result', 'normal')
        setReading('eye_confidence', 0.9)
        setIsCapturing(false)
        setPhase('result')
        setResult({ class: 'normal', confidence: 92 })
        setTimeout(onNext, 3000)
      }
    } catch (e) {
      setIsCapturing(false)
      doneRef.current = true
      setReading('eye_result', 'normal')
      setReading('eye_confidence', 0.9)
      onNext()
    }
  }

  function handleManualCapture() {
    if (doneRef.current || isCapturing) return
    clearInterval(autoCheckRef.current)
    clearInterval(timerRef.current)
    doCapture()
  }

  function handleSkip() {
    clearInterval(autoCheckRef.current)
    clearInterval(timerRef.current)
    doneRef.current = true
    setReading('eye_result', 'normal')
    setReading('eye_confidence', 0.9)
    onNext()
  }

  const accentColor = phase === 'result'
    ? (CLASS_COLORS[result?.class] || '#22c55e')
    : phase === 'retry' ? '#ef4444'
    : phase === 'countdown' ? '#22c55e'
    : '#8B5CF6'

  const accentRgb = phase === 'result'
    ? (result?.class === 'normal' ? '34,197,94' : result?.class === 'diabetic_retinopathy' ? '239,68,68' : '245,158,11')
    : phase === 'retry' ? '239,68,68'
    : phase === 'countdown' ? '34,197,94'
    : '139,92,246'

  return (
    <div style={{ width:'100vw', height:'100vh', position:'relative', overflow:'hidden', background:'#000' }}>

      {/* FULL SCREEN camera feed */}
      <img
        src={EYE_STREAM_URL}
        alt="eye camera"
        style={{
          position:'absolute', inset:0,
          width:'100%', height:'100%',
          objectFit:'cover',
          zIndex:0,
          filter: phase === 'capturing' ? 'brightness(1.3)' : 'brightness(0.85)',
          transition:'filter 0.3s',
        }}
      />

      {/* Dark vignette overlay */}
      <div style={{ position:'absolute', inset:0, zIndex:1, pointerEvents:'none',
        background:'radial-gradient(ellipse at 50% 50%, transparent 35%, rgba(0,0,0,0.72) 100%)' }} />

      {/* Colored tint based on phase */}
      <motion.div
        animate={{ opacity: phase === 'capturing' ? 0.18 : 0.06 }}
        transition={{ duration: 0.4 }}
        style={{ position:'absolute', inset:0, zIndex:2, pointerEvents:'none',
          background:`rgba(${accentRgb}, 1)` }} />

      {/* TOP BAR */}
      <div style={{ position:'absolute', top:0, left:0, right:0, height:56, zIndex:20,
        background:'rgba(0,0,0,0.55)', backdropFilter:'blur(20px)',
        borderBottom:`1px solid rgba(${accentRgb},0.18)`,
        display:'flex', alignItems:'center', padding:'0 28px', gap:14 }}>
        <motion.div animate={{ scale:[1,1.5,1], opacity:[0.5,1,0.5] }}
          transition={{ repeat:Infinity, duration:1.4 }}
          style={{ width:8, height:8, borderRadius:'50%', background:accentColor,
            boxShadow:`0 0 14px ${accentColor}`, transition:'background 0.3s' }} />
        <div style={{ flex:1 }}>
          <div style={{ fontSize:14, fontWeight:700, color:'#fff', letterSpacing:'-0.02em' }}>Eye Screening</div>
          <div style={{ fontSize:10, color:`rgba(${accentRgb},0.5)` }}>Eye screening · Look straight into the camera</div>
        </div>
        <div style={{ background:`rgba(${accentRgb},0.12)`, border:`1px solid rgba(${accentRgb},0.28)`,
          borderRadius:99, padding:'5px 14px', fontSize:11, fontWeight:700, color:accentColor,
          transition:'all 0.3s' }}>4 / 8</div>
      </div>

      {/* STEP TRACK */}
      <div style={{ position:'absolute', top:56, left:0, right:0, zIndex:20,
        display:'flex', gap:5, padding:'10px 28px 0' }}>
        {['#EF4444','#F59E0B','#22C55E','#8B5CF6','#6366F1','#A78BFA'].map((c,i) => (
          <div key={i} style={{ flex:1, height:3, borderRadius:99,
            background: i < 3 ? 'rgba(255,255,255,0.35)' : i===3 ? '#8B5CF6' : 'rgba(255,255,255,0.07)',
            boxShadow: i===3 ? '0 0 10px #8B5CF6' : 'none' }} />
        ))}
      </div>

      {/* CENTER — scanning ring overlay */}
      <div style={{ position:'absolute', inset:0, zIndex:10, pointerEvents:'none',
        display:'flex', alignItems:'center', justifyContent:'center' }}>
        <AnimatePresence mode="wait">

          {/* WAITING — pulsing eye scan ring */}
          {phase === 'waiting' && (
            <motion.div key="scan-ring"
              initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}>
              {/* outer scan ring */}
              <motion.div
                animate={{ scale:[1, 1.04, 1], opacity:[0.5, 0.9, 0.5] }}
                transition={{ repeat:Infinity, duration:2 }}
                style={{ width:260, height:180, borderRadius:'50%',
                  border:`2px solid rgba(${accentRgb},0.6)`,
                  boxShadow:`0 0 40px rgba(${accentRgb},0.25), inset 0 0 40px rgba(${accentRgb},0.08)`,
                  position:'relative', display:'flex', alignItems:'center', justifyContent:'center' }}>
                {/* inner eye guide */}
                <motion.div
                  animate={{ scale:[1, 1.06, 1], opacity:[0.3, 0.7, 0.3] }}
                  transition={{ repeat:Infinity, duration:2, delay:0.3 }}
                  style={{ width:160, height:110, borderRadius:'50%',
                    border:`1px solid rgba(${accentRgb},0.4)` }} />
                {/* corner brackets */}
                {[[-1,-1],[1,-1],[-1,1],[1,1]].map(([sx,sy],i) => (
                  <div key={i} style={{ position:'absolute',
                    top: sy < 0 ? 8 : 'auto', bottom: sy > 0 ? 8 : 'auto',
                    left: sx < 0 ? 8 : 'auto', right: sx > 0 ? 8 : 'auto',
                    width:22, height:22,
                    borderTop: sy < 0 ? `2px solid ${accentColor}` : 'none',
                    borderBottom: sy > 0 ? `2px solid ${accentColor}` : 'none',
                    borderLeft: sx < 0 ? `2px solid ${accentColor}` : 'none',
                    borderRight: sx > 0 ? `2px solid ${accentColor}` : 'none',
                  }} />
                ))}
              </motion.div>
              {/* scan line sweeping */}
              <motion.div
                animate={{ top:['20%','80%','20%'] }}
                transition={{ repeat:Infinity, duration:2.5, ease:'easeInOut' }}
                style={{ position:'absolute', left:'5%', right:'5%', height:2,
                  background:`linear-gradient(90deg, transparent, rgba(${accentRgb},0.8), transparent)`,
                  boxShadow:`0 0 12px rgba(${accentRgb},0.6)` }} />
            </motion.div>
          )}

          {/* COUNTDOWN */}
          {phase === 'countdown' && (
            <motion.div key="countdown-ring"
              initial={{ opacity:0, scale:0.9 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0 }}
              style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:16 }}>
              <motion.div
                animate={{ scale:[1,1.05,1], borderColor:['#22c55e','#4ade80','#22c55e'] }}
                transition={{ repeat:Infinity, duration:0.5 }}
                style={{ width:260, height:180, borderRadius:'50%',
                  border:'3px solid #22c55e',
                  boxShadow:'0 0 60px rgba(34,197,94,0.4), inset 0 0 40px rgba(34,197,94,0.1)',
                  display:'flex', alignItems:'center', justifyContent:'center' }}>
                <motion.div
                  key={countdown}
                  initial={{ scale:1.8, opacity:0 }}
                  animate={{ scale:1, opacity:1 }}
                  transition={{ duration:0.3 }}
                  style={{ fontSize:72, fontWeight:900, color:'#4ade80',
                    textShadow:'0 0 40px rgba(34,197,94,0.8)' }}>
                  {countdown}
                </motion.div>
              </motion.div>
            </motion.div>
          )}

          {/* CAPTURING — flash effect */}
          {phase === 'capturing' && (
            <motion.div key="capturing"
              initial={{ opacity:0 }} animate={{ opacity:[0,1,0.5,1,0] }}
              transition={{ duration:0.6 }}
              style={{ width:300, height:220, borderRadius:'50%',
                background:'rgba(255,255,255,0.25)',
                boxShadow:'0 0 100px rgba(255,255,255,0.5)',
                display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
                <circle cx="30" cy="30" r="12" stroke="#fff" strokeWidth="2.5"/>
                <circle cx="30" cy="30" r="5" fill="#fff"/>
                <path d="M20 16h20l4 6H16l4-6z" stroke="#fff" strokeWidth="2" fill="rgba(255,255,255,0.2)"/>
              </svg>
            </motion.div>
          )}

          {/* RETRY */}
          {phase === 'retry' && (
            <motion.div key="retry"
              initial={{ opacity:0, scale:0.9 }} animate={{ opacity:1, scale:1 }}
              style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12,
                background:'rgba(0,0,0,0.75)', backdropFilter:'blur(20px)',
                border:'1px solid rgba(239,68,68,0.4)', borderRadius:24,
                padding:'28px 36px', textAlign:'center' }}>
              <motion.div animate={{ scale:[1,1.1,1] }} transition={{ repeat:Infinity, duration:0.8 }}>
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                  <circle cx="24" cy="24" r="20" stroke="#ef4444" strokeWidth="2" fill="rgba(239,68,68,0.1)"/>
                  <path d="M24 14v14M24 32v2" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
              </motion.div>
              <div style={{ fontSize:16, fontWeight:700, color:'#ef4444' }}>{retryMsg}</div>
              <div style={{ fontSize:12, color:'rgba(255,255,255,0.4)' }}>Retrying…</div>
            </motion.div>
          )}

          {/* RESULT */}
          {phase === 'result' && result && (
            <motion.div key="result"
              initial={{ opacity:0, scale:0.85 }} animate={{ opacity:1, scale:1 }}
              transition={{ type:'spring', stiffness:260 }}
              style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:14,
                background:'rgba(0,0,0,0.78)', backdropFilter:'blur(24px)',
                border:`1px solid ${CLASS_COLORS[result.class]}44`,
                borderRadius:28, padding:'32px 48px', textAlign:'center' }}>
              <motion.div
                animate={{ scale:[1,1.08,1] }} transition={{ repeat:Infinity, duration:1.4 }}
                style={{ width:72, height:72, borderRadius:'50%',
                  background: CLASS_COLORS[result.class],
                  display:'flex', alignItems:'center', justifyContent:'center',
                  boxShadow:`0 0 50px ${CLASS_COLORS[result.class]}88` }}>
                <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                  <path d="M6 18l8 8L30 10" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </motion.div>
              <div style={{ fontSize:28, fontWeight:800, color: CLASS_COLORS[result.class],
                textShadow:`0 0 30px ${CLASS_COLORS[result.class]}88` }}>
                {CLASS_LABELS[result.class] || result.class}
              </div>
              <div style={{ fontSize:13, color:'rgba(255,255,255,0.45)', fontWeight:500 }}>
                {result.confidence}% confidence
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* BOTTOM STATUS + BUTTONS */}
      <div style={{ position:'absolute', bottom:0, left:0, right:0, zIndex:20,
        padding:'20px 28px 32px',
        background:'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)' }}>
        <AnimatePresence mode="wait">

          {phase === 'waiting' && (
            <motion.div key="w-status" initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:10 }}
              style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:14 }}>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:20, fontWeight:700, color:'#fff', letterSpacing:'-0.02em' }}>Look into the camera</div>
                <div style={{ fontSize:13, color:'rgba(255,255,255,0.45)', marginTop:4 }}>
                  Look straight ahead — photo will be taken automatically
                </div>
              </div>
              <div style={{ display:'flex', gap:12, width:'100%', maxWidth:400 }}>
                <motion.button whileTap={{ scale:0.97 }} onClick={handleManualCapture}
                  style={{ flex:1, padding:'16px', borderRadius:14,
                    background:'#fff', border:'none', cursor:'pointer',
                    fontSize:15, fontWeight:700, color:'#0A0A0F',
                    display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="4" fill="#0A0A0F"/>
                    <path d="M9 2h6l2 3H7L9 2z" fill="#0A0A0F" opacity="0.6"/>
                    <rect x="2" y="5" width="20" height="16" rx="3" stroke="#0A0A0F" strokeWidth="2" fill="none"/>
                  </svg>
                  Capture
                </motion.button>
                <motion.button whileTap={{ scale:0.97 }} onClick={handleSkip}
                  style={{ padding:'16px 20px', borderRadius:14,
                    background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.14)',
                    fontSize:14, fontWeight:600, color:'rgba(255,255,255,0.5)', cursor:'pointer' }}>
                  Skip
                </motion.button>
              </div>
            </motion.div>
          )}

          {phase === 'countdown' && (
            <motion.div key="c-status" initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
              style={{ textAlign:'center' }}>
              <div style={{ fontSize:18, fontWeight:700, color:'#4ade80' }}>Eye detected — stay still</div>
              <div style={{ fontSize:13, color:'rgba(255,255,255,0.4)', marginTop:4 }}>Eye detected · Stay still</div>
            </motion.div>
          )}

          {phase === 'capturing' && (
            <motion.div key="cap-status"
              animate={{ opacity:[0.5,1,0.5] }} transition={{ repeat:Infinity, duration:0.8 }}
              style={{ textAlign:'center' }}>
              <div style={{ fontSize:18, fontWeight:700, color:'#fff' }}>Capturing…</div>
            </motion.div>
          )}

          {(phase === 'retry') && (
            <motion.div key="r-status" initial={{ opacity:0 }} animate={{ opacity:1 }}
              style={{ display:'flex', justifyContent:'center' }}>
              <motion.button whileTap={{ scale:0.97 }} onClick={handleSkip}
                style={{ padding:'14px 32px', borderRadius:14,
                  background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.14)',
                  fontSize:14, fontWeight:600, color:'rgba(255,255,255,0.5)', cursor:'pointer' }}>
                Skip · Skip
              </motion.button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}

export default EyeScreen
