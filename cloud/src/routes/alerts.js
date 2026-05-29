const express = require('express');
const router = express.Router();
const Alert = require('../models/Alert');

// GET /api/alerts/:patientId — all alerts for patient
router.get('/:patientId', async (req, res) => {
  try {
    const alerts = await Alert.find({
      patient_id: req.params.patientId
    }).sort({ createdAt: -1 });
    res.json({ alerts, count: alerts.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/alerts/:id/resolve — resolve an alert
router.put('/:id/resolve', async (req, res) => {
  try {
    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      { resolved: true },
      { new: true }
    );
    if (!alert) return res.status(404).json({ error: 'Alert not found' });
    res.json({ success: true, alert });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
