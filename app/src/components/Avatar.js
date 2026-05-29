import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { colors, radius } from '../theme';

export default function Avatar({ name, photo, size = 48, style }) {
  const initials = name
    ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  const fontSize = size * 0.35;

  if (photo) {
    return (
      <Image
        source={{ uri: photo }}
        style={[
          styles.avatar,
          { width: size, height: size, borderRadius: size / 2 },
          style,
        ]}
      />
    );
  }

  return (
    <View
      style={[
        styles.placeholder,
        { width: size, height: size, borderRadius: size / 2 },
        style,
      ]}
    >
      <Text style={[styles.initials, { fontSize }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    backgroundColor: colors.card,
  },
  placeholder: {
    backgroundColor: colors.primary + '33',
    borderWidth: 2,
    borderColor: colors.primary + '66',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: colors.primary,
    fontWeight: '700',
  },
});
