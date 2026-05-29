const mongoose = require('mongoose');

const visitSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  patient_id: { type: String, required: true, index: true },
  session_type: { type: String, default: 'daily' }, // daily/special/emergency

  // AI Results
  risk_level: { type: String },       // GREEN/YELLOW/RED
  health_score: { type: Number },     // 0-100
  ai_summary: { type: String },
  what_to_do: { type: String },
  doctor_type: { type: String },
  next_checkup_days: { type: Number },

  // Readings snapshot
  readings: { type: mongoose.Schema.Types.Mixed },

  // Flags
  simulation_mode: { type: Boolean, default: false },
  fallback_used: { type: Boolean, default: false },

  started_at: { type: Date },
  completed_at: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Visit', visitSchema);
