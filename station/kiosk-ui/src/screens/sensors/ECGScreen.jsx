import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useStore from '../../store'
import config from '../../config'

function ECGMonitor({ active, hr }) {
  return (
    <div style={{ width:'100%', height:'100%', backgroundColor:'#000',
      position:'relative', overflow:'hidden', display:'flex', flexDirection:'column' }}>

      <svg style={{ position:'absolute', top:0, left:0, width:'100%', height:'100%' }}>
        <defs>
          <pattern id="smallgrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(0,200,80,0.1)" strokeWidth="0.5"/>
          </pattern>
          <pattern id="biggrid" width="100" height="100" patternUnits="userSpaceOnUse">
            <rect width="100" height="100" fill="url(#smallgrid)"/>
            <path d="M 100 0 L 0 0 0 100" fill="none" stroke="rgba(0,200,80,0.18)" strokeWidth="1"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#biggrid)" />
      </svg>

      <div style={{ position:'absolute', inset:0, pointerEvents:'none',
        background:'radial-gradient(ellipse at 50% 50%, rgba(0,255,136,0.04) 0%, transparent 70%)' }} />

      <div style={{ flex:1, position:'relative', overflow:'hidden' }}>
        <style>{`
          @keyframes ecgScroll {
            from { transform: translateX(0); }
            to   { transform: translateX(-50%); }
          }
          .ecg-scroll {
            animation: ecgScroll ${active ? '2s' : '8s'} linear infinite;
            display: flex; width: 200%;
          }
        `}</style>

        <div className="ecg-scroll" style={{ position:'absolute', top:0, left:0, height:'100%' }}>
          {[0,1].map((copy) => (
            <svg key={copy} width="50%" height="100%" viewBox="0 0 600 160" preserveAspectRatio="none">
              {active ? (
                <g>
                  <line x1="0"   y1="80" x2="80"  y2="80"  stroke="#00FF88" strokeWidth="2.5" strokeLinecap="round"/>
                  <path d="M80,80 C90,80 95,65 100,80" fill="none" stroke="#00FF88" strokeWidth="2.5" strokeLinecap="round"/>
                  <line x1="100" y1="80" x2="130" y2="80"  stroke="#00FF88" strokeWidth="2.5"/>
                  <line x1="130" y1="80" x2="145" y2="95"  stroke="#00FF88" strokeWidth="2.5" strokeLinecap="round"/>
                  <line x1="145" y1="95" x2="155" y2="10"  stroke="#00FF88" strokeWidth="3.5"
                    style={{ filter:'drop-shadow(0 0 6px #00FF88)' }} strokeLinecap="round"/>
                  <line x1="155" y1="10" x2="165" y2="130" stroke="#00FF88" strokeWidth="3.5" strokeLinecap="round"/>
                  <line x1="165" y1="130" x2="180" y2="80" stroke="#00FF88" strokeWidth="2.5" strokeLinecap="round"/>
                  <line x1="180" y1="80" x2="210" y2="80"  stroke="#00FF88" strokeWidth="2.5"/>
                  <path d="M210,80 C225,80 235,40 250,40 C265,40 275,80 290,80" fill="none" stroke="#00FF88" strokeWidth="2.5" strokeLinecap="round"/>
                  <line x1="290" y1="80" x2="600" y2="80"  stroke="#00FF88" strokeWidth="2.5"/>
                </g>
              ) : (
                <path d={`M0,80 C50,80 100,${75+copy*2},150,80 C200,85 250,80 300,80 C350,75 400,80 450,80 C500,85 550,80 600,80`}
                  fill="none" stroke="rgba(0,255,136,0.3)" strokeWidth="1.5" strokeLinecap="round"/>
              )}
            </svg>
          ))}
        </div>

        {hr && (
          <div style={{ position:'absolute', top:16, right:24, textAlign:'right', zIndex:10 }}>
            <motion.div animate={{ scale:[1,1.05,1] }} transition={{ repeat:Infinity, duration:0.85 }}
              style={{ fontSize:64, fontWeight:900, color:'#00FF88', lineHeight:1,
                textShadow:'0 0 30px rgba(0,255,136,0.6)' }}>{hr}</motion.div>
            <div style={{ color:'#4ade80', fontSize:13, fontWeight:700, letterSpacing:3 }}>BPM</div>
          </div>
        )}

        <div style={{ position:'absolute', top:16, left:24, zIndex:10 }}>
          <div style={{ fontSize:11, fontWeight:700, color:'rgba(0,255,136,0.5)', letterSpacing:'0.12em' }}>ECG</div>
          <motion.div animate={{ opacity: active ? [0.6,1,0.6] : 1 }} transition={{ repeat:Infinity, duration:1.2 }}
            style={{ fontSize:12, color: active ? '#4ade80' : '#6b7280', fontWeight:600, marginTop:2 }}>
            {active ? '● LIVE' : '○ NO SIGNAL'}
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {!active && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            style={{ position:'absolute', bottom:70, left:0, right:0,
              display:'flex', justifyContent:'center', zIndex:10 }}>
            <motion.div animate={{ opacity:[0.6,1,0.6] }} transition={{ repeat:Infinity, duration:1.2 }}
              style={{ background:'rgba(245,158,11,0.12)', border:'1px solid rgba(245,158,11,0.4)',
                borderRadius:12, padding:'10px 24px', color:'#f59e0b', fontSize:15, fontWeight:700 }}>
              Place both palms on the ECG pads
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ECGScreen({ onNext }) {
  const setReading = useStore((s) => s.setReading)
  const [phase, setPhase]         = useState('ready')
  const [hasSignal, setHasSignal] = useState(false)
  const [hr, setHr]               = useState(null)
  const [countdown, setCountdown] = useState(7)
  const [done, setDone]           = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const pollRef           = useRef(null)
  const timerRef          = useRef(null)
  const countdownRef      = useRef(7)
  const doneRef           = useRef(false)
  const signalDebounceRef = useRef(null)
  const stableSignalRef   = useRef(false)
  const hasSignalRef      = useRef(false)

  function startReading() {
    setPhase('reading')
    setDone(false); doneRef.current = false
    setCountdown(7); countdownRef.current = 7

    pollRef.current = setInterval(async () => {
      try {
        const res  = await fetch(`${config.LOCAL_URL}/api/sensors/live`)
        const data = await res.json()
        const leadsOn = data.leads_connected === true
        if (leadsOn !== stableSignalRef.current) {
          clearTimeout(signalDebounceRef.current)
          signalDebounceRef.current = setTimeout(() => {
            stableSignalRef.current = leadsOn
            hasSignalRef.current    = leadsOn
            setHasSignal(leadsOn)
          }, 1500)
        }
        if (data.hr && data.hr > 30 && data.hr < 200) setHr(data.hr)
      } catch (e) {}
    }, 300)

    timerRef.current = setInterval(() => {
      if (!hasSignalRef.current) return
      countdownRef.current -= 1
      setCountdown(countdownRef.current)
      if (countdownRef.current <= 0) {
        clearInterval(timerRef.current); clearInterval(pollRef.current)
        if (!doneRef.current) {
          doneRef.current = true; setDone(true)
          setReading('ecg', 'recorded')
          setTimeout(onNext, 2000)
        }
      }
    }, 1000)
  }

  useEffect(() => {
    return () => { clearInterval(pollRef.current); clearInterval(timerRef.current) }
  }, [])

  function handleSkip() {
    clearInterval(pollRef.current); clearInterval(timerRef.current)
    setReading('ecg', null); onNext()
  }

  if (phase === 'ready') {
    return (
      <div style={{ width:'100vw', height:'100vh', position:'relative', overflow:'hidden',
        background:'radial-gradient(ellipse at 30% 20%, #031a0e 0%, #040F08 55%, #020a05 100%)',
        display:'flex', flexDirection:'column' }}>

        <div style={{ position:'absolute', inset:0, pointerEvents:'none',
          background:'radial-gradient(ellipse at 50% 45%, rgba(0,180,80,0.09) 0%, transparent 65%)' }} />

        {/* TOP BAR */}
        <div style={{ height:56, flexShrink:0, zIndex:20,
          background:'rgba(0,0,0,0.65)', backdropFilter:'blur(20px)',
          borderBottom:'1px solid rgba(34,197,94,0.12)',
          display:'flex', alignItems:'center', padding:'0 28px', gap:14 }}>
          <motion.div animate={{ scale:[1,1.5,1], opacity:[0.5,1,0.5] }}
            transition={{ repeat:Infinity, duration:1.2 }}
            style={{ width:8, height:8, borderRadius:'50%', background:'#22C55E', boxShadow:'0 0 14px #22C55E' }} />
          <div style={{ flex:1 }}>
            <div style={{ fontSize:14, fontWeight:700, color:'#fff', letterSpacing:'-0.02em' }}>Place both palms on the ECG pads</div>
            <div style={{ fontSize:10, color:'rgba(34,197,94,0.45)' }}>Left palm on left pad · Right palm on right pad</div>
          </div>
          <div style={{ background:'rgba(34,197,94,0.1)', border:'1px solid rgba(34,197,94,0.22)',
            borderRadius:99, padding:'5px 14px', fontSize:11, fontWeight:700, color:'#22C55E' }}>4 / 5</div>
        </div>

        {/* STEP TRACK */}
        <div style={{ display:'flex', gap:5, padding:'10px 28px 0', flexShrink:0, zIndex:20 }}>
          {['#8B5CF6','#EF4444','#F59E0B','#22C55E','#6366F1'].map((c,i) => (
            <div key={i} style={{ flex:1, height:3, borderRadius:99,
              background: i < 3 ? 'rgba(255,255,255,0.3)' : i===3 ? '#22C55E' : 'rgba(255,255,255,0.07)',
              boxShadow: i===3 ? '0 0 10px #22C55E' : 'none' }} />
          ))}
        </div>

        <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'0 28px' }}>
          <motion.div
            initial={{ opacity:0, y:20, scale:0.96 }} animate={{ opacity:1, y:0, scale:1 }}
            transition={{ duration:0.45 }}
            style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:16,
              background:'rgba(2,10,5,0.75)', backdropFilter:'blur(32px)',
              border:'1px solid rgba(34,197,94,0.18)', borderRadius:28,
              padding:'28px 36px', maxWidth:400, width:'100%',
              boxShadow:'0 0 80px rgba(0,160,60,0.1)' }}>

            <svg width="120" height="52" viewBox="0 0 120 52" fill="none">
              <line x1="0"  y1="26" x2="25" y2="26" stroke="#22C55E" strokeWidth="2" opacity="0.6"/>
              <line x1="25" y1="26" x2="32" y2="36" stroke="#22C55E" strokeWidth="2" opacity="0.7"/>
              <line x1="32" y1="36" x2="40" y2="4"  stroke="#22C55E" strokeWidth="2.5"
                style={{ filter:'drop-shadow(0 0 4px #22C55E)' }} opacity="0.9"/>
              <line x1="40" y1="4"  x2="48" y2="46" stroke="#22C55E" strokeWidth="2.5" opacity="0.9"/>
              <line x1="48" y1="46" x2="56" y2="26" stroke="#22C55E" strokeWidth="2" opacity="0.7"/>
              <path d="M56,26 C62,26 66,14 72,14 C78,14 82,26 88,26" fill="none" stroke="#22C55E" strokeWidth="2" opacity="0.6"/>
              <line x1="88" y1="26" x2="120" y2="26" stroke="#22C55E" strokeWidth="2" opacity="0.6"/>
            </svg>

            <div style={{ fontSize:10, fontWeight:700, color:'#22C55E', letterSpacing:'0.12em', textTransform:'uppercase' }}>
              ECG · ELECTROCARDIOGRAM
            </div>
            <div style={{ fontSize:17, fontWeight:700, color:'#fff', textAlign:'center', lineHeight:1.4, letterSpacing:'-0.02em' }}>
              Place both palms on<br/>the copper pads
            </div>
            <div style={{ fontSize:12, color:'rgba(34,197,94,0.45)', textAlign:'center', lineHeight:1.5 }}>
              Left palm on left pad · Right palm on right pad · Stay still
            </div>

            {retryCount > 0 && (
              <div style={{ padding:'6px 14px', borderRadius:99,
                background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.3)',
                fontSize:11, color:'#F59E0B', fontWeight:600 }}>
                Retry {retryCount}/3
              </div>
            )}

            <motion.button whileTap={{ scale:0.97 }} onClick={startReading}
              style={{ width:'100%', padding:'16px 24px', borderRadius:14,
                background:'#fff', border:'none', cursor:'pointer',
                fontSize:16, fontWeight:700, color:'#0A0A0F',
                display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
              <motion.div animate={{ scale:[1,1.3,1] }} transition={{ repeat:Infinity, duration:1.3 }}
                style={{ width:9, height:9, borderRadius:'50%', background:'#22C55E', boxShadow:'0 0 10px #22C55E' }} />
              I'm Ready
            </motion.button>

            {retryCount >= 3 && (
              <button onClick={handleSkip} style={{ background:'none', border:'none', cursor:'pointer',
                fontSize:11, color:'rgba(255,255,255,0.2)', fontWeight:500 }}>
                Skip this step
              </button>
            )}
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ width:'100vw', height:'100vh', position:'relative', display:'flex', flexDirection:'column', background:'#000' }}>

      {/* TOP BAR */}
      <div style={{ height:56, flexShrink:0, zIndex:20,
        background:'rgba(0,0,0,0.75)', backdropFilter:'blur(20px)',
        borderBottom:'1px solid rgba(34,197,94,0.15)',
        display:'flex', alignItems:'center', padding:'0 28px', gap:14 }}>
        <motion.div animate={{ scale:[1,1.5,1], opacity:[0.5,1,0.5] }}
          transition={{ repeat:Infinity, duration: hasSignal ? 0.85 : 1.4 }}
          style={{ width:8, height:8, borderRadius:'50%',
            background: hasSignal ? '#22C55E' : '#F59E0B',
            boxShadow:`0 0 14px ${hasSignal ? '#22C55E' : '#F59E0B'}` }} />
        <div style={{ flex:1 }}>
          <div style={{ fontSize:14, fontWeight:700, color:'#fff', letterSpacing:'-0.02em' }}>
            {hasSignal ? 'ECG recording in progress' : 'Place palms on the pads'}
          </div>
          <div style={{ fontSize:10, color: hasSignal ? 'rgba(34,197,94,0.5)' : 'rgba(245,158,11,0.5)' }}>
            {hasSignal ? 'Keep palms still · Recording in progress' : 'Place both palms on copper pads'}
          </div>
        </div>
        <div style={{ background:'rgba(34,197,94,0.1)', border:'1px solid rgba(34,197,94,0.22)',
          borderRadius:99, padding:'5px 14px', fontSize:11, fontWeight:700, color:'#22C55E' }}>4 / 5</div>
      </div>

      {/* STEP TRACK */}
      <div style={{ display:'flex', gap:5, padding:'10px 28px 0', flexShrink:0, zIndex:20,
        background:'rgba(0,0,0,0.6)', backdropFilter:'blur(10px)' }}>
        {['#8B5CF6','#EF4444','#F59E0B','#22C55E','#6366F1'].map((c,i) => (
          <div key={i} style={{ flex:1, height:3, borderRadius:99,
            background: i < 3 ? 'rgba(255,255,255,0.3)' : i===3 ? '#22C55E' : 'rgba(255,255,255,0.07)',
            boxShadow: i===3 ? '0 0 10px #22C55E' : 'none' }} />
        ))}
      </div>

      <div style={{ flex:1, minHeight:0 }}>
        <ECGMonitor active={hasSignal} hr={hr} />
      </div>

      {/* BOTTOM STATUS BAR */}
      <div style={{ flexShrink:0, zIndex:20,
        background:'rgba(0,0,0,0.8)', backdropFilter:'blur(20px)',
        borderTop:'1px solid rgba(34,197,94,0.12)',
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'14px 28px' }}>

        <div>
          <div style={{ fontSize:15, fontWeight:700, color: hasSignal ? '#4ade80' : '#f59e0b' }}>
            {hasSignal ? '● ECG recording' : '○ Waiting for signal'}
          </div>
          <div style={{ fontSize:12, color:'rgba(255,255,255,0.3)', marginTop:2 }}>
            {hasSignal ? 'Keep palms still' : 'Place palms on the pads'}
          </div>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          {done ? (
            <motion.div initial={{ scale:0 }} animate={{ scale:1 }} transition={{ type:'spring', stiffness:280 }}
              style={{ width:52, height:52, borderRadius:'50%', background:'#22C55E',
                display:'flex', alignItems:'center', justifyContent:'center',
                boxShadow:'0 0 40px rgba(34,197,94,0.7)' }}>
              <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
                <path d="M4 13l6 6L22 7" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </motion.div>
          ) : (
            <div style={{ textAlign:'center' }}>
              <div style={{ width:52, height:52, borderRadius:'50%',
                border:`3px solid ${hasSignal ? '#22c55e' : '#374151'}`,
                display:'flex', alignItems:'center', justifyContent:'center',
                background:'rgba(0,0,0,0.4)',
                boxShadow: hasSignal ? '0 0 20px rgba(34,197,94,0.4)' : 'none' }}>
                <span style={{ color: hasSignal ? '#4ade80' : '#6b7280', fontWeight:800, fontSize:16 }}>
                  {countdown}
                </span>
              </div>
              <div style={{ color:'rgba(255,255,255,0.3)', fontSize:10, marginTop:3, fontWeight:600 }}>sec</div>
            </div>
          )}

          <motion.button whileTap={{ scale:0.95 }} onClick={handleSkip}
            style={{ padding:'10px 18px', borderRadius:10,
              background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)',
              color:'rgba(255,255,255,0.35)', fontSize:13, fontWeight:600, cursor:'pointer' }}>
            Skip
          </motion.button>
        </div>
      </div>
    </div>
  )
}

export default ECGScreen
