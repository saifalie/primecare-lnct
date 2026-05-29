const mongoose = require('mongoose');

const sleepLogSchema = new mongoose.Schema({
  patient_id: { type: String, required: true, index: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  duration_hours: { type: Number },
  wake_episodes: { type: Number, default: 0 },
  quality: { type: String }, // poor/fair/good/excellent
  avg_hr_sleep: { type: Number },
  recorded_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SleepLog', sleepLogSchema);
