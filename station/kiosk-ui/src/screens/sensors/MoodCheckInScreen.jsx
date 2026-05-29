import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useStore from '../../store'

const MOODS = [
  { score: 1, emoji: '😞', label: 'Very Low', color: '#EF4444' },
  { score: 2, emoji: '😟', label: 'Low',      color: '#F97316' },
  { score: 3, emoji: '😐', label: 'Okay',     color: '#F59E0B' },
  { score: 4, emoji: '🙂', label: 'Good',     color: '#84CC16' },
  { score: 5, emoji: '😊', label: 'Great',    color: '#22C55E' },
]

const SLEEP_OPTIONS = [
  { value: 'poor',      label: 'Poor',      color: '#EF4444' },
  { value: 'fair',      label: 'Fair',      color: '#F59E0B' },
  { value: 'good',      label: 'Good',      color: '#84CC16' },
  { value: 'excellent', label: 'Excellent', color: '#22C55E' },
]

function MoodCheckInScreen({ onNext }) {
  const setReading = useStore((s) => s.setReading)
  const [phase, setPhase] = useState('mood') // 'mood' | 'sleep' | 'done'
  const [selectedMood, setSelectedMood] = useState(null)
  const [selectedSleep, setSelectedSleep] = useState(null)

  function handleMoodSelect(mood) {
    setSelectedMood(mood)
    setReading('mood_score', mood.score)
    // Short pause then advance to sleep question
    setTimeout(() => setPhase('sleep'), 600)
  }

  function handleSleepSelect(sleep) {
    setSelectedSleep(sleep)
    setReading('sleep_quality', sleep.value)
    setPhase('done')
    setTimeout(onNext, 900)
  }

  return (
    <div style={{
      width: '100vw', height: '100vh', overflow: 'hidden',
      background: 'radial-gradient(ellipse at 50% 30%, #0d0d2b 0%, #0A0A0F 65%)',
      display: 'flex', flexDirection: 'column',
      fontFamily: 'Inter, sans-serif',
    }}>

      {/* TOP BAR */}
      <div style={{
        height: 56, flexShrink: 0, zIndex: 20,
        background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(99,102,241,0.12)',
        display: 'flex', alignItems: 'center', padding: '0 28px', gap: 14,
      }}>
        <motion.div
          animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 2 }}
          style={{ width: 8, height: 8, borderRadius: '50%',
            background: '#6366F1', boxShadow: '0 0 14px #6366F1' }}
        />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>
            Almost done — just two quick questions
          </div>
          <div style={{ fontSize: 10, color: 'rgba(99,102,241,0.5)' }}>
            Mood check-in · Helps personalise your AI analysis
          </div>
        </div>
        <div style={{
          background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.22)',
          borderRadius: 99, padding: '5px 14px', fontSize: 11, fontWeight: 700, color: '#6366F1',
        }}>5 / 5</div>
      </div>

      {/* STEP TRACK */}
      <div style={{ display: 'flex', gap: 5, padding: '10px 28px 0', flexShrink: 0 }}>
        {['#8B5CF6','#EF4444','#F59E0B','#22C55E','#6366F1'].map((c, i) => (
          <div key={i} style={{
            flex: 1, height: 3, borderRadius: 99,
            background: i < 4 ? 'rgba(255,255,255,0.3)' : '#6366F1',
            boxShadow: i === 4 ? '0 0 10px #6366F1' : 'none',
          }} />
        ))}
      </div>

      {/* MAIN CONTENT */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '20px 48px',
      }}>
        <AnimatePresence mode="wait">

          {/* MOOD QUESTION */}
          {phase === 'mood' && (
            <motion.div key="mood"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -24 }}
              transition={{ duration: 0.4 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32, width: '100%', maxWidth: 700 }}
            >
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)',
                  letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
                  Question 1 of 2
                </div>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#F8FAFC',
                  letterSpacing: '-0.03em', lineHeight: 1.2 }}>
                  How are you feeling today?
                </div>
              </div>

              {/* Emoji row */}
              <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
                {MOODS.map((mood, i) => (
                  <motion.button
                    key={mood.score}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.07, duration: 0.35 }}
                    whileHover={{ y: -6, scale: 1.08 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleMoodSelect(mood)}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                      background: selectedMood?.score === mood.score
                        ? `${mood.color}20` : 'rgba(255,255,255,0.04)',
                      border: `2px solid ${selectedMood?.score === mood.score
                        ? mood.color : 'rgba(255,255,255,0.08)'}`,
                      borderRadius: 20, padding: '20px 18px',
                      cursor: 'pointer', transition: 'all 0.2s ease',
                      minWidth: 100,
                      boxShadow: selectedMood?.score === mood.score
                        ? `0 0 20px ${mood.color}40` : 'none',
                      fontFamily: 'inherit',
                    }}
                  >
                    <span style={{ fontSize: 48, lineHeight: 1 }}>{mood.emoji}</span>
                    <span style={{
                      fontSize: 13, fontWeight: 700,
                      color: selectedMood?.score === mood.score
                        ? mood.color : 'rgba(255,255,255,0.4)',
                    }}>
                      {mood.label}
                    </span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* SLEEP QUESTION */}
          {phase === 'sleep' && (
            <motion.div key="sleep"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -24 }}
              transition={{ duration: 0.4 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32, width: '100%', maxWidth: 600 }}
            >
              {/* Mood confirmed pill */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: `${selectedMood.color}18`,
                  border: `1px solid ${selectedMood.color}40`,
                  borderRadius: 99, padding: '6px 16px',
                }}
              >
                <span style={{ fontSize: 18 }}>{selectedMood.emoji}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: selectedMood.color }}>
                  Feeling {selectedMood.label}
                </span>
                <span style={{ fontSize: 13, color: '#22C55E', marginLeft: 4 }}>✓</span>
              </motion.div>

              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)',
                  letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
                  Question 2 of 2
                </div>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#F8FAFC',
                  letterSpacing: '-0.03em', lineHeight: 1.2 }}>
                  How was your sleep last night?
                </div>
              </div>

              {/* Sleep options */}
              <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
                {SLEEP_OPTIONS.map((option, i) => (
                  <motion.button
                    key={option.value}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.07, duration: 0.3 }}
                    whileHover={{ y: -4, scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => handleSleepSelect(option)}
                    style={{
                      padding: '18px 32px', borderRadius: 16,
                      background: 'rgba(255,255,255,0.04)',
                      border: `2px solid rgba(255,255,255,0.1)`,
                      cursor: 'pointer', transition: 'all 0.2s ease',
                      fontFamily: 'inherit',
                    }}
                  >
                    <div style={{ fontSize: 18, fontWeight: 800, color: option.color,
                      letterSpacing: '-0.01em' }}>
                      {option.label}
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* DONE */}
          {phase === 'done' && (
            <motion.div key="done"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 280 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 280, delay: 0.1 }}
                style={{
                  width: 80, height: 80, borderRadius: '50%', background: '#22C55E',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 0 60px rgba(34,197,94,0.6)',
                }}
              >
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                  <path d="M6 20l10 10L34 10" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </motion.div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#F8FAFC',
                letterSpacing: '-0.02em' }}>
                Check-in complete
              </div>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>
                Starting AI analysis…
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}

export default MoodCheckInScreen
