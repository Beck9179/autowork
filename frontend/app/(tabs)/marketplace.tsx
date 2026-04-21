import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, ScrollView,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors, spacing, radius } from '../../src/theme';
import GlassCard from '../../src/components/GlassCard';
import { api } from '../../src/api';

export default function Marketplace() {
  const router = useRouter();
  const [cats, setCats] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [selected, setSelected] = useState('all');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (cat: string) => {
    setLoading(true);
    try {
      const [c, a] = await Promise.all([api.categories(), api.listAgents(cat)]);
      setCats(c);
      setAgents(a);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(selected); }, [load, selected]);

  useFocusEffect(useCallback(() => { load(selected); }, [load, selected]));

  const deploy = async (agent_id: string) => {
    await api.deploy(agent_id);
    router.push(`/agent/${agent_id}`);
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>AGENT.CLUSTER</Text>
        <Text style={styles.title} testID="marketplace-title">MARKETPLACE</Text>
        <Text style={styles.sub}>AI agents from GitHub that earn while you sleep</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
      >
        {cats.map((c) => {
          const active = selected === c.id;
          return (
            <TouchableOpacity
              key={c.id}
              testID={`category-chip-${c.id}`}
              onPress={() => setSelected(c.id)}
              activeOpacity={0.85}
              style={[
                styles.chip,
                active && { backgroundColor: colors.aiCyan, borderColor: colors.aiCyan },
              ]}
            >
              <Text style={[styles.chipTxt, active && { color: colors.background }]}>
                {c.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={agents}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          testID="agents-list"
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.delay(index * 60).springify()}>
              <TouchableOpacity
                testID={`agent-card-${item.id}`}
                onPress={() => router.push(`/agent/${item.id}`)}
                activeOpacity={0.85}
              >
                <GlassCard style={styles.card}>
                  <View style={[styles.iconBubble, { borderColor: item.accent_color }]}>
                    <Ionicons name={item.icon} size={22} color={item.accent_color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.titleRow}>
                      <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.price}>${item.base_daily_earning.toFixed(2)}/d</Text>
                    </View>
                    <Text style={styles.tagline} numberOfLines={1}>{item.tagline}</Text>
                    <View style={styles.metaRow}>
                      <View style={styles.tag}>
                        <Text style={styles.tagTxt}>{item.category.toUpperCase()}</Text>
                      </View>
                      <Ionicons name="logo-github" size={12} color={colors.textMuted} style={{ marginLeft: 8 }} />
                      <Text style={styles.repo} numberOfLines={1}>{item.github_repo}</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => deploy(item.id)}
                    style={styles.deployBtn}
                    testID={`deploy-button-${item.id}`}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="rocket-outline" size={18} color={colors.primary} />
                  </TouchableOpacity>
                </GlassCard>
              </TouchableOpacity>
            </Animated.View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  eyebrow: { color: colors.aiCyan, fontSize: 10, letterSpacing: 2, fontWeight: '700' },
  title: { color: colors.textPrimary, fontSize: 26, fontWeight: '900', letterSpacing: 1.5 },
  sub: { color: colors.textSecondary, fontSize: 13, marginTop: 4 },
  chipsRow: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.sm as any },
  chip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: radius.pill,
    backgroundColor: colors.surfaceHighlight, marginRight: spacing.sm,
    borderWidth: 1, borderColor: colors.border,
  },
  chipTxt: { color: colors.textSecondary, fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.sm as any },
  card: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, marginBottom: spacing.sm },
  iconBubble: {
    width: 48, height: 48, borderRadius: 12, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,255,255,0.04)', marginRight: spacing.md,
  },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { color: colors.textPrimary, fontSize: 15, fontWeight: '800', flex: 1, marginRight: spacing.sm },
  price: { color: colors.primary, fontSize: 13, fontWeight: '800', fontFamily: 'Courier' },
  tagline: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  tag: {
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
    backgroundColor: 'rgba(255,0,255,0.12)',
  },
  tagTxt: { color: colors.aiMagenta, fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  repo: { color: colors.textMuted, fontSize: 10, marginLeft: 4, flex: 1 },
  deployBtn: {
    width: 42, height: 42, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(57,255,20,0.08)',
    borderWidth: 1, borderColor: colors.borderGlowGreen,
    marginLeft: spacing.sm,
  },
});
