import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { showAlert } from '../../lib/utils';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../lib/theme';
import { t } from '../../lib/i18n';
import { getTashkentNow, formatMoney } from '../../lib/utils';
import { Card, SectionTitle, StatusBadge, EmptyState, ScreenLoader } from '../../components/UI';
import { NotificationBell } from '../../components/NotificationBell';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function AdminDashboard({ navigation }: any) {
const styles = getStyles();

const me = useQuery(api.users.me);
const centerFinancials = useQuery(api.transactions.getCenterFinancials);
const pendingCount = useQuery(api.transactions.getPendingCount);
const debtors = useQuery(api.transactions.getDebtors);
const pendingEnrollments = useQuery(api.classes.listEnrollments, { status: 'pending' as any });
const schedule = useQuery(api.rooms.getFullSchedule);
const approveEnrollment = useMutation(api.classes.approveEnrollment);
const rejectEnrollment = useMutation(api.classes.rejectEnrollment);
const telegramReqs = useQuery(api.telegram.listRegistrationRequests, { status: 'pending' });
const approveTgReg = useMutation(api.telegram.approveRegistration);
const rejectTgReg = useMutation(api.telegram.rejectRegistration);

if (centerFinancials === undefined || me === undefined || schedule === undefined) return <ScreenLoader />;

// Get today's day name using centralized Tashkent time
const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const tn = getTashkentNow();
const today = days[tn.getUTCDay()];
const todayClasses = schedule?.filter((s) => s.dayOfWeek === today) || [];

const totalDebt = debtors?.reduce((sum, d) => sum + Math.abs(d.balance), 0) ?? 0;

return (
<SafeAreaView style={styles.container} edges={['top']}>
<ScrollView contentContainerStyle={styles.content}>
<View style={styles.headerRow}>
  <View>
    <Text style={styles.title}>{t('dashboard')}</Text>
    <Text style={styles.subtitle}>{t('welcome')}, {me?.name || ''}</Text>
  </View>
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
    <NotificationBell />
    <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
      <Ionicons name="person-circle-outline" size={32} color={colors.text} />
    </TouchableOpacity>
  </View>
</View>


{/* Financial summary - simple 3 stats */}
<View style={styles.finCard}>
  <View style={styles.finRow}>
    <View style={styles.finItem}>
      <Text style={styles.finLabel}>{t('earned_from_lessons')}</Text>
      <Text style={[styles.finValue, { color: colors.primary }]}>
        {formatMoney(centerFinancials?.totalLessonCharges || 0)}
      </Text>
    </View>
    <View style={styles.finDivider} />
    <View style={styles.finItem}>
      <Text style={styles.finLabel}>{t('collected')}</Text>
      <Text style={[styles.finValue, { color: colors.success }]}>
        {formatMoney(centerFinancials?.totalCollected || 0)}
      </Text>
    </View>
    <View style={styles.finDivider} />
    <View style={styles.finItem}>
      <Text style={styles.finLabel}>{t('balance')}</Text>
      <Text style={[styles.finValue, {
        color: (centerFinancials?.outstandingBalance ?? 0) > 0 ? colors.warning : colors.success,
      }]}>
        {formatMoney(centerFinancials?.outstandingBalance ?? 0)}
      </Text>
    </View>
  </View>
</View>

{/* Debt stat - tappable */}
{debtors && debtors.length > 0 && (
<TouchableOpacity
activeOpacity={0.7}
onPress={() => navigation.navigate('Debtors')}
>
<View style={styles.debtStatCard}>
<View style={{ flex: 1 }}>
<Text style={styles.debtStatLabel}>{t('students_with_debt')}</Text>
<Text style={styles.debtStatValue}>{formatMoney(totalDebt)}</Text>
</View>
<View style={styles.debtStatBadge}>
<Text style={styles.debtStatBadgeText}>{debtors.length}</Text>
</View>
<Text style={styles.debtStatArrow}>›</Text>
</View>
</TouchableOpacity>
)}

{/* Telegram Registration Requests */}
{telegramReqs && telegramReqs.filter((r: any) => r.step === 'submitted').length > 0 && (
<>
<SectionTitle title={t('telegram_requests')} />
<Card>
{telegramReqs.filter((r: any) => r.step === 'submitted').map((r: any, i: number, arr: any[]) => (
<View key={r._id} style={[styles.enrollmentItem, i < arr.length - 1 && styles.classItemBorder]}>
  <View style={{ flex: 1 }}>
    <Text style={styles.enrollName}>🎓 {r.studentName || '—'}</Text>
    <Text style={styles.enrollClass}>👤 {r.parentName || '—'} • 📱 {r.phone || '—'}</Text>
    <Text style={styles.enrollClass}>📚 {r.subjectName || '—'} • {r.className || '—'}</Text>
  </View>
  <View style={styles.enrollActions}>
    <TouchableOpacity
      style={styles.approveBtn}
      onPress={async () => {
        try { await approveTgReg({ registrationId: r._id }); }
        catch (err: any) { showAlert(t('error'), err?.message || t('error_generic')); }
      }}
    >
      <Text style={styles.approveBtnText}>{t('approve')}</Text>
    </TouchableOpacity>
    <TouchableOpacity
      style={styles.rejectBtn}
      onPress={async () => {
        try { await rejectTgReg({ registrationId: r._id }); }
        catch (err: any) { showAlert(t('error'), err?.message || t('error_generic')); }
      }}
    >
      <Text style={styles.rejectBtnText}>{t('reject')}</Text>
    </TouchableOpacity>
  </View>
</View>
))}
</Card>
</>
)}

{/* Pending Payments */}
{pendingCount !== undefined && pendingCount > 0 && (
<>
<SectionTitle
title={t('pending_payments')}
action={
<TouchableOpacity onPress={() => navigation.navigate('Transactions')}>
<Text style={styles.viewAll}>{t('view_all')}</Text>
</TouchableOpacity>
}
/>
<Card>
<View style={styles.alertCard}>
<Text style={styles.alertNumber}>{pendingCount}</Text>
<Text style={styles.alertText}>{t('pending_payments')}</Text>
</View>
</Card>
</>
)}

{/* Pending Enrollments */}
{pendingEnrollments && pendingEnrollments.length > 0 && (
<>
<SectionTitle title={t('pending_enrollments')} />
<Card>
{pendingEnrollments.slice(0, 5).map((e: any, i: number) => (
<View key={e._id} style={[styles.enrollmentItem, i < Math.min(pendingEnrollments.length, 5) - 1 && styles.classItemBorder]}>
<View style={{ flex: 1 }}>
<Text style={styles.enrollName}>{e.studentName || 'Unknown'}</Text>
<Text style={styles.enrollClass}>{e.className}</Text>
</View>
<View style={styles.enrollActions}>
<TouchableOpacity
  style={styles.approveBtn}
  onPress={async () => {
    try { await approveEnrollment({ enrollmentId: e._id }); }
    catch (err: any) { showAlert(t('error'), err?.message || t('error_generic')); }
  }}
>
  <Text style={styles.approveBtnText}>{t('approve')}</Text>
</TouchableOpacity>
<TouchableOpacity
  style={styles.rejectBtn}
  onPress={async () => {
    try { await rejectEnrollment({ enrollmentId: e._id }); }
    catch (err: any) { showAlert(t('error'), err?.message || t('error_generic')); }
  }}
>
  <Text style={styles.rejectBtnText}>{t('reject')}</Text>
</TouchableOpacity>
</View>
</View>
))}
{pendingEnrollments.length > 5 && (
<TouchableOpacity onPress={() => navigation.navigate('Users')} style={{ paddingTop: spacing.sm }}>
<Text style={styles.viewAll}>{t('view_all')} ({pendingEnrollments.length})</Text>
</TouchableOpacity>
)}
</Card>
</>
)}

{/* Today's Classes */}
<SectionTitle title={t('todays_classes')} />
{todayClasses.length === 0 ? (
<EmptyState message={t('no_classes_today')} />
) : (
<Card>
{todayClasses.map((c, i) => (
<View
key={c._id}
style={[styles.classItem, i < todayClasses.length - 1 && styles.classItemBorder]}
>
<View style={styles.timeBlock}>
<Text style={styles.timeText}>{c.startTime}</Text>
<Text style={styles.timeSep}>-</Text>
<Text style={styles.timeText}>{c.endTime}</Text>
</View>
<View style={{ flex: 1, marginLeft: spacing.md }}>
<Text style={styles.className}>{c.className || c.subjectName}</Text>
<Text style={styles.classDetails}>
{c.teacherName} • {c.roomName}
</Text>
</View>
</View>
))}
</Card>
)}

</ScrollView>
</SafeAreaView>
);
}


