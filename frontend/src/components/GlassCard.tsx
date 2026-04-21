import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { colors, radius, spacing } from '../theme';

export default function GlassCard({
  children,
  style,
  glow,
  testID,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  glow?: 'cyan' | 'green' | 'magenta' | 'none';
  testID?: string;
}) {
  const glowStyle =
    glow === 'cyan'
      ? { borderColor: colors.borderGlowCyan, shadowColor: colors.aiCyan }
      : glow === 'green'
      ? { borderColor: colors.borderGlowGreen, shadowColor: colors.primary }
      : glow === 'magenta'
      ? { borderColor: colors.borderGlowMagenta, shadowColor: colors.aiMagenta }
      : { borderColor: colors.border, shadowColor: '#000' };

  return (
    <View style={[styles.card, glowStyle, style]} testID={testID}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 18,
    elevation: 6,
  },
});
