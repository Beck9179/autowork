import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors, spacing, radius } from '../../src/theme';
import GlassCard from '../../src/components/GlassCard';
import { api } from '../../src/api';

export default function Leaderboard() {
  const router = useRouter();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.leaderboard();
      setRows(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>GLOBAL.RANKINGS</Text>
        <Text style={styles.title} testID="leaderboard-title">LEADERBOARD</Text>
        <Text style={styles.sub}>Top earning agents across the network</Text>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item, idx) => `${item.agent?.id}-${idx}`}
          contentContainerStyle={styles.list}
          testID="leaderboard-list"
          renderItem={({ item, index }) => {
            const rank = index + 1;
            const isTop = rank <= 3;
            const rankColor = rank === 1 ? colors.gold : rank === 2 ? colors.aiCyan : rank === 3 ? colors.aiMagenta : colors.textMuted;

            return (
              <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
                <TouchableOpacity
                  testID={`leaderboard-row-${rank}`}
                  onPress={() => router.push(`/agent/${item.agent.id}`)}
                  activeOpacity={0.85}
                >
                  <GlassCard
                    glow={rank === 1 ? 'green' : 'none'}
                    style={[
                      styles.row,
                      isTop && { borderColor: rankColor + '88' },
                    ]}
                  >
                    <View style={[styles.rankBadge, { borderColor: rankColor }]}>
                      <Text style={[styles.rankText, { color: rankColor }]}>
                        #{rank}
                      </Text>
                    </View>
                    <View style={[styles.icon, { borderColor: item.agent.accent_color }]}>
                      <Ionicons name={item.agent.icon} size={20} color={item.agent.accent_color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.name} numberOfLines={1}>{item.agent.name}</Text>
                      <Text style={styles.creator} numberOfLines={1}>by {item.agent.creator}</Text>
                      <View style={styles.metaRow}>
                        <View style={styles.metaPill}>
                          <Ionicons name="layers-outline" size={10} color={colors.aiCyan} />
                          <Text style={[styles.metaTxt, { color: colors.aiCyan }]}>
                            {item.deploys} deploys
                          </Text>
                        </View>
                        <View style={styles.metaPill}>
                          <Ionicons name="flash-outline" size={10} color={colors.aiMagenta} />
                          <Text style={[styles.metaTxt, { color: colors.aiMagenta }]}>
                            LVL {item.avg_level}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.earned}>
                        ${item.total_earned >= 10000
                          ? `${(item.total_earned / 1000).toFixed(1)}k`
                          : item.total_earned.toFixed(2)}
                      </Text>
                      <Text style={styles.earnedLbl}>total</Text>
                    </View>
                  </GlassCard>
                </TouchableOpacity>
              </Animated.View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.md },
  eyebrow: { color: colors.aiCyan, fontSize: 10, letterSpacing: 2, fontWeight: '700' },
  title: { color: colors.textPrimary, fontSize: 26, fontWeight: '900', letterSpacing: 1.5 },
  sub: { color: colors.textSecondary, fontSize: 13, marginTop: 4 },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  row: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, marginBottom: spacing.sm },
  rankBadge: {
    width: 40, height: 40, borderRadius: 10, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center', marginRight: spacing.md,
  },
  rankText: { fontSize: 12, fontWeight: '900', fontFamily: 'Courier' },
  icon: {
    width: 42, height: 42, borderRadius: 10, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)', marginRight: spacing.md,
  },
  name: { color: colors.textPrimary, fontSize: 14, fontWeight: '800' },
  creator: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  metaRow: { flexDirection: 'row', marginTop: 4, gap: 6 as any },
  metaPill: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 6, paddingVertical: 2,
    marginRight: 6, borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  metaTxt: { fontSize: 9, fontWeight: '700', marginLeft: 3, letterSpacing: 0.5 },
  earned: { color: colors.primary, fontSize: 15, fontWeight: '900', fontFamily: 'Courier' },
  earnedLbl: { color: colors.textMuted, fontSize: 9, letterSpacing: 1, marginTop: 2 },
});
