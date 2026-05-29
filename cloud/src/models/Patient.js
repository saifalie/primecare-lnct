const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  age: { type: Number, required: true },
  gender: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  profile_photo: { type: String },
  blood_group: { type: String },

  // Medical history
  conditions: [String],
  allergies: [String],
  surgeries: [{ name: String, year: Number }],
  family_history: [String],

  // Personal baselines
  baseline_hr: { type: Number },
  baseline_spo2: { type: Number },
  baseline_bp_sys: { type: Number },
  baseline_bp_dia: { type: Number },
  baseline_temp: { type: Number },

  // Band device
  band_device_id: { type: String },
  band_last_seen: { type: Date },
  band_battery: { type: Number },

  // Emergency
  emergency_contacts: [{
    name: String,
    phone: String,
    relation: String,
    priority: Number
  }],
  auto_112: { type: Boolean, default: true },

  // FCM tokens for push notifications
  fcm_tokens: [String],

  // Latest summary
  latest_summary: { type: String },
  latest_health_score: { type: Number },
  latest_risk_level: { type: String },

}, { timestamps: true });

module.exports = mongoose.model('Patient', patientSchema);
