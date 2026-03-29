import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal } from 'react-native';
import { showAlert } from '../lib/utils';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../lib/theme';
import { t } from '../lib/i18n';
import { ScreenLoader } from '../components/UI';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ScreenHeader } from '../components/ScreenHeader';

type Period = 'day' | 'week' | 'month';

function fmtFull(amount: number): string {
return new Intl.NumberFormat('en-US').format(Math.round(amount));
}

export default function FinancesScreen({ navigation }: any) {
const styles = getStyles();

const me = useQuery(api.users.me);
const [period, setPeriod] = useState<Period>('month');
const [payModalVisible, setPayModalVisible] = useState(false);
const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
const [selectedTeacherName, setSelectedTeacherName] = useState('');
const [payAmount, setPayAmount] = useState('');
const [payNote, setPayNote] = useState('');
const [expandedTeacher, setExpandedTeacher] = useState<string | null>(null);
const [saving, setSaving] = useState(false);

const financials = useQuery(api.finances.getFinancials, { period });
const teacherPayments = useQuery(api.finances.listTeacherPayments,
expandedTeacher ? { teacherId: expandedTeacher as any } : 'skip'
);
const recordTeacherPayment = useMutation(api.finances.recordTeacherPayment);

if (!financials || me === undefined) return <ScreenLoader />;

if (me && me.role !== 'admin' && me.role !== 'super_admin' && me.role !== 'teacher') {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>{t('no_permission')}</Text>
    </View>
  );
}

const handlePayTeacher = async () => {
if (!selectedTeacherId || !payAmount) {
showAlert(t('error'), t('fill_required_fields'));
return;
}
const amount = parseFloat(payAmount);
if (isNaN(amount) || amount <= 0) {
showAlert(t('error'), t('amount') + ' > 0');
return;
}
setSaving(true);
try {
await recordTeacherPayment({
teacherId: selectedTeacherId as any,
amount,
note: payNote || undefined,
});
setPayModalVisible(false);
setPayAmount('');
setPayNote('');
setSelectedTeacherId(null);
} catch (err: any) {
showAlert(t('error'), err?.message || t('error_generic'));
} finally {
setSaving(false);
}
};

const totalOwedToTeachers = financials.teacherBreakdown.reduce((sum, teacher) => sum + Math.max(0, teacher.balance), 0);

