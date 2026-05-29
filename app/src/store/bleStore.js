import { create } from 'zustand';

const useBleStore = create((set) => ({
  // Connection state
  isConnected: false,
  isScanning: false,
  deviceId: null,
  deviceName: null,
  signalStrength: null,

  // Live vitals from band
  vitals: {
    hr: '--',
    spo2: '--',
    temperature: '--',
    steps: 0,
    battery: 0,
    lat: 0,
    lng: 0,
    gps_fixed: false,
  },

  // Alerts
  lastFall: null,
  lastSOS: null,

  // Last updated
  lastUpdated: null,

  // Actions
  setConnected: (deviceId, deviceName) => set({
    isConnected: true,
    deviceId,
    deviceName,
  }),

  setDisconnected: () => set({
    isConnected: false,
    deviceId: null,
    deviceName: null,
    vitals: {
      hr: '--',
      spo2: '--',
      temperature: '--',
      steps: 0,
      battery: 0,
      lat: 0,
      lng: 0,
      gps_fixed: false,
    },
  }),

  setVitals: (vitals) => set({
    vitals,
    lastUpdated: new Date(),
  }),

  setScanning: (isScanning) => set({ isScanning }),
  setSignalStrength: (signalStrength) => set({ signalStrength }),
  setLastFall: (data) => set({ lastFall: data }),
  setLastSOS: (data) => set({ lastSOS: data }),
}));

export default useBleStore;
