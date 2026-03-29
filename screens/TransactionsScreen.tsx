import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Pressable, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Id } from '../convex/_generated/dataModel';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../lib/theme';
import { t } from '../lib/i18n';
import { showAlert, formatMoney } from '../lib/utils';
import { Card, ScreenLoader, EmptyState, StatusBadge } from '../components/UI';
import { ScreenHeader } from '../components/ScreenHeader';

const PAGE_SIZE = 20;

export default function TransactionsScreen({ navigation }: any) {
  const [filter, setFilter] = useState<string | undefined>(undefined);
  const [searchText, setSearchText] = useState('');
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [confirmReverseId, setConfirmReverseId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const transactions = useQuery(api.transactions.listTransactions, { status: filter });
  const confirmPayment = useMutation(api.transactions.confirmPayment);
  const createReversal = useMutation(api.transactions.createReversal);

  const filteredTx = useMemo(() => {
    if (!transactions) return [];
    if (!searchText) return transactions;
    const q = searchText.toLowerCase();
    return transactions.filter((tx: any) =>
      (tx.studentName || '').toLowerCase().includes(q) ||
      (tx.className || '').toLowerCase().includes(q) ||
      (tx.note || '').toLowerCase().includes(q)
    );
  }, [transactions, searchText]);

  if (transactions === undefined) return <ScreenLoader />;

  const filters = [
    { label: t('all'), value: undefined },
    { label: t('pending'), value: 'pending' },
    { label: t('confirmed'), value: 'confirmed' },
  ];

  const doConfirm = (txId: Id<"transactions">) => {
    setLoadingId(txId + '_confirm');
    confirmPayment({ transactionId: txId })
      .then(() => {
        showAlert(t('success'), t('payment_confirmed_msg'));
      })
      .catch((err: any) => {
        showAlert(t('error'), err?.message || t('error_generic'));
      })
      .finally(() => {
        setLoadingId(null);
      });
  };

  const doReverse = (txId: Id<"transactions">) => {
    setLoadingId(txId + '_reverse');
    setConfirmReverseId(null);
    createReversal({ originalTransactionId: txId })
      .then(() => {
        showAlert(t('success'), t('transaction_reversed_msg'));
      })
      .catch((err: any) => {
        showAlert(t('error'), err?.message || t('error_generic'));
      })
      .finally(() => {
        setLoadingId(null);
      });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title={t('transactions')} onBack={() => navigation.goBack()} />

      <View style={styles.searchBox}>
        <TextInput
          value={searchText}
          onChangeText={setSearchText}
          placeholder={t('search')}
          placeholderTextColor={colors.textTertiary}
          style={styles.searchInput}
        />
      </View>

      <View style={styles.filterRow}>
        {filters.map((f) => (
          <TouchableOpacity
            key={f.label}
            style={[styles.filterBtn, filter === f.value && styles.filterBtnActive]}
            onPress={() => setFilter(f.value)}
          >
            <Text style={[styles.filterText, filter === f.value && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {filteredTx.length === 0 ? (
          <EmptyState message={t('no_results')} />
        ) : (
          filteredTx.slice(0, visibleCount).map((tx: any) => {
            const isLoading = loadingId !== null;
            const isConfirming = loadingId === tx._id + '_confirm';
            const isReversing = loadingId === tx._id + '_reverse';

            return (
              <View key={tx._id}>
                <Card>
                  <View style={styles.txHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.txStudent}>{tx.studentName || 'Unknown'}</Text>
                      <Text style={styles.txClass}>{tx.className}</Text>
                    </View>
                    <Text style={[styles.txAmount, { color: tx.amount >= 0 ? colors.success : colors.error }]}>
                      {tx.amount >= 0 ? '+' : ''}{formatMoney(tx.amount)}
                    </Text>
                  </View>

                  <View style={styles.txMeta}>
                    <StatusBadge status={tx.status} />
                    <StatusBadge status={tx.type} />
                    <Text style={styles.txDate}>{formatDate(tx._creationTime)}</Text>
                  </View>

                  {tx.createdByName && (
                    <Text style={styles.txCreator}>By: {tx.createdByName}</Text>
                  )}
                  {tx.note && <Text style={styles.txNote}>{tx.note}</Text>}

                  {tx.status === 'pending' && (
                    <View style={styles.txActions}>
                      <Pressable
                        style={[
                          styles.confirmBtn,
                          isConfirming && { opacity: 0.5 },
                        ]}
                        onPress={() => doConfirm(tx._id)}
                        disabled={isLoading}
                      >
                        <Text style={styles.confirmBtnText}>
                          {isConfirming ? '...' : t('confirm_payment')}
                        </Text>
                      </Pressable>
                    </View>
                  )}
                  {tx.status === 'confirmed' && tx.type === 'payment' && (
                    confirmReverseId === tx._id ? (
                      <View style={[styles.confirmReverseRow, { marginTop: spacing.md }]}>
                        <Text style={styles.confirmReverseText}>{t('confirm')}?</Text>
                        <Pressable
                          style={styles.confirmReverseYes}
                          onPress={() => doReverse(tx._id)}
                          disabled={isLoading}
                        >
                          <Text style={styles.confirmReverseYesText}>
                            {isReversing ? '...' : t('yes')}
                          </Text>
                        </Pressable>
                        <Pressable
                          style={styles.confirmReverseNo}
                          onPress={() => setConfirmReverseId(null)}
                        >
                          <Text style={styles.confirmReverseNoText}>{t('no')}</Text>
                        </Pressable>
                      </View>
                    ) : (
                      <Pressable
                        style={styles.reverseLink}
                        onPress={() => setConfirmReverseId(tx._id)}
                        disabled={isLoading}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                      >
                        <Text style={styles.reverseLinkText}>{t('reverse_payment')}</Text>
                      </Pressable>
                    )
                  )}
                </Card>
              </View>
            );
          })
        )}
        {filteredTx.length > visibleCount && (
          <TouchableOpacity
            style={{ padding: 12, alignItems: 'center' }}
            onPress={() => setVisibleCount(prev => prev + PAGE_SIZE)}
          >
            <Text style={{ color: colors.primary, fontWeight: '600' }}>{t('load_more')}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  filterRow: { flexDirection: 'row', paddingHorizontal: spacing.lg, gap: spacing.sm, marginBottom: spacing.md },
  filterBtn: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.full, backgroundColor: colors.surfaceSecondary },
  filterBtnActive: { backgroundColor: colors.primary },
  filterText: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: fontWeight.medium },
  filterTextActive: { color: colors.textInverse },
  searchBox: { paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  searchInput: { backgroundColor: colors.surface, borderRadius: borderRadius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: fontSize.sm, color: colors.text, borderWidth: 1, borderColor: colors.border },
  content: { padding: spacing.lg, paddingBottom: 100 },
  txHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.sm },
  txStudent: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text },
  txClass: { fontSize: fontSize.sm, color: colors.textSecondary },
  txAmount: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  txMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  txDate: { fontSize: fontSize.xs, color: colors.textTertiary, marginLeft: 'auto' },
  txCreator: { fontSize: fontSize.xs, color: colors.textTertiary },
  txNote: { fontSize: fontSize.sm, color: colors.textSecondary, fontStyle: 'italic', marginTop: spacing.xs },
  txActions: { flexDirection: 'row', marginTop: spacing.md, gap: spacing.sm },
  confirmBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: {
    color: colors.textInverse,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  reverseActionBtn: {
    flex: 1,
    backgroundColor: colors.errorLight,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.error,
  },
  reverseActionBtnText: {
    color: colors.error,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  reverseLink: { marginTop: spacing.md, paddingVertical: spacing.sm },
  reverseLinkText: { fontSize: fontSize.sm, color: colors.error, fontWeight: fontWeight.medium },
  confirmReverseRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  confirmReverseText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  confirmReverseYes: {
    backgroundColor: colors.error,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  confirmReverseYesText: {
    color: colors.textInverse,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  confirmReverseNo: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  confirmReverseNoText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
});