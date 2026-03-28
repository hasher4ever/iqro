import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useAction } from 'convex/react';
import { api } from '../convex/_generated/api';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../lib/theme';
import { t } from '../lib/i18n';
import { formatMoney } from '../lib/utils';
import { Card, ScreenLoader, EmptyState } from '../components/UI';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../components/ScreenHeader';

type SortOption = 'debt' | 'name' | 'sessions';

const PAGE_SIZE = 20;

export default function DebtorsScreen({ navigation }: any) {
  const me = useQuery(api.users.me);
  const debtors = useQuery(api.transactions.getDebtors);
  const sendReminder = useAction(api.telegramActions.sendPaymentReminderPublic);
  const [searchText, setSearchText] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('debt');
  const [filterClass, setFilterClass] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const classNames = useMemo(() => {
    if (!debtors) return [];
    const names = new Set<string>();
    debtors.forEach((d: any) => { if (d.className) names.add(d.className); });
    return Array.from(names);
  }, [debtors]);

  const filtered = useMemo(() => {
    if (!debtors) return [];
    let result = [...debtors];
    if (searchText) {
      const q = searchText.toLowerCase();
      result = result.filter((d: any) =>
        (d.studentName || '').toLowerCase().includes(q) ||
        (d.className || '').toLowerCase().includes(q)
      );
    }
    if (filterClass) {
      result = result.filter((d: any) => d.className === filterClass);
    }
    if (sortBy === 'debt') {
      result.sort((a: any, b: any) => a.balance - b.balance);
    } else if (sortBy === 'name') {
      result.sort((a: any, b: any) => (a.studentName || '').localeCompare(b.studentName || ''));
    } else {
      result.sort((a: any, b: any) => b.sessionsAttended - a.sessionsAttended);
    }
    return result;
  }, [debtors, searchText, filterClass, sortBy]);

  const totalDebt = filtered.reduce((sum: number, d: any) => sum + Math.abs(d.balance), 0);

  if (debtors === undefined || me === undefined) return <ScreenLoader />;

  if (me && me.role !== 'admin' && me.role !== 'super_admin') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>{t('no_permission')}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title={t('students_with_debt')} onBack={() => navigation.goBack()} />

      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>{t('total')}</Text>
          <Text style={styles.summaryValue}>{filtered.length}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>{t('owed')}</Text>
          <Text style={[styles.summaryValue, { color: colors.error }]}>{formatMoney(totalDebt)}</Text>
        </View>
      </View>

      <View style={styles.searchBox}>
        <TextInput
          value={searchText}
          onChangeText={setSearchText}
          placeholder={t('search')}
          placeholderTextColor={colors.textTertiary}
          style={styles.searchInput}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContent}>
        <TouchableOpacity
          style={[styles.chip, !filterClass && styles.chipActive]}
          onPress={() => setFilterClass('')}
        >
          <Text style={[styles.chipText, !filterClass && styles.chipTextActive]}>{t('all')}</Text>
        </TouchableOpacity>
        {classNames.map((cn: string) => (
          <TouchableOpacity
            key={cn}
            style={[styles.chip, filterClass === cn && styles.chipActive]}
            onPress={() => setFilterClass(cn)}
          >
            <Text style={[styles.chipText, filterClass === cn && styles.chipTextActive]}>{cn}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.sortRow}>
        <Text style={styles.sortLabel}>{t('sort_by')}:</Text>
        {(['debt', 'name', 'sessions'] as SortOption[]).map((opt) => (
          <TouchableOpacity
            key={opt}
            style={[styles.chip, sortBy === opt && styles.chipActive]}
            onPress={() => setSortBy(opt)}
          >
            <Text style={sortBy === opt ? styles.chipTextActive : styles.chipText}>
              {opt === 'debt' ? t('balance') : opt === 'name' ? t('name') : t('sessions')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {filtered.length === 0 ? (
          <EmptyState message={t('no_results')} />
        ) : (
          filtered.slice(0, visibleCount).map((d: any) => (
            <View key={`${d.studentId}-${d.classId}`}>
              <Card>
                <View style={styles.debtorRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.debtorName}>{d.studentName || 'Unknown'}</Text>
                    <Text style={styles.debtorClass}>{d.className}</Text>
                    <Text style={styles.debtorMeta}>
                      {d.sessionsAttended} {t('sessions')} {'\u2022'} {t('paid')}: {formatMoney(d.totalPaid)} {'\u2022'} {t('owed')}: {formatMoney(d.totalOwed)}
                    </Text>
                  </View>
                  <View style={styles.debtorActions}>
                    <Text style={styles.debtorAmount}>{formatMoney(d.balance)}</Text>
                    <TouchableOpacity
                      style={styles.reminderBtn}
                      onPress={async () => {
                        try {
                          const result = await sendReminder({
                            studentId: d.studentId,
                            amount: Math.abs(d.balance),
                            studentName: d.studentName || 'Student',
                          });
                          if (result.success) {
                            Alert.alert(t('success'), t('telegram_reminder_sent'));
                          } else {
                            Alert.alert(t('error'), result.error || t('error_generic'));
                          }
                        } catch (e: any) {
                          Alert.alert(t('error'), e.message || t('error_generic'));
                        }
                      }}
                    >
                      <Ionicons name="paper-plane-outline" size={14} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                </View>
              </Card>
            </View>
          ))
        )}
        {filtered.length > visibleCount && (
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  backBtn: { fontSize: fontSize.md, color: colors.primary, fontWeight: fontWeight.medium },
  headerTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },
  summaryRow: { flexDirection: 'row', paddingHorizontal: spacing.lg, gap: spacing.md, marginBottom: spacing.md },
  summaryItem: { flex: 1, backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.borderLight },
  summaryLabel: { fontSize: fontSize.xs, color: colors.textSecondary, fontWeight: fontWeight.medium },
  summaryValue: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text, marginTop: 2 },
  searchBox: { paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  searchInput: { backgroundColor: colors.surface, borderRadius: borderRadius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: fontSize.sm, color: colors.text, borderWidth: 1, borderColor: colors.border },
  filterScroll: { maxHeight: 44, marginBottom: spacing.sm },
  filterContent: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.full, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: fontSize.sm, color: colors.text },
  chipTextActive: { fontSize: fontSize.sm, color: colors.textInverse, fontWeight: fontWeight.semibold },
  sortRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, gap: spacing.sm, marginBottom: spacing.md },
  sortLabel: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: fontWeight.medium },
  content: { padding: spacing.lg, paddingBottom: 100 },
  debtorRow: { flexDirection: 'row', alignItems: 'center' },
  debtorName: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text },
  debtorClass: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 1 },
  debtorMeta: { fontSize: fontSize.xs, color: colors.textTertiary, marginTop: 4 },
  debtorAmount: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.error },
  debtorActions: { alignItems: 'flex-end', gap: spacing.xs },
  reminderBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
});