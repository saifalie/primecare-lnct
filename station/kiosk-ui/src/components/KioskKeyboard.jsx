import { motion, AnimatePresence } from 'framer-motion'

const HINDI_ROWS = [
  ['अ','आ','इ','ई','उ','ऊ','ए','ऐ','ओ','औ'],
  ['क','ख','ग','घ','च','छ','ज','झ','ट','ठ'],
  ['ड','ढ','त','थ','द','ध','न','प','फ','ब'],
  ['भ','म','य','र','ल','व','श','स','ह','⌫'],
  ['␣','़','ं','ः','।','?','!','(',')','—'],
]

const ENGLISH_ROWS = [
  ['q','w','e','r','t','y','u','i','o','p'],
  ['a','s','d','f','g','h','j','k','l','⌫'],
  ['z','x','c','v','b','n','m','.','@','␣'],
]

const NUMBER_ROWS = [
  ['1','2','3'],
  ['4','5','6'],
  ['7','8','9'],
  ['⌫','0','✓'],
]

function getKeyStyle(key) {
  const base = {
    borderRadius: 10, border: 'none', cursor: 'pointer',
    fontWeight: 600, display: 'flex', alignItems: 'center',
    justifyContent: 'center', userSelect: 'none', WebkitUserSelect: 'none',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  }
  if (key === '⌫') return { ...base, background: '#FEE2E2', color: '#DC2626', fontSize: 18 }
  if (key === '✓') return { ...base, background: '#0A0A0F', color: '#fff', fontSize: 18 }
  if (key === '␣') return { ...base, background: '#E5E7EB', color: '#374151', fontSize: 12 }
  return { ...base, background: '#fff', color: '#0A0A0F', fontSize: 15 }
}

function KioskKeyboard({ visible, mode = 'english', onKey, onDone }) {
  const rows = mode === 'number' ? NUMBER_ROWS : mode === 'hindi' ? HINDI_ROWS : ENGLISH_ROWS
  const isNumber = mode === 'number'

  function handleKey(key) {
    if (key === '⌫') { onKey('BACKSPACE'); return }
    if (key === '✓') { onDone?.(); return }
    if (key === '␣') { onKey(' '); return }
    onKey(key)
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 40 }}
          style={{
            position: 'absolute',
            bottom: 0, left: 0, right: 0,
            zIndex: 100,
            background: 'rgba(245,245,247,0.98)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderTop: '1px solid rgba(0,0,0,0.08)',
            padding: isNumber ? '14px 30%' : '12px 10px',
            paddingBottom: 20,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
            <div style={{ width: 36, height: 4, borderRadius: 99, background: '#D1D5DB' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: isNumber ? 10 : 6 }}>
            {rows.map((row, ri) => (
              <div key={ri} style={{ display: 'flex', gap: isNumber ? 10 : 5, justifyContent: 'center' }}>
                {row.map((key) => (
                  <motion.button
                    key={key + ri}
                    whileTap={{ scale: 0.82, backgroundColor: '#E5E7EB' }}
                    onPointerDown={(e) => { e.preventDefault(); handleKey(key) }}
                    style={{
                      ...getKeyStyle(key),
                      width: isNumber ? 84 : (key === '⌫' ? 62 : key === '␣' ? 120 : 50),
                      height: isNumber ? 74 : 42,
                      fontSize: isNumber ? 26 : (key === '␣' ? 11 : 15),
                      flexShrink: 0,
                    }}
                  >
                    {key === '␣' ? 'space' : key}
                  </motion.button>
                ))}
              </div>
            ))}
          </div>
          {!isNumber && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, padding: '0 4px' }}>
              <div style={{ display: 'flex', gap: 8 }}>
                {['english','hindi'].map((m) => (
                  <button key={m}
                    onPointerDown={(e) => { e.preventDefault(); onKey('MODE:' + m) }}
                    style={{
                      padding: '8px 18px', borderRadius: 8,
                      background: mode === m ? '#0A0A0F' : '#E5E7EB',
                      color: mode === m ? '#fff' : '#6B7280',
                      border: 'none', cursor: 'pointer',
                      fontSize: 13, fontWeight: 600,
                    }}
                  >
                    {m === 'english' ? 'EN' : 'हिं'}
                  </button>
                ))}
              </div>
              <motion.button
                whileTap={{ scale: 0.96 }}
                onPointerDown={(e) => { e.preventDefault(); onDone?.() }}
                style={{
                  padding: '10px 32px', borderRadius: 10,
                  background: '#0A0A0F', color: '#fff',
                  border: 'none', cursor: 'pointer',
                  fontSize: 14, fontWeight: 700,
                }}
              >
                Done ✓
              </motion.button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default KioskKeyboard
