import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { colors, spacing, radius } from '../../src/theme';
import GlassCard from '../../src/components/GlassCard';
import NeonButton from '../../src/components/NeonButton';
import ProgressBar from '../../src/components/ProgressBar';
import Sparkline from '../../src/components/Sparkline';
import { api } from '../../src/api';

export default function AgentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [agent, setAgent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [insight, setInsight] = useState<any>(null);
  const [insightLoading, setInsightLoading] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const a = await api.getAgent(id);
      setAgent(a);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  // Fetch Claude insight when deployment exists. Re-fetch whenever level changes.
  useEffect(() => {
    const dep = agent?.my_deployment;
    if (!dep?.id) {
      setInsight(null);
      return;
    }
    if (insight && insight.level === dep.level) return;
    let cancelled = false;
    setInsightLoading(true);
    api.insight(dep.id)
      .then((r) => { if (!cancelled) setInsight(r); })
      .catch(() => { if (!cancelled) setInsight(null); })
      .finally(() => { if (!cancelled) setInsightLoading(false); });
    return () => { cancelled = true; };
  }, [agent?.my_deployment?.id, agent?.my_deployment?.level, insight]);

  const onDeploy = async () => {
    if (!agent) return;
    setBusy(true);
    try {
      await api.deploy(agent.id);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const onToggle = async () => {
    if (!agent?.my_deployment) return;
    setBusy(true);
    try {
      await api.toggle(agent.my_deployment.id);
      await load();
    } finally {
      setBusy(false);
    }
  };

  if (loading || !agent) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  const dep = agent.my_deployment;
  const xpInLevel = dep ? dep.xp % 500 : 0;
  const xpProgress = dep ? xpInLevel / 500 : 0;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.topRow}>
          <TouchableOpacity
            testID="agent-back-button"
            onPress={() => router.back()}
            style={styles.backBtn}
            activeOpacity={0.8}
          >
            <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={[styles.tag, { borderColor: agent.accent_color }]}>
            <Text style={[styles.tagTxt, { color: agent.accent_color }]}>
              {agent.category.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Hero */}
        <Animated.View entering={FadeIn.duration(400)}>
          <GlassCard glow="cyan" style={styles.hero}>
            <View style={[styles.iconBubble, { borderColor: agent.accent_color, shadowColor: agent.accent_color }]}>
              <Ionicons name={agent.icon} size={40} color={agent.accent_color} />
            </View>
            <Text style={styles.name} testID="agent-name">{agent.name}</Text>
            <Text style={styles.creator}>by {agent.creator}</Text>
            <View style={styles.repoRow}>
              <Ionicons name="logo-github" size={14} color={colors.textSecondary} />
              <Text style={styles.repo}>{agent.github_repo}</Text>
            </View>
            <Text style={styles.description}>{agent.description}</Text>
          </GlassCard>
        </Animated.View>

        {/* Earnings chart placeholder */}
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <GlassCard glow="green" style={styles.chartCard}>
            <View style={styles.chartHead}>
              <View>
                <Text style={styles.chartLbl}>SIMULATED EARNINGS · 24H</Text>
                <Text style={styles.chartVal}>
                  ${agent.base_daily_earning.toFixed(2)}
                  <Text style={styles.chartSub}> /day baseline</Text>
                </Text>
              </View>
              <View style={styles.volPill}>
                <Ionicons name="pulse-outline" size={12} color={colors.aiMagenta} />
                <Text style={styles.volTxt}>VOL {Math.round(agent.volatility * 100)}%</Text>
              </View>
            </View>
            <View style={styles.chartArea}>
              <Sparkline color={colors.primary} bars={40} seed={agent.id.length + 3} />
            </View>
          </GlassCard>
        </Animated.View>

        {/* Evolution */}
        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <GlassCard glow="magenta" style={{ padding: spacing.lg }}>
            <Text style={styles.sectionTitle}>EVOLUTION</Text>
            {dep ? (
              <>
                <View style={styles.lvlRow}>
                  <Text style={styles.lvlTxt}>LVL {dep.level}</Text>
                  <Text style={styles.lvlXp}>
                    {xpInLevel} / 500 XP
                  </Text>
                </View>
                <ProgressBar progress={xpProgress} color={colors.aiMagenta} height={10} testID="agent-evolution-bar" />
                <View style={styles.depStats}>
                  <View style={styles.depStat}>
                    <Text style={styles.depStatVal}>${dep.earned_total.toFixed(3)}</Text>
                    <Text style={styles.depStatLbl}>EARNED</Text>
                  </View>
                  <View style={styles.depStat}>
                    <Text style={[styles.depStatVal, { color: colors.aiCyan }]}>{dep.xp}</Text>
                    <Text style={styles.depStatLbl}>TOTAL XP</Text>
                  </View>
                  <View style={styles.depStat}>
                    <Text style={[styles.depStatVal, { color: dep.active ? colors.primary : colors.textMuted }]}>
                      {dep.active ? 'LIVE' : 'PAUSED'}
                    </Text>
                    <Text style={styles.depStatLbl}>STATUS</Text>
                  </View>
                </View>
              </>
            ) : (
              <Text style={styles.notDeployed}>
                Deploy to begin this agent&apos;s evolution. Each active second earns XP and refines its model.
              </Text>
            )}
          </GlassCard>
        </Animated.View>

        {/* Claude AI Insight - only when deployed */}
        {dep && (
          <Animated.View entering={FadeInDown.delay(250).springify()}>
            <GlassCard glow="cyan" style={styles.insightCard} testID="agent-insight-card">
              <View style={styles.insightHead}>
                <Ionicons name="sparkles-outline" size={16} color={colors.aiCyan} />
                <Text style={styles.insightTitle}>NEURAL LOG · LVL {dep.level}</Text>
                {insight?.cached && (
                  <View style={styles.cachedPill}>
                    <Text style={styles.cachedTxt}>CACHED</Text>
                  </View>
                )}
              </View>
              {insightLoading && !insight ? (
                <View style={styles.insightLoading}>
                  <ActivityIndicator color={colors.aiCyan} size="small" />
                  <Text style={styles.insightLoadingTxt}>Decoding evolution log...</Text>
                </View>
              ) : insight?.narrative ? (
                <Text style={styles.insightTxt} testID="agent-insight-text">
                  {insight.narrative}
                </Text>
              ) : (
                <Text style={styles.insightFallback}>
                  Insight unavailable. Agent will report on next level-up.
                </Text>
              )}
              <Text style={styles.insightFooter}>powered by Claude Sonnet 4.5</Text>
            </GlassCard>
          </Animated.View>
        )}

        {/* Community stats */}
        <Animated.View entering={FadeInDown.delay(300).springify()}>
          <Text style={styles.sectionTitle}>COMMUNITY</Text>
          <View style={styles.communityRow}>
            <GlassCard style={styles.commCard}>
              <Text style={styles.commVal}>{agent.total_deploys.toLocaleString()}</Text>
              <Text style={styles.commLbl}>DEPLOYS</Text>
            </GlassCard>
            <GlassCard style={styles.commCard}>
              <Text style={[styles.commVal, { color: colors.aiCyan }]}>
                ${Math.round(agent.community_earned / 1000)}k
              </Text>
              <Text style={styles.commLbl}>COMMUNITY EARNED</Text>
            </GlassCard>
          </View>
        </Animated.View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Floating action bar */}
      <View style={styles.footer}>
        {dep ? (
          <View style={styles.footerRow}>
            <NeonButton
              label={dep.active ? 'Pause' : 'Resume'}
              variant="secondary"
              onPress={onToggle}
              loading={busy}
              style={{ flex: 1, marginRight: spacing.sm }}
              testID="agent-toggle-button"
            />
            <NeonButton
              label="Open Fleet"
              onPress={() => router.push('/(tabs)')}
              style={{ flex: 1 }}
              testID="agent-open-fleet-button"
            />
          </View>
        ) : (
          <NeonButton
            label="Deploy Agent"
            onPress={onDeploy}
            loading={busy}
            testID="agent-deploy-button"
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  backBtn: {
    width: 40, height: 40, borderRadius: 10, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface,
  },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, borderWidth: 1 },
  tagTxt: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  hero: { padding: spacing.lg, alignItems: 'center', marginBottom: spacing.md },
  iconBubble: {
    width: 88, height: 88, borderRadius: 24, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,255,255,0.05)',
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 20,
    marginBottom: spacing.md,
  },
  name: { color: colors.textPrimary, fontSize: 26, fontWeight: '900', letterSpacing: 1 },
  creator: { color: colors.textSecondary, fontSize: 13, marginTop: 4 },
  repoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  repo: { color: colors.textSecondary, fontSize: 12, marginLeft: 6, fontFamily: 'Courier' },
  description: { color: colors.textSecondary, fontSize: 13, marginTop: spacing.md, textAlign: 'center', lineHeight: 20 },
  chartCard: { padding: spacing.lg, marginBottom: spacing.md },
  chartHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  chartLbl: { color: colors.textSecondary, fontSize: 10, letterSpacing: 2, fontWeight: '700' },
  chartVal: { color: colors.primary, fontSize: 22, fontWeight: '900', fontFamily: 'Courier', marginTop: 4 },
  chartSub: { color: colors.textMuted, fontSize: 11, fontFamily: 'System', fontWeight: '600' },
  volPill: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: radius.pill, borderWidth: 1, borderColor: colors.borderGlowMagenta,
  },
  volTxt: { color: colors.aiMagenta, fontSize: 10, fontWeight: '800', marginLeft: 4, letterSpacing: 1 },
  chartArea: { height: 80, marginTop: spacing.md },
  sectionTitle: {
    color: colors.textSecondary, fontSize: 11, letterSpacing: 2, fontWeight: '800',
    marginBottom: spacing.sm,
  },
  lvlRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  lvlTxt: { color: colors.aiMagenta, fontSize: 20, fontWeight: '900', fontFamily: 'Courier' },
  lvlXp: { color: colors.textSecondary, fontSize: 12, fontFamily: 'Courier', fontWeight: '700' },
  depStats: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md },
  depStat: { alignItems: 'center', flex: 1 },
  depStatVal: { color: colors.primary, fontSize: 18, fontWeight: '800', fontFamily: 'Courier' },
  depStatLbl: { color: colors.textMuted, fontSize: 10, letterSpacing: 1, fontWeight: '700', marginTop: 2 },
  notDeployed: { color: colors.textSecondary, fontSize: 13, lineHeight: 20 },
  insightCard: { padding: spacing.lg, marginTop: spacing.md },
  insightHead: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  insightTitle: {
    color: colors.aiCyan, fontSize: 11, letterSpacing: 2, fontWeight: '800',
    marginLeft: 6, flex: 1,
  },
  cachedPill: {
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
    borderWidth: 1, borderColor: colors.border,
  },
  cachedTxt: { color: colors.textMuted, fontSize: 8, fontWeight: '800', letterSpacing: 1 },
  insightLoading: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm },
  insightLoadingTxt: { color: colors.textMuted, fontSize: 12, marginLeft: 10, fontStyle: 'italic' },
  insightTxt: {
    color: colors.textPrimary, fontSize: 14, lineHeight: 22,
    fontStyle: 'italic', letterSpacing: 0.2,
  },
  insightFallback: { color: colors.textMuted, fontSize: 12, fontStyle: 'italic' },
  insightFooter: {
    color: colors.textMuted, fontSize: 9, letterSpacing: 1.5, fontWeight: '600',
    marginTop: spacing.sm, textAlign: 'right',
  },
  communityRow: { flexDirection: 'row', gap: spacing.sm as any },
  commCard: { flex: 1, padding: spacing.md, alignItems: 'center', marginRight: spacing.sm },
  commVal: { color: colors.primary, fontSize: 20, fontWeight: '900', fontFamily: 'Courier' },
  commLbl: { color: colors.textMuted, fontSize: 10, letterSpacing: 1, fontWeight: '700', marginTop: 4 },
  footer: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    padding: spacing.lg,
    backgroundColor: 'rgba(3,3,5,0.95)',
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  footerRow: { flexDirection: 'row' },
});
