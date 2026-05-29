import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, StatusBar,
  TouchableOpacity, Switch, RefreshControl
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts, spacing, radius } from '../theme';
import useBleStore from '../store/bleStore';
import useAuthStore from '../store/authStore';
import { startScan, disconnect } from '../services/bleService';
import { getPatient } from '../services/api';

export default function ProfileScreen() {
  const [auto112, setAuto112] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const { isConnected, vitals } = useBleStore();
  const { patientId, logout } = useAuthStore();

  const fetchPatient = async () => {
    if (!patientId) { setLoading(false); return; }
    try {
      const res = await getPatient(patientId);
      setPatient(res.data);
      if (res.data.auto_112 !== undefined) setAuto112(res.data.auto_112);
    } catch (err) {
      console.log('Patient fetch error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPatient(); }, [patientId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPatient().then(() => setRefreshing(false));
  };

  const initials = patient?.name
    ? patient.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'PC';

  const conditions = patient?.conditions || [];
  const allergies = patient?.allergies || [];
  const contacts = patient?.emergency_contacts || [];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Profile hero */}
        <LinearGradient colors={['#1A1A35', '#070710']} style={styles.hero}>
          <View style={styles.avatarWrap}>
            <LinearGradient colors={['#818CF8', '#6366F1', '#4F46E5']} style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </LinearGradient>
            <View style={[styles.onlineDot, { backgroundColor: isConnected ? '#22C55E' : '#EF4444' }]} />
          </View>
          <Text style={styles.patientName}>{patient?.name || (loading ? 'Loading...' : 'No Patient')}</Text>
          <Text style={styles.patientAge}>
            {patient ? `${patient.age} years · ${patient.blood_group || 'Unknown'}` : ''}
          </Text>
          <View style={styles.bandStatusRow}>
            <View style={[styles.bandStatusDot, { backgroundColor: isConnected ? '#22C55E' : '#EF4444' }]} />
            <Text style={[styles.bandStatusText, { color: isConnected ? '#22C55E' : '#EF4444' }]}>
              {isConnected ? 'PrimeBand Connected' : 'PrimeBand Offline'}
            </Text>
            {!isConnected && (
              <TouchableOpacity onPress={startScan} style={styles.reconnectBtn}>
                <Text style={styles.reconnectText}>↺ Scan</Text>
              </TouchableOpacity>
            )}
          </View>
        </LinearGradient>

        {/* Band info */}
        {isConnected && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Band Status</Text>
            <View style={styles.card}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Battery</Text>
                <Text style={[styles.infoValue, {
                  color: vitals.battery < 20 ? '#EF4444' : vitals.battery < 40 ? '#F59E0B' : '#22C55E'
                }]}>{vitals.battery}%</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Steps Today</Text>
                <Text style={styles.infoValue}>{vitals.steps}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>GPS</Text>
                <Text style={[styles.infoValue, { color: vitals.gps_fixed ? '#22C55E' : '#F59E0B' }]}>
                  {vitals.gps_fixed ? 'Fixed' : 'Searching'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Medical info */}
        {patient && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Medical Info</Text>
            <View style={styles.card}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Blood Group</Text>
                <Text style={[styles.infoValue, { color: '#EF4444' }]}>
                  {patient.blood_group || 'Unknown'}
                </Text>
              </View>
              {conditions.length > 0 && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Conditions</Text>
                    <View style={styles.tagsWrap}>
                      {conditions.map((c, i) => (
                        <View key={i} style={styles.tag}>
                          <Text style={styles.tagText}>{c}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </>
              )}
              {allergies.length > 0 && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Allergies</Text>
                    <View style={styles.tagsWrap}>
                      {allergies.map((a, i) => (
                        <View key={i} style={[styles.tag, { backgroundColor: '#EF444415', borderColor: '#EF444430' }]}>
                          <Text style={[styles.tagText, { color: '#EF4444' }]}>{a}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </>
              )}
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Phone</Text>
                <Text style={styles.infoValue}>{patient.phone || '--'}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Emergency contacts */}
        {contacts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Emergency Contacts</Text>
            {contacts.map((contact, i) => (
              <View key={i} style={[styles.contactCard, { borderColor: i === 0 ? '#EF444430' : '#1E1E30' }]}>
                <View style={[styles.priorityBadge, { backgroundColor: i === 0 ? '#EF444420' : '#6366F120' }]}>
                  <Text style={[styles.priorityText, { color: i === 0 ? '#EF4444' : colors.primary }]}>
                    #{contact.priority || i + 1}
                  </Text>
                </View>
                <View style={styles.contactInfo}>
                  <Text style={styles.contactName}>{contact.name}</Text>
                  <Text style={styles.contactRelation}>{contact.relation}</Text>
                  <Text style={styles.contactPhone}>{contact.phone}</Text>
                </View>
                <TouchableOpacity style={styles.callBtn}>
                  <Text style={styles.callBtnText}>📞</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View>
                <Text style={styles.settingLabel}>Auto 112</Text>
                <Text style={styles.settingDesc}>Auto-call emergency if no response</Text>
              </View>
              <Switch
                value={auto112}
                onValueChange={setAuto112}
                trackColor={{ false: '#1E1E30', true: '#EF444440' }}
                thumbColor={auto112 ? '#EF4444' : '#4A4A6A'}
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.settingRow}>
              <View>
                <Text style={styles.settingLabel}>Push Notifications</Text>
                <Text style={styles.settingDesc}>Alerts and daily summaries</Text>
              </View>
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{ false: '#1E1E30', true: colors.primary + '40' }}
                thumbColor={notifications ? colors.primary : '#4A4A6A'}
              />
            </View>
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#070710' },
  scroll: {},
  hero: { paddingTop: 70, paddingBottom: spacing.xl, alignItems: 'center', gap: spacing.xs },
  avatarWrap: { position: 'relative', marginBottom: spacing.sm },
  avatar: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.bold, fontSize: 28, color: '#FFFFFF' },
  onlineDot: {
    position: 'absolute', bottom: 2, right: 2,
    width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: '#070710',
  },
  patientName: { fontFamily: fonts.black, fontSize: 28, color: '#FFFFFF', letterSpacing: -0.8 },
  patientAge: { fontFamily: fonts.regular, fontSize: 14, color: '#64748B' },
  bandStatusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs },
  bandStatusDot: { width: 8, height: 8, borderRadius: 4 },
  bandStatusText: { fontFamily: fonts.semiBold, fontSize: 13 },
  reconnectBtn: {
    backgroundColor: colors.primary + '25', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: radius.full, borderWidth: 1, borderColor: colors.primary + '50',
  },
  reconnectText: { fontFamily: fonts.semiBold, fontSize: 11, color: colors.primary },
  section: { paddingHorizontal: spacing.md, marginBottom: spacing.lg },
  sectionTitle: { fontFamily: fonts.bold, fontSize: 18, color: '#FFFFFF', letterSpacing: -0.5, marginBottom: spacing.sm },
  card: { backgroundColor: '#13131F', borderRadius: radius.xl, borderWidth: 1, borderColor: '#1E1E30', overflow: 'hidden' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md },
  infoLabel: { fontFamily: fonts.regular, fontSize: 14, color: '#64748B' },
  infoValue: { fontFamily: fonts.semiBold, fontSize: 14, color: '#FFFFFF' },
  divider: { height: 1, backgroundColor: '#1E1E30' },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, justifyContent: 'flex-end' },
  tag: {
    backgroundColor: '#6366F115', borderWidth: 1, borderColor: '#6366F130',
    borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 3,
  },
  tagText: { fontFamily: fonts.medium, fontSize: 11, color: colors.primary },
  contactCard: {
    backgroundColor: '#13131F', borderRadius: radius.xl, borderWidth: 1,
    flexDirection: 'row', alignItems: 'center', padding: spacing.md,
    gap: spacing.sm, marginBottom: spacing.sm,
  },
  priorityBadge: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  priorityText: { fontFamily: fonts.bold, fontSize: 13 },
  contactInfo: { flex: 1 },
  contactName: { fontFamily: fonts.semiBold, fontSize: 15, color: '#FFFFFF' },
  contactRelation: { fontFamily: fonts.regular, fontSize: 12, color: '#64748B' },
  contactPhone: { fontFamily: fonts.regular, fontSize: 12, color: '#4A4A6A' },
  callBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#22C55E15', alignItems: 'center', justifyContent: 'center' },
  callBtnText: { fontSize: 20 },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md },
  settingLabel: { fontFamily: fonts.semiBold, fontSize: 15, color: '#FFFFFF', marginBottom: 2 },
  settingDesc: { fontFamily: fonts.regular, fontSize: 12, color: '#4A4A6A' },
  logoutBtn: {
    marginHorizontal: spacing.md, backgroundColor: '#EF444415',
    borderRadius: radius.xl, borderWidth: 1, borderColor: '#EF444430',
    padding: spacing.md, alignItems: 'center', marginBottom: spacing.md,
  },
  logoutText: { fontFamily: fonts.semiBold, fontSize: 15, color: '#EF4444' },
});
