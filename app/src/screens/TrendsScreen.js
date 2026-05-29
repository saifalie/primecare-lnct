import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, StatusBar,
  TouchableOpacity, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts, spacing, radius } from '../theme';
import { TrendChart } from '../components';
import useBleStore from '../store/bleStore';
import useAuthStore from '../store/authStore';
import { getVitalsHistory, getTrend } from '../services/api';

const TIME_RANGES = ['24H', '7D', '30D'];

const TABS = [
  { key: 'hr',    label: 'Heart Rate', unit: 'bpm', color: '#FF4D6D', baseline: 72 },
  { key: 'spo2',  label: 'SpO2',       unit: '%',   color: '#38BDF8', baseline: 97 },
  { key: 'steps', label: 'Steps',      unit: 'steps', color: '#6366F1', baseline: 5000 },
];

function generateMockData(base, variance, count) {
  return Array.from({ length: count }, (_, i) => ({
    x: i + 1,
    y: Math.round(base + (Math.random() - 0.5) * variance * 2),
  }));
}

export default function TrendsScreen() {
  const [activeTab, setActiveTab] = useState('hr');
  const [activeRange, setActiveRange] = useState('7D');
  const [refreshing, setRefreshing] = useState(false);
  const [vitalsHistory, setVitalsHistory] = useState([]);
  const [trendSummary, setTrendSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const { vitals } = useBleStore();
  const { patientId } = useAuthStore();

  const getDays = () => {
    switch (activeRange) {
      case '24H': return 1;
      case '7D':  return 7;
      case '30D': return 30;
      default:    return 7;
    }
  };

  const fetchData = async () => {
    if (!patientId) { setLoading(false); return; }
    try {
      const [historyRes, trendRes] = await Promise.all([
        getVitalsHistory(patientId, getDays()),
        getTrend(patientId, getDays()),
      ]);
      setVitalsHistory(historyRes.data);
      setTrendSummary(trendRes.data);
    } catch (err) {
      console.log('Trends fetch error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [patientId, activeRange]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData().then(() => setRefreshing(false));
  };

  const currentTab = TABS.find(t => t.key === activeTab);

  // Build chart data from real vitals history
  const getChartData = () => {
    if (vitalsHistory.length < 2) {
      // Fall back to mock if no real data
      const base = activeTab === 'hr' ? 72 : activeTab === 'spo2' ? 97 : 3000;
      const variance = activeTab === 'hr' ? 6 : activeTab === 'spo2' ? 2 : 2000;
      return generateMockData(base, variance, 7);
    }
    return vitalsHistory.map((v, i) => ({
      x: i + 1,
      y: activeTab === 'hr' ? (v.hr || 0) :
         activeTab === 'spo2' ? (v.spo2 || 0) :
         (v.steps || 0),
    })).filter(d => d.y > 0);
  };

  const getCurrentValue = () => {
    switch (activeTab) {
      case 'hr':    return vitals.hr === '--' ? '--' : vitals.hr;
      case 'spo2':  return vitals.spo2 === '--' ? '--' : vitals.spo2;
      case 'steps': return vitals.steps;
      default:      return '--';
    }
  };

  const data = getChartData();
  const values = data.map(d => d.y).filter(v => v > 0);
  const avgVal = values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : '--';
  const minVal = values.length > 0 ? Math.min(...values) : '--';
  const maxVal = values.length > 0 ? Math.max(...values) : '--';

  const hasRealData = vitalsHistory.length >= 2;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <LinearGradient colors={['#0F0F1A', '#070710']} style={styles.header}>
        <Text style={styles.headerTitle}>Trends</Text>
        <Text style={styles.headerSub}>
          {hasRealData ? `${vitalsHistory.length} readings from band` : 'Connect band for real data'}
        </Text>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Metric tabs */}
        <View style={styles.tabRow}>
          {TABS.map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && { backgroundColor: tab.color + '20', borderColor: tab.color + '50' }]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[styles.tabText, activeTab === tab.key && { color: tab.color }]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Current value card */}
        <View style={[styles.currentCard, { borderColor: currentTab.color + '30' }]}>
          <LinearGradient
            colors={[currentTab.color + '15', currentTab.color + '05']}
            style={styles.currentGradient}
          >
            <View style={styles.currentLeft}>
              <Text style={styles.currentLabel}>Current (Live)</Text>
              <Text style={[styles.currentValue, { color: currentTab.color }]}>
                {getCurrentValue()}
              </Text>
              <Text style={[styles.currentUnit, { color: currentTab.color + 'AA' }]}>
                {currentTab.unit}
              </Text>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Avg</Text>
                <Text style={[styles.statValue, { color: currentTab.color }]}>{avgVal}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Min</Text>
                <Text style={[styles.statValue, { color: '#22C55E' }]}>{minVal}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Max</Text>
                <Text style={[styles.statValue, { color: '#EF4444' }]}>{maxVal}</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Cloud trend summary */}
        {trendSummary && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Period Summary</Text>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Checkups</Text>
                <Text style={styles.summaryValue}>{trendSummary.total_visits}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Avg HR</Text>
                <Text style={[styles.summaryValue, { color: '#FF4D6D' }]}>{trendSummary.avg_hr || '--'}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Avg SpO2</Text>
                <Text style={[styles.summaryValue, { color: '#38BDF8' }]}>{trendSummary.avg_spo2 || '--'}</Text>
              </View>
            </View>
            {trendSummary.risk_breakdown && (
              <View style={styles.riskRow}>
                <View style={[styles.riskBadge, { backgroundColor: '#22C55E15', borderColor: '#22C55E30' }]}>
                  <Text style={[styles.riskText, { color: '#22C55E' }]}>✓ {trendSummary.risk_breakdown.GREEN} Good</Text>
                </View>
                <View style={[styles.riskBadge, { backgroundColor: '#F59E0B15', borderColor: '#F59E0B30' }]}>
                  <Text style={[styles.riskText, { color: '#F59E0B' }]}>⚠ {trendSummary.risk_breakdown.YELLOW} Attention</Text>
                </View>
                <View style={[styles.riskBadge, { backgroundColor: '#EF444415', borderColor: '#EF444430' }]}>
                  <Text style={[styles.riskText, { color: '#EF4444' }]}>✕ {trendSummary.risk_breakdown.RED} Urgent</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Time range selector */}
        <View style={styles.rangeRow}>
          {TIME_RANGES.map(r => (
            <TouchableOpacity
              key={r}
              style={[styles.rangeBtn, activeRange === r && styles.rangeBtnActive]}
              onPress={() => setActiveRange(r)}
            >
              <Text style={[styles.rangeText, activeRange === r && styles.rangeTextActive]}>{r}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {!hasRealData && (
          <View style={styles.mockNotice}>
            <Text style={styles.mockNoticeText}>
              📡 Showing sample data — connect band and sync to see real trends
            </Text>
          </View>
        )}

        {/* Chart */}
        <TrendChart
          data={data}
          color={currentTab.color}
          label={currentTab.label.toUpperCase()}
          unit={currentTab.unit}
          baseline={currentTab.baseline}
          index={0}
        />

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#070710' },
  header: { paddingTop: 56, paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  headerTitle: { fontFamily: fonts.black, fontSize: 28, color: '#FFFFFF', letterSpacing: -0.8 },
  headerSub: { fontFamily: fonts.regular, fontSize: 13, color: '#4A4A6A', marginTop: 2 },
  scroll: { paddingHorizontal: spacing.md },
  tabRow: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.md },
  tab: {
    flex: 1, paddingVertical: 8, borderRadius: radius.md,
    backgroundColor: '#13131F', borderWidth: 1, borderColor: '#1E1E30', alignItems: 'center',
  },
  tabText: { fontFamily: fonts.semiBold, fontSize: 11, color: '#4A4A6A' },
  currentCard: { borderRadius: radius.xl, overflow: 'hidden', borderWidth: 1, marginBottom: spacing.md },
  currentGradient: {
    padding: spacing.md, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between',
  },
  currentLeft: {},
  currentLabel: { fontFamily: fonts.regular, fontSize: 11, color: '#4A4A6A', marginBottom: 4 },
  currentValue: { fontFamily: fonts.black, fontSize: 48, letterSpacing: -2 },
  currentUnit: { fontFamily: fonts.semiBold, fontSize: 13 },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statItem: { alignItems: 'center' },
  statLabel: { fontFamily: fonts.regular, fontSize: 11, color: '#4A4A6A', marginBottom: 4 },
  statValue: { fontFamily: fonts.bold, fontSize: 18 },
  statDivider: { width: 1, height: 30, backgroundColor: '#1E1E30' },
  summaryCard: {
    backgroundColor: '#13131F', borderRadius: radius.xl,
    borderWidth: 1, borderColor: '#1E1E30',
    padding: spacing.md, marginBottom: spacing.md,
  },
  summaryTitle: { fontFamily: fonts.semiBold, fontSize: 13, color: '#4A4A6A', marginBottom: spacing.sm },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: spacing.sm },
  summaryItem: { alignItems: 'center' },
  summaryLabel: { fontFamily: fonts.regular, fontSize: 11, color: '#4A4A6A', marginBottom: 4 },
  summaryValue: { fontFamily: fonts.bold, fontSize: 20, color: '#FFFFFF' },
  riskRow: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  riskBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full, borderWidth: 1 },
  riskText: { fontFamily: fonts.semiBold, fontSize: 11 },
  rangeRow: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.md },
  rangeBtn: {
    flex: 1, paddingVertical: 6, borderRadius: radius.md,
    backgroundColor: '#13131F', borderWidth: 1, borderColor: '#1E1E30', alignItems: 'center',
  },
  rangeBtnActive: { backgroundColor: colors.primary + '20', borderColor: colors.primary + '50' },
  rangeText: { fontFamily: fonts.semiBold, fontSize: 12, color: '#4A4A6A' },
  rangeTextActive: { color: colors.primary },
  mockNotice: {
    backgroundColor: '#6366F110', borderRadius: radius.md,
    borderWidth: 1, borderColor: '#6366F120',
    padding: spacing.sm, marginBottom: spacing.md,
  },
  mockNoticeText: { fontFamily: fonts.regular, fontSize: 12, color: '#6366F1', textAlign: 'center' },
});
