import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useStore from '../store'
import config from '../config'
import BPScreen from './sensors/BPScreen'
import HeartRateScreen from './sensors/HeartRateScreen'
import TemperatureScreen from './sensors/TemperatureScreen'
import ECGScreen from './sensors/ECGScreen'
import EyeScreen from './sensors/EyeScreen'
import MoodCheckInScreen from './sensors/MoodCheckInScreen'

const SENSORS = [
  { key: 'heartrate',   component: HeartRateScreen },
  { key: 'temperature', component: TemperatureScreen },
  { key: 'ecg',         component: ECGScreen },
  { key: 'bp',          component: BPScreen },
  { key: 'eye',         component: EyeScreen },
  { key: 'mood',        component: MoodCheckInScreen },
]

function SensorFlow() {
  const navigate = useNavigate()
  const patient = useStore((s) => s.patient)
  const currentStep = useStore((s) => s.currentStep)
  const setCurrentStep = useStore((s) => s.setCurrentStep)
  const setSessionId = useStore((s) => s.setSessionId)
  const sessionId = useStore((s) => s.sessionId)
  const [sessionStarted, setSessionStarted] = useState(false)

  // Guard — if no patient, send back
  useEffect(() => {
    if (!patient) navigate('/profile-selection')
  }, [patient])

  // Start session on mount
  useEffect(() => {
    if (!patient || sessionStarted) return
    setSessionStarted(true)
    setCurrentStep(0)

    async function startSession() {
      try {
        const res = await fetch(`${config.LOCAL_URL}/api/sessions/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patient_id: patient.id,
            session_type: 'daily',
          }),
        })
        const data = await res.json()
        if (data.session_id) {
          setSessionId(data.session_id)
          console.log('[SensorFlow] Session started:', data.session_id)
        } else {
          console.error('[SensorFlow] No session_id in response:', data)
        }
      } catch (e) {
        console.error('[SensorFlow] Failed to start session:', e.message)
      }
    }

    startSession()
  }, [patient])

  function handleNext() {
    if (currentStep < SENSORS.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      navigate('/analysis')
    }
  }

  const current = SENSORS[currentStep]
  if (!current) {
    navigate('/analysis')
    return null
  }

  const CurrentScreen = current.component

  return (
    <div style={{
      width: '100vw', height: '100vh', overflow: 'hidden',
      background: '#0A0A0F', display: 'flex', flexDirection: 'column',
    }}>
      <CurrentScreen onNext={handleNext} />
    </div>
  )
}

export default SensorFlow
