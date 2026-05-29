import { create } from 'zustand';

const FAMILY_MEMBERS = [
  { id: 'patient-001', name: 'Papa', age: 68, initials: 'PA', color: '#6366F1', role: 'Patient' },
  { id: 'patient-002', name: 'Dadi', age: 72, initials: 'DA', color: '#22C55E', role: 'Patient' },
  { id: 'patient-003', name: 'Saif', age: 26, initials: 'SA', color: '#F59E0B', role: 'Caregiver' },
];

const useProfileStore = create((set, get) => ({
  activePatientId: 'patient-001',
  members: FAMILY_MEMBERS,

  setActivePatient: (id) => set({ activePatientId: id }),

  getActiveMember: () => {
    const { activePatientId, members } = get();
    return members.find(m => m.id === activePatientId) || members[0];
  },
}));

export default useProfileStore;
