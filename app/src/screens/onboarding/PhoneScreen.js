import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts, spacing, radius } from '../../theme';

export default function PhoneScreen({ navigation }) {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleSendOTP = async () => {
    if (phone.length < 10) {
      setError('Enter a valid 10-digit phone number');
      shake();
      return;
    }
    setError('');
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      navigation.navigate('OTP', { phone: '+91' + phone });
    } catch (e) {
      setError('Could not send OTP. Check your connection.');
      shake();
    } finally {
      setLoading(false);
    }
  };

  const isReady = phone.length === 10;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Background gradient */}
      <LinearGradient
        colors={['#0D0818', '#070710']}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.inner}>
        {/* Top badge */}
        <View style={styles.badge}>
          <View style={styles.badgeDot} />
          <Text style={styles.badgeText}>PRIMECARE</Text>
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>What's your{'\n'}phone number?</Text>
          <Text style={styles.subtitle}>
            Your family will use this to link the app to your PrimeStation profile.
          </Text>
        </View>

        {/* Input */}
        <Animated.View style={[styles.inputWrap, { transform: [{ translateX: shakeAnim }] }]}>
          <View style={styles.prefix}>
            <Text style={styles.flag}>🇮🇳</Text>
            <Text style={styles.prefixText}>+91</Text>
          </View>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={text => {
              setPhone(text.replace(/[^0-9]/g, ''));
              setError('');
            }}
            placeholder="98765 43210"
            placeholderTextColor="#3D3D5C"
            keyboardType="number-pad"
            maxLength={10}
            autoFocus
          />
          {isReady && (
            <View style={styles.checkmark}>
              <Text style={styles.checkmarkText}>✓</Text>
            </View>
          )}
        </Animated.View>

        {error ? (
          <View style={styles.errorWrap}>
            <Text style={styles.errorIcon}>⚠</Text>
            <Text style={styles.error}>{error}</Text>
          </View>
        ) : null}

        {/* Button */}
        <TouchableOpacity
          onPress={handleSendOTP}
          disabled={loading || !isReady}
          style={styles.btnWrap}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={isReady ? ['#6366F1', '#4F46E5'] : ['#1E1E30', '#1E1E30']}
            style={styles.btn}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={[styles.btnText, !isReady && styles.btnTextDim]}>
                Send OTP  →
              </Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.note}>
          We'll send a 4-digit verification code to this number.
        </Text>

        {/* Decorative bottom */}
        <View style={styles.decorRow}>
          {['Heart Rate', 'SpO2', 'Temperature', 'ECG'].map((item, i) => (
            <View key={i} style={styles.decorChip}>
              <Text style={styles.decorText}>{item}</Text>
            </View>
          ))}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070710',
  },
  inner: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: 64,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.xl,
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  badgeText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.primary,
    letterSpacing: 3,
  },
  header: {
    marginBottom: spacing.xl * 1.5,
  },
  title: {
    fontFamily: fonts.black,
    fontSize: 38,
    color: '#FFFFFF',
    letterSpacing: -1.5,
    lineHeight: 44,
    marginBottom: spacing.md,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: '#64748B',
    lineHeight: 22,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#13131F',
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: '#2A2A40',
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  prefix: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRightWidth: 1,
    borderRightColor: '#2A2A40',
    gap: 6,
  },
  flag: {
    fontSize: 18,
  },
  prefixText: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    color: '#94A3B8',
  },
  input: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontFamily: fonts.bold,
    fontSize: 22,
    color: '#FFFFFF',
    letterSpacing: 3,
  },
  checkmark: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#22C55E20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  checkmarkText: {
    color: '#22C55E',
    fontSize: 16,
    fontFamily: fonts.bold,
  },
  errorWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.md,
    marginLeft: 4,
  },
  errorIcon: {
    fontSize: 13,
    color: colors.danger,
  },
  error: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.danger,
  },
  btnWrap: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  btn: {
    paddingVertical: spacing.md + 6,
    alignItems: 'center',
    borderRadius: radius.lg,
  },
  btnText: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  btnTextDim: {
    color: '#3D3D5C',
  },
  note: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: '#3D3D5C',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.xl * 2,
  },
  decorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  decorChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: '#1E1E30',
    backgroundColor: '#0F0F1A',
  },
  decorText: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: '#3D3D5C',
  },
});
