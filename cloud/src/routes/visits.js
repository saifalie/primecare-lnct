const express = require('express');
const router = express.Router();
const Visit = require('../models/Visit');

// GET /api/visits/:patientId — all visits for patient
router.get('/:patientId', async (req, res) => {
  try {
    const visits = await Visit.find({
      patient_id: req.params.patientId
    }).sort({ completed_at: -1, started_at: -1 });
    res.json({ visits, count: visits.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/visits/:patientId/:visitId — single visit detail
router.get('/:patientId/:visitId', async (req, res) => {
  try {
    const visit = await Visit.findOne({
      patient_id: req.params.patientId,
      id: req.params.visitId
    });
    if (!visit) return res.status(404).json({ error: 'Visit not found' });
    res.json(visit);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
