import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../lib/theme';
import { t } from '../../lib/i18n';
import { getTashkentNow, formatMoney } from '../../lib/utils';
import { SectionTitle, EmptyState, ScreenLoader, Badge } from '../../components/UI';
import { NotificationBell } from '../../components/NotificationBell';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function TeacherDashboard({ navigation }: any) {
const me = useQuery(api.users.me);
const classes = useQuery(api.classes.getByTeacher, {});
const pendingTx = useQuery(api.transactions.listTransactions, { status: 'pending' });
const earnings = useQuery(api.finances.getTeacherEarnings);
if (classes === undefined) return <ScreenLoader />;

const days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
const tn = getTashkentNow();
const today = days[tn.getUTCDay()];
const cm = tn.getUTCHours()*60 + tn.getUTCMinutes();

const currentClass = classes?.find((cls: any) => {
const slot = cls.scheduleDays?.find((d: any) => d.dayOfWeek === today);
if (!slot) return false;
const [sh,sm2] = slot.startTime.split(':').map(Number);
const [eh,em2] = slot.endTime.split(':').map(Number);
return cm >= sh*60+sm2 && cm < eh*60+em2;
});

const upcoming = (classes || []).filter((cls: any) => {
const slot = cls.scheduleDays?.find((d: any) => d.dayOfWeek === today);
if (!slot) return false;
const [sh,sm2] = slot.startTime.split(':').map(Number);
return cm < sh*60+sm2;
});

const pt = pendingTx || [];

return (
<SafeAreaView style={s.container} edges={['top']}>
<ScrollView contentContainerStyle={s.content}>
<View style={s.headerRow}>
<View style={{ flex: 1 }}>
<Text style={s.title}>{t('dashboard')}</Text>
<Text style={s.subtitle}>{t('welcome')}, {me?.name || t('teacher')}</Text>
</View>
<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
<NotificationBell />
<TouchableOpacity style={s.profileBtn} onPress={() => navigation.navigate('Profile')}>
<Ionicons name="person-outline" size={20} color={colors.text} />
</TouchableOpacity>
</View>
</View>

{earnings && (
<View style={s.earningsCard}>
<View style={s.earningsStatsRow}>
<View style={s.earningStat}>
<Text style={s.earningsStatLabel}>{t('earned_from_lessons')}</Text>
<Text style={[s.earningsStatValue, { color: colors.primary }]}>{formatMoney(earnings.totalEarned)}</Text>
</View>
<View style={s.earnDivider} />
<View style={s.earningStat}>
<Text style={s.earningsStatLabel}>{t('paid')}</Text>
<Text style={[s.earningsStatValue, { color: colors.success }]}>{formatMoney(earnings.totalPaidOut)}</Text>
</View>
<View style={s.earnDivider} />
<View style={s.earningStat}>
<Text style={s.earningsStatLabel}>{t('balance')}</Text>
<Text style={[s.earningsStatValue, { color: earnings.balance > 0 ? colors.error : colors.success }]}>
{formatMoney(earnings.balance)}
</Text>
</View>
</View>
</View>
)}

{currentClass && (() => {
const slot = currentClass.scheduleDays?.find((d: any) => d.dayOfWeek === today);
return (
<TouchableOpacity style={s.liveCard} activeOpacity={0.8}
onPress={() => navigation.navigate('ClassDetail', { classId: currentClass._id, className: currentClass.name })}>
<View style={s.liveBadgeRow}>
<View style={s.liveBadge}><View style={s.liveDot} /><Text style={s.liveBadgeText}>LIVE</Text></View>
{slot && <Text style={s.liveTime}>{slot.startTime} - {slot.endTime}</Text>}
</View>
<Text style={s.liveClassName}>{currentClass.name}</Text>
<Text style={s.liveSub}>{currentClass.subjectName} • {currentClass.roomName}</Text>
<View style={s.liveActions}>
<TouchableOpacity style={s.liveBtn} onPress={() => navigation.navigate('AttendanceScreen', { classId: currentClass._id, className: currentClass.name })}>
<Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
<Text style={s.liveBtnText}>{t('attendance')}</Text>
</TouchableOpacity>
<TouchableOpacity style={s.liveBtn} onPress={() => navigation.navigate('GradesScreen', { classId: currentClass._id, className: currentClass.name })}>
<Ionicons name="star-outline" size={16} color="#fff" />
<Text style={s.liveBtnText}>{t('grades')}</Text>
</TouchableOpacity>
</View>
</TouchableOpacity>
);
})()}

<SectionTitle title={t('classes')} />
{!classes || classes.length === 0 ? <EmptyState message={t('no_data')} /> : (
classes.map((cls: any) => {
const slot = cls.scheduleDays?.find((d: any) => d.dayOfWeek === today);
const live = currentClass?._id === cls._id;
return (
<TouchableOpacity key={cls._id} style={[s.courseCard, live && s.courseCardLive]} activeOpacity={0.7}
onPress={() => navigation.navigate('ClassDetail', { classId: cls._id, className: cls.name })}>
<View style={s.courseHeader}>
<View style={{ flex: 1 }}>
<Text style={s.courseName}>{cls.name}</Text>
<Text style={s.courseSub}>{cls.subjectName} • {cls.roomName}</Text>
</View>
{slot && <Badge text={`${slot.startTime}-${slot.endTime}`} color={live ? colors.error : colors.primary} />}
</View>
<Text style={s.courseSched}>{cls.scheduleDays?.map((d: any) => `${t(d.dayOfWeek).slice(0,3)} ${d.startTime}`).join(' • ')}</Text>
<View style={s.courseActions}>
<TouchableOpacity style={s.courseBtn} onPress={() => navigation.navigate('AttendanceScreen', { classId: cls._id, className: cls.name })}>
<Ionicons name="checkmark-circle-outline" size={14} color={colors.primary} />
<Text style={s.courseBtnText}>{t('attendance')}</Text>
</TouchableOpacity>
<TouchableOpacity style={s.courseBtn} onPress={() => navigation.navigate('GradesScreen', { classId: cls._id, className: cls.name })}>
<Ionicons name="star-outline" size={14} color={colors.primary} />
<Text style={s.courseBtnText}>{t('grades')}</Text>
</TouchableOpacity>
<TouchableOpacity style={s.courseBtn} onPress={() => navigation.navigate('PaymentScreen', { classId: cls._id, className: cls.name })}>
<Ionicons name="card-outline" size={14} color={colors.primary} />
<Text style={s.courseBtnText}>{t('payment')}</Text>
</TouchableOpacity>
</View>
</TouchableOpacity>
);
})
)}

{upcoming.length > 0 && (
<>
<SectionTitle title={t('todays_classes')} />
{upcoming.map((cls: any) => {
const slot = cls.scheduleDays?.find((d: any) => d.dayOfWeek === today);
return (
<View key={cls._id} style={s.upRow}>
<View style={s.upTime}><Text style={s.upTimeText}>{slot?.startTime}</Text></View>
<View style={{ flex: 1 }}>
<Text style={s.upName}>{cls.name}</Text>
<Text style={s.upSub}>{cls.roomName}</Text>
</View>
</View>
);
})}
</>
)}

{pt.length > 0 && (
<>
<SectionTitle title={t('pending_payments')} />
<View style={s.courseCard}>
{pt.slice(0,5).map((tx: any) => (
<View key={tx._id} style={s.txItem}>
<View style={{ flex: 1 }}>
<Text style={s.txName}>{tx.studentName || 'Unknown'}</Text>
<Text style={s.txClass}>{tx.className}</Text>
</View>
<Text style={s.txAmt}>{formatMoney(tx.amount)}</Text>
</View>
))}
</View>
</>
)}
</ScrollView>
</SafeAreaView>
);
}

