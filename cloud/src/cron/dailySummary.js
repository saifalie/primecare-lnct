const Patient = require('../models/Patient');
const BandVitals = require('../models/BandVitals');
const Visit = require('../models/Visit');
const { sendPushNotification } = require('../notifications/fcm');
const axios = require('axios');

const runDailySummary = async () => {
  console.log('Daily summary cron started:', new Date().toISOString());

  try {
    const patients = await Patient.find({ fcm_tokens: { $exists: true, $ne: [] } });
    console.log(`Running daily summary for ${patients.length} patients`);

    for (const patient of patients) {
      try {
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const vitals = await BandVitals.find({
          patient_id: patient.id,
          recorded_at: { $gte: since }
        });

        const latestVisit = await Visit.findOne(
          { patient_id: patient.id },
          null,
          { sort: { completed_at: -1 } }
        );

        let summary = null;
        try {
          const PI_URL = process.env.PI_LLM_URL || 'http://192.168.1.100:8080';
          const response = await axios.post(`${PI_URL}/api/analysis/daily-summary`, {
            patient_id: patient.id
          }, { timeout: 20000 });
          summary = response.data.summary;
        } catch (err) {
          if (vitals.length > 0) {
            const avgHR = Math.round(vitals.reduce((s, v) => s + (v.hr || 0), 0) / vitals.length);
            const avgSpO2 = (vitals.reduce((s, v) => s + (v.spo2 || 0), 0) / vitals.length).toFixed(1);
            summary = `${patient.name} had ${vitals.length} readings in the last 24 hours. Average HR: ${avgHR} bpm, SpO2: ${avgSpO2}%.`;
            if (latestVisit) {
              summary += ` Last checkup: ${latestVisit.risk_level || 'completed'}.`;
            }
          } else {
            summary = `No band data recorded for ${patient.name} in the last 24 hours.`;
          }
        }

        await Patient.findOneAndUpdate(
          { id: patient.id },
          { latest_summary: summary }
        );

        if (summary && patient.fcm_tokens.length > 0) {
          await sendPushNotification(
            patient.fcm_tokens,
            `Good morning — ${patient.name}'s daily summary`,
            summary,
            { patient_id: patient.id, type: 'daily_summary' }
          );
        }

        console.log(`Daily summary sent for patient: ${patient.name}`);
      } catch (err) {
        console.error(`Error generating summary for patient ${patient.id}:`, err.message);
      }
    }
  } catch (err) {
    console.error('Daily summary cron error:', err.message);
  }
};

module.exports = { runDailySummary };