return (
<SafeAreaView style={styles.container} edges={['top']}>
<ScreenHeader title={t('finances')} onBack={() => navigation.goBack()} />

{/* Period Selector */}
<View style={styles.periodRow}>
{(['day', 'week', 'month'] as Period[]).map((p) => (
<TouchableOpacity
key={p}
style={[styles.periodBtn, period === p && styles.periodBtnActive]}
onPress={() => setPeriod(p)}
>
<Text style={[styles.periodText, period === p && styles.periodTextActive]}>
{p === 'day' ? t('fin_day') : p === 'week' ? t('fin_week') : t('fin_month')}
</Text>
</TouchableOpacity>
))}
</View>
<Text style={styles.dateRange}>{financials.startDate} — {financials.endDate}</Text>

<ScrollView contentContainerStyle={styles.scroll}>

{/* ========== SECTION 1: STUDENTS / REVENUE ========== */}
<Text style={styles.sectionTitle}>
<Ionicons name="school-outline" size={16} color={colors.primary} />  {t('students')}
</Text>

<View style={styles.card}>
{/* Row: Projected */}
<View style={styles.finRow}>
<View style={styles.finLabelRow}>
<Ionicons name="calendar-outline" size={14} color={colors.textTertiary} />
<Text style={styles.finLabel}>{t('fin_projected')}</Text>
</View>
<Text style={[styles.finValue, { color: colors.textSecondary }]}>{fmtFull(financials.projected)}</Text>
</View>

{/* Row: Earned (Factual AR) */}
<View style={styles.finRow}>
<View style={styles.finLabelRow}>
<Ionicons name="checkmark-circle-outline" size={14} color={colors.primary} />
<Text style={styles.finLabel}>{t('earned_from_lessons')}</Text>
</View>
<Text style={[styles.finValue, { color: colors.primary }]}>{fmtFull(financials.factualAR)}</Text>
</View>

{/* Row: Collected */}
<View style={styles.finRow}>
<View style={styles.finLabelRow}>
<Ionicons name="wallet-outline" size={14} color={colors.success} />
<Text style={styles.finLabel}>{t('collected')}</Text>
</View>
<Text style={[styles.finValue, { color: colors.success }]}>{fmtFull(financials.factualGathered)}</Text>
</View>

{/* Row: Lost */}
<View style={styles.finRow}>
<View style={styles.finLabelRow}>
<Ionicons name="close-circle-outline" size={14} color={colors.error} />
<Text style={styles.finLabel}>{t('fin_loss')}</Text>
</View>
<Text style={[styles.finValue, { color: colors.error }]}>{fmtFull(financials.factualLoss)}</Text>
</View>

{/* Row: Advance */}
<View style={[styles.finRow, { borderBottomWidth: 0 }]}>
<View style={styles.finLabelRow}>
<Ionicons name="arrow-forward-circle-outline" size={14} color={colors.accent} />
<Text style={styles.finLabel}>{t('fin_advance')}</Text>
</View>
<Text style={[styles.finValue, { color: colors.accent }]}>{fmtFull(financials.advanceAmount)}</Text>
</View>
</View>

{/* ========== SECTION 2: TEACHERS ========== */}
<Text style={styles.sectionTitle}>
<Ionicons name="people-outline" size={16} color={colors.primary} />  {t('teachers')}
</Text>

{/* Summary: 3 numbers */}
<View style={styles.teacherSummaryRow}>
<View style={styles.teacherSummaryItem}>
<Text style={styles.tsLabel}>{t('earned_from_lessons')}</Text>
<Text style={[styles.tsValue, { color: colors.primary }]}>{fmtFull(financials.teacherFactualAP)}</Text>
</View>
<View style={styles.tsDivider} />
<View style={styles.teacherSummaryItem}>
<Text style={styles.tsLabel}>{t('paid')}</Text>
<Text style={[styles.tsValue, { color: colors.success }]}>{fmtFull(financials.teacherTotalPaid)}</Text>
</View>
<View style={styles.tsDivider} />
<View style={styles.teacherSummaryItem}>
<Text style={styles.tsLabel}>{t('balance')}</Text>
<Text style={[styles.tsValue, { color: totalOwedToTeachers > 0 ? colors.error : colors.success }]}>
{fmtFull(totalOwedToTeachers)}
</Text>
</View>
</View>

{/* Per-teacher cards */}
{financials.teacherBreakdown.map((tb) => {
const isExpanded = expandedTeacher === tb.teacherId;
const owes = Math.max(0, tb.balance);
return (
<View key={tb.teacherId} style={styles.teacherCard}>
<TouchableOpacity
style={styles.teacherHeader}
onPress={() => setExpandedTeacher(isExpanded ? null : tb.teacherId)}
activeOpacity={0.7}
>
<View style={styles.teacherLeft}>
<View style={styles.avatar}>
<Text style={styles.avatarText}>
{(tb.teacherName || '?')[0].toUpperCase()}
</Text>
</View>
<View style={{ flex: 1 }}>
<Text style={styles.teacherName}>{tb.teacherName || 'Unknown'}</Text>
<Text style={styles.teacherShare}>{tb.sharePercent}%</Text>
</View>
</View>
<View style={{ alignItems: 'flex-end' }}>
<Text style={[styles.teacherOwed, { color: owes > 0 ? colors.error : colors.success }]}>
{owes > 0 ? '-' : ''}{fmtFull(owes)}
</Text>
<Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textTertiary} />
</View>
</TouchableOpacity>

{isExpanded && (
<View style={styles.teacherBody}>
{/* 3 stats matching teacher dashboard */}
<View style={styles.teacherStatsRow}>
<View style={styles.teacherStat}>
<Text style={styles.statLabel}>{t('earned_from_lessons')}</Text>
<Text style={[styles.statValue, { color: colors.primary }]}>{fmtFull(tb.factualAP)}</Text>
</View>
<View style={styles.teacherStat}>
<Text style={styles.statLabel}>{t('paid')}</Text>
<Text style={[styles.statValue, { color: colors.success }]}>{fmtFull(tb.totalPaidToTeacher)}</Text>
</View>
<View style={styles.teacherStat}>
<Text style={styles.statLabel}>{t('balance')}</Text>
<Text style={[styles.statValue, { color: owes > 0 ? colors.error : colors.success }]}>
{fmtFull(owes)}
</Text>
</View>
</View>

<TouchableOpacity
style={styles.payBtn}
onPress={() => {
setSelectedTeacherId(tb.teacherId);
setSelectedTeacherName(tb.teacherName || 'Unknown');
setPayAmount('');
setPayNote('');
setPayModalVisible(true);
}}
>
<Ionicons name="cash-outline" size={16} color={colors.textInverse} />
<Text style={styles.payBtnText}>{t('fin_pay_teacher')}</Text>
</TouchableOpacity>

{/* Payment history */}
{teacherPayments && teacherPayments.length > 0 && (
<View style={styles.historySection}>
<Text style={styles.historyTitle}>{t('fin_payment_history')}</Text>
{teacherPayments.map((p) => (
<View key={p._id} style={styles.historyItem}>
<Text style={styles.historyAmount}>{fmtFull(p.amount)}</Text>
<Text style={styles.historyMeta}>
{new Date(p._creationTime).toLocaleDateString()}
{p.note ? ` · ${p.note}` : ''}
</Text>
</View>
))}
</View>
)}
</View>
)}
</View>
);
})}

{financials.teacherBreakdown.length === 0 && (
<View style={styles.card}>
<Text style={styles.emptyText}>{t('no_data')}</Text>
</View>
)}

<View style={{ height: 40 }} />
</ScrollView>