const s = StyleSheet.create({
container: { flex: 1, backgroundColor: colors.background },
content: { padding: spacing.lg, paddingBottom: 100 },
headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: spacing.lg },
title: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.text },
subtitle: { fontSize: fontSize.md, color: colors.textSecondary, marginTop: 2 },
profileBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceSecondary, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
liveCard: { backgroundColor: colors.primary, borderRadius: borderRadius.lg, padding: spacing.lg, marginBottom: spacing.lg },
liveBadgeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
liveBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.error, borderRadius: borderRadius.full, paddingHorizontal: spacing.sm, paddingVertical: 3 },
liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff', marginRight: 4 },
liveBadgeText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: '#fff' },
liveTime: { fontSize: fontSize.sm, color: 'rgba(255,255,255,0.8)' },
liveClassName: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: '#fff' },
liveSub: { fontSize: fontSize.sm, color: 'rgba(255,255,255,0.7)', marginTop: 2, marginBottom: spacing.md },
liveActions: { flexDirection: 'row', gap: spacing.sm },
liveBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: borderRadius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: 4 },
liveBtnText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: '#fff' },
courseCard: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.borderLight },
courseCardLive: { borderColor: colors.primary, borderWidth: 2 },
courseHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.xs },
courseName: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text },
courseSub: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 1 },
courseSched: { fontSize: fontSize.xs, color: colors.textTertiary, marginBottom: spacing.sm },
courseActions: { flexDirection: 'row', gap: spacing.sm },
courseBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primaryLight, borderRadius: borderRadius.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, gap: 4 },
courseBtnText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.primary },
upRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.xs },
upTime: { backgroundColor: colors.primaryLight, borderRadius: borderRadius.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, marginRight: spacing.md },
upTimeText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.primary },
upName: { fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.text },
upSub: { fontSize: fontSize.sm, color: colors.textSecondary },
txItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
txName: { fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.text },
txClass: { fontSize: fontSize.sm, color: colors.textSecondary },
txAmt: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.pending },
earningsCard: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.borderLight },
earningsStatsRow: { flexDirection: 'row', alignItems: 'center' },
earningStat: { flex: 1, alignItems: 'center' },
earnDivider: { width: 1, height: 30, backgroundColor: colors.borderLight },
earningsStatLabel: { fontSize: 10, fontWeight: fontWeight.medium, color: colors.textTertiary, marginBottom: 2, textAlign: 'center' },
earningsStatValue: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
});
