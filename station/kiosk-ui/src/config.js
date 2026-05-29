const CLOUD_URL = 'https://primecare-cloud-production.up.railway.app'

const config = {
  API_URL: CLOUD_URL,
  WS_URL: `wss://primecare-cloud-production.up.railway.app/ws`,
  LOCAL_URL: `https://${window.location.hostname}`,
  SIMULATION_DATASETS: {
    GREEN: {
      hr: 72, spo2: 98, temperature: 36.8,
      bp_systolic: 118, bp_diastolic: 76,
    },
    YELLOW: {
      hr: 88, spo2: 96, temperature: 37.1,
      bp_systolic: 148, bp_diastolic: 94,
    },
    RED: {
      hr: 108, spo2: 91, temperature: 38.9,
      bp_systolic: 182, bp_diastolic: 112,
    }
  }
}
export default config
