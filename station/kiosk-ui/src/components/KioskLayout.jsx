import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useStore from '../store'
import config from '../config'

function ConnectivityBanner() {
  const connectivity = useStore((s) => s.connectivity)
  const setConnectivity = useStore((s) => s.setConnectivity)
  const prevConnectivity = useRef(connectivity)
  const showBanner = useStore((s) => s.showConnectivityBanner)
  const setShowBanner = useStore((s) => s.setShowConnectivityBanner)

  useEffect(() => {
    if (prevConnectivity.current !== connectivity) {
      setShowBanner(true)
      if (connectivity === 'groq') {
        setTimeout(() => setShowBanner(false), 3000)
      }
      prevConnectivity.current = connectivity
    }
  }, [connectivity])

  const isOffline = connectivity === 'ollama'

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ y: -60 }}
          animate={{ y: 0 }}
          exit={{ y: -60 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className={`fixed top-0 left-0 right-0 z-50 text-center py-3 text-sm font-medium ${
            isOffline
              ? 'bg-amber-500 text-amber-950'
              : 'bg-green-500 text-green-950'
          }`}
        >
          {isOffline ? '📡 Offline Mode — Local AI active' : '✅ Online — Cloud AI active'}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function KioskLayout({ children }) {
  const setConnectivity = useStore((s) => s.setConnectivity)
  const wsRef = useRef(null)
  const setWs = useStore((s) => s.setWs)

  useEffect(() => {
    function connect() {
      try {
        const ws = new WebSocket(config.WS_URL)
        wsRef.current = ws
        setWs(ws)

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            if (data.type === 'connectivity_change') {
              setConnectivity(data.mode)
            }
          } catch (e) {}
        }

        ws.onclose = () => {
          setTimeout(connect, 3000)
        }

        ws.onerror = () => {
          ws.close()
        }
      } catch (e) {}
    }

    connect()

    return () => {
      if (wsRef.current) wsRef.current.close()
    }
  }, [])

  return (
    <div
      className="w-screen h-screen overflow-hidden relative"
      style={{ backgroundColor: 'transparent' }}
    >
      <ConnectivityBanner />
      <div className="w-full h-full">
        {children}
      </div>
    </div>
  )
}

export default KioskLayout
