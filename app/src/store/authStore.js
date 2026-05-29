import { create } from 'zustand';
import { setAuthToken } from '../services/api';

const useAuthStore = create((set) => ({
  token: null,
  patientId: null,
  patient: null,
  isLoggedIn: false,

  login: (token, patientId, patient = null) => {
    setAuthToken(token);
    set({ token, patientId, patient, isLoggedIn: true });
  },

  setPatient: (patient) => set({ patient }),

  logout: () => {
    setAuthToken(null);
    set({ token: null, patientId: null, patient: null, isLoggedIn: false });
  },
}));

export default useAuthStore;
