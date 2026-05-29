import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, StatusBar,
  TouchableOpacity, Animated, Dimensions, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts, spacing, radius } from '../theme';
import { HealthRing, TrendChart } from '../components';
import Svg, { Path, Rect } from 'react-native-svg';
import useBleStore from '../store/bleStore';
import useAuthStore from '../store/authStore';
import useProfileStore from '../store/profileStore';
import { startScan } from '../services/bleService';
import { getPatientSummary, getVitalsHistory } from '../services/api';
import ProfileSwitcher from '../components/ProfileSwitcher';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - spacing.md * 2 - spacing.sm) / 2;

function VitalIcon({ type, color, size = 22 }) {
  if (type === 'heart') return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 21C12 21 3 14 3 8C3 5.24 5.24 3 8 3C9.64 3 11.09 3.78 12 5C12.91 3.78 14.36 3 16 3C18.76 3 21 5.24 21 8C21 14 12 21 12 21Z" fill={color} />
    </Svg>
  );
  if (type === 'lungs') return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 3V14M12 3C12 3 9 5 7 7C5 9 4 11 4 13C4 16 6 19 9 19C10.5 19 11.5 18.5 12 18C12.5 18.5 13.5 19 15 19C18 19 20 16 20 13C20 11 19 9 17 7C15 5 12 3 12 3Z" stroke={color} strokeWidth="1.8" fill="none" strokeLinecap="round" />
    </Svg>
  );
  if (type === 'temp') return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 2C10.34 2 9 3.34 9 5V13.26C7.79 14.13 7 15.47 7 17C7 19.76 9.24 22 12 22C14.76 22 17 19.76 17 17C17 15.47 16.21 14.13 15 13.26V5C15 3.34 13.66 2 12 2Z" stroke={color} strokeWidth="1.8" fill="none" />
    </Svg>
  );
  if (type === 'battery') return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x="2" y="7" width="18" height="10" rx="2" stroke={color} strokeWidth="1.8" fill="none" />
      <Path d="M20 10V14" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Rect x="4" y="9" width="11" height="6" rx="1" fill={color} opacity="0.7" />
    </Svg>
  );
  return null;
}

function calculateHealthScore(vitals) {
  if (vitals.hr === '--' || vitals.spo2 === '--') return null;
  let score = 100;
  const hr = Number(vitals.hr);
  const spo2 = Number(vitals.spo2);
  if (hr < 60 || hr > 100) score -= 15;
  if (hr > 90) score -= 10;
  if (spo2 < 95) score -= 20;
  if (spo2 < 97) score -= 10;
  return Math.max(0, Math.min(100, score));
}

function getScoreLabel(score) {
  if (score === null) return { label: 'Measuring...', color: '#64748B' };
  if (score >= 85) return { label: 'Good', color: '#22C55E' };
  if (score >= 70) return { label: 'Attention', color: '#F59E0B' };
  return { label: 'Urgent', color: '#EF4444' };
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning ☀️';
  if (hour < 17) return 'Good Afternoon 🌤️';
  return 'Good Evening 🌙';
}

