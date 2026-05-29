import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, StatusBar,
  TouchableOpacity, Animated, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts, spacing, radius } from '../theme';
import { HealthRing, TrendChart } from '../components';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - spacing.md * 2 - spacing.sm) / 2;

const HR_DATA = [
  { x: 1, y: 74 }, { x: 2, y: 71 }, { x: 3, y: 78 },
  { x: 4, y: 69 }, { x: 5, y: 73 }, { x: 6, y: 70 }, { x: 7, y: 72 },
];
const SPO2_DATA = [
  { x: 1, y: 97 }, { x: 2, y: 98 }, { x: 3, y: 96 },
  { x: 4, y: 98 }, { x: 5, y: 97 }, { x: 6, y: 99 }, { x: 7, y: 98 },
];
const BP_DATA = [
  { x: 1, y: 118 }, { x: 2, y: 122 }, { x: 3, y: 125 },
  { x: 4, y: 128 }, { x: 5, y: 132 }, { x: 6, y: 135 }, { x: 7, y: 138 },
];

const VITALS = [
  {
    icon: 'heart', value: '72', unit: 'bpm', label: 'Heart Rate',
    color: '#FF4D6D', bg: ['#FF4D6D18', '#FF4D6D05'], pulse: true,
  },
  {
    icon: 'lungs', value: '98', unit: '%', label: 'SpO2',
    color: '#38BDF8', bg: ['#38BDF818', '#38BDF805'],
  },
  {
    icon: 'temp', value: '36.8', unit: '°C', label: 'Temperature',
    color: '#FB923C', bg: ['#FB923C18', '#FB923C05'],
  },
  {
    icon: 'battery', value: '87', unit: '%', label: 'Battery',
    color: '#4ADE80', bg: ['#4ADE8018', '#4ADE8005'],
  },
];

const ACTIONS = [
  { icon: '📞', label: 'Video Call', color: '#6366F1', bg: '#6366F1' },
  { icon: '💊', label: 'Medications', color: '#22C55E', bg: '#22C55E' },
  { icon: '📊', label: 'Trends', color: '#38BDF8', bg: '#38BDF8' },
  { icon: '🔍', label: 'Analyze', color: '#F59E0B', bg: '#F59E0B' },
];

