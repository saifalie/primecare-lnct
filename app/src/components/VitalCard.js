import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts, colors, radius, spacing } from '../theme';

export default function VitalCard({ icon, value, unit, label, color, index = 0, pulse = false }) {
  const scale = useRef(new Animated.Value(0.8)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(scale, {
        toValue: 1,
        duration: 600,
        delay: index * 100,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 600,
        delay: index * 100,
        useNativeDriver: true,
      }),
    ]).start();

    if (pulse) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.timing(glowOpacity, { toValue: 0.2, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    }
  }, []);

  return (
    <Animated.View style={[styles.wrapper, { transform: [{ scale }], opacity }]}>
      <LinearGradient
        colors={[color + '15', color + '05']}
        style={styles.card}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {pulse && (
          <Animated.View style={[styles.glow, { backgroundColor: color + '20', opacity: glowOpacity }]} />
        )}

        <View style={[styles.iconWrap, { backgroundColor: color + '20' }]}>
          <Text style={styles.icon}>{icon}</Text>
        </View>

        <Text style={[styles.value, { color }]}>{value ?? '--'}</Text>
        <Text style={[styles.unit, { color: color + 'AA' }]}>{unit}</Text>
        <Text style={styles.label}>{label}</Text>

        <View style={[styles.accent, { backgroundColor: color }]} />
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  card: {
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
    position: 'relative',
    minHeight: 140,
  },
  glow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radius.xl,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  icon: {
    fontSize: 20,
  },
  value: {
    fontFamily: fonts.black,
    fontSize: 34,
    letterSpacing: -1.5,
    lineHeight: 38,
  },
  unit: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    marginTop: 2,
  },
  label: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  accent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
    opacity: 0.6,
  },
});
