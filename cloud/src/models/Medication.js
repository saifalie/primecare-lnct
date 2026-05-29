const mongoose = require('mongoose');

const medicationSchema = new mongoose.Schema({
  patient_id: { type: String, required: true, index: true },
  name: { type: String, required: true },
  dose: { type: String, required: true },
  frequency: { type: String, required: true },
  times: [String], // ["08:00", "20:00"]
  purpose: { type: String },
  prescribing_dr: { type: String },
  active: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Medication', medicationSchema);
