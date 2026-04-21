import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius } from '../../src/theme';
import GlassCard from '../../src/components/GlassCard';
import NeonButton from '../../src/components/NeonButton';
import ProgressBar from '../../src/components/ProgressBar';
import Sparkline from '../../src/components/Sparkline';
import { api } from '../../src/api';

export default function Dashboard() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [myAgents, setMyAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [d, mine] = await Promise.all([api.dashboard(), api.myAgents()]);
      setData(d);
      setMyAgents(mine);
    } catch (e) {
      console.warn('dashboard load err', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      const t = setInterval(load, 6000);
      return () => clearInterval(t);
    }, [load])
  );

  useEffect(() => { load(); }, [load]);

  const onDeployFeatured = async () => {
    if (!data?.featured_agent) return;
    await api.deploy(data.featured_agent.id);
    load();
  };

  if (loading && !data) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl tintColor={colors.primary} refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />
        }
      >
        {/* Header */}
        <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>SYSTEM.ONLINE</Text>
            <Text style={styles.title} testID="dashboard-title">CASH CLAW</Text>
          </View>
          <TouchableOpacity
            testID="header-profile-button"
            style={styles.statusDot}
            onPress={() => router.push('/(tabs)/profile')}
          >
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Hero earnings card */}
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <GlassCard glow="green" style={styles.hero} testID="hero-earnings-card">
            <View style={styles.heroSparkWrap}>
              <Sparkline color={colors.primary} bars={32} seed={7} />
            </View>
            <Text style={styles.kpiLabel}>TOTAL EARNED · ALL AGENTS</Text>
            <Text style={styles.heroNumber} testID="total-earnings-text">
              ${(data?.total_earned ?? 0).toFixed(4)}
            </Text>
            <View style={styles.heroRow}>
              <View style={styles.heroStat}>
                <Ionicons name="flash-outline" size={14} color={colors.primary} />
                <Text style={styles.heroStatText}>
                  {data?.active_agents ?? 0} / {data?.deployed_agents ?? 0} active
                </Text>
              </View>
              <View style={styles.heroStat}>
                <Ionicons name="trending-up-outline" size={14} color={colors.aiCyan} />
                <Text style={[styles.heroStatText, { color: colors.aiCyan }]}>
                  LVL {data?.avg_level ?? 0} avg
                </Text>
              </View>
            </View>
          </GlassCard>
        </Animated.View>

        {/* KPI tiles */}
        <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.kpiGrid}>
          <GlassCard glow="cyan" style={styles.kpiTile} testID="kpi-active-agents">
            <Ionicons name="hardware-chip-outline" size={22} color={colors.aiCyan} />
            <Text style={styles.kpiTileValue}>{data?.active_agents ?? 0}</Text>
            <Text style={styles.kpiTileLabel}>ACTIVE AGENTS</Text>
          </GlassCard>
          <GlassCard glow="magenta" style={styles.kpiTile} testID="kpi-pending-payout">
            <Ionicons name="wallet-outline" size={22} color={colors.aiMagenta} />
            <Text style={styles.kpiTileValue}>${(data?.pending_payout ?? 0).toFixed(2)}</Text>
            <Text style={styles.kpiTileLabel}>PENDING PAYOUT</Text>
          </GlassCard>
        </Animated.View>

        {/* Featured Agent */}
        {data?.featured_agent && (
          <Animated.View entering={FadeInDown.delay(300).springify()}>
            <Text style={styles.sectionTitle}>FEATURED AGENT</Text>
            <GlassCard glow="cyan" style={styles.featured} testID="featured-agent-card">
              <View style={styles.featuredHead}>
                <View style={[styles.iconBubble, { borderColor: data.featured_agent.accent_color }]}>
                  <Ionicons name={data.featured_agent.icon} size={28} color={data.featured_agent.accent_color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.featuredName}>{data.featured_agent.name}</Text>
                  <Text style={styles.featuredTag}>{data.featured_agent.tagline}</Text>
                </View>
              </View>
              <View style={styles.featuredStats}>
                <View style={styles.featuredStat}>
                  <Text style={styles.featuredStatVal}>
                    ${data.featured_agent.base_daily_earning.toFixed(2)}
                  </Text>
                  <Text style={styles.featuredStatLbl}>/day baseline</Text>
                </View>
                <View style={styles.featuredStat}>
                  <Text style={[styles.featuredStatVal, { color: colors.aiCyan }]}>
                    {data.featured_agent.total_deploys.toLocaleString()}
                  </Text>
                  <Text style={styles.featuredStatLbl}>deploys</Text>
                </View>
                <View style={styles.featuredStat}>
                  <Text style={[styles.featuredStatVal, { color: colors.aiMagenta }]}>
                    ${Math.round(data.featured_agent.community_earned / 1000)}k
                  </Text>
                  <Text style={styles.featuredStatLbl}>community</Text>
                </View>
              </View>
              <NeonButton
                label="Deploy Agent"
                onPress={onDeployFeatured}
                testID="deploy-featured-agent-button"
                style={{ marginTop: spacing.md }}
              />
              <TouchableOpacity
                style={styles.detailsLink}
                onPress={() => router.push(`/agent/${data.featured_agent.id}`)}
                testID="featured-agent-details-link"
              >
                <Text style={styles.detailsLinkText}>View details</Text>
                <Ionicons name="arrow-forward" size={14} color={colors.aiCyan} />
              </TouchableOpacity>
            </GlassCard>
          </Animated.View>
        )}

        {/* My Agents */}
        <Animated.View entering={FadeInDown.delay(400).springify()}>
          <Text style={styles.sectionTitle}>MY FLEET · {myAgents.length}</Text>
          {myAgents.length === 0 ? (
            <GlassCard style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
              <Ionicons name="rocket-outline" size={36} color={colors.textMuted} />
              <Text style={styles.emptyText}>No agents deployed yet</Text>
              <Text style={styles.emptySub}>Browse the Cluster to deploy your first earner.</Text>
              <NeonButton
                label="Browse Marketplace"
                variant="secondary"
                onPress={() => router.push('/(tabs)/marketplace')}
                testID="browse-marketplace-cta"
                style={{ marginTop: spacing.md }}
              />
            </GlassCard>
          ) : (
            myAgents.slice(0, 4).map((m, idx) => (
              <Animated.View key={m.id} entering={FadeInDown.delay(450 + idx * 80).springify()}>
                <TouchableOpacity
                  onPress={() => router.push(`/agent/${m.agent_id}`)}
                  testID={`my-agent-row-${m.agent_id}`}
                  activeOpacity={0.85}
                >
                  <GlassCard style={styles.myAgentRow}>
                    <View style={[styles.iconBubbleSmall, { borderColor: m.agent.accent_color }]}>
                      <Ionicons name={m.agent.icon} size={18} color={m.agent.accent_color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.myAgentTopRow}>
                        <Text style={styles.myAgentName} numberOfLines={1}>{m.agent.name}</Text>
                        <Text style={[styles.myAgentEarn, { color: colors.primary }]}>
                          ${m.earned_total.toFixed(3)}
                        </Text>
                      </View>
                      <View style={styles.myAgentMeta}>
                        <Text style={styles.myAgentLvl}>LVL {m.level}</Text>
                        <View style={{ flex: 1, marginHorizontal: spacing.sm }}>
                          <ProgressBar progress={m.progress} color={colors.aiMagenta} height={4} />
                        </View>
                        <View style={[styles.activePill, { borderColor: m.active ? colors.primary : colors.textMuted }]}>
                          <View style={[styles.activeDot, { backgroundColor: m.active ? colors.primary : colors.textMuted }]} />
                          <Text style={[styles.activeTxt, { color: m.active ? colors.primary : colors.textMuted }]}>
                            {m.active ? 'LIVE' : 'PAUSED'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </GlassCard>
                </TouchableOpacity>
              </Animated.View>
            ))
          )}
        </Animated.View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  eyebrow: { color: colors.aiCyan, fontSize: 10, letterSpacing: 2, fontWeight: '700' },
  title: { color: colors.textPrimary, fontSize: 28, fontWeight: '900', letterSpacing: 2 },
  statusDot: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: radius.pill, borderWidth: 1, borderColor: colors.borderGlowGreen,
    backgroundColor: 'rgba(57,255,20,0.08)',
  },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.primary, marginRight: 6 },
  liveText: { color: colors.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  hero: { padding: spacing.lg, overflow: 'hidden', position: 'relative', marginBottom: spacing.md },
  heroSparkWrap: { position: 'absolute', inset: 0 as any, left: 0, right: 0, top: 0, bottom: 0, opacity: 0.18 },
  kpiLabel: { color: colors.textSecondary, fontSize: 10, letterSpacing: 2, fontWeight: '700', marginBottom: 4 },
  heroNumber: {
    color: colors.primary, fontSize: 44, fontWeight: '900', fontFamily: 'Courier',
    letterSpacing: -1, marginBottom: spacing.sm,
  },
  heroRow: { flexDirection: 'row', gap: spacing.md as any, marginTop: spacing.sm },
  heroStat: { flexDirection: 'row', alignItems: 'center', gap: 6 as any, marginRight: spacing.md },
  heroStatText: { color: colors.primary, fontSize: 12, marginLeft: 6, fontWeight: '700', letterSpacing: 0.5 },
  kpiGrid: { flexDirection: 'row', gap: spacing.md as any, marginBottom: spacing.md },
  kpiTile: { flex: 1, minHeight: 110, marginRight: spacing.md },
  kpiTileValue: {
    color: colors.textPrimary, fontSize: 24, fontWeight: '900',
    fontFamily: 'Courier', marginTop: spacing.sm,
  },
  kpiTileLabel: { color: colors.textSecondary, fontSize: 10, letterSpacing: 1.5, fontWeight: '700', marginTop: 4 },
  sectionTitle: {
    color: colors.textSecondary, fontSize: 11, letterSpacing: 2, fontWeight: '800',
    marginTop: spacing.lg, marginBottom: spacing.sm,
  },
  featured: { padding: spacing.lg },
  featuredHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md as any, marginBottom: spacing.md },
  iconBubble: {
    width: 56, height: 56, borderRadius: 16, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,255,255,0.05)', marginRight: spacing.md,
  },
  iconBubbleSmall: {
    width: 40, height: 40, borderRadius: 12, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)', marginRight: spacing.md,
  },
  featuredName: { color: colors.textPrimary, fontSize: 20, fontWeight: '800' },
  featuredTag: { color: colors.textSecondary, fontSize: 13, marginTop: 2 },
  featuredStats: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: spacing.md, borderTopWidth: 1, borderBottomWidth: 1,
    borderColor: colors.border,
  },
  featuredStat: { alignItems: 'center', flex: 1 },
  featuredStatVal: { color: colors.primary, fontSize: 18, fontWeight: '800', fontFamily: 'Courier' },
  featuredStatLbl: { color: colors.textMuted, fontSize: 10, letterSpacing: 1, fontWeight: '600', marginTop: 2 },
  detailsLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: spacing.md, gap: 6 as any },
  detailsLinkText: { color: colors.aiCyan, fontSize: 12, fontWeight: '700', letterSpacing: 1, marginRight: 6 },
  emptyText: { color: colors.textPrimary, fontSize: 16, fontWeight: '700', marginTop: spacing.md },
  emptySub: { color: colors.textMuted, fontSize: 13, marginTop: 4, textAlign: 'center' },
  myAgentRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm, padding: spacing.md },
  myAgentTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  myAgentName: { color: colors.textPrimary, fontSize: 15, fontWeight: '700', flex: 1, marginRight: spacing.sm },
  myAgentEarn: { fontSize: 15, fontWeight: '800', fontFamily: 'Courier' },
  myAgentMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  myAgentLvl: {
    color: colors.aiMagenta, fontSize: 10, fontWeight: '800', letterSpacing: 1,
    paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: colors.borderGlowMagenta, borderRadius: 4,
  },
  activePill: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: radius.pill, borderWidth: 1,
  },
  activeDot: { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
  activeTxt: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },
});
