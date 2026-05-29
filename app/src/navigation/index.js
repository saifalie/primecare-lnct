import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Modal, FlatList } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import HomeScreen from '../screens/HomeScreen';
import AlertsScreen from '../screens/AlertsScreen';
import TrendsScreen from '../screens/TrendsScreen';
import MedicationsScreen from '../screens/MedicationsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import useBleStore from '../store/bleStore';
import useAuthStore from '../store/authStore';
import useProfileStore from '../store/profileStore';
import { startScan } from '../services/bleService';
import { getPatient } from '../services/api';

const Tab = createBottomTabNavigator();

function SplashScreen({ onDone }) {
  const opacity = new Animated.Value(0);
  const scale = new Animated.Value(0.8);
  const lineWidth = new Animated.Value(0);

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true }),
      ]),
      Animated.timing(lineWidth, { toValue: 200, duration: 800, useNativeDriver: false }),
      Animated.delay(600),
      Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start(() => onDone());
  }, []);

  return (
    <LinearGradient colors={['#070710', '#0F0F1A', '#070710']} style={splash.container}>
      <Animated.View style={[splash.content, { opacity, transform: [{ scale }] }]}>
        <View style={splash.iconWrap}>
          <LinearGradient colors={['#818CF8', '#6366F1', '#4F46E5']} style={splash.iconBg}>
            <Text style={splash.iconText}>❤️</Text>
          </LinearGradient>
        </View>
        <Text style={splash.title}>PrimeCare</Text>
        <Text style={splash.subtitle}>Health Monitoring</Text>
        <Animated.View style={[splash.line, { width: lineWidth }]} />
        <Text style={splash.tagline}>Always Watching. Always Ready.</Text>
      </Animated.View>
    </LinearGradient>
  );
}

function MainNavigator() {
  const { lastFall, lastSOS } = useBleStore();
  const alertCount = (lastFall ? 1 : 0) + (lastSOS ? 1 : 0);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#6366F1',
        tabBarInactiveTintColor: '#3D3D5C',
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ focused, color }) => {
          let iconName;
          if (route.name === 'Home') iconName = focused ? 'heart' : 'heart-outline';
          else if (route.name === 'Alerts') iconName = focused ? 'notifications' : 'notifications-outline';
          else if (route.name === 'Trends') iconName = focused ? 'stats-chart' : 'stats-chart-outline';
          else if (route.name === 'Medications') iconName = focused ? 'medical' : 'medical-outline';
          else if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline';
          return (
            <View style={styles.iconWrap}>
              <Ionicons name={iconName} size={22} color={color} />
              {route.name === 'Alerts' && alertCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{alertCount}</Text>
                </View>
              )}
            </View>
          );
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Alerts" component={AlertsScreen} />
      <Tab.Screen name="Trends" component={TrendsScreen} />
      <Tab.Screen name="Medications" component={MedicationsScreen} options={{ tabBarLabel: 'Meds' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const [showSplash, setShowSplash] = useState(true);
  const { login } = useAuthStore();
  const { setActivePatient } = useProfileStore();

  useEffect(() => {
    const init = async () => {
      // Auto-login patient-001 — no auth friction
      try {
        const res = await getPatient('patient-001');
        login('demo-token', 'patient-001', res.data);
      } catch {
        login('demo-token', 'patient-001', null);
      }
      setActivePatient('patient-001');
      startScan();
    };
    init();
  }, []);

  if (showSplash) {
    return <SplashScreen onDone={() => setShowSplash(false)} />;
  }

  return (
    <NavigationContainer>
      <MainNavigator />
    </NavigationContainer>
  );
}

const splash = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { alignItems: 'center' },
  iconWrap: { marginBottom: 20 },
  iconBg: { width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  iconText: { fontSize: 40 },
  title: { fontFamily: 'Inter_800ExtraBold', fontSize: 36, color: '#FFFFFF', letterSpacing: -1.5, marginBottom: 4 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 14, color: '#4A4A6A', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 32 },
  line: { height: 1, backgroundColor: '#6366F130', marginBottom: 16 },
  tagline: { fontFamily: 'Inter_500Medium', fontSize: 13, color: '#3D3D5C', letterSpacing: 0.5 },
});

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#0A0A14', borderTopColor: '#1A1A2E',
    borderTopWidth: 0.5, height: 80, paddingBottom: 16, paddingTop: 10,
  },
  tabLabel: { fontFamily: 'Inter_500Medium', fontSize: 10, marginTop: 2 },
  iconWrap: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute', top: -4, right: -8,
    backgroundColor: '#EF4444', borderRadius: 6,
    width: 14, height: 14, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#0A0A14',
  },
  badgeText: { color: '#FFFFFF', fontSize: 8, fontFamily: 'Inter_700Bold' },
});
