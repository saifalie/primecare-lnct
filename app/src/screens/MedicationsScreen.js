import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, StatusBar,
  TouchableOpacity, RefreshControl, Modal, TextInput
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts, spacing, radius } from '../theme';
import useAuthStore from '../store/authStore';
import { getMedications, addMedication, deleteMedication } from '../services/api';

function getStatusColor(status) {
  switch (status) {
    case 'taken': return '#22C55E';
    case 'missed': return '#EF4444';
    case 'due': return '#F59E0B';
    default: return '#4A4A6A';
  }
}

function getStatusLabel(status) {
  switch (status) {
    case 'taken': return '✓ Taken';
    case 'missed': return '✗ Missed';
    case 'due': return '⏰ Due Now';
    default: return '○ Upcoming';
  }
}

function getMedStatus(times) {
  if (!times || times.length === 0) return 'upcoming';
  const now = new Date();
  const currentHour = now.getHours();
  const currentMin = now.getMinutes();
  const currentTotal = currentHour * 60 + currentMin;

  for (const t of times) {
    const [h, m] = t.split(':').map(Number);
    const medTotal = h * 60 + m;
    const diff = currentTotal - medTotal;
    if (diff >= 0 && diff <= 60) return 'due';
    if (diff > 60) return 'upcoming';
  }
  return 'upcoming';
}

const MED_COLORS = ['#6366F1', '#22C55E', '#F59E0B', '#EF4444', '#38BDF8', '#FB923C'];

