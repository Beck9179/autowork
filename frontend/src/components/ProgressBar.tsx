import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, radius } from '../theme';

export default function ProgressBar({
  progress,
  color = colors.aiMagenta,
  height = 8,
  testID,
}: {
  progress: number; // 0..1
  color?: string;
  height?: number;
  testID?: string;
}) {
  const pct = Math.max(0, Math.min(1, progress));
  return (
    <View style={[styles.track, { height, borderRadius: height / 2 }]} testID={testID}>
      <View
        style={{
          width: `${pct * 100}%`,
          height: '100%',
          backgroundColor: color,
          shadowColor: color,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.9,
          shadowRadius: 8,
          borderRadius: height / 2,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    backgroundColor: colors.surfaceHighlight,
    overflow: 'hidden',
    width: '100%',
    borderRadius: radius.sm,
  },
});
