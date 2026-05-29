import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import Svg, { Circle, Path, Defs, RadialGradient, Stop, LinearGradient } from 'react-native-svg';

export default function HeartIllustration({ size = 220 }) {
  const pulse = useRef(new Animated.Value(1)).current;
  const glow = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 500, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1.08, duration: 500, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0.4, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: '#FF6B8A18',
        opacity: glow,
        transform: [{ scale: pulse }],
      }} />
      <Animated.View style={{
        position: 'absolute',
        width: size * 0.78,
        height: size * 0.78,
        borderRadius: size / 2,
        borderWidth: 1,
        borderColor: '#FF6B8A30',
        opacity: glow,
      }} />
      <Animated.View style={{ transform: [{ scale: pulse }] }}>
        <Svg width={size * 0.7} height={size * 0.7} viewBox="0 0 200 200">
          <Defs>
            <RadialGradient id="heartGlow" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#FF6B8A" stopOpacity="0.3" />
              <Stop offset="100%" stopColor="#FF6B8A" stopOpacity="0" />
            </RadialGradient>
            <LinearGradient id="heartFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#FF8FA3" />
              <Stop offset="100%" stopColor="#E91E8C" />
            </LinearGradient>
          </Defs>
          <Circle cx="100" cy="110" r="80" fill="url(#heartGlow)" />
          <Path
            d="M100 160 C60 130 20 110 20 75 C20 50 40 35 60 35 C75 35 90 45 100 58 C110 45 125 35 140 35 C160 35 180 50 180 75 C180 110 140 130 100 160Z"
            fill="url(#heartFill)"
            opacity="0.95"
          />
          <Path
            d="M15 108 L45 108 L58 82 L68 130 L78 95 L88 108 L185 108"
            stroke="#FFFFFF"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.9"
          />
          <Path
            d="M70 55 C75 48 85 44 95 46"
            stroke="#FFFFFF"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            opacity="0.5"
          />
        </Svg>
      </Animated.View>
    </View>
  );
}
