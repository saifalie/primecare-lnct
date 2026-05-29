import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, FlatList, Animated
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts, spacing, radius } from '../theme';
import useProfileStore from '../store/profileStore';
import useAuthStore from '../store/authStore';
import { getPatient } from '../services/api';

export default function ProfileSwitcher() {
  const [showModal, setShowModal] = useState(false);
  const { members, activePatientId, setActivePatient } = useProfileStore();
  const { login } = useAuthStore();

  const activeMember = members.find(m => m.id === activePatientId) || members[0];

  const handleSwitch = async (member) => {
    setShowModal(false);
    setActivePatient(member.id);
    try {
      const res = await getPatient(member.id);
      login('demo-token', member.id, res.data);
    } catch {
      login('demo-token', member.id, null);
    }
  };

  return (
    <>
      <TouchableOpacity
        style={styles.switcher}
        onPress={() => setShowModal(true)}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={[activeMember.color + '40', activeMember.color + '20']}
          style={styles.avatar}
        >
          <Text style={styles.avatarText}>{activeMember.initials}</Text>
        </LinearGradient>
        <View style={styles.info}>
          <Text style={styles.name}>{activeMember.name}</Text>
          <Text style={styles.role}>{activeMember.role}</Text>
        </View>
        <Text style={styles.chevron}>⌄</Text>
      </TouchableOpacity>

      <Modal visible={showModal} transparent animationType="fade">
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setShowModal(false)}
        >
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Family Members</Text>
            {members.map((member) => (
              <TouchableOpacity
                key={member.id}
                style={[
                  styles.memberRow,
                  member.id === activePatientId && styles.memberRowActive
                ]}
                onPress={() => handleSwitch(member)}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[member.color + '40', member.color + '20']}
                  style={[styles.memberAvatar, { borderColor: member.color + '60' }]}
                >
                  <Text style={[styles.memberInitials, { color: member.color }]}>
                    {member.initials}
                  </Text>
                </LinearGradient>
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>{member.name}</Text>
                  <Text style={styles.memberRole}>{member.age} yrs · {member.role}</Text>
                </View>
                {member.id === activePatientId && (
                  <View style={[styles.activeDot, { backgroundColor: member.color }]} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  switcher: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#13131F',
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#1E1E30',
  },
  avatar: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontFamily: fonts.bold, fontSize: 11, color: '#FFFFFF' },
  info: {},
  name: { fontFamily: fonts.semiBold, fontSize: 13, color: '#FFFFFF' },
  role: { fontFamily: fonts.regular, fontSize: 10, color: '#4A4A6A' },
  chevron: { fontSize: 16, color: '#4A4A6A', marginLeft: 2 },
  overlay: {
    flex: 1, backgroundColor: '#000000AA',
    justifyContent: 'flex-start', paddingTop: 100,
    paddingHorizontal: spacing.md,
  },
  modal: {
    backgroundColor: '#13131F',
    borderRadius: radius.xl,
    borderWidth: 1, borderColor: '#1E1E30',
    padding: spacing.md,
  },
  modalTitle: {
    fontFamily: fonts.bold, fontSize: 13,
    color: '#4A4A6A', letterSpacing: 1,
    textTransform: 'uppercase', marginBottom: spacing.md,
  },
  memberRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: spacing.sm, padding: spacing.sm,
    borderRadius: radius.lg, marginBottom: spacing.xs,
  },
  memberRowActive: { backgroundColor: '#1E1E30' },
  memberAvatar: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  memberInitials: { fontFamily: fonts.bold, fontSize: 14 },
  memberInfo: { flex: 1 },
  memberName: { fontFamily: fonts.semiBold, fontSize: 15, color: '#FFFFFF' },
  memberRole: { fontFamily: fonts.regular, fontSize: 12, color: '#64748B' },
  activeDot: { width: 8, height: 8, borderRadius: 4 },
});
