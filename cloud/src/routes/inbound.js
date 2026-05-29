const express = require('express');
const router = express.Router();
const BandVitals = require('../models/BandVitals');
const Alert = require('../models/Alert');
const Visit = require('../models/Visit');
const Patient = require('../models/Patient');
const { broadcastToPatient } = require('../websocket/wsServer');
const { sendPushNotification } = require('../notifications/fcm');

// POST /api/inbound/band/vitals — receives vitals from Pi gateway
router.post('/band/vitals', async (req, res) => {
  try {
    const { patient_id, hr, spo2, temperature, steps, battery } = req.body;
    if (!patient_id) return res.status(400).json({ error: 'patient_id required' });

    // Save to MongoDB
    const vitals = new BandVitals({ patient_id, hr, spo2, temperature, steps, battery });
    await vitals.save();

    // Broadcast to connected WebSocket clients for this patient
    broadcastToPatient(patient_id, {
      type: 'band_vitals',
      patient_id,
      data: { hr, spo2, temperature, steps, battery, timestamp: new Date().toISOString() }
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/inbound/alerts — receives alerts from Pi gateway
router.post('/alerts', async (req, res) => {
  try {
    const { patient_id, type, severity, message, data } = req.body;
    if (!patient_id) return res.status(400).json({ error: 'patient_id required' });

    // Save alert
    const alert = new Alert({ patient_id, type, severity, message, data });
    await alert.save();

    // Send push notification
    const patient = await Patient.findOne({ id: patient_id });
    if (patient && patient.fcm_tokens && patient.fcm_tokens.length > 0) {
      const title = severity === 'CRITICAL' ? '🚨 Emergency Alert' : '📊 Health Alert';
      await sendPushNotification(patient.fcm_tokens, title, message, {
        patient_id,
        alert_type: type,
        severity
      });
      await Alert.findByIdAndUpdate(alert._id, { notified_app: true });
    }

    res.json({ success: true, alert_id: alert._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/inbound/visits — receives completed visit from Pi sync service
router.post('/visits', async (req, res) => {
  try {
    const visitData = req.body;
    if (!visitData.patient_id || !visitData.id) {
      return res.status(400).json({ error: 'patient_id and id required' });
    }

    // Upsert — update if exists, insert if not
    await Visit.findOneAndUpdate(
      { id: visitData.id },
      visitData,
      { upsert: true, new: true }
    );

    // Update patient's latest health score and summary
    if (visitData.health_score || visitData.ai_summary) {
      await Patient.findOneAndUpdate(
        { id: visitData.patient_id },
        {
          latest_health_score: visitData.health_score,
          latest_summary: visitData.ai_summary,
          latest_risk_level: visitData.risk_level
        }
      );
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