{/* Pay Modal */}
<Modal visible={payModalVisible} transparent animationType="slide">
<View style={styles.modalOverlay}>
<View style={styles.modalContent}>
<View style={styles.modalHeader}>
<TouchableOpacity onPress={() => setPayModalVisible(false)}>
<Text style={styles.modalCancel}>{t('cancel')}</Text>
</TouchableOpacity>
<Text style={styles.modalTitle}>{t('fin_pay_teacher')}</Text>
<TouchableOpacity onPress={handlePayTeacher} disabled={saving}>
<Text style={[styles.modalSave, saving && { opacity: 0.4 }]}>{t('confirm')}</Text>
</TouchableOpacity>
</View>

<View style={styles.modalTeacher}>
<Ionicons name="person-circle-outline" size={24} color={colors.primary} />
<Text style={styles.modalTeacherText}>{selectedTeacherName}</Text>
</View>

<Text style={styles.inputLabel}>{t('amount')}</Text>
<TextInput
style={styles.input}
placeholder="0"
keyboardType="numeric"
value={payAmount}
onChangeText={setPayAmount}
autoFocus
/>

<Text style={styles.inputLabel}>{t('note')}</Text>
<TextInput
style={[styles.input, { height: 60 }]}
placeholder={t('note')}
value={payNote}
onChangeText={setPayNote}
multiline
/>
</View>
</View>
</Modal>
</SafeAreaView>
);
}

function getStyles() { return StyleSheet.create({
container: { flex: 1, backgroundColor: colors.background },

// Period
periodRow: {
flexDirection: 'row', marginHorizontal: spacing.lg, marginBottom: spacing.sm,
backgroundColor: colors.surfaceSecondary, borderRadius: borderRadius.lg, padding: 3,
},
periodBtn: { flex: 1, paddingVertical: spacing.sm, alignItems: 'center', borderRadius: borderRadius.md },
periodBtnActive: { backgroundColor: colors.surface, boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.1)', elevation: 2 },
periodText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.textTertiary },
periodTextActive: { color: colors.primary, fontWeight: fontWeight.semibold },
dateRange: { textAlign: 'center', fontSize: fontSize.xs, color: colors.textTertiary, marginBottom: spacing.sm },
scroll: { padding: spacing.lg, paddingTop: spacing.xs },

// Section
sectionTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text, marginBottom: spacing.sm, marginTop: spacing.md },

// Card
card: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, marginBottom: spacing.md },

// Finance rows (students section)
finRow: {
flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
paddingVertical: spacing.sm + 2, borderBottomWidth: 1, borderBottomColor: colors.borderLight,
},
finLabelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
finLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.text },
finValue: { fontSize: fontSize.md, fontWeight: fontWeight.bold },

// Teacher summary
teacherSummaryRow: {
flexDirection: 'row', backgroundColor: colors.surface, borderRadius: borderRadius.lg,
padding: spacing.md, marginBottom: spacing.sm, alignItems: 'center',
},
teacherSummaryItem: { flex: 1, alignItems: 'center' },
tsDivider: { width: 1, height: 30, backgroundColor: colors.borderLight },
tsLabel: { fontSize: 10, fontWeight: fontWeight.medium, color: colors.textTertiary, marginBottom: 2, textAlign: 'center' },
tsValue: { fontSize: fontSize.md, fontWeight: fontWeight.bold },

// Teacher card
teacherCard: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, marginBottom: spacing.sm, overflow: 'hidden' },
teacherHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md },
teacherLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center', marginRight: spacing.sm },
avatarText: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.primary },
teacherName: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.text },
teacherShare: { fontSize: fontSize.xs, color: colors.textTertiary },
teacherOwed: { fontSize: fontSize.md, fontWeight: fontWeight.bold },

// Teacher expanded body
teacherBody: { paddingHorizontal: spacing.md, paddingBottom: spacing.md, borderTopWidth: 1, borderTopColor: colors.borderLight },
teacherStatsRow: { flexDirection: 'row', paddingVertical: spacing.sm },
teacherStat: { flex: 1 },
statLabel: { fontSize: 10, color: colors.textTertiary },
statValue: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, marginTop: 2 },

payBtn: {
flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs,
backgroundColor: colors.primary, borderRadius: borderRadius.md, paddingVertical: spacing.sm, marginTop: spacing.xs,
},
payBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textInverse },

// Payment history
historySection: { marginTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.borderLight, paddingTop: spacing.sm },
historyTitle: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.textSecondary, marginBottom: spacing.xs },
historyItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
historyAmount: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.success },
historyMeta: { fontSize: fontSize.xs, color: colors.textTertiary },

emptyText: { fontSize: fontSize.sm, color: colors.textTertiary, textAlign: 'center', paddingVertical: spacing.lg },

// Modal
modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
modalContent: { backgroundColor: colors.surface, borderTopLeftRadius: borderRadius.xl, borderTopRightRadius: borderRadius.xl, padding: spacing.lg, paddingBottom: 40 },
modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
modalCancel: { fontSize: fontSize.md, color: colors.textSecondary },
modalTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text },
modalSave: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.primary },
modalTeacher: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
modalTeacherText: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.text },
inputLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.text, marginBottom: spacing.xs, marginTop: spacing.md },
input: { backgroundColor: colors.surfaceSecondary, borderRadius: borderRadius.md, padding: spacing.md, fontSize: fontSize.md, color: colors.text },
}); }
