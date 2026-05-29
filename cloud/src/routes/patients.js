const express = require('express');
const router = express.Router();
const Patient = require('../models/Patient');
const Visit = require('../models/Visit');

// GET /api/patients — list all patients for profile selection
router.get('/', async (req, res) => {
  try {
    const patients = await Patient.find({}).sort({ createdAt: -1 });

    // For each patient get their latest visit
    const patientsWithScore = await Promise.all(patients.map(async (p) => {
      const latestVisit = await Visit.findOne({
        patient_id: p.id,
        completed_at: { $exists: true, $ne: null }
      }).sort({ completed_at: -1 });

      return {
        id: p.id,
        name: p.name,
        age: p.age,
        gender: p.gender,
        phone: p.phone,
        profile_photo: p.profile_photo,
        blood_group: p.blood_group,
        conditions: p.conditions,
        baseline_hr: p.baseline_hr,
        baseline_spo2: p.baseline_spo2,
        baseline_bp_sys: p.baseline_bp_sys,
        baseline_bp_dia: p.baseline_bp_dia,
        emergency_contacts: p.emergency_contacts,
        auto_112: p.auto_112,
        band_battery: p.band_battery,
        band_last_seen: p.band_last_seen,
        fcm_tokens: p.fcm_tokens,
        latest_health_score: p.latest_health_score,
        latest_summary: p.latest_summary,
        latest_risk_level: p.latest_risk_level,
        health_score: p.latest_health_score,
        last_checkup: latestVisit ? latestVisit.completed_at : null,
        last_checkup_at: latestVisit ? latestVisit.completed_at : null,
        createdAt: p.createdAt,
      };
    }));

    res.json({ success: true, patients: patientsWithScore });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/patients/register — register new patient (called by kiosk)
router.post('/register', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'phone required' });

    const existing = await Patient.findOne({ phone });
    if (existing) {
      return res.status(409).json({ error: 'Phone number already registered', patient: formatPatient(existing) });
    }

    const { v4: uuidv4 } = require('uuid');
    const id = uuidv4();

    const patient = new Patient({ id, ...req.body });
    await patient.save();

    res.status(201).json({ success: true, patient: formatPatient(patient) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/patients — create or update patient (called by sync service)
router.post('/', async (req, res) => {
  try {
    const { phone } = req.body;
    const existing = await Patient.findOne({ phone });
    if (existing) {
      const updated = await Patient.findOneAndUpdate(
        { phone },
        { ...req.body },
        { new: true }
      );
      return res.json(formatPatient(updated));
    }
    const patient = new Patient(req.body);
    await patient.save();
    res.json(formatPatient(patient));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/patients/:id — full patient profile
router.get('/:id', async (req, res) => {
  try {
    const patient = await Patient.findOne({ id: req.params.id });
    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    res.json(formatPatient(patient));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/patients/:id — update patient profile
router.put('/:id', async (req, res) => {
  try {
    const patient = await Patient.findOneAndUpdate(
      { id: req.params.id },
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );
    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    res.json(formatPatient(patient));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/patients/:id/contacts — update emergency contacts
router.put('/:id/contacts', async (req, res) => {
  try {
    const { contacts } = req.body;
    const patient = await Patient.findOneAndUpdate(
      { id: req.params.id },
      { emergency_contacts: contacts },
      { new: true }
    );
    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    res.json({ success: true, contacts: patient.emergency_contacts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/patients/:id/summary — latest daily summary
router.get('/:id/summary', async (req, res) => {
  try {
    const patient = await Patient.findOne({ id: req.params.id });
    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    res.json({
      summary: patient.latest_summary,
      health_score: patient.latest_health_score,
      risk_level: patient.latest_risk_level
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function formatPatient(p) {
  return {
    id: p.id,
    name: p.name,
    age: p.age,
    gender: p.gender,
    phone: p.phone,
    profile_photo: p.profile_photo,
    blood_group: p.blood_group,
    conditions: p.conditions,
    allergies: p.allergies,
    emergency_contacts: p.emergency_contacts,
    auto_112: p.auto_112,
    baseline_hr: p.baseline_hr,
    baseline_spo2: p.baseline_spo2,
    baseline_bp_sys: p.baseline_bp_sys,
    baseline_bp_dia: p.baseline_bp_dia,
    baseline_temp: p.baseline_temp,
    band_device_id: p.band_device_id,
    band_battery: p.band_battery,
    band_last_seen: p.band_last_seen,
    fcm_tokens: p.fcm_tokens,
    health_score: p.latest_health_score,
    latest_health_score: p.latest_health_score,
    latest_summary: p.latest_summary,
    last_summary: p.latest_summary,
    latest_risk_level: p.latest_risk_level,
    createdAt: p.createdAt,
  };
}

module.exports = router;
