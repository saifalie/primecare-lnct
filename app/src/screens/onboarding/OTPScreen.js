import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts, spacing, radius } from '../../theme';
import useAuthStore from '../../store/authStore';
import { verifyOTP, requestOTP, getPatient } from '../../services/api';

export default function OTPScreen({ navigation, route }) {
  const { phone, devOtp } = route.params;
  const [otp, setOtp] = useState(['', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(30);
  const [verified, setVerified] = useState(false);
  const inputs = useRef([]);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0)).current;
  const login = useAuthStore(s => s.login);

  useEffect(() => {
    const interval = setInterval(() => {
      setResendTimer(t => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const showSuccess = (callback) => {
    setVerified(true);
    Animated.spring(successScale, {
      toValue: 1, tension: 50, friction: 5, useNativeDriver: true,
    }).start(() => { setTimeout(callback, 600); });
  };

  const handleChange = (text, index) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);
    setError('');
    if (text && index < 3) inputs.current[index + 1].focus();
    if (index === 3 && text) {
      const code = [...newOtp.slice(0, 3), text].join('');
      if (code.length === 4) handleVerify(code);
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputs.current[index - 1].focus();
    }
  };

  const handleVerify = async (code) => {
    const finalCode = code || otp.join('');
    if (finalCode.length < 4) {
      setError('Enter the 4-digit code');
      shake();
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await verifyOTP(phone, finalCode);
      const { token, patient_id, name } = res.data;

      // Fetch full patient profile
      let patient = null;
      try {
        const patientRes = await getPatient(patient_id);
        patient = patientRes.data;
      } catch (e) {
        console.log('Could not fetch patient profile:', e.message);
      }

      showSuccess(() => {
        login(token, patient_id, patient);
      });
    } catch (err) {
      const msg = err.response?.data?.error || 'Verification failed';
      setError(msg);
      shake();
      setOtp(['', '', '', '']);
      inputs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    setResendTimer(30);
    setOtp(['', '', '', '']);
    inputs.current[0]?.focus();
    try {
      const res = await requestOTP(phone);
      console.log('New OTP:', res.data.dev_otp);
    } catch (e) {
      setError('Failed to resend. Try again.');
    }
  };

  const otpString = otp.join('');

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient colors={['#0D0818', '#070710']} style={StyleSheet.absoluteFill} />

      <View style={styles.inner}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backArrow}>←</Text>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={styles.lockIcon}>
            <Text style={styles.lockEmoji}>🔐</Text>
          </View>
          <Text style={styles.title}>Enter the code</Text>
          <Text style={styles.subtitle}>Sent to{' '}
            <Text style={styles.phoneHighlight}>{phone}</Text>
          </Text>
          {devOtp && (
            <View style={styles.devHint}>
              <Text style={styles.devHintText}>Dev OTP: </Text>
              <Text style={styles.devCode}>{devOtp}</Text>
            </View>
          )}
        </View>

        <Animated.View style={[styles.otpRow, { transform: [{ translateX: shakeAnim }] }]}>
          {otp.map((digit, i) => (
            <TextInput
              key={i}
              ref={ref => inputs.current[i] = ref}
              style={[
                styles.otpBox,
                digit && styles.otpBoxFilled,
                verified && styles.otpBoxSuccess,
              ]}
              value={digit}
              onChangeText={text => handleChange(text.replace(/[^0-9]/g, '').slice(-1), i)}
              onKeyPress={e => handleKeyPress(e, i)}
              keyboardType="number-pad"
              maxLength={1}
              autoFocus={i === 0}
              selectTextOnFocus
              editable={!verified}
            />
          ))}
        </Animated.View>

        {verified && (
          <Animated.View style={[styles.successRow, { transform: [{ scale: successScale }] }]}>
            <View style={styles.successBadge}>
              <Text style={styles.successIcon}>✓</Text>
              <Text style={styles.successText}>Verified!</Text>
            </View>
          </Animated.View>
        )}

        {error ? (
          <View style={styles.errorWrap}>
            <Text style={styles.errorIcon}>⚠</Text>
            <Text style={styles.error}>{error}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          onPress={() => handleVerify()}
          disabled={loading || otpString.length < 4 || verified}
          style={styles.btnWrap}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={otpString.length === 4 ? ['#6366F1', '#4F46E5'] : ['#1E1E30', '#1E1E30']}
            style={styles.btn}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={[styles.btnText, otpString.length < 4 && styles.btnTextDim]}>
                Verify
              </Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleResend} disabled={resendTimer > 0}>
          <Text style={[styles.resend, resendTimer === 0 && styles.resendActive]}>
            {resendTimer > 0 ? `Resend code in ${resendTimer}s` : 'Resend code'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#070710' },
  inner: { flex: 1, paddingHorizontal: spacing.xl, paddingTop: 60 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.xl },
  backArrow: { fontSize: 18, color: colors.primary },
  backText: { fontFamily: fonts.medium, fontSize: 15, color: colors.primary },
  header: { marginBottom: spacing.xl },
  lockIcon: {
    width: 56, height: 56, borderRadius: radius.md,
    backgroundColor: colors.primary + '20', borderWidth: 1,
    borderColor: colors.primary + '40', alignItems: 'center',
    justifyContent: 'center', marginBottom: spacing.lg,
  },
  lockEmoji: { fontSize: 26 },
  title: { fontFamily: fonts.black, fontSize: 36, color: '#FFFFFF', letterSpacing: -1.5, marginBottom: spacing.sm },
  subtitle: { fontFamily: fonts.regular, fontSize: 15, color: '#64748B', marginBottom: spacing.sm },
  phoneHighlight: { fontFamily: fonts.semiBold, color: '#94A3B8' },
  devHint: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.primary + '15', paddingHorizontal: spacing.sm,
    paddingVertical: 4, borderRadius: radius.sm, alignSelf: 'flex-start',
    borderWidth: 1, borderColor: colors.primary + '30',
  },
  devHintText: { fontFamily: fonts.regular, fontSize: 12, color: '#94A3B8' },
  devCode: { fontFamily: fonts.black, fontSize: 13, color: colors.primary, letterSpacing: 2 },
  otpRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  otpBox: {
    flex: 1, height: 68, backgroundColor: '#13131F',
    borderRadius: radius.lg, borderWidth: 1.5, borderColor: '#2A2A40',
    textAlign: 'center', fontFamily: fonts.black, fontSize: 30, color: '#FFFFFF',
  },
  otpBoxFilled: { borderColor: colors.primary, backgroundColor: colors.primary + '15' },
  otpBoxSuccess: { borderColor: '#22C55E', backgroundColor: '#22C55E15' },
  successRow: { alignItems: 'center', marginBottom: spacing.md },
  successBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#22C55E20', paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm, borderRadius: radius.full,
    borderWidth: 1, borderColor: '#22C55E40',
  },
  successIcon: { fontSize: 16, color: '#22C55E' },
  successText: { fontFamily: fonts.semiBold, fontSize: 15, color: '#22C55E' },
  errorWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.md },
  errorIcon: { fontSize: 13, color: colors.danger },
  error: { fontFamily: fonts.medium, fontSize: 13, color: colors.danger },
  btnWrap: { borderRadius: radius.lg, overflow: 'hidden', marginTop: spacing.md, marginBottom: spacing.lg },
  btn: { paddingVertical: spacing.md + 6, alignItems: 'center', borderRadius: radius.lg },
  btnText: { fontFamily: fonts.semiBold, fontSize: 16, color: '#FFFFFF', letterSpacing: 0.5 },
  btnTextDim: { color: '#3D3D5C' },
  resend: { fontFamily: fonts.medium, fontSize: 14, color: '#3D3D5C', textAlign: 'center' },
  resendActive: { color: colors.primary },
});