function VitalIcon({ type, color, size = 22 }) {
  if (type === 'heart') return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 21C12 21 3 14 3 8C3 5.24 5.24 3 8 3C9.64 3 11.09 3.78 12 5C12.91 3.78 14.36 3 16 3C18.76 3 21 5.24 21 8C21 14 12 21 12 21Z" fill={color} />
      <Path d="M5 10 L7 10 L9 7 L11 13 L13 9 L15 10 L17 10" stroke="white" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
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
      <Path d="M12 16C11.45 16 11 16.45 11 17C11 17.55 11.45 18 12 18C12.55 18 13 17.55 13 17C13 16.45 12.55 16 12 16Z" fill={color} />
      <Rect x="11" y="5" width="2" height="8" rx="1" fill={color} opacity="0.6" />
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

export default function HomeScreen() {
  const ripple1 = useRef(new Animated.Value(1)).current;
  const ripple2 = useRef(new Animated.Value(1)).current;
  const rippleOpacity1 = useRef(new Animated.Value(0.6)).current;
  const rippleOpacity2 = useRef(new Animated.Value(0.4)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerY = useRef(new Animated.Value(-20)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerOpacity, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(headerY, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(ripple1, { toValue: 2.8, duration: 1400, useNativeDriver: true }),
          Animated.timing(rippleOpacity1, { toValue: 0, duration: 1400, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(ripple1, { toValue: 1, duration: 0, useNativeDriver: true }),
          Animated.timing(rippleOpacity1, { toValue: 0.6, duration: 0, useNativeDriver: true }),
        ]),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.delay(500),
        Animated.parallel([
          Animated.timing(ripple2, { toValue: 2.8, duration: 1400, useNativeDriver: true }),
          Animated.timing(rippleOpacity2, { toValue: 0, duration: 1400, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(ripple2, { toValue: 1, duration: 0, useNativeDriver: true }),
          Animated.timing(rippleOpacity2, { toValue: 0.4, duration: 0, useNativeDriver: true }),
        ]),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.12, duration: 500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.12, duration: 500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Ambient glow */}
      <LinearGradient
        colors={['#6366F130', '#4F46E510', 'transparent']}
        style={styles.ambientTop}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 1 }}
        pointerEvents="none"
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── HEADER ── */}
        <Animated.View style={[styles.header, {
          opacity: headerOpacity,
          transform: [{ translateY: headerY }],
        }]}>
          <View>
            <Text style={styles.greeting}>Good Morning ☀️</Text>
            <Text style={styles.name}>Papa's Health</Text>
          </View>
          <TouchableOpacity activeOpacity={0.8} style={styles.avatarWrap}>
            <LinearGradient colors={['#818CF8', '#6366F1', '#4F46E5']} style={styles.avatar} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Text style={styles.avatarText}>PA</Text>
            </LinearGradient>
            <View style={styles.onlineDot} />
          </TouchableOpacity>
        </Animated.View>

        {/* ── HEALTH SCORE HERO ── */}
        <View style={styles.heroCard}>
          <LinearGradient
            colors={['#1A1A35', '#12122A', '#0A0A18']}
            style={styles.heroGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Decorative corner glow */}
            <View style={styles.heroCornerGlow} pointerEvents="none" />

            <View style={styles.heroContent}>
              <View style={styles.heroLeft}>
                <View style={styles.heroLabelRow}>
                  <View style={styles.heroLabelDot} />
                  <Text style={styles.heroLabel}>HEALTH SCORE</Text>
                </View>
                <Text style={styles.heroScore}>84</Text>
                <View style={styles.heroBadge}>
                  <View style={styles.heroDot} />
                  <Text style={styles.heroBadgeText}>Good</Text>
                </View>
                <Text style={styles.heroTrend}>↑ 3 pts from last week</Text>
              </View>
              <HealthRing score={84} size={150} strokeWidth={11} />
            </View>
          </LinearGradient>
        </View>

        {/* ── BAND STATUS ── */}
        <View style={styles.bandBar}>
          <View style={styles.bandLeft}>
            <View style={styles.rippleWrap}>
              <Animated.View style={[styles.ripple, { transform: [{ scale: ripple1 }], opacity: rippleOpacity1 }]} />
              <Animated.View style={[styles.ripple, { transform: [{ scale: ripple2 }], opacity: rippleOpacity2 }]} />
              <View style={styles.bandDot} />
            </View>
            <Text style={styles.bandText}>PrimeBand Connected</Text>
          </View>
          <View style={styles.bandRight}>
            <Text style={styles.bandTime}>Just now</Text>
            <Text style={styles.bandArrow}>›</Text>
          </View>
        </View>

        {/* ── LIVE VITALS ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Live Vitals</Text>
          <Text style={styles.sectionSub}>Real-time from band</Text>
        </View>

        <View style={styles.vitalsGrid}>
          {VITALS.map((v, i) => (
            <VitalCardPro key={i} vital={v} index={i} pulseAnim={v.pulse ? pulseAnim : null} />
          ))}
        </View>

        {/* ── TRENDS ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>7-Day Trends</Text>
          <TouchableOpacity>
            <Text style={styles.sectionLink}>See all ›</Text>
          </TouchableOpacity>
        </View>

        <TrendChart data={HR_DATA} color="#FF4D6D" label="HEART RATE" unit="bpm" baseline={68} index={0} />
        <TrendChart data={SPO2_DATA} color="#38BDF8" label="SPO2" unit="%" baseline={97} index={1} />
        <TrendChart data={BP_DATA} color="#FB923C" label="BLOOD PRESSURE" unit="mmHg" baseline={118} index={2} />

        {/* ── AI SUMMARY ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today's Summary</Text>
          <Text style={styles.sectionSub}>8:00 AM</Text>
        </View>

        <View style={styles.summaryCard}>
          <LinearGradient colors={['#1A1A35', '#12122A']} style={styles.summaryGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <View style={styles.summaryTopRow}>
              <LinearGradient colors={['#818CF8', '#6366F1']} style={styles.aiChip} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Text style={styles.aiChipText}>✦  AI Summary</Text>
              </LinearGradient>
            </View>
            <Text style={styles.summaryText}>
              Papa had a stable night. Slept 6.2 hours with no interruptions. Morning heart rate is within his personal baseline of 68–75 bpm. SpO2 excellent at 98%. Blood pressure is trending upward over the last 3 days — consider a checkup soon.
            </Text>
            <View style={styles.tagsRow}>
              <SummaryTag emoji="😴" label="6.2h sleep" color={colors.primary} />
              <SummaryTag emoji="💊" label="Meds taken" color="#22C55E" />
              <SummaryTag emoji="⚠️" label="BP watch" color="#F59E0B" />
            </View>
          </LinearGradient>
        </View>

        {/* ── QUICK ACTIONS ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
        </View>

        <View style={styles.actionsRow}>
          {ACTIONS.map((a, i) => (
            <ActionButton key={i} action={a} />
          ))}
        </View>

        {/* ── ALERT ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Alert</Text>
          <TouchableOpacity>
            <Text style={styles.sectionLink}>All alerts ›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.alertCard}>
          <View style={styles.alertStripe} />
          <View style={styles.alertInner}>
            <View style={styles.alertIconWrap}>
              <LinearGradient colors={['#F59E0B30', '#F59E0B10']} style={styles.alertIconBg} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <Text style={styles.alertIconText}>⚠️</Text>
              </LinearGradient>
            </View>
            <View style={styles.alertContent}>
              <View style={styles.alertTopRow}>
                <Text style={styles.alertTitle}>Blood Pressure Trend</Text>
                <View style={styles.alertBadge}>
                  <Text style={styles.alertBadgeText}>INFO</Text>
                </View>
              </View>
              <Text style={styles.alertTime}>2 hours ago</Text>
              <Text style={styles.alertBody}>
                BP has been rising over the last 3 readings. Consider scheduling a checkup soon.
              </Text>
            </View>
          </View>
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
    <Animated.View style={[
      styles.vitalCard,
      { opacity: entryOpacity, transform: [{ translateY: entryY }] }
    ]}>
      <LinearGradient colors={vital.bg} style={styles.vitalGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        {/* Top row */}
        <View style={styles.vitalTopRow}>
          <Animated.View style={[
            styles.vitalIconWrap,
            { backgroundColor: vital.color + '22', transform: pulseAnim ? [{ scale: pulseAnim }] : [] }
          ]}>
            <VitalIcon type={vital.icon} color={vital.color} size={18} />
          </Animated.View>
          {vital.pulse && (
            <View style={[styles.livePill, { borderColor: vital.color + '40' }]}>
              <View style={[styles.liveDot, { backgroundColor: vital.color }]} />
              <Text style={[styles.liveText, { color: vital.color }]}>LIVE</Text>
            </View>
          )}
        </View>

        {/* Value */}
        <Text style={[styles.vitalValue, { color: vital.color }]}>{vital.value}</Text>
        <Text style={[styles.vitalUnit, { color: vital.color + 'AA' }]}>{vital.unit}</Text>
        <Text style={styles.vitalLabel}>{vital.label}</Text>

        {/* Bottom accent */}
        <View style={[styles.vitalAccent, { backgroundColor: vital.color }]} />
      </LinearGradient>
    </Animated.View>
  );
}

function SummaryTag({ emoji, label, color }) {
  return (
    <View style={[styles.summaryTag, { backgroundColor: color + '15', borderColor: color + '30' }]}>
      <Text style={styles.summaryTagEmoji}>{emoji}</Text>
      <Text style={[styles.summaryTagText, { color }]}>{label}</Text>
    </View>
  );
}

function ActionButton({ action }) {
  return (
    <TouchableOpacity style={styles.actionBtn} activeOpacity={0.75}>
      <LinearGradient
        colors={[action.bg + '30', action.bg + '12']}
        style={styles.actionIconWrap}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.actionEmoji}>{action.icon}</Text>
      </LinearGradient>
      <Text style={[styles.actionLabel, { color: action.color }]}>{action.label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070710',
  },
  ambientTop: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 350,
  },
  scroll: {
    paddingHorizontal: spacing.md,
    paddingTop: 56,
    paddingBottom: 32,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  greeting: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: '#64748B',
    marginBottom: 2,
    letterSpacing: 0.2,
  },
  name: {
    fontFamily: fonts.black,
    fontSize: 28,
    color: '#FFFFFF',
    letterSpacing: -0.8,
  },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0, right: 0,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#070710',
  },

  // Hero card
  heroCard: {
    borderRadius: radius.xxl,
    overflow: 'hidden',
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: '#6366F122',
  },
  heroGradient: {
    padding: spacing.lg,
  },
  heroCornerGlow: {
    position: 'absolute',
    top: -40, right: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#6366F115',
  },
  heroContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroLeft: { flex: 1 },
  heroLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.xs,
  },
  heroLabelDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  heroLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 9,
    color: '#4A4A6A',
    letterSpacing: 2.5,
  },
  heroScore: {
    fontFamily: fonts.black,
    fontSize: 72,
    color: '#FFFFFF',
    letterSpacing: -4,
    lineHeight: 76,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#22C55E18',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: '#22C55E35',
    marginTop: spacing.sm,
    gap: 5,
  },
  heroDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
  },
  heroBadgeText: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    color: '#22C55E',
  },
  heroTrend: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: '#4A4A6A',
    marginTop: 6,
  },

  // Band bar
  bandBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#22C55E08',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#22C55E20',
    marginBottom: spacing.xl,
  },
  bandLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bandRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rippleWrap: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ripple: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  bandDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  bandText: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: '#22C55E',
  },
  bandTime: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: '#4A4A6A',
  },
  bandArrow: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: '#4A4A6A',
  },

  // Section headers
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  sectionSub: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: '#4A4A6A',
  },
  sectionLink: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: colors.primary,
  },

  // Vitals grid
  vitalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  vitalCard: {
    width: CARD_WIDTH,
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1E1E30',
  },
  vitalGradient: {
    padding: spacing.md,
    minHeight: 150,
    position: 'relative',
  },
  vitalTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  vitalIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
    backgroundColor: '#FF4D6D08',
  },
  liveDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  liveText: {
    fontFamily: fonts.bold,
    fontSize: 8,
    letterSpacing: 1,
  },
  vitalValue: {
    fontFamily: fonts.black,
    fontSize: 36,
    letterSpacing: -1.5,
    lineHeight: 40,
  },
  vitalUnit: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    marginTop: 2,
  },
  vitalLabel: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: '#4A4A6A',
    marginTop: spacing.xs,
  },
  vitalAccent: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: 2,
    opacity: 0.5,
  },

  // Summary
  summaryCard: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#6366F118',
    marginBottom: spacing.xl,
  },
  summaryGradient: {
    padding: spacing.lg,
  },
  summaryTopRow: {
    marginBottom: spacing.md,
  },
  aiChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  aiChipText: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  summaryText: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: '#94A3B8',
    lineHeight: 26,
    marginBottom: spacing.md,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  summaryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  summaryTagEmoji: { fontSize: 12 },
  summaryTagText: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
  },

  // Actions
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  actionIconWrap: {
    width: 60,
    height: 60,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFF08',
  },
  actionEmoji: { fontSize: 26 },
  actionLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 9,
    textAlign: 'center',
    lineHeight: 14,
  },

  // Alert
  alertCard: {
    borderRadius: radius.xl,
    backgroundColor: '#13131F',
    borderWidth: 1,
    borderColor: '#F59E0B22',
    overflow: 'hidden',
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  alertStripe: {
    width: 3,
    backgroundColor: '#F59E0B',
    opacity: 0.8,
  },
  alertInner: {
    flex: 1,
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
  },
  alertIconWrap: {},
  alertIconBg: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertIconText: { fontSize: 20 },
  alertContent: { flex: 1 },
  alertTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  alertTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: '#FFFFFF',
    flex: 1,
  },
  alertBadge: {
    backgroundColor: '#F59E0B18',
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#F59E0B35',
  },
  alertBadgeText: {
    fontFamily: fonts.bold,
    fontSize: 9,
    color: '#F59E0B',
    letterSpacing: 1,
  },
  alertTime: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: '#4A4A6A',
    marginBottom: 6,
  },
  alertBody: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: '#64748B',
    lineHeight: 20,
  },
});
