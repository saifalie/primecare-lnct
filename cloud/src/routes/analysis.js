const express = require('express');
const router = express.Router();
const axios = require('axios');
const Visit = require('../models/Visit');
const BandVitals = require('../models/BandVitals');
const Patient = require('../models/Patient');

// POST /api/analysis/history — deep history analysis (calls Pi LLM service)
router.post('/history', async (req, res) => {
  try {
    const { patient_id, days } = req.body;
    if (!patient_id) return res.status(400).json({ error: 'patient_id required' });

    const PI_URL = process.env.PI_LLM_URL || 'http://192.168.1.100:8080';

    const response = await axios.post(`${PI_URL}/api/analysis/history`, {
      patient_id,
      days: days || 30
    }, { timeout: 30000 });

    res.json(response.data);
  } catch (err) {
    // If Pi is unreachable, return graceful error
    if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
      return res.status(503).json({
        error: 'PrimeStation is offline. Analysis requires station to be connected.'
      });
    }
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analysis/trend/:patientId — simple trend summary from cloud data
router.get('/trend/:patientId', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [visits, vitals] = await Promise.all([
      Visit.find({ patient_id: req.params.patientId, completed_at: { $gte: since } })
        .sort({ completed_at: -1 }),
      BandVitals.find({ patient_id: req.params.patientId, recorded_at: { $gte: since } })
        .sort({ recorded_at: -1 })
    ]);

    // Calculate averages
    const avgHR = vitals.length
      ? Math.round(vitals.reduce((s, v) => s + (v.hr || 0), 0) / vitals.length)
      : null;
    const avgSpO2 = vitals.length
      ? (vitals.reduce((s, v) => s + (v.spo2 || 0), 0) / vitals.length).toFixed(1)
      : null;

    const riskCounts = { GREEN: 0, YELLOW: 0, RED: 0 };
    visits.forEach(v => { if (v.risk_level) riskCounts[v.risk_level]++; });

    res.json({
      period_days: days,
      total_visits: visits.length,
      avg_hr: avgHR,
      avg_spo2: avgSpO2,
      risk_breakdown: riskCounts,
      latest_visit: visits[0] || null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
