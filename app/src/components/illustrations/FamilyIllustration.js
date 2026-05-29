import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import Svg, { Circle, Path, Line, Defs, RadialGradient, Stop, LinearGradient } from 'react-native-svg';

export default function FamilyIllustration({ size = 220 }) {
  const pulse1 = useRef(new Animated.Value(0.6)).current;
  const pulse2 = useRef(new Animated.Value(0.3)).current;
  const pulse3 = useRef(new Animated.Value(0.8)).current;
  const signal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse1, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse1, { toValue: 0.6, duration: 800, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse2, { toValue: 0.9, duration: 1100, useNativeDriver: true }),
        Animated.timing(pulse2, { toValue: 0.3, duration: 1100, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse3, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse3, { toValue: 0.5, duration: 900, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.timing(signal, { toValue: 1, duration: 2000, useNativeDriver: true })
    ).start();
  }, []);

  const signalOpacity = signal.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 1, 0],
  });

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Background glow */}
      <Animated.View style={{
        position: 'absolute',
        width: size * 0.85,
        height: size * 0.85,
        borderRadius: size / 2,
        backgroundColor: '#F59E0B12',
        opacity: pulse1,
      }} />

      <Svg width={size} height={size} viewBox="0 0 220 220">
        <Defs>
          <RadialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#F59E0B" stopOpacity="0.2" />
            <Stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
          </RadialGradient>
          <LinearGradient id="node1" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#FCD34D" />
            <Stop offset="100%" stopColor="#F59E0B" />
          </LinearGradient>
          <LinearGradient id="node2" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#A78BFA" />
            <Stop offset="100%" stopColor="#7C3AED" />
          </LinearGradient>
          <LinearGradient id="node3" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#6EE7B7" />
            <Stop offset="100%" stopColor="#059669" />
          </LinearGradient>
          <LinearGradient id="centerNode" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#FB923C" />
            <Stop offset="100%" stopColor="#EA580C" />
          </LinearGradient>
        </Defs>

        {/* Center glow */}
        <Circle cx="110" cy="115" r="70" fill="url(#centerGlow)" />

        {/* Connection lines */}
        <Line x1="110" y1="115" x2="55" y2="65" stroke="#F59E0B" strokeWidth="1.5" opacity="0.4" strokeDasharray="4,4" />
        <Line x1="110" y1="115" x2="165" y2="65" stroke="#A78BFA" strokeWidth="1.5" opacity="0.4" strokeDasharray="4,4" />
        <Line x1="110" y1="115" x2="110" y2="175" stroke="#34D399" strokeWidth="1.5" opacity="0.4" strokeDasharray="4,4" />

        {/* Animated signal dot on line 1 */}
        <Animated.View style={{ opacity: signalOpacity, position: 'absolute' }}>
          <Circle cx="80" cy="88" r="4" fill="#F59E0B" opacity="0.9" />
        </Animated.View>

        {/* Person node 1 — top left — Papa */}
        <Circle cx="55" cy="52" r="26" fill="url(#node1)" opacity="0.95" />
        {/* Head */}
        <Circle cx="55" cy="44" r="9" fill="#FFFFFF" opacity="0.9" />
        {/* Body */}
        <Path d="M38 72 Q55 58 72 72" fill="#FFFFFF" opacity="0.7" />
        {/* Label dot */}
        <Circle cx="75" cy="38" r="6" fill="#EF4444" />

        {/* Person node 2 — top right — Family */}
        <Circle cx="165" cy="52" r="26" fill="url(#node2)" opacity="0.95" />
        <Circle cx="165" cy="44" r="9" fill="#FFFFFF" opacity="0.9" />
        <Path d="M148 72 Q165 58 182 72" fill="#FFFFFF" opacity="0.7" />
        {/* Phone icon */}
        <Circle cx="185" cy="38" r="6" fill="#22C55E" />

        {/* Person node 3 — bottom — Station */}
        <Circle cx="110" cy="185" r="26" fill="url(#node3)" opacity="0.95" />
        {/* Station icon — screen shape */}
        <Path d="M97 180 L123 180 L123 192 L97 192 Z" fill="#FFFFFF" opacity="0.4" rx="2" />
        <Path d="M100 183 L120 183 L120 189 L100 189 Z" fill="#FFFFFF" opacity="0.8" rx="1" />
        <Path d="M104 192 L116 192 L114 196 L106 196 Z" fill="#FFFFFF" opacity="0.6" />

        {/* Center hub */}
        <Circle cx="110" cy="115" r="22" fill="url(#centerNode)" opacity="0.95" />
        <Circle cx="110" cy="115" r="18" fill="none" stroke="#FFFFFF" strokeWidth="1.5" opacity="0.3" />
        {/* Heart in center */}
        <Path
          d="M110 122 C103 117 98 113 98 108 C98 104 101 102 104 102 C107 102 109 104 110 106 C111 104 113 102 116 102 C119 102 122 104 122 108 C122 113 117 117 110 122Z"
          fill="#FFFFFF"
          opacity="0.9"
        />

        {/* Signal rings around center */}
        <Circle cx="110" cy="115" r="30" fill="none" stroke="#F59E0B" strokeWidth="1" opacity="0.2" />
        <Circle cx="110" cy="115" r="40" fill="none" stroke="#F59E0B" strokeWidth="0.5" opacity="0.12" />
      </Svg>
    </View>
  );
}
