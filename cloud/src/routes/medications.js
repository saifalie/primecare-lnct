const express = require('express');
const router = express.Router();
const Medication = require('../models/Medication');

// GET /api/medications/:patientId — all medications for patient
router.get('/:patientId', async (req, res) => {
  try {
    const medications = await Medication.find({
      patient_id: req.params.patientId,
      active: true
    }).sort({ createdAt: -1 });
    res.json(medications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/medications/:patientId — add new medication
router.post('/:patientId', async (req, res) => {
  try {
    const medication = new Medication({
      patient_id: req.params.patientId,
      ...req.body
    });
    await medication.save();
    res.json({ success: true, medication });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/medications/:id — update medication
router.put('/:id', async (req, res) => {
  try {
    const medication = await Medication.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!medication) return res.status(404).json({ error: 'Medication not found' });
    res.json({ success: true, medication });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/medications/:id — deactivate medication
router.delete('/:id', async (req, res) => {
  try {
    const medication = await Medication.findByIdAndUpdate(
      req.params.id,
      { active: false },
      { new: true }
    );
    if (!medication) return res.status(404).json({ error: 'Medication not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