export default function MedicationsScreen() {
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMed, setNewMed] = useState({ name: '', dose: '', time: '', purpose: '' });
  const [saving, setSaving] = useState(false);
  const { patientId } = useAuthStore();

  const fetchMedications = async () => {
    if (!patientId) { setLoading(false); return; }
    try {
      const res = await getMedications(patientId);
      setMedications(res.data);
    } catch (err) {
      console.log('Medications fetch error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMedications(); }, [patientId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMedications().then(() => setRefreshing(false));
  };

  const handleAdd = async () => {
    if (!newMed.name || !newMed.dose) return;
    setSaving(true);
    try {
      const times = newMed.time ? [newMed.time] : ['08:00'];
      await addMedication(patientId, {
        name: newMed.name,
        dose: newMed.dose,
        frequency: 'daily',
        times,
        purpose: newMed.purpose || '',
        active: true,
      });
      setNewMed({ name: '', dose: '', time: '', purpose: '' });
      setShowAddModal(false);
      fetchMedications();
    } catch (err) {
      console.log('Add medication error:', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (medId) => {
    try {
      await deleteMedication(medId);
      setMedications(prev => prev.filter(m => m._id !== medId));
    } catch (err) {
      console.log('Delete error:', err.message);
    }
  };

  const takenCount = medications.filter(m => getMedStatus(m.times) === 'taken').length;
  const compliance = medications.length > 0
    ? Math.round((takenCount / medications.length) * 100)
    : 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <LinearGradient colors={['#0F0F1A', '#070710']} style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Medications</Text>
            <Text style={styles.headerSub}>Today's schedule</Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddModal(true)}>
            <Text style={styles.addBtnText}>+ Add</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Compliance card */}
        <View style={styles.complianceCard}>
          <LinearGradient colors={['#1A1A35', '#12122A']} style={styles.complianceGradient}>
            <View style={styles.complianceLeft}>
              <Text style={styles.complianceLabel}>Today's Compliance</Text>
              <Text style={[styles.complianceValue, {
                color: compliance >= 80 ? '#22C55E' : compliance >= 50 ? '#F59E0B' : '#EF4444'
              }]}>{compliance}%</Text>
              <Text style={styles.complianceSub}>{takenCount} of {medications.length} taken</Text>
            </View>
            <View style={styles.complianceRing}>
              <View style={[styles.ringOuter, {
                borderColor: compliance >= 80 ? '#22C55E' : compliance >= 50 ? '#F59E0B' : '#EF4444'
              }]}>
                <Text style={[styles.ringValue, {
                  color: compliance >= 80 ? '#22C55E' : compliance >= 50 ? '#F59E0B' : '#EF4444'
                }]}>{compliance}%</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        <Text style={styles.sectionTitle}>Today's Schedule</Text>

        {loading && (
          <Text style={styles.loadingText}>Loading medications...</Text>
        )}

        {!loading && medications.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>💊</Text>
            <Text style={styles.emptyTitle}>No medications</Text>
            <Text style={styles.emptyText}>Tap + Add to add a medication</Text>
          </View>
        )}

        {medications.map((med, i) => {
          const status = getMedStatus(med.times);
          const color = MED_COLORS[i % MED_COLORS.length];
          const timeStr = med.times && med.times.length > 0 ? med.times.join(', ') : '--';
          return (
            <View key={med._id} style={[styles.medCard, { borderColor: color + '25' }]}>
              <View style={[styles.medStripe, { backgroundColor: color }]} />
              <View style={styles.medInner}>
                <View style={[styles.medIconWrap, { backgroundColor: color + '20' }]}>
                  <Text style={styles.medIcon}>💊</Text>
                </View>
                <View style={styles.medContent}>
                  <View style={styles.medTopRow}>
                    <Text style={styles.medName}>{med.name}</Text>
                    <Text style={[styles.medStatus, { color: getStatusColor(status) }]}>
                      {getStatusLabel(status)}
                    </Text>
                  </View>
                  <Text style={styles.medDose}>{med.dose}{med.purpose ? ` · ${med.purpose}` : ''}</Text>
                  <Text style={styles.medTime}>{timeStr}</Text>
                </View>
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleDelete(med._id)}
                >
                  <Text style={styles.deleteBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Add Medication Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Medication</Text>
            <TextInput
              style={styles.input}
              placeholder="Medication name"
              placeholderTextColor="#4A4A6A"
              value={newMed.name}
              onChangeText={t => setNewMed(p => ({ ...p, name: t }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Dose (e.g. 500mg)"
              placeholderTextColor="#4A4A6A"
              value={newMed.dose}
              onChangeText={t => setNewMed(p => ({ ...p, dose: t }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Time (e.g. 08:00)"
              placeholderTextColor="#4A4A6A"
              value={newMed.time}
              onChangeText={t => setNewMed(p => ({ ...p, time: t }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Purpose (e.g. Blood Pressure)"
              placeholderTextColor="#4A4A6A"
              value={newMed.purpose}
              onChangeText={t => setNewMed(p => ({ ...p, purpose: t }))}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddModal(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleAdd} disabled={saving}>
                <LinearGradient colors={['#6366F1', '#4F46E5']} style={styles.saveBtnGradient}>
                  <Text style={styles.saveText}>{saving ? 'Saving...' : 'Add'}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#070710' },
  header: { paddingTop: 56, paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  headerTitle: { fontFamily: fonts.black, fontSize: 28, color: '#FFFFFF', letterSpacing: -0.8 },
  headerSub: { fontFamily: fonts.regular, fontSize: 13, color: '#4A4A6A', marginTop: 2 },
  addBtn: {
    backgroundColor: colors.primary + '25', paddingHorizontal: 16,
    paddingVertical: 8, borderRadius: radius.full,
    borderWidth: 1, borderColor: colors.primary + '50',
  },
  addBtnText: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.primary },
  scroll: { paddingHorizontal: spacing.md },
  complianceCard: {
    borderRadius: radius.xl, overflow: 'hidden',
    borderWidth: 1, borderColor: '#22C55E20', marginBottom: spacing.lg,
  },
  complianceGradient: {
    padding: spacing.lg, flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center',
  },
  complianceLeft: {},
  complianceLabel: { fontFamily: fonts.regular, fontSize: 12, color: '#4A4A6A', marginBottom: 4 },
  complianceValue: { fontFamily: fonts.black, fontSize: 48, letterSpacing: -2 },
  complianceSub: { fontFamily: fonts.regular, fontSize: 13, color: '#4A4A6A' },
  complianceRing: { alignItems: 'center', justifyContent: 'center' },
  ringOuter: {
    width: 80, height: 80, borderRadius: 40,
    borderWidth: 6, alignItems: 'center', justifyContent: 'center',
  },
  ringValue: { fontFamily: fonts.bold, fontSize: 18 },
  sectionTitle: {
    fontFamily: fonts.bold, fontSize: 20, color: '#FFFFFF',
    letterSpacing: -0.5, marginBottom: spacing.sm, marginTop: spacing.sm,
  },
  loadingText: { fontFamily: fonts.regular, fontSize: 14, color: '#4A4A6A', textAlign: 'center', marginTop: 40 },
  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: spacing.md },
  emptyTitle: { fontFamily: fonts.bold, fontSize: 20, color: '#FFFFFF', marginBottom: spacing.xs },
  emptyText: { fontFamily: fonts.regular, fontSize: 14, color: '#4A4A6A' },
  medCard: {
    backgroundColor: '#13131F', borderRadius: radius.xl,
    borderWidth: 1, overflow: 'hidden', flexDirection: 'row', marginBottom: spacing.sm,
  },
  medStripe: { width: 3 },
  medInner: {
    flex: 1, flexDirection: 'row', padding: spacing.md,
    gap: spacing.sm, alignItems: 'center',
  },
  medIconWrap: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  medIcon: { fontSize: 22 },
  medContent: { flex: 1 },
  medTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  medName: { fontFamily: fonts.semiBold, fontSize: 15, color: '#FFFFFF' },
  medStatus: { fontFamily: fonts.semiBold, fontSize: 11 },
  medDose: { fontFamily: fonts.regular, fontSize: 12, color: '#64748B', marginBottom: 2 },
  medTime: { fontFamily: fonts.regular, fontSize: 12, color: '#4A4A6A' },
  deleteBtn: { padding: 8 },
  deleteBtnText: { fontFamily: fonts.bold, fontSize: 14, color: '#4A4A6A' },
  modalOverlay: { flex: 1, backgroundColor: '#000000CC', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: '#13131F', borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl, padding: spacing.lg,
    borderWidth: 1, borderColor: '#1E1E30',
  },
  modalTitle: { fontFamily: fonts.bold, fontSize: 22, color: '#FFFFFF', marginBottom: spacing.lg },
  input: {
    backgroundColor: '#0F0F1A', borderRadius: radius.md, padding: spacing.md,
    color: '#FFFFFF', fontFamily: fonts.regular, fontSize: 15,
    borderWidth: 1, borderColor: '#1E1E30', marginBottom: spacing.sm,
  },
  modalBtns: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  cancelBtn: { flex: 1, padding: spacing.md, borderRadius: radius.md, backgroundColor: '#1E1E30', alignItems: 'center' },
  cancelText: { fontFamily: fonts.semiBold, fontSize: 15, color: '#64748B' },
  saveBtn: { flex: 1, borderRadius: radius.md, overflow: 'hidden' },
  saveBtnGradient: { padding: spacing.md, alignItems: 'center' },
  saveText: { fontFamily: fonts.semiBold, fontSize: 15, color: '#FFFFFF' },
});