export default function HomeScreen() {
  const { isConnected, isScanning, vitals, lastFall, lastSOS, lastUpdated } = useBleStore();
  const { patientId, patient } = useAuthStore();
  const { activePatientId, getActiveMember } = useProfileStore();
  const activeMember = getActiveMember();
  const isActivePatientBandOwner = activePatientId === 'patient-001';

  const [cloudSummary, setCloudSummary] = useState(null);
  const [hrHistory, setHrHistory] = useState([]);
  const [spo2History, setSpo2History] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const ripple1 = useRef(new Animated.Value(1)).current;
  const ripple2 = useRef(new Animated.Value(1)).current;
  const rippleOpacity1 = useRef(new Animated.Value(0.6)).current;
  const rippleOpacity2 = useRef(new Animated.Value(0.4)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerY = useRef(new Animated.Value(-20)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const fetchCloudData = async () => {
    if (!activePatientId) return;
    try {
      const [summaryRes, historyRes] = await Promise.all([
        getPatientSummary(activePatientId),
        getVitalsHistory(activePatientId, 1),
      ]);
      setCloudSummary(summaryRes.data);
      if (historyRes.data && historyRes.data.length > 0) {
        const hrData = historyRes.data.map((v, i) => ({ x: i + 1, y: v.hr || 0 })).filter(d => d.y > 0);
        const spo2Data = historyRes.data.map((v, i) => ({ x: i + 1, y: v.spo2 || 0 })).filter(d => d.y > 0);
        if (hrData.length > 1) setHrHistory(hrData);
        if (spo2Data.length > 1) setSpo2History(spo2Data);
      }
    } catch (err) {
      console.log('Cloud fetch error:', err.message);
    }
  };

  useEffect(() => {
    fetchCloudData();
  }, [activePatientId]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerOpacity, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(headerY, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]).start();

    Animated.loop(Animated.sequence([
      Animated.parallel([
        Animated.timing(ripple1, { toValue: 2.8, duration: 1400, useNativeDriver: true }),
        Animated.timing(rippleOpacity1, { toValue: 0, duration: 1400, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(ripple1, { toValue: 1, duration: 0, useNativeDriver: true }),
        Animated.timing(rippleOpacity1, { toValue: 0.6, duration: 0, useNativeDriver: true }),
      ]),
    ])).start();

    Animated.loop(Animated.sequence([
      Animated.delay(500),
      Animated.parallel([
        Animated.timing(ripple2, { toValue: 2.8, duration: 1400, useNativeDriver: true }),
        Animated.timing(rippleOpacity2, { toValue: 0, duration: 1400, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(ripple2, { toValue: 1, duration: 0, useNativeDriver: true }),
        Animated.timing(rippleOpacity2, { toValue: 0.4, duration: 0, useNativeDriver: true }),
      ]),
    ])).start();

    Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.12, duration: 500, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1.12, duration: 500, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
    ])).start();
  }, []);

  useEffect(() => {
    if (!isActivePatientBandOwner) return;
    if (vitals.hr !== '--' && vitals.hr !== 0) {
      setHrHistory(prev => [...prev, { x: prev.length + 1, y: Number(vitals.hr) }].slice(-10));
    }
    if (vitals.spo2 !== '--' && vitals.spo2 !== 0) {
      setSpo2History(prev => [...prev, { x: prev.length + 1, y: Number(vitals.spo2) }].slice(-10));
    }
  }, [vitals, isActivePatientBandOwner]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCloudData().then(() => setRefreshing(false));
  };

  // For non-band patients show cloud health score, for Papa show live
  const liveVitals = isActivePatientBandOwner ? vitals : {
    hr: '--', spo2: '--', temperature: '--', steps: 0, battery: 0, gps_fixed: false
  };
  const healthScore = isActivePatientBandOwner
    ? calculateHealthScore(vitals)
    : (cloudSummary?.health_score || null);
  const scoreInfo = getScoreLabel(healthScore);

  const VITALS = [
    { icon: 'heart', value: String(liveVitals.hr), unit: 'bpm', label: 'Heart Rate', color: '#FF4D6D', bg: ['#FF4D6D18', '#FF4D6D05'], pulse: isConnected && isActivePatientBandOwner && liveVitals.hr !== '--' },
    { icon: 'lungs', value: String(liveVitals.spo2), unit: '%', label: 'SpO2', color: '#38BDF8', bg: ['#38BDF818', '#38BDF805'] },
    { icon: 'temp', value: '--', unit: '°C', label: 'Temperature', color: '#FB923C', bg: ['#FB923C18', '#FB923C05'] },
    { icon: 'battery', value: String(liveVitals.battery), unit: '%', label: 'Battery', color: liveVitals.battery < 20 ? '#EF4444' : liveVitals.battery < 40 ? '#F59E0B' : '#4ADE80', bg: ['#4ADE8018', '#4ADE8005'] },
  ];

  const defaultHrData = [{ x: 1, y: 74 }, { x: 2, y: 71 }, { x: 3, y: 78 }, { x: 4, y: 69 }, { x: 5, y: 73 }, { x: 6, y: 70 }, { x: 7, y: 72 }];
  const defaultSpo2Data = [{ x: 1, y: 97 }, { x: 2, y: 98 }, { x: 3, y: 96 }, { x: 4, y: 98 }, { x: 5, y: 97 }, { x: 6, y: 99 }, { x: 7, y: 98 }];

  const summaryText = cloudSummary?.summary ||
    (isActivePatientBandOwner && isConnected && liveVitals.hr !== '--'
      ? `Current heart rate is ${liveVitals.hr} bpm with SpO2 at ${liveVitals.spo2}%.`
      : `Connect PrimeBand to get live health data for ${activeMember.name}.`);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <LinearGradient colors={['#6366F130', '#4F46E510', 'transparent']} style={styles.ambientTop} start={{ x: 0.3, y: 0 }} end={{ x: 0.7, y: 1 }} pointerEvents="none" />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>

        {/* HEADER */}
        <Animated.View style={[styles.header, { opacity: headerOpacity, transform: [{ translateY: headerY }] }]}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.name}>{activeMember.name}'s Health</Text>
          </View>
          <ProfileSwitcher />
        </Animated.View>

        {/* HEALTH SCORE */}
        <View style={styles.heroCard}>
          <LinearGradient colors={['#1A1A35', '#12122A', '#0A0A18']} style={styles.heroGradient}>
            <View style={styles.heroContent}>
              <View style={styles.heroLeft}>
                <View style={styles.heroLabelRow}>
                  <View style={[styles.heroLabelDot, { backgroundColor: activeMember.color }]} />
                  <Text style={styles.heroLabel}>HEALTH SCORE</Text>
                </View>
                <Text style={styles.heroScore}>{healthScore !== null ? healthScore : '--'}</Text>
                <View style={[styles.heroBadge, { backgroundColor: scoreInfo.color + '18', borderColor: scoreInfo.color + '35' }]}>
                  <View style={[styles.heroDot, { backgroundColor: scoreInfo.color }]} />
                  <Text style={[styles.heroBadgeText, { color: scoreInfo.color }]}>{scoreInfo.label}</Text>
                </View>
                <Text style={styles.heroTrend}>
                  {isActivePatientBandOwner
                    ? (isConnected ? 'Live from PrimeBand' : 'Connect band to measure')
                    : `${activeMember.name} · ${activeMember.role}`}
                </Text>
              </View>
              <HealthRing score={healthScore || 0} size={150} strokeWidth={11} color={activeMember.color} />
            </View>
          </LinearGradient>
        </View>

        {/* BAND STATUS — only for Papa */}
        {isActivePatientBandOwner && (
          <View style={[styles.bandBar, { borderColor: isConnected ? '#22C55E20' : '#EF444420', backgroundColor: isConnected ? '#22C55E08' : '#EF444408' }]}>
            <View style={styles.bandLeft}>
              <View style={styles.rippleWrap}>
                {isConnected && (
                  <>
                    <Animated.View style={[styles.ripple, { transform: [{ scale: ripple1 }], opacity: rippleOpacity1 }]} />
                    <Animated.View style={[styles.ripple, { transform: [{ scale: ripple2 }], opacity: rippleOpacity2 }]} />
                  </>
                )}
                <View style={[styles.bandDot, { backgroundColor: isConnected ? '#22C55E' : '#EF4444' }]} />
              </View>
              <Text style={[styles.bandText, { color: isConnected ? '#22C55E' : '#EF4444' }]}>
                {isConnected ? 'PrimeBand Connected' : isScanning ? 'Scanning...' : 'PrimeBand Offline'}
              </Text>
            </View>
            <View style={styles.bandRight}>
              {!isConnected && !isScanning && (
                <TouchableOpacity onPress={startScan} style={styles.reconnectBtn}>
                  <Text style={styles.reconnectText}>↺ Scan</Text>
                </TouchableOpacity>
              )}
              {isConnected && <Text style={styles.bandTime}>{lastUpdated ? lastUpdated.toLocaleTimeString() : '--'}</Text>}
              {isScanning && <Text style={styles.bandTime}>Searching...</Text>}
            </View>
          </View>
        )}

        {/* NO BAND MESSAGE for other patients */}
        {!isActivePatientBandOwner && (
          <View style={[styles.bandBar, { borderColor: '#6366F120', backgroundColor: '#6366F108' }]}>
            <Text style={[styles.bandText, { color: '#6366F1' }]}>📊 Showing cloud data for {activeMember.name}</Text>
          </View>
        )}

        {/* ALERTS */}
        {lastFall && isActivePatientBandOwner && (
          <View style={[styles.alertCard, { borderColor: '#EF444435', marginBottom: spacing.md }]}>
            <View style={[styles.alertStripe, { backgroundColor: '#EF4444' }]} />
            <View style={styles.alertInner}>
              <Text style={[styles.alertTitle, { color: '#EF4444' }]}>🚨 Fall Detected!</Text>
              <Text style={styles.alertBody}>HR: {lastFall.hr} | SpO2: {lastFall.spo2}</Text>
            </View>
          </View>
        )}
        {lastSOS && isActivePatientBandOwner && (
          <View style={[styles.alertCard, { borderColor: '#EF444435', marginBottom: spacing.md }]}>
            <View style={[styles.alertStripe, { backgroundColor: '#EF4444' }]} />
            <View style={styles.alertInner}>
              <Text style={[styles.alertTitle, { color: '#EF4444' }]}>🆘 SOS Triggered!</Text>
              <Text style={styles.alertBody}>By: {lastSOS.triggered_by}</Text>
            </View>
          </View>
        )}

        {/* LIVE VITALS */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Live Vitals</Text>
          <Text style={styles.sectionSub}>{isActivePatientBandOwner ? 'Real-time from band' : 'Last known'}</Text>
        </View>
        <View style={styles.vitalsGrid}>
          {VITALS.map((v, i) => (
            <VitalCardPro key={i} vital={v} index={i} pulseAnim={v.pulse ? pulseAnim : null} />
          ))}
        </View>

        {/* TRENDS */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{isActivePatientBandOwner ? 'Live Trends' : 'Trends'}</Text>
          <Text style={styles.sectionSub}>Last readings</Text>
        </View>
        <TrendChart data={hrHistory.length > 1 ? hrHistory : defaultHrData} color="#FF4D6D" label="HEART RATE" unit="bpm" baseline={72} index={0} />
        <TrendChart data={spo2History.length > 1 ? spo2History : defaultSpo2Data} color="#38BDF8" label="SPO2" unit="%" baseline={97} index={1} />

        {/* AI SUMMARY */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today's Summary</Text>
          <Text style={styles.sectionSub}>AI Generated</Text>
        </View>
        <View style={styles.summaryCard}>
          <LinearGradient colors={['#1A1A35', '#12122A']} style={styles.summaryGradient}>
            <LinearGradient colors={['#818CF8', '#6366F1']} style={styles.aiChip}>
              <Text style={styles.aiChipText}>✦  AI Summary</Text>
            </LinearGradient>
            <Text style={styles.summaryText}>{summaryText}</Text>
          </LinearGradient>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function VitalCardPro({ vital, index, pulseAnim }) {
  const entryOpacity = useRef(new Animated.Value(0)).current;
  const entryY = useRef(new Animated.Value(16)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(entryOpacity, { toValue: 1, duration: 500, delay: index * 80, useNativeDriver: true }),
      Animated.timing(entryY, { toValue: 0, duration: 500, delay: index * 80, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={[styles.vitalCard, { opacity: entryOpacity, transform: [{ translateY: entryY }] }]}>
      <LinearGradient colors={vital.bg} style={styles.vitalGradient}>
        <View style={styles.vitalTopRow}>
          <Animated.View style={[styles.vitalIconWrap, { backgroundColor: vital.color + '22', transform: pulseAnim ? [{ scale: pulseAnim }] : [] }]}>
            <VitalIcon type={vital.icon} color={vital.color} size={18} />
          </Animated.View>
          {vital.pulse && (
            <View style={[styles.livePill, { borderColor: vital.color + '40' }]}>
              <View style={[styles.liveDot, { backgroundColor: vital.color }]} />
              <Text style={[styles.liveText, { color: vital.color }]}>LIVE</Text>
            </View>
          )}
        </View>
        <Text style={[styles.vitalValue, { color: vital.color }]}>{vital.value}</Text>
        <Text style={[styles.vitalUnit, { color: vital.color + 'AA' }]}>{vital.unit}</Text>
        <Text style={styles.vitalLabel}>{vital.label}</Text>
        <View style={[styles.vitalAccent, { backgroundColor: vital.color }]} />
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#070710' },
  ambientTop: { position: 'absolute', top: 0, left: 0, right: 0, height: 350 },
  scroll: { paddingHorizontal: spacing.md, paddingTop: 56, paddingBottom: 32 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  greeting: { fontFamily: fonts.regular, fontSize: 13, color: '#64748B', marginBottom: 2 },
  name: { fontFamily: fonts.black, fontSize: 28, color: '#FFFFFF', letterSpacing: -0.8 },
  heroCard: { borderRadius: radius.xxl, overflow: 'hidden', marginBottom: spacing.sm, borderWidth: 1, borderColor: '#6366F122' },
  heroGradient: { padding: spacing.lg },
  heroContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroLeft: { flex: 1 },
  heroLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.xs },
  heroLabelDot: { width: 5, height: 5, borderRadius: 3 },
  heroLabel: { fontFamily: fonts.semiBold, fontSize: 9, color: '#4A4A6A', letterSpacing: 2.5 },
  heroScore: { fontFamily: fonts.black, fontSize: 72, color: '#FFFFFF', letterSpacing: -4, lineHeight: 76 },
  heroBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full, borderWidth: 1, marginTop: spacing.sm, gap: 5 },
  heroDot: { width: 6, height: 6, borderRadius: 3 },
  heroBadgeText: { fontFamily: fonts.semiBold, fontSize: 12 },
  heroTrend: { fontFamily: fonts.regular, fontSize: 12, color: '#4A4A6A', marginTop: 6 },
  bandBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: 12, borderWidth: 1, marginBottom: spacing.xl },
  bandLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bandRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rippleWrap: { width: 16, height: 16, alignItems: 'center', justifyContent: 'center' },
  ripple: { position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: '#22C55E' },
  bandDot: { width: 8, height: 8, borderRadius: 4 },
  bandText: { fontFamily: fonts.semiBold, fontSize: 13 },
  bandTime: { fontFamily: fonts.regular, fontSize: 12, color: '#4A4A6A' },
  reconnectBtn: { backgroundColor: colors.primary + '25', paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full, borderWidth: 1, borderColor: colors.primary + '50' },
  reconnectText: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.primary },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: spacing.sm },
  sectionTitle: { fontFamily: fonts.bold, fontSize: 20, color: '#FFFFFF', letterSpacing: -0.5 },
  sectionSub: { fontFamily: fonts.regular, fontSize: 12, color: '#4A4A6A' },
  vitalsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xl },
  vitalCard: { width: CARD_WIDTH, borderRadius: radius.xl, overflow: 'hidden', borderWidth: 1, borderColor: '#1E1E30' },
  vitalGradient: { padding: spacing.md, minHeight: 150, position: 'relative' },
  vitalTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  vitalIconWrap: { width: 36, height: 36, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  livePill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.full, borderWidth: 1, backgroundColor: '#FF4D6D08' },
  liveDot: { width: 4, height: 4, borderRadius: 2 },
  liveText: { fontFamily: fonts.bold, fontSize: 8, letterSpacing: 1 },
  vitalValue: { fontFamily: fonts.black, fontSize: 36, letterSpacing: -1.5, lineHeight: 40 },
  vitalUnit: { fontFamily: fonts.semiBold, fontSize: 13, marginTop: 2 },
  vitalLabel: { fontFamily: fonts.regular, fontSize: 11, color: '#4A4A6A', marginTop: spacing.xs },
  vitalAccent: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, opacity: 0.5 },
  summaryCard: { borderRadius: radius.xl, overflow: 'hidden', borderWidth: 1, borderColor: '#6366F118', marginBottom: spacing.xl },
  summaryGradient: { padding: spacing.lg },
  aiChip: { alignSelf: 'flex-start', paddingHorizontal: spacing.md, paddingVertical: 5, borderRadius: radius.full, marginBottom: spacing.md },
  aiChipText: { fontFamily: fonts.semiBold, fontSize: 12, color: '#FFFFFF', letterSpacing: 0.5 },
  summaryText: { fontFamily: fonts.regular, fontSize: 15, color: '#94A3B8', lineHeight: 26 },
  alertCard: { borderRadius: radius.xl, backgroundColor: '#13131F', borderWidth: 1, overflow: 'hidden', flexDirection: 'row', marginBottom: spacing.md },
  alertStripe: { width: 3 },
  alertInner: { flex: 1, padding: spacing.md },
  alertTitle: { fontFamily: fonts.bold, fontSize: 15, marginBottom: 4 },
  alertBody: { fontFamily: fonts.regular, fontSize: 13, color: '#64748B', lineHeight: 20 },
});
