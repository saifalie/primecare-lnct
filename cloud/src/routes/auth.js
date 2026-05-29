const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Patient = require('../models/Patient');

// In-memory OTP store (fine for hackathon)
const otpStore = {};

// POST /api/auth/request-otp
router.post('/request-otp', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone required' });

    // Generate 4-digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    otpStore[phone] = { otp, expires: Date.now() + 10 * 60 * 1000 }; // 10 min

    // In production: send SMS via Twilio
    // For hackathon: just return it in response
    console.log(`OTP for ${phone}: ${otp}`);

    res.json({ success: true, message: 'OTP sent', dev_otp: otp });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/verify-otp
router.post('/verify-otp', async (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) return res.status(400).json({ error: 'Phone and OTP required' });

    const record = otpStore[phone];
    if (!record) return res.status(400).json({ error: 'OTP not requested' });
    if (Date.now() > record.expires) return res.status(400).json({ error: 'OTP expired' });
    if (record.otp !== otp) return res.status(400).json({ error: 'Invalid OTP' });

    // Clear OTP
    delete otpStore[phone];

    // Find patient by phone
    const patient = await Patient.findOne({ phone });
    if (!patient) return res.status(404).json({ error: 'No patient found with this phone number' });

    // Generate JWT
    const token = jwt.sign(
      { patient_id: patient.id, phone: patient.phone },
      process.env.JWT_SECRET || 'primecare-secret',
      { expiresIn: '30d' }
    );

    res.json({ success: true, token, patient_id: patient.id, name: patient.name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/devices/register — save FCM token
router.post('/devices/register', async (req, res) => {
  try {
    const { patient_id, fcm_token } = req.body;
    if (!patient_id || !fcm_token) return res.status(400).json({ error: 'patient_id and fcm_token required' });

    await Patient.findOneAndUpdate(
      { id: patient_id },
      { $addToSet: { fcm_tokens: fcm_token } }
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
