import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, Dimensions,
  TouchableOpacity, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts, spacing, radius } from '../../theme';
import HeartIllustration from '../../components/illustrations/HeartIllustration';
import ShieldIllustration from '../../components/illustrations/ShieldIllustration';
import FamilyIllustration from '../../components/illustrations/FamilyIllustration';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    Illustration: HeartIllustration,
    tag: 'PRIMEBAND',
    tagColor: '#FF6B8A',
    title: 'Always Watching,\nAlways Ready',
    subtitle: 'PrimeBand monitors heart rate, SpO2, temperature and activity — 24 hours a day, even while Papa sleeps.',
    gradient: ['#1E0A1E', '#130A24', '#070710'],
    accent: '#FF6B8A',
    stats: [
      { value: '24/7', label: 'Monitoring' },
      { value: '<5s', label: 'Alert Speed' },
      { value: '98%', label: 'Accuracy' },
    ],
  },
  {
    id: '2',
    Illustration: ShieldIllustration,
    tag: 'PRIMESTATION',
    tagColor: '#34D399',
    title: 'Clinical Checkups\nAt Home',
    subtitle: 'Full health scan in 4 minutes. AI compares every reading against Papa\'s personal history and baselines.',
    gradient: ['#071A12', '#091A10', '#070710'],
    accent: '#34D399',
    stats: [
      { value: '4 min', label: 'Full Checkup' },
      { value: 'AI', label: 'Powered' },
      { value: '5', label: 'Sensors' },
    ],
  },
  {
    id: '3',
    Illustration: FamilyIllustration,
    tag: 'PRIMECARE APP',
    tagColor: '#F59E0B',
    title: 'Your Family,\nConnected',
    subtitle: 'Live vitals on your phone. Instant alerts the moment something needs attention. Video call Papa in one tap.',
    gradient: ['#1A1200', '#150E00', '#070710'],
    accent: '#F59E0B',
    stats: [
      { value: 'Live', label: 'Vitals' },
      { value: 'Push', label: 'Alerts' },
      { value: '1-tap', label: 'Video Call' },
    ],
  },
];

export default function SplashSlides({ navigation }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef(null);

  const handleNext = () => {
    if (activeIndex < SLIDES.length - 1) {
      flatListRef.current.scrollToIndex({ index: activeIndex + 1 });
    } else {
      navigation.replace('Phone');
    }
  };

  const handleSkip = () => navigation.replace('Phone');

  const renderSlide = ({ item }) => {
    const { Illustration } = item;
    return (
      <LinearGradient colors={item.gradient} style={styles.slide} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}>
        {/* Tag */}
        <View style={[styles.tag, { backgroundColor: item.accent + '20', borderColor: item.accent + '40' }]}>
          <View style={[styles.tagDot, { backgroundColor: item.accent }]} />
          <Text style={[styles.tagText, { color: item.accent }]}>{item.tag}</Text>
        </View>

        {/* Illustration */}
        <View style={styles.illustrationWrap}>
          <Illustration size={230} />
        </View>

        {/* Text */}
        <View style={styles.textWrap}>
          <Text style={[styles.title, { color: '#FFFFFF' }]}>{item.title}</Text>
          <Text style={styles.subtitle}>{item.subtitle}</Text>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          {item.stats.map((stat, i) => (
            <View key={i} style={[styles.statCard, { borderColor: item.accent + '30' }]}>
              <Text style={[styles.statValue, { color: item.accent }]}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>
    );
  };

  const slide = SLIDES[activeIndex];

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderSlide}
        keyExtractor={item => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width);
          setActiveIndex(index);
        }}
        scrollEventThrottle={16}
      />

      {/* Bottom controls */}
      <View style={styles.controls}>
        {/* Dots */}
        <View style={styles.dots}>
          {SLIDES.map((s, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === activeIndex
                  ? { backgroundColor: slide.accent, width: 28 }
                  : { backgroundColor: '#FFFFFF20' }
              ]}
            />
          ))}
        </View>

        {/* Buttons */}
        <View style={styles.buttons}>
          {activeIndex < SLIDES.length - 1 ? (
            <>
              <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
                <Text style={styles.skipText}>Skip</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleNext}>
                <LinearGradient
                  colors={[slide.accent, slide.accent + 'CC']}
                  style={styles.nextBtn}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.nextText}>Next  →</Text>
                </LinearGradient>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity onPress={handleNext} style={{ flex: 1 }}>
              <LinearGradient
                colors={['#F59E0B', '#D97706']}
                style={styles.getStartedBtn}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.getStartedText}>Get Started  →</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  slide: {
    width,
    flex: 1,
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: spacing.xl,
    paddingBottom: 220,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    marginBottom: spacing.lg,
    gap: 6,
  },
  tagDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tagText: {
    fontFamily: fonts.semiBold,
    fontSize: 11,
    letterSpacing: 2,
  },
  illustrationWrap: {
    marginBottom: spacing.xl,
  },
  textWrap: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontFamily: fonts.black,
    fontSize: 34,
    letterSpacing: -1,
    textAlign: 'center',
    lineHeight: 40,
    marginBottom: spacing.md,
    color: '#FFFFFF',
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    backgroundColor: '#FFFFFF08',
  },
  statValue: {
    fontFamily: fonts.black,
    fontSize: 18,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  controls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.xl,
    paddingBottom: 44,
    paddingTop: spacing.lg,
    backgroundColor: '#070710EE',
    borderTopWidth: 1,
    borderTopColor: '#FFFFFF08',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    gap: 6,
  },
  dot: {
    height: 6,
    borderRadius: 3,
    width: 8,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipBtn: {
    paddingVertical: spacing.md,
    paddingRight: spacing.lg,
  },
  skipText: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: '#64748B',
  },
  nextBtn: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
  },
  nextText: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    color: '#FFFFFF',
  },
  getStartedBtn: {
    paddingVertical: spacing.md + 2,
    borderRadius: radius.full,
    alignItems: 'center',
  },
  getStartedText: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    color: '#FFFFFF',
  },
});
