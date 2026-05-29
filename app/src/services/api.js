import axios from 'axios';

const CLOUD_URL = 'https://primecare-cloud-production.up.railway.app';

const api = axios.create({
  baseURL: CLOUD_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Auth token injector
export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

// ─── AUTH ───────────────────────────────────────────
export const requestOTP = (phone) =>
  api.post('/api/auth/request-otp', { phone });

export const verifyOTP = (phone, otp) =>
  api.post('/api/auth/verify-otp', { phone, otp });

export const registerDevice = (patient_id, fcm_token) =>
  api.post('/api/auth/devices/register', { patient_id, fcm_token });

// ─── PATIENT ─────────────────────────────────────────
export const getPatient = (patientId) =>
  api.get(`/api/patients/${patientId}`);

export const updateContacts = (patientId, contacts) =>
  api.put(`/api/patients/${patientId}/contacts`, { contacts });

export const getPatientSummary = (patientId) =>
  api.get(`/api/patients/${patientId}/summary`);

// ─── VITALS ──────────────────────────────────────────
export const getLiveVitals = (patientId) =>
  api.get(`/api/vitals/${patientId}/live`);

export const getVitalsHistory = (patientId, days = 7) =>
  api.get(`/api/vitals/${patientId}/history?days=${days}`);

// ─── ALERTS ──────────────────────────────────────────
export const getAlerts = (patientId) =>
  api.get(`/api/alerts/${patientId}`);

export const resolveAlert = (alertId) =>
  api.put(`/api/alerts/${alertId}/resolve`);

// ─── MEDICATIONS ─────────────────────────────────────
export const getMedications = (patientId) =>
  api.get(`/api/medications/${patientId}`);

export const addMedication = (patientId, data) =>
  api.post(`/api/medications/${patientId}`, data);

export const updateMedication = (medicationId, data) =>
  api.put(`/api/medications/${medicationId}`, data);

export const deleteMedication = (medicationId) =>
  api.delete(`/api/medications/${medicationId}`);

// ─── VISITS ──────────────────────────────────────────
export const getVisits = (patientId) =>
  api.get(`/api/visits/${patientId}`);

export const getVisit = (patientId, visitId) =>
  api.get(`/api/visits/${patientId}/${visitId}`);

// ─── ANALYSIS ────────────────────────────────────────
export const getHistoryAnalysis = (patientId, days = 30) =>
  api.post('/api/analysis/history', { patient_id: patientId, days });

export const getTrend = (patientId, days = 7) =>
  api.get(`/api/analysis/trend/${patientId}?days=${days}`);

// ─── INBOUND (Pi gateway sends here — not called from app) ───
// These are used by Pi only, listed here for reference:
// POST /api/inbound/band/vitals
// POST /api/inbound/alerts
// POST /api/inbound/visits

export default api;
