import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { fonts, colors } from '../theme';

export default function HealthRing({ score = 84, size = 200, strokeWidth = 12 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = useRef(new Animated.Value(0)).current;
  const [strokeOffset, setStrokeOffset] = useState(circumference);

  useEffect(() => {
    const listener = progress.addListener(({ value }) => {
      setStrokeOffset(circumference * (1 - value));
    });

    setTimeout(() => {
      Animated.timing(progress, {
        toValue: score / 100,
        duration: 1800,
        delay: 300,
        useNativeDriver: false,
      }).start();
    }, 0);

    return () => progress.removeListener(listener);
  }, [score]);

  const scoreColor = score >= 75 ? '#22C55E' : score >= 50 ? '#F59E0B' : '#EF4444';
  const scoreLabel = score >= 75 ? 'Good' : score >= 50 ? 'Attention' : 'Urgent';

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} style={styles.svg}>
        <Defs>
          <LinearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor={scoreColor} stopOpacity="1" />
            <Stop offset="100%" stopColor={scoreColor} stopOpacity="0.6" />
          </LinearGradient>
        </Defs>

        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={scoreColor + '18'}
          strokeWidth={strokeWidth}
          fill="none"
        />

        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#ringGrad)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeOffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>

      <View style={styles.center}>
        <Text style={[styles.score, { color: scoreColor }]}>{score}</Text>
        <Text style={styles.outOf}>/100</Text>
        <Text style={[styles.label, { color: scoreColor }]}>{scoreLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  svg: {
    position: 'absolute',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  score: {
    fontFamily: fonts.black,
    fontSize: 48,
    letterSpacing: -2,
    lineHeight: 52,
  },
  outOf: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.textMuted,
  },
  label: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    marginTop: 4,
    letterSpacing: 0.3,
  },
});
