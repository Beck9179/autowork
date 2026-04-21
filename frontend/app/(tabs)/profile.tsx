import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';
import { colors, spacing, radius } from '../../src/theme';
import GlassCard from '../../src/components/GlassCard';
import { api } from '../../src/api';

export default function Profile() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const p = await api.profile();
      setProfile(p);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading && !profile) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={44} color={colors.aiCyan} />
          </View>
          <Text style={styles.handle} testID="profile-handle">{profile?.handle}</Text>
          <View style={styles.tierPill}>
            <Ionicons name="hardware-chip-outline" size={12} color={colors.aiMagenta} />
            <Text style={styles.tierTxt}>{profile?.tier}</Text>
          </View>
          <Text style={styles.joined}>OPERATOR SINCE {profile?.joined}</Text>
        </Animated.View>

        <View style={styles.statsRow}>
          <GlassCard glow="cyan" style={styles.stat}>
            <Ionicons name="hardware-chip-outline" size={20} color={colors.aiCyan} />
            <Text style={styles.statVal}>{profile?.total_agents ?? 0}</Text>
            <Text style={styles.statLbl}>AGENTS</Text>
          </GlassCard>
          <GlassCard glow="magenta" style={styles.stat}>
            <Ionicons name="flash-outline" size={20} color={colors.aiMagenta} />
            <Text style={styles.statVal}>{profile?.total_xp ?? 0}</Text>
            <Text style={styles.statLbl}>TOTAL XP</Text>
          </GlassCard>
          <GlassCard glow="green" style={styles.stat}>
            <Ionicons name="cash-outline" size={20} color={colors.primary} />
            <Text style={styles.statVal}>${(profile?.lifetime_earned ?? 0).toFixed(0)}</Text>
            <Text style={styles.statLbl}>EARNED</Text>
          </GlassCard>
        </View>

        <Text style={styles.sectionTitle}>SETTINGS</Text>
        {[
          { icon: 'logo-github', label: 'GitHub API Keys', testID: 'settings-github', hint: 'Not connected' },
          { icon: 'color-palette-outline', label: 'Theme', testID: 'settings-theme', hint: 'Neon Dark' },
          { icon: 'notifications-outline', label: 'Notifications', testID: 'settings-notifs', hint: 'Earnings alerts' },
          { icon: 'shield-checkmark-outline', label: 'Security', testID: 'settings-security', hint: '2FA off' },
          { icon: 'help-circle-outline', label: 'Help & Docs', testID: 'settings-help' },
          { icon: 'log-out-outline', label: 'Log Out', testID: 'settings-logout', danger: true },
        ].map((item) => (
          <TouchableOpacity key={item.label} testID={item.testID} activeOpacity={0.8}>
            <GlassCard style={styles.settingRow}>
              <Ionicons
                name={item.icon as any}
                size={20}
                color={item.danger ? colors.danger : colors.textSecondary}
              />
              <Text style={[styles.settingLabel, item.danger && { color: colors.danger }]}>
                {item.label}
              </Text>
              {item.hint && <Text style={styles.settingHint}>{item.hint}</Text>}
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </GlassCard>
          </TouchableOpacity>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  header: { alignItems: 'center', marginTop: spacing.md, marginBottom: spacing.xl },
  avatar: {
    width: 96, height: 96, borderRadius: 24, borderWidth: 2, borderColor: colors.borderGlowCyan,
    backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.aiCyan, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 20,
  },
  handle: { color: colors.textPrimary, fontSize: 22, fontWeight: '900', marginTop: spacing.md, letterSpacing: 1 },
  tierPill: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 4, marginTop: 6,
    borderRadius: radius.pill, borderWidth: 1, borderColor: colors.borderGlowMagenta,
    backgroundColor: 'rgba(255,0,255,0.08)',
  },
  tierTxt: { color: colors.aiMagenta, fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginLeft: 4 },
  joined: { color: colors.textMuted, fontSize: 10, letterSpacing: 1.5, marginTop: 6, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: spacing.sm as any, marginBottom: spacing.md },
  stat: { flex: 1, alignItems: 'center', padding: spacing.md, marginRight: spacing.sm },
  statVal: {
    color: colors.textPrimary, fontSize: 20, fontWeight: '900',
    fontFamily: 'Courier', marginTop: spacing.xs,
  },
  statLbl: { color: colors.textMuted, fontSize: 9, letterSpacing: 1.5, fontWeight: '700', marginTop: 2 },
  sectionTitle: {
    color: colors.textSecondary, fontSize: 11, letterSpacing: 2,
    fontWeight: '800', marginTop: spacing.lg, marginBottom: spacing.sm,
  },
  settingRow: {
    flexDirection: 'row', alignItems: 'center', padding: spacing.md, marginBottom: spacing.sm,
  },
  settingLabel: { color: colors.textPrimary, fontSize: 14, fontWeight: '700', marginLeft: spacing.md, flex: 1 },
  settingHint: { color: colors.textMuted, fontSize: 11, marginRight: 6 },
});
