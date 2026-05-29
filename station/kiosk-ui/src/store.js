import { create } from 'zustand'

const useStore = create((set) => ({
  // Patient
  patient: null,
  setPatient: (patient) => set({ patient }),

  // Session
  sessionId: null,
  setSessionId: (sessionId) => set({ sessionId }),

  // Mode: 'daily' or 'special'
  mode: null,
  setMode: (mode) => set({ mode }),

  // Current step
  currentStep: 0,
  setCurrentStep: (currentStep) => set({ currentStep }),

  // All sensor readings collected so far
  readings: {},
  setReading: (key, value) => set((state) => ({
    readings: { ...state.readings, [key]: value }
  })),

  // Watchdog alerts
  watchdogAlerts: [],
  setWatchdogAlerts: (watchdogAlerts) => set({ watchdogAlerts }),

  // Global WebSocket instance (set by KioskLayout)
  ws: null,
  setWs: (ws) => set({ ws }),

  // Final diagnosis result
  diagnosisResult: null,
  setDiagnosisResult: (diagnosisResult) => set({ diagnosisResult }),

  // Reset everything for next patient
  resetSession: () => set({
    patient: null,
    sessionId: null,
    mode: null,
    currentStep: 0,
    readings: {},
    watchdogAlerts: [],
    diagnosisResult: null,
  }),
}))

export default useStore
