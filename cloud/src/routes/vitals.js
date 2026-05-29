const express = require('express');
const router = express.Router();
const BandVitals = require('../models/BandVitals');

// GET /api/vitals/:patientId/live — latest band vitals
router.get('/:patientId/live', async (req, res) => {
  try {
    const vitals = await BandVitals.findOne(
      { patient_id: req.params.patientId },
      null,
      { sort: { recorded_at: -1 } }
    );
    if (!vitals) return res.status(404).json({ error: 'No vitals found' });
    res.json(vitals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/vitals/:patientId/history?days=7 — vitals history
router.get('/:patientId/history', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const vitals = await BandVitals.find({
      patient_id: req.params.patientId,
      recorded_at: { $gte: since }
    }).sort({ recorded_at: 1 });

    res.json(vitals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
