import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, spacing } from '../theme';

export default function Badge({ label, color, style }) {
  const badgeColor = color || colors.primary;
  return (
    <View style={[styles.badge, { backgroundColor: badgeColor + '22', borderColor: badgeColor + '44' }, style]}>
      <Text style={[styles.label, { color: badgeColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