function getStyles() { return StyleSheet.create({
container: { flex: 1, backgroundColor: colors.background },
content: { padding: spacing.lg, paddingBottom: 100 },
headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: spacing.lg },
title: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.text },
subtitle: { fontSize: fontSize.md, color: colors.textSecondary, marginTop: 2 },
statsRow: { flexDirection: 'row', marginHorizontal: -spacing.xs, marginBottom: spacing.md },
finCard: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.md },
finRow: { flexDirection: 'row', alignItems: 'center' },
finItem: { flex: 1, alignItems: 'center' },
finDivider: { width: 1, height: 36, backgroundColor: colors.borderLight },
finLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.medium, color: colors.textSecondary, marginBottom: 4, textAlign: 'center' },
finValue: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
debtStatCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.errorLight, borderRadius: borderRadius.lg, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.error + '30' },
debtStatLabel: { fontSize: fontSize.sm, color: colors.error, fontWeight: fontWeight.medium },
debtStatValue: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.error, marginTop: 2 },
debtStatBadge: { backgroundColor: colors.error, borderRadius: borderRadius.full, width: 32, height: 32, justifyContent: 'center', alignItems: 'center', marginRight: spacing.sm },
debtStatBadgeText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.textInverse },
debtStatArrow: { fontSize: 24, color: colors.error, fontWeight: fontWeight.bold },
viewAll: { fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.medium },
alertCard: { flexDirection: 'row', alignItems: 'center' },
alertNumber: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.warning, marginRight: spacing.md },
alertText: { fontSize: fontSize.md, color: colors.text },
enrollmentItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm },
enrollName: { fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.text },
enrollClass: { fontSize: fontSize.sm, color: colors.textSecondary },
classItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md },
classItemBorder: { borderBottomWidth: 1, borderBottomColor: colors.borderLight },
timeBlock: { alignItems: 'center', width: 55 },
timeText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.primary },
timeSep: { fontSize: fontSize.xs, color: colors.textTertiary },
className: { fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.text },
classDetails: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
debtItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm },
debtAmount: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.error },
debtDetail: { fontSize: fontSize.xs, color: colors.textTertiary, marginTop: 2 },
enrollActions: { flexDirection: 'row', gap: spacing.sm },
approveBtn: { backgroundColor: colors.successLight, borderRadius: borderRadius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
approveBtnText: { fontSize: fontSize.sm, color: colors.success, fontWeight: fontWeight.semibold },
rejectBtn: { backgroundColor: colors.errorLight, borderRadius: borderRadius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
rejectBtnText: { fontSize: fontSize.sm, color: colors.error, fontWeight: fontWeight.semibold },
}); }
