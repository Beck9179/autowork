import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform,
  ActivityIndicator, Modal, TextInput,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { colors, spacing, radius } from '../../src/theme';
import GlassCard from '../../src/components/GlassCard';
import NeonButton from '../../src/components/NeonButton';
import Sparkline from '../../src/components/Sparkline';
import { api } from '../../src/api';

export default function Wallet() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await api.wallet();
      setData(d);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      const t = setInterval(load, 6000);
      return () => clearInterval(t);
    }, [load])
  );

  const onWithdraw = async () => {
    const v = parseFloat(amount);
    if (isNaN(v) || v <= 0) {
      Platform.OS === 'web' ? alert('Enter a valid amount') : Alert.alert('Enter a valid amount');
      return;
    }
    if (v > (data?.balance ?? 0)) {
      Platform.OS === 'web' ? alert('Insufficient balance') : Alert.alert('Insufficient balance');
      return;
    }
    setSubmitting(true);
    try {
      await api.withdraw(v);
      setShowWithdraw(false);
      setAmount('');
      load();
    } catch (e: any) {
      Platform.OS === 'web' ? alert(e.message) : Alert.alert('Error', e.message);
    } finally {
      setSubmitting(false);
    }
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
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>WALLET.VAULT</Text>
          <Text style={styles.title} testID="wallet-title">PAYOUT</Text>
        </View>

        {/* Balance card */}
        <Animated.View entering={FadeIn.duration(400)}>
          <GlassCard glow="green" style={styles.balanceCard}>
            <View style={styles.balanceSpark}>
              <Sparkline color={colors.primary} bars={40} seed={13} />
            </View>
            <Text style={styles.balanceLbl}>CURRENT BALANCE · USDC</Text>
            <Text style={styles.balance} testID="wallet-balance">
              ${(data?.balance ?? 0).toFixed(4)}
            </Text>
            <View style={styles.balanceRow}>
              <Ionicons name="infinite-outline" size={14} color={colors.aiCyan} />
              <Text style={styles.balanceSub}>
                Lifetime: ${(data?.lifetime_earned ?? 0).toFixed(2)}
              </Text>
            </View>
            <NeonButton
              label="Withdraw Now"
              onPress={() => setShowWithdraw(true)}
              testID="withdraw-button"
              style={{ marginTop: spacing.lg }}
              disabled={(data?.balance ?? 0) <= 0}
            />
          </GlassCard>
        </Animated.View>

        <Text style={styles.sectionTitle}>RECENT PAYOUTS</Text>
        {(!data?.payouts || data.payouts.length === 0) ? (
          <GlassCard style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
            <Ionicons name="cash-outline" size={36} color={colors.textMuted} />
            <Text style={styles.emptyText}>No payouts yet</Text>
            <Text style={styles.emptySub}>Earnings will appear here once withdrawn.</Text>
          </GlassCard>
        ) : (
          data.payouts.map((p: any, idx: number) => (
            <Animated.View key={p.id} entering={FadeInDown.delay(idx * 60).springify()}>
              <GlassCard style={styles.payoutRow} testID={`payout-row-${idx}`}>
                <View style={[styles.payoutIcon, { borderColor: colors.borderGlowGreen }]}>
                  <Ionicons name="arrow-down-outline" size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.payoutAmt}>+${p.amount.toFixed(2)}</Text>
                  <Text style={styles.payoutMeta}>
                    {p.method} · {new Date(p.created_at).toLocaleString()}
                  </Text>
                </View>
                <View style={styles.statusPill}>
                  <Text style={styles.statusTxt}>{p.status.toUpperCase()}</Text>
                </View>
              </GlassCard>
            </Animated.View>
          ))
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal transparent visible={showWithdraw} animationType="fade" onRequestClose={() => setShowWithdraw(false)}>
        <View style={styles.modalBg}>
          <GlassCard glow="green" style={styles.modal}>
            <Text style={styles.modalTitle}>WITHDRAW FUNDS</Text>
            <Text style={styles.modalSub}>Max ${(data?.balance ?? 0).toFixed(2)}</Text>
            <TextInput
              testID="withdraw-amount-input"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
            <View style={styles.modalBtns}>
              <NeonButton
                label="Cancel"
                variant="secondary"
                onPress={() => setShowWithdraw(false)}
                style={{ flex: 1, marginRight: spacing.sm }}
                testID="withdraw-cancel"
              />
              <NeonButton
                label="Confirm"
                onPress={onWithdraw}
                loading={submitting}
                style={{ flex: 1 }}
                testID="withdraw-confirm"
              />
            </View>
          </GlassCard>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  header: { marginBottom: spacing.md },
  eyebrow: { color: colors.aiCyan, fontSize: 10, letterSpacing: 2, fontWeight: '700' },
  title: { color: colors.textPrimary, fontSize: 26, fontWeight: '900', letterSpacing: 1.5 },
  balanceCard: { padding: spacing.lg, overflow: 'hidden', position: 'relative' },
  balanceSpark: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, opacity: 0.14 },
  balanceLbl: { color: colors.textSecondary, fontSize: 10, letterSpacing: 2, fontWeight: '700' },
  balance: {
    color: colors.primary, fontSize: 44, fontWeight: '900',
    fontFamily: 'Courier', letterSpacing: -1, marginTop: 4,
  },
  balanceRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm },
  balanceSub: { color: colors.aiCyan, fontSize: 12, marginLeft: 6, fontWeight: '700' },
  sectionTitle: {
    color: colors.textSecondary, fontSize: 11, letterSpacing: 2, fontWeight: '800',
    marginTop: spacing.xl, marginBottom: spacing.sm,
  },
  payoutRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: spacing.md, marginBottom: spacing.sm,
  },
  payoutIcon: {
    width: 40, height: 40, borderRadius: 12, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(57,255,20,0.05)', marginRight: spacing.md,
  },
  payoutAmt: { color: colors.primary, fontSize: 15, fontWeight: '800', fontFamily: 'Courier' },
  payoutMeta: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  statusPill: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill,
    borderWidth: 1, borderColor: colors.borderGlowGreen,
  },
  statusTxt: { color: colors.primary, fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  emptyText: { color: colors.textPrimary, fontSize: 16, fontWeight: '700', marginTop: spacing.md },
  emptySub: { color: colors.textMuted, fontSize: 13, marginTop: 4, textAlign: 'center' },
  modalBg: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center', justifyContent: 'center', padding: spacing.lg,
  },
  modal: { width: '100%', maxWidth: 400, padding: spacing.lg },
  modalTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '900', letterSpacing: 1.5 },
  modalSub: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  input: {
    backgroundColor: colors.surfaceHighlight,
    color: colors.textPrimary, fontSize: 22, fontFamily: 'Courier', fontWeight: '800',
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, marginTop: spacing.md, letterSpacing: 1,
  },
  modalBtns: { flexDirection: 'row', marginTop: spacing.lg },
});
