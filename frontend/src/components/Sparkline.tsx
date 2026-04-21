import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';

// Simple faux sparkline using stacked vertical bars for a cyberpunk "data" feel.
// No SVG dependency; works on native + web.
export default function Sparkline({
  color,
  bars = 28,
  seed = 1,
}: {
  color: string;
  bars?: number;
  seed?: number;
}) {
  const values = useMemo(() => {
    const arr: number[] = [];
    let x = seed;
    for (let i = 0; i < bars; i++) {
      // deterministic pseudo-random 0.25..1
      x = (x * 9301 + 49297) % 233280;
      const r = x / 233280;
      const smooth = 0.3 + 0.7 * Math.abs(Math.sin(i / 2 + seed)) * (0.6 + r * 0.4);
      arr.push(smooth);
    }
    return arr;
  }, [bars, seed]);

  return (
    <View style={styles.row} pointerEvents="none">
      {values.map((v, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            marginHorizontal: 1,
            height: `${v * 100}%`,
            backgroundColor: color,
            opacity: 0.35 + 0.6 * v,
            borderRadius: 2,
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: '100%',
    width: '100%',
  },
});
