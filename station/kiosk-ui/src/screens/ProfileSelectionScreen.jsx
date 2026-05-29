import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import useStore from '../store'
import config from '../config'

function ProfileSelectionScreen() {
  const navigate = useNavigate()
  const setPatient = useStore((s) => s.setPatient)
  const resetSession = useStore((s) => s.resetSession)

  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    resetSession()
    fetchPatients()
  }, [])

  async function fetchPatients() {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`${config.API_URL}/api/patients`)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setPatients(data.patients || data || [])
    } catch (e) {
      setError('Could not load profiles. Check connection.')
    } finally {
      setLoading(false)
    }
  }

  function handleSelectPatient(patient) {
    setPatient(patient)
    navigate('/dashboard')
  }

  function getRiskColor(score) {
    if (!score) return '#64748B'
    if (score >= 70) return '#22C55E'
    if (score >= 45) return '#F59E0B'
    return '#EF4444'
  }

  function getRiskLabel(score) {
    if (!score) return 'No data'
    if (score >= 70) return 'Good'
    if (score >= 45) return 'Attention'
    return 'Urgent'
  }

  function formatLastCheckup(dateStr) {
    if (!dateStr) return 'No checkup yet'
    const date = new Date(dateStr)
    const now = new Date()
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    return `${Math.floor(diffDays / 30)} months ago`
  }

  function getInitials(name) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  return (
    <div style={{
      width: '100vw', height: '100vh', overflow: 'hidden',
      background: 'radial-gradient(ellipse at 50% 0%, #0d0d2b 0%, #0A0A0F 60%)',
      display: 'flex', flexDirection: 'column',
    }}>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          padding: '40px 64px 0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#F8FAFC', letterSpacing: '-0.02em' }}>
            Who are you?
          </div>
          <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.35)', marginTop: 6, fontWeight: 400 }}>
            Select your profile to begin your health checkup
          </div>
        </div>

        {/* PrimeCare logo small */}
        <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em' }}>
          Prime<span style={{ color: '#6366F1' }}>Care</span>
        </div>
      </motion.div>

      {/* Content area */}
      <div style={{
        flex: 1, overflow: 'hidden',
        padding: '32px 64px 40px',
        display: 'flex', flexDirection: 'column',
      }}>

        {/* Loading state */}
        {loading && (
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 24, flexWrap: 'wrap',
          }}>
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{ opacity: [0.3, 0.7, 0.3] }}
                transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.2 }}
                style={{
                  width: 220, height: 280, borderRadius: 24,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              />
            ))}
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 16,
          }}>
            <div style={{ fontSize: 48 }}>⚠️</div>
            <div style={{ fontSize: 18, color: '#F59E0B', fontWeight: 600 }}>{error}</div>
            <button
              onClick={fetchPatients}
              style={{
                marginTop: 8, padding: '12px 32px', borderRadius: 12,
                background: '#6366F1', color: 'white', border: 'none',
                fontSize: 16, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Try Again
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && patients.length === 0 && (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 16,
          }}>
            <div style={{ fontSize: 64 }}>👋</div>
            <div style={{ fontSize: 24, color: '#F8FAFC', fontWeight: 700 }}>Welcome to PrimeCare</div>
            <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.35)', textAlign: 'center', maxWidth: 320 }}>
              No profiles yet. Create the first family member profile to get started.
            </div>
          </div>
        )}

        {/* Patient cards grid */}
        {!loading && !error && patients.length > 0 && (
          <div style={{
            flex: 1, overflowY: 'auto',
            display: 'flex', flexWrap: 'wrap',
            gap: 20, alignContent: 'flex-start',
          }}>
            <AnimatePresence>
              {patients.map((patient, i) => (
                <motion.div
                  key={patient.id}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08, duration: 0.4 }}
                  onClick={() => handleSelectPatient(patient)}
                  style={{
                    width: 210, flexShrink: 0,
                    background: 'rgba(30, 30, 46, 0.9)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 24, padding: '28px 20px',
                    cursor: 'pointer', textAlign: 'center',
                    transition: 'all 0.2s ease',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
                  }}
                  whileHover={{
                    borderColor: 'rgba(99,102,241,0.5)',
                    background: 'rgba(40,40,60,0.95)',
                    y: -4,
                    boxShadow: '0 8px 32px rgba(99,102,241,0.2)',
                  }}
                  whileTap={{ scale: 0.97 }}
                >
                  {/* Avatar */}
                  <div style={{
                    width: 80, height: 80, borderRadius: '50%',
                    overflow: 'hidden', flexShrink: 0,
                    border: '2px solid rgba(99,102,241,0.4)',
                    background: 'rgba(99,102,241,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {patient.profile_photo ? (
                      <img
                        src={patient.profile_photo}
                        alt={patient.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => { e.target.style.display = 'none' }}
                      />
                    ) : (
                      <span style={{ fontSize: 28, fontWeight: 700, color: '#818CF8' }}>
                        {getInitials(patient.name)}
                      </span>
                    )}
                  </div>

                  {/* Name */}
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#F8FAFC', lineHeight: 1.2 }}>
                    {patient.name}
                  </div>

                  {/* Age + Gender */}
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}>
                    {patient.age} years · {patient.gender}
                  </div>

                  {/* Health score badge */}
                  <div style={{
                    padding: '4px 14px', borderRadius: 99,
                    background: `${getRiskColor(patient.health_score)}18`,
                    border: `1px solid ${getRiskColor(patient.health_score)}40`,
                    fontSize: 12, fontWeight: 700,
                    color: getRiskColor(patient.health_score),
                    letterSpacing: '0.05em',
                  }}>
                    {patient.health_score ? `${patient.health_score} · ${getRiskLabel(patient.health_score)}` : 'No data yet'}
                  </div>

                  {/* Last checkup */}
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', marginTop: 4 }}>
                    Last checkup: {formatLastCheckup(patient.last_checkup)}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Add New Profile button */}
        {!loading && !error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            style={{ flexShrink: 0, marginTop: 24, display: 'flex', justifyContent: 'center' }}
          >
            <motion.button
              whileHover={{ background: 'rgba(99,102,241,0.15)', borderColor: 'rgba(99,102,241,0.5)' }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/register')}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '14px 32px', borderRadius: 14,
                background: 'rgba(99,102,241,0.08)',
                border: '1px solid rgba(99,102,241,0.25)',
                color: '#818CF8', fontSize: 16, fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.2s ease',
                fontFamily: 'inherit',
              }}
            >
              <span style={{ fontSize: 20 }}>+</span>
              Add New Profile
            </motion.button>
          </motion.div>
        )}
      </div>
    </div>
  )
}

export default ProfileSelectionScreen
