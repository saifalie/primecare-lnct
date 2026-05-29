import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, StatusBar,
  TouchableOpacity, RefreshControl
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts, spacing, radius } from '../theme';
import useBleStore from '../store/bleStore';
import useAuthStore from '../store/authStore';
import { startScan } from '../services/bleService';
import { getAlerts, resolveAlert } from '../services/api';

const FILTERS = ['All', 'Emergency', 'Health', 'Medication'];

function getAlertIcon(type) {
  switch (type) {
    case 'fall': return '🚨';
    case 'sos': return '🆘';
    case 'hr_high': return '❤️';
    case 'spo2_low': return '🫁';
    case 'bp_trend': return '📊';
    case 'medication_missed': return '💊';
    default: return '⚠️';
  }
}

function getAlertColor(severity) {
  switch (severity) {
    case 'CRITICAL': return '#EF4444';
    case 'WARNING': return '#F59E0B';
    case 'INFO': return '#6366F1';
    default: return '#6366F1';
  }
}

function getAlertCategory(type) {
  if (type === 'fall' || type === 'sos') return 'Emergency';
  if (type === 'medication_missed') return 'Medication';
  return 'Health';
}

function timeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function AlertsScreen() {
  const [activeFilter, setActiveFilter] = useState('All');
  const [refreshing, setRefreshing] = useState(false);
  const [cloudAlerts, setCloudAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { lastFall, lastSOS } = useBleStore();
  const { patientId } = useAuthStore();

  const fetchAlerts = async () => {
    if (!patientId) { setLoading(false); return; }
    try {
      const res = await getAlerts(patientId);
      setCloudAlerts(Array.isArray(res.data) ? res.data : (res.data.alerts || []));
    } catch (err) {
      console.log('Alerts fetch error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAlerts(); }, [patientId]);

  const onRefresh = () => {
    setRefreshing(true);
    useBleStore.getState().setLastFall(null);
    useBleStore.getState().setLastSOS(null);
    fetchAlerts().then(() => setRefreshing(false));
  };

  // Build live BLE alerts
  const liveAlerts = [];
  if (lastFall) {
    liveAlerts.push({
      _id: 'live-fall', type: 'fall', severity: 'CRITICAL',
      message: `Fall detected. HR: ${lastFall.hr} SpO2: ${lastFall.spo2}${lastFall.gps_fixed ? ` Location: ${Number(lastFall.lat).toFixed(4)}, ${Number(lastFall.lng).toFixed(4)}` : ''}`,
      created_at: new Date().toISOString(),
    });
  }
  if (lastSOS) {
    liveAlerts.push({
      _id: 'live-sos', type: 'sos', severity: 'CRITICAL',
      message: `SOS triggered by ${lastSOS.triggered_by}.`,
      created_at: new Date().toISOString(),
    });
  }

  const allAlerts = [...liveAlerts, ...cloudAlerts];

  const filtered = activeFilter === 'All' ? allAlerts :
    allAlerts.filter(a => getAlertCategory(a.type) === activeFilter);

  const criticalCount = allAlerts.filter(a => a.severity === 'CRITICAL' && !a.resolved).length;

  const handleResolve = async (alertId) => {
    if (alertId.startsWith('live-')) {
      if (alertId === 'live-fall') useBleStore.getState().setLastFall(null);
      if (alertId === 'live-sos') useBleStore.getState().setLastSOS(null);
      return;
    }
    try {
      await resolveAlert(alertId);
      setCloudAlerts(prev => prev.map(a =>
        a._id === alertId ? { ...a, resolved: true } : a
      ));
    } catch (err) {
      console.log('Resolve error:', err.message);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <LinearGradient colors={['#0F0F1A', '#070710']} style={styles.header}>
        <Text style={styles.headerTitle}>Alerts</Text>
        {criticalCount > 0 && (
          <View style={styles.alertCountBadge}>
            <Text style={styles.alertCountText}>{criticalCount}</Text>
          </View>
        )}
      </LinearGradient>

      <View style={styles.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, activeFilter === f && styles.filterTabActive]}
            onPress={() => setActiveFilter(f)}
          >
            <Text style={[styles.filterText, activeFilter === f && styles.filterTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {loading && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Loading alerts...</Text>
          </View>
        )}

        {!loading && filtered.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>✅</Text>
            <Text style={styles.emptyTitle}>No alerts</Text>
            <Text style={styles.emptyText}>Everything looks good</Text>
          </View>
        )}

        {filtered.map((alert) => {
          const color = getAlertColor(alert.severity);
          return (
            <TouchableOpacity
              key={alert._id}
              activeOpacity={0.8}
              onLongPress={() => handleResolve(alert._id)}
            >
              <View style={[styles.alertCard, {
                borderColor: color + '30',
                opacity: alert.resolved ? 0.5 : 1
              }]}>
                <View style={[styles.alertStripe, { backgroundColor: color }]} />
                <View style={styles.alertInner}>
                  <View style={styles.alertIconWrap}>
                    <LinearGradient
                      colors={[color + '25', color + '10']}
                      style={styles.alertIconBg}
                    >
                      <Text style={styles.alertIconText}>{getAlertIcon(alert.type)}</Text>
                    </LinearGradient>
                  </View>
                  <View style={styles.alertContent}>
                    <View style={styles.alertTopRow}>
                      <View style={[styles.severityBadge, { backgroundColor: color + '20', borderColor: color + '40' }]}>
                        <Text style={[styles.severityText, { color }]}>{alert.severity}</Text>
                      </View>
                      <Text style={styles.alertTime}>{timeAgo(alert.created_at)}</Text>
                    </View>
                    <Text style={styles.alertMessage}>{alert.message}</Text>
                    {alert.resolved && (
                      <Text style={styles.resolvedText}>✓ Resolved</Text>
                    )}
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}

        {!loading && allAlerts.length > 0 && (
          <Text style={styles.hintText}>Long press an alert to resolve it</Text>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#070710' },
  header: {
    paddingTop: 56, paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
  },
  headerTitle: { fontFamily: fonts.black, fontSize: 28, color: '#FFFFFF', letterSpacing: -0.8 },
  alertCountBadge: {
    backgroundColor: '#EF444425', borderRadius: radius.full,
    paddingHorizontal: 8, paddingVertical: 2,
    borderWidth: 1, borderColor: '#EF444440',
  },
  alertCountText: { fontFamily: fonts.bold, fontSize: 12, color: '#EF4444' },
  filterRow: {
    flexDirection: 'row', paddingHorizontal: spacing.md,
    paddingBottom: spacing.md, gap: spacing.xs,
  },
  filterTab: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: radius.full, backgroundColor: '#13131F',
    borderWidth: 1, borderColor: '#1E1E30',
  },
  filterTabActive: { backgroundColor: colors.primary + '25', borderColor: colors.primary + '60' },
  filterText: { fontFamily: fonts.medium, fontSize: 12, color: '#4A4A6A' },
  filterTextActive: { color: colors.primary },
  scroll: { paddingHorizontal: spacing.md },
  emptyState: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: spacing.md },
  emptyTitle: { fontFamily: fonts.bold, fontSize: 20, color: '#FFFFFF', marginBottom: spacing.xs },
  emptyText: { fontFamily: fonts.regular, fontSize: 14, color: '#4A4A6A' },
  alertCard: {
    backgroundColor: '#13131F', borderRadius: radius.xl,
    borderWidth: 1, overflow: 'hidden',
    flexDirection: 'row', marginBottom: spacing.sm,
  },
  alertStripe: { width: 3 },
  alertInner: { flex: 1, flexDirection: 'row', padding: spacing.md, gap: spacing.sm },
  alertIconWrap: {},
  alertIconBg: {
    width: 44, height: 44, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  alertIconText: { fontSize: 22 },
  alertContent: { flex: 1 },
  alertTopRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 6,
  },
  severityBadge: {
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: radius.full, borderWidth: 1,
  },
  severityText: { fontFamily: fonts.bold, fontSize: 9, letterSpacing: 1 },
  alertTime: { fontFamily: fonts.regular, fontSize: 11, color: '#4A4A6A' },
  alertMessage: { fontFamily: fonts.regular, fontSize: 13, color: '#94A3B8', lineHeight: 20 },
  resolvedText: { fontFamily: fonts.semiBold, fontSize: 11, color: '#22C55E', marginTop: 4 },
  hintText: {
    fontFamily: fonts.regular, fontSize: 11, color: '#3D3D5C',
    textAlign: 'center', marginBottom: spacing.md,
  },
});
