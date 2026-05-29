const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  patient_id: { type: String, required: true, index: true },
  type: { type: String, required: true }, // fall/sos/hr_high/spo2_low/bp_trend/medication_missed
  severity: { type: String, required: true }, // INFO/WARNING/CRITICAL
  message: { type: String, required: true },
  data: { type: mongoose.Schema.Types.Mixed },
  resolved: { type: Boolean, default: false },
  notified_app: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Alert', alertSchema);
