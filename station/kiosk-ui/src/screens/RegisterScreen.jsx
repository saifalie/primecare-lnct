import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import * as THREE from 'three'
import useStore from '../store'
import config from '../config'
import KioskKeyboard from '../components/KioskKeyboard'

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']

const CONDITIONS = [
  'Diabetes', 'Hypertension', 'Heart Disease',
  'Kidney Disease', 'Thyroid', 'Asthma', 'Arthritis', 'Other',
]

const EMPTY_CONTACT = { name: '', phone: '', relation: '' }
const RELATIONS = ['Son', 'Daughter', 'Spouse', 'Sibling', 'Parent', 'Other']

function RegisterScreen() {
  const navigate = useNavigate()
  const setPatient = useStore((s) => s.setPatient)
  const setSessionId = useStore((s) => s.setSessionId)

  const [form, setForm] = useState({
    name: '', age: '', gender: '', phone: '',
    blood_group: '', conditions: [],
  })
  const [contacts, setContacts] = useState([{ ...EMPTY_CONTACT }])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Keyboard
  const [kbVisible, setKbVisible] = useState(false)
  const [kbMode, setKbMode] = useState('english')
  const [activeField, setActiveField] = useState(null)
  // activeField: 'name' | 'age' | 'phone' | 'contact_name_0' | 'contact_phone_0' etc.

  // Three.js
  const mountRef = useRef(null)
  const animRef = useRef(null)

  const isValid =
    form.name.trim() &&
    form.age &&
    form.gender &&
    form.phone.length === 10 &&
    contacts.length >= 1 &&
    contacts[0].name.trim() &&
    contacts[0].phone.length === 10

  // Three.js particles — same as other screens
  useEffect(() => {
    const container = mountRef.current
    if (!container) return
    const W = container.clientWidth
    const H = container.clientHeight
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 1000)
    camera.position.z = 5
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(W, H)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0)
    container.appendChild(renderer.domElement)
    const count = 200
    const pos = new Float32Array(count * 3)
    const col = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      pos[i*3] = (Math.random() - 0.5) * 20
      pos[i*3+1] = (Math.random() - 0.5) * 16
      pos[i*3+2] = (Math.random() - 0.5) * 6
      const p = Math.random()
      if (p < 0.5) { col[i*3]=0.39; col[i*3+1]=0.40; col[i*3+2]=0.95 }
      else { col[i*3]=0.53; col[i*3+1]=0.55; col[i*3+2]=0.98 }
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3))
    const mat = new THREE.PointsMaterial({ size: 0.04, vertexColors: true, transparent: true, opacity: 0.7, sizeAttenuation: true })
    const points = new THREE.Points(geo, mat)
    scene.add(points)
    let tick = 0
    function animate() {
      animRef.current = requestAnimationFrame(animate)
      tick += 0.003
      points.rotation.y = tick * 0.06
      points.rotation.x = Math.sin(tick * 0.04) * 0.04
      mat.opacity = 0.5 + Math.sin(tick) * 0.2
      renderer.render(scene, camera)
    }
    animate()
    return () => {
      cancelAnimationFrame(animRef.current)
      renderer.dispose(); geo.dispose(); mat.dispose()
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement)
    }
  }, [])

  function openKeyboard(field, type = 'english') {
    setActiveField(field)
    setKbMode(type)
    setKbVisible(true)
  }

  function handleKey(key) {
    if (key.startsWith('MODE:')) { setKbMode(key.replace('MODE:', '')); return }

    // Contact fields: 'contact_name_0', 'contact_phone_1', etc.
    if (activeField && activeField.startsWith('contact_')) {
      const parts = activeField.split('_')
      const subField = parts[1] // 'name' or 'phone'
      const idx = parseInt(parts[2])
      setContacts((prev) => {
        const next = [...prev]
        const current = next[idx][subField] || ''
        if (key === 'BACKSPACE') next[idx] = { ...next[idx], [subField]: current.slice(0, -1) }
        else next[idx] = { ...next[idx], [subField]: current + key }
        return next
      })
      return
    }

    // Regular form fields
    setForm((prev) => {
      const current = prev[activeField] || ''
      if (key === 'BACKSPACE') return { ...prev, [activeField]: current.slice(0, -1) }
      return { ...prev, [activeField]: current + key }
    })
  }

  function toggleCondition(cond) {
    setForm((prev) => {
      const exists = prev.conditions.includes(cond)
      return {
        ...prev,
        conditions: exists
          ? prev.conditions.filter((c) => c !== cond)
          : [...prev.conditions, cond],
      }
    })
  }

  function addContact() {
    if (contacts.length >= 3) return
    setContacts((prev) => [...prev, { ...EMPTY_CONTACT }])
  }

  function removeContact(idx) {
    setContacts((prev) => prev.filter((_, i) => i !== idx))
  }

  function setContactRelation(idx, relation) {
    setContacts((prev) => {
      const next = [...prev]
      next[idx] = { ...next[idx], relation }
      return next
    })
  }

  async function handleSubmit() {
    if (!isValid) return
    setLoading(true)
    setError('')
    try {
      const payload = {
        name: form.name.trim(),
        age: parseInt(form.age),
        gender: form.gender,
        phone: form.phone,
        blood_group: form.blood_group || null,
        conditions: form.conditions,
        emergency_contacts: contacts
          .filter((c) => c.name.trim() && c.phone.length === 10)
          .map((c, i) => ({ ...c, priority: i + 1 })),
      }
      const res = await fetch(`${config.API_URL}/api/patients/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (data.patient) {
        setPatient(data.patient)
        // Start a session
        try {
          const sessRes = await fetch(`${config.API_URL}/api/sessions/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ patient_id: data.patient.id, session_type: 'daily' }),
          })
          const sessData = await sessRes.json()
          if (sessData.session_id) setSessionId(sessData.session_id)
        } catch (e) {}
        navigate('/dashboard')
      } else {
        setError(data.error || 'Registration failed. Please try again.')
      }
    } catch (e) {
      setError('Could not connect to server. Check connection.')
    }
    setLoading(false)
  }

  // Shared input row style
  function fieldBox(isActive) {
    return {
      background: 'rgba(255,255,255,0.05)',
      borderRadius: 14,
      border: `1.5px solid ${isActive ? '#6366F1' : 'rgba(255,255,255,0.1)'}`,
      padding: '12px 16px',
      display: 'flex', alignItems: 'center', gap: 12,
      cursor: 'pointer',
      boxShadow: isActive ? '0 0 0 3px rgba(99,102,241,0.15)' : 'none',
      transition: 'all 0.15s',
    }
  }

  return (
    <div style={{
      width: '100vw', height: '100vh', overflow: 'hidden',
      display: 'grid', gridTemplateColumns: '1fr 1fr',
      background: '#0A0A0F', fontFamily: 'Inter, sans-serif',
    }}>

      {/* LEFT — dark branding panel */}
      <div style={{
        background: 'radial-gradient(ellipse at 30% 40%, #0d0d2b 0%, #0A0A0F 60%)',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '52px', position: 'relative', overflow: 'hidden',
      }}>
        <div ref={mountRef} style={{ position: 'absolute', inset: 0, zIndex: 0 }} />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          style={{ position: 'relative', zIndex: 1 }}
        >
          {/* Back */}
          <button onClick={() => navigate('/profile-selection')} style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 99, padding: '8px 16px 8px 12px',
            color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 500,
            cursor: 'pointer', marginBottom: 44, fontFamily: 'inherit',
          }}>
            ← Back
          </button>

          {/* Brand */}
          <div style={{ fontSize: 14, fontWeight: 700, color: '#6366F1',
            letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
            PrimeCare
          </div>
          <div style={{ fontSize: 38, fontWeight: 900, color: '#F8FAFC',
            letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 10 }}>
            New Family<br />Member
          </div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)', fontWeight: 400,
            lineHeight: 1.6, maxWidth: 280 }}>
            Register a profile to enable health monitoring,
            AI analysis, and emergency alerts for this person.
          </div>

          {/* Feature list */}
          <div style={{ marginTop: 40, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { icon: '🩺', text: 'Full health checkups with AI analysis' },
              { icon: '⌚', text: 'Live vitals from PrimeBand 24/7' },
              { icon: '🚨', text: 'Emergency chain — contacts + auto 112' },
              { icon: '💊', text: 'Medication schedule and reminders' },
            ].map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.08, duration: 0.4 }}
                style={{ display: 'flex', alignItems: 'center', gap: 12 }}
              >
                <div style={{ fontSize: 20, flexShrink: 0 }}>{f.icon}</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>
                  {f.text}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* RIGHT — form panel */}
      <motion.div
        initial={{ opacity: 0, x: 28 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        style={{
          background: '#0E0E1A',
          borderLeft: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', flexDirection: 'column',
          position: 'relative', overflow: 'hidden',
        }}
      >
        {/* Scrollable form area */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: kbVisible ? '36px 40px 300px' : '36px 40px 40px',
          transition: 'padding 0.35s cubic-bezier(0.4,0,0.2,1)',
          display: 'flex', flexDirection: 'column', gap: 20,
        }}>

          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#F8FAFC',
              letterSpacing: '-0.03em', marginBottom: 4 }}>
              Register Profile
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>
              Fill in the details below to create a new health profile
            </div>
          </div>

          {/* ── SECTION: Basic Info ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <SectionLabel>Basic Information</SectionLabel>

            {/* Name */}
            <div style={fieldBox(activeField === 'name')}
              onClick={() => openKeyboard('name', 'english')}>
              <div style={{ flex: 1 }}>
                <FieldLabel>Full Name</FieldLabel>
                <FieldValue>{form.name || 'Tap to enter name'}</FieldValue>
              </div>
              <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 18 }}>›</span>
            </div>

            {/* Age + Gender row */}
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ ...fieldBox(activeField === 'age'), flex: '0 0 110px' }}
                onClick={() => openKeyboard('age', 'number')}>
                <div style={{ flex: 1 }}>
                  <FieldLabel>Age</FieldLabel>
                  <FieldValue>{form.age ? `${form.age} yrs` : '—'}</FieldValue>
                </div>
              </div>

              <div style={{ flex: 1, display: 'flex', gap: 8 }}>
                {[
                  { val: 'male', label: 'Male', color: '#6366F1' },
                  { val: 'female', label: 'Female', color: '#EC4899' },
                  { val: 'other', label: 'Other', color: '#8B5CF6' },
                ].map((g) => (
                  <motion.button key={g.val}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setForm({ ...form, gender: g.val })}
                    style={{
                      flex: 1, borderRadius: 12, cursor: 'pointer', border: 'none',
                      background: form.gender === g.val
                        ? g.color : 'rgba(255,255,255,0.05)',
                      color: form.gender === g.val ? '#fff' : 'rgba(255,255,255,0.4)',
                      fontSize: 13, fontWeight: 700,
                      border: `1.5px solid ${form.gender === g.val ? g.color : 'rgba(255,255,255,0.1)'}`,
                      transition: 'all 0.15s', fontFamily: 'inherit',
                    }}
                  >{g.label}</motion.button>
                ))}
              </div>
            </div>

            {/* Phone */}
            <div style={fieldBox(activeField === 'phone')}
              onClick={() => openKeyboard('phone', 'number')}>
              <div style={{ flex: 1 }}>
                <FieldLabel>Mobile Number</FieldLabel>
                <FieldValue style={{ letterSpacing: form.phone ? '0.08em' : 0 }}>
                  {form.phone || 'Tap to enter 10-digit number'}
                </FieldValue>
              </div>
              {form.phone.length === 10 && (
                <div style={{ width: 22, height: 22, borderRadius: '50%',
                  background: '#22C55E', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 12, color: '#fff' }}>✓</span>
                </div>
              )}
            </div>
          </div>

          {/* ── SECTION: Blood Group ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <SectionLabel>Blood Group <span style={{ fontWeight: 400, opacity: 0.5 }}>(optional)</span></SectionLabel>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {BLOOD_GROUPS.map((bg) => (
                <motion.button key={bg}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setForm({ ...form, blood_group: form.blood_group === bg ? '' : bg })}
                  style={{
                    padding: '8px 16px', borderRadius: 10,
                    background: form.blood_group === bg
                      ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.05)',
                    border: `1.5px solid ${form.blood_group === bg ? '#EF4444' : 'rgba(255,255,255,0.1)'}`,
                    color: form.blood_group === bg ? '#EF4444' : 'rgba(255,255,255,0.5)',
                    fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    transition: 'all 0.15s', fontFamily: 'inherit',
                  }}
                >{bg}</motion.button>
              ))}
            </div>
          </div>

          {/* ── SECTION: Conditions ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <SectionLabel>Medical Conditions <span style={{ fontWeight: 400, opacity: 0.5 }}>(select all that apply)</span></SectionLabel>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {CONDITIONS.map((cond) => {
                const selected = form.conditions.includes(cond)
                return (
                  <motion.button key={cond}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => toggleCondition(cond)}
                    style={{
                      padding: '8px 16px', borderRadius: 10,
                      background: selected ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)',
                      border: `1.5px solid ${selected ? '#6366F1' : 'rgba(255,255,255,0.1)'}`,
                      color: selected ? '#818CF8' : 'rgba(255,255,255,0.4)',
                      fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      transition: 'all 0.15s', fontFamily: 'inherit',
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}
                  >
                    {selected && <span style={{ fontSize: 11 }}>✓</span>}
                    {cond}
                  </motion.button>
                )
              })}
            </div>
          </div>

          {/* ── SECTION: Emergency Contacts ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <SectionLabel>Emergency Contacts <span style={{ color: '#EF4444' }}>*</span></SectionLabel>
              {contacts.length < 3 && (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={addContact}
                  style={{
                    padding: '5px 14px', borderRadius: 8,
                    background: 'rgba(99,102,241,0.1)',
                    border: '1px solid rgba(99,102,241,0.3)',
                    color: '#818CF8', fontSize: 12, fontWeight: 700,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >+ Add Contact</motion.button>
              )}
            </div>

            <AnimatePresence>
              {contacts.map((contact, idx) => (
                <motion.div key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 16, padding: '16px',
                    display: 'flex', flexDirection: 'column', gap: 10,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, fontWeight: 700,
                      color: 'rgba(255,255,255,0.3)', letterSpacing: '0.06em' }}>
                      CONTACT {idx + 1} {idx === 0 ? '(Primary)' : ''}
                    </span>
                    {idx > 0 && (
                      <button onClick={() => removeContact(idx)} style={{
                        background: 'none', border: 'none', color: '#EF4444',
                        fontSize: 12, cursor: 'pointer', fontWeight: 600,
                        fontFamily: 'inherit',
                      }}>Remove</button>
                    )}
                  </div>

                  {/* Contact name */}
                  <div style={fieldBox(activeField === `contact_name_${idx}`)}
                    onClick={() => openKeyboard(`contact_name_${idx}`, 'english')}>
                    <div style={{ flex: 1 }}>
                      <FieldLabel>Name</FieldLabel>
                      <FieldValue>{contact.name || 'Tap to enter name'}</FieldValue>
                    </div>
                  </div>

                  {/* Contact phone + relation */}
                  <div style={{ display: 'flex', gap: 10 }}>
                    <div style={{ ...fieldBox(activeField === `contact_phone_${idx}`), flex: 1 }}
                      onClick={() => openKeyboard(`contact_phone_${idx}`, 'number')}>
                      <div style={{ flex: 1 }}>
                        <FieldLabel>Phone</FieldLabel>
                        <FieldValue style={{ letterSpacing: contact.phone ? '0.06em' : 0 }}>
                          {contact.phone || '10-digit number'}
                        </FieldValue>
                      </div>
                      {contact.phone.length === 10 && (
                        <span style={{ color: '#22C55E', fontSize: 14 }}>✓</span>
                      )}
                    </div>

                    {/* Relation selector */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, flex: '0 0 auto', maxWidth: 160, alignContent: 'flex-start' }}>
                      {RELATIONS.map((r) => (
                        <motion.button key={r}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setContactRelation(idx, r)}
                          style={{
                            padding: '4px 10px', borderRadius: 7,
                            background: contact.relation === r
                              ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)',
                            border: `1px solid ${contact.relation === r ? '#6366F1' : 'rgba(255,255,255,0.08)'}`,
                            color: contact.relation === r ? '#818CF8' : 'rgba(255,255,255,0.35)',
                            fontSize: 11, fontWeight: 600, cursor: 'pointer',
                            fontFamily: 'inherit', transition: 'all 0.12s',
                          }}
                        >{r}</motion.button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              padding: '12px 16px', borderRadius: 12,
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              fontSize: 13, color: '#EF4444', fontWeight: 500,
            }}>
              {error}
            </div>
          )}

          {/* Submit */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleSubmit}
            disabled={!isValid || loading}
            style={{
              width: '100%', padding: '16px 24px', borderRadius: 14,
              background: isValid ? '#6366F1' : 'rgba(255,255,255,0.06)',
              border: `1.5px solid ${isValid ? '#6366F1' : 'rgba(255,255,255,0.1)'}`,
              cursor: isValid ? 'pointer' : 'not-allowed',
              fontSize: 15, fontWeight: 700,
              color: isValid ? '#fff' : 'rgba(255,255,255,0.25)',
              letterSpacing: '-0.01em',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              transition: 'all 0.2s', fontFamily: 'inherit',
              boxShadow: isValid ? '0 4px 20px rgba(99,102,241,0.3)' : 'none',
            }}
          >
            {loading ? 'Creating profile...' : 'Create Profile →'}
          </motion.button>

        </div>

        {/* Keyboard */}
        <KioskKeyboard
          visible={kbVisible}
          mode={kbMode}
          onKey={handleKey}
          onDone={() => setKbVisible(false)}
        />
      </motion.div>
    </div>
  )
}

// Small helper components
function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)',
      letterSpacing: '0.08em', textTransform: 'uppercase' }}>
      {children}
    </div>
  )
}

function FieldLabel({ children }) {
  return (
    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontWeight: 600,
      letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 3 }}>
      {children}
    </div>
  )
}

function FieldValue({ children, style }) {
  return (
    <div style={{ fontSize: 14, fontWeight: 600,
      color: children && !String(children).includes('Tap') && !String(children).includes('digit') && !String(children).includes('—')
        ? '#F8FAFC' : 'rgba(255,255,255,0.2)',
      minHeight: 20, ...style }}>
      {children}
    </div>
  )
}

export default RegisterScreen
