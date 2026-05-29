import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, radius } from '../theme';

export default function LiveValue({ icon, value, unit, label, color, style }) {
  const valueColor = color || colors.textPrimary;

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={[styles.value, { color: valueColor }]}>
        {value ?? '--'}
      </Text>
      <Text style={styles.unit}>{unit}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    minWidth: 72,
  },
  icon: {
    fontSize: 20,
    marginBottom: 2,
  },
  value: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  unit: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  label: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },
});
