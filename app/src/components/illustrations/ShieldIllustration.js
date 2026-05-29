import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import Svg, { Circle, Path, Rect, Defs, RadialGradient, Stop, LinearGradient } from 'react-native-svg';

export default function ShieldIllustration({ size = 220 }) {
  const float = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0.5)).current;
  const orbit = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: -10, duration: 1500, useNativeDriver: true }),
        Animated.timing(float, { toValue: 0, duration: 1500, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0.5, duration: 1200, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.timing(orbit, { toValue: 1, duration: 3000, useNativeDriver: true })
    ).start();
  }, []);

  const dot1X = orbit.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [60, 80, 60, 40, 60] });
  const dot1Y = orbit.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [30, 50, 70, 50, 30] });
  const dot2X = orbit.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [140, 120, 140, 160, 140] });
  const dot2Y = orbit.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [70, 50, 30, 50, 70] });

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Glow ring */}
      <Animated.View style={{
        position: 'absolute',
        width: size * 0.9,
        height: size * 0.9,
        borderRadius: size / 2,
        backgroundColor: '#34D39915',
        opacity: glow,
      }} />

      <Animated.View style={{ transform: [{ translateY: float }] }}>
        <Svg width={size * 0.75} height={size * 0.75} viewBox="0 0 200 200">
          <Defs>
            <RadialGradient id="shieldGlow" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#34D399" stopOpacity="0.25" />
              <Stop offset="100%" stopColor="#34D399" stopOpacity="0" />
            </RadialGradient>
            <LinearGradient id="shieldFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#34D399" />
              <Stop offset="100%" stopColor="#059669" />
            </LinearGradient>
            <LinearGradient id="crossFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#FFFFFF" />
              <Stop offset="100%" stopColor="#D1FAE5" />
            </LinearGradient>
          </Defs>

          {/* Background glow */}
          <Circle cx="100" cy="105" r="75" fill="url(#shieldGlow)" />

          {/* Shield shape */}
          <Path
            d="M100 20 L165 48 L165 105 C165 145 135 170 100 182 C65 170 35 145 35 105 L35 48 Z"
            fill="url(#shieldFill)"
            opacity="0.95"
          />

          {/* Shield inner border */}
          <Path
            d="M100 32 L153 56 L153 105 C153 138 128 160 100 170 C72 160 47 138 47 105 L47 56 Z"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="1.5"
            opacity="0.25"
          />

          {/* Medical cross */}
          <Rect x="85" y="72" width="30" height="72" rx="6" fill="url(#crossFill)" />
          <Rect x="64" y="93" width="72" height="30" rx="6" fill="url(#crossFill)" />

          {/* Shine on shield */}
          <Path
            d="M65 42 C72 38 82 36 90 38"
            stroke="#FFFFFF"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            opacity="0.5"
          />

          {/* Orbiting dots */}
          <Circle cx="30" cy="80" r="5" fill="#34D399" opacity="0.7" />
          <Circle cx="170" cy="80" r="4" fill="#6EE7B7" opacity="0.6" />
          <Circle cx="55" cy="165" r="4" fill="#34D399" opacity="0.5" />
          <Circle cx="145" cy="165" r="3" fill="#6EE7B7" opacity="0.5" />
        </Svg>
      </Animated.View>
    </View>
  );
}
