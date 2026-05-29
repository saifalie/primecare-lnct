const mongoose = require('mongoose');

const bandVitalsSchema = new mongoose.Schema({
  patient_id: { type: String, required: true, index: true },
  hr: { type: Number },
  spo2: { type: Number },
  temperature: { type: Number },
  steps: { type: Number },
  battery: { type: Number },
  fall_detected: { type: Boolean, default: false },
  recorded_at: { type: Date, default: Date.now }
});

// Auto-delete records older than 7 days
bandVitalsSchema.index({ recorded_at: 1 }, { expireAfterSeconds: 604800 });

module.exports = mongoose.model('BandVitals', bandVitalsSchema);
