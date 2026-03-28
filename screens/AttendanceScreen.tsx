import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../lib/theme';
import { t } from '../lib/i18n';
import { Card, Button, ScreenLoader, EmptyState, Badge } from '../components/UI';
import { ScreenHeader } from '../components/ScreenHeader';
import { Ionicons } from '@expo/vector-icons';

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

function getToday(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function formatDateDisplay(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export default function AttendanceScreen({ route, navigation }: any) {
const { classId, className } = route.params;
const [selectedDate, setSelectedDate] = useState<string>(getToday());
const me = useQuery(api.users.me);
const students = useQuery(api.classes.getClassStudents, { classId });
const attendance = useQuery(api.attendance.getClassAttendance, { classId, date: selectedDate });
const attendanceStatus = useQuery(api.attendance.isAttendanceOpen, { classId });
const markAttendance = useMutation(api.attendance.markAttendance);
const unlockAttendance = useMutation(api.attendance.unlockAttendance);

const [records, setRecords] = useState<Record<string, AttendanceStatus>>({});
const [saving, setSaving] = useState(false);

const isToday = selectedDate === getToday();
const isFuture = selectedDate > getToday();

const goToPrevDay = () => {
  setSelectedDate(shiftDate(selectedDate, -1));
  setRecords({});
};
const goToNextDay = () => {
  const next = shiftDate(selectedDate, 1);
  if (next > getToday()) {
    Alert.alert(t('error'), t('no_future_dates'));
    return;
  }
  setSelectedDate(next);
  setRecords({});
};

if (students === undefined || attendance === undefined || me === undefined) return <ScreenLoader />;

if (me && me.role !== 'admin' && me.role !== 'super_admin' && me.role !== 'teacher') {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>{t('no_permission')}</Text>
    </View>
  );
}


const isAdmin = me?.role === 'super_admin' || me?.role === 'admin';
const canSave = isAdmin || attendanceStatus?.isOpen;

// Build initial state from existing attendance
const getStatus = (studentId: string): AttendanceStatus => {
if (records[studentId]) return records[studentId];
const existing = attendance?.find((a: any) => a.studentId === studentId);
if (existing) return existing.status as AttendanceStatus;
return 'absent';
};

const toggleStatus = (studentId: string) => {
const current = getStatus(studentId);
const order: AttendanceStatus[] = ['present', 'absent', 'late', 'excused'];
const nextIndex = (order.indexOf(current) + 1) % order.length;
setRecords((prev) => ({ ...prev, [studentId]: order[nextIndex] }));
};

const handleSave = async () => {
if (!students || students.length === 0) return;
setSaving(true);
try {
const attendanceRecords = students.map((s: any) => ({
studentId: s._id,
status: getStatus(s._id) as any,
}));
await markAttendance({ classId, date: selectedDate, records: attendanceRecords });
Alert.alert(t('success'), t('attendance') + ' saved');
navigation.goBack();
} catch (error: any) {
Alert.alert(t('error'), error?.message || t('error_generic'));
} finally {
setSaving(false);
}
};

const handleUnlock = async () => {
try {
await unlockAttendance({ classId, durationMinutes: 30 });
Alert.alert(t('success'), t('attendance_unlocked_30min'));
} catch (error: any) {
Alert.alert(t('error'), error?.message || t('error_generic'));
}
};

const statusColors: Record<string, string> = {
present: colors.present,
absent: colors.absent,
late: colors.late,
excused: colors.excused,
};

return (
<SafeAreaView style={styles.container} edges={['top']}>
<ScreenHeader title={`${t('attendance')} — ${className}`} onBack={() => navigation.goBack()} />
<ScrollView contentContainerStyle={styles.content}>
{/* Date navigation */}
<View style={styles.dateBanner}>
  <TouchableOpacity onPress={goToPrevDay} style={styles.dateNavBtn}>
    <Ionicons name="chevron-back" size={20} color={colors.primary} />
  </TouchableOpacity>
  <View style={styles.dateCenter}>
    <Ionicons name="calendar-outline" size={16} color={colors.primary} />
    <Text style={styles.dateBannerText}>{formatDateDisplay(selectedDate)}</Text>
  </View>
  <TouchableOpacity onPress={goToNextDay} style={[styles.dateNavBtn, isToday && { opacity: 0.3 }]} disabled={isToday}>
    <Ionicons name="chevron-forward" size={20} color={colors.primary} />
  </TouchableOpacity>
</View>

{/* Window status banner for teachers */}
{!isAdmin && !attendanceStatus?.isOpen && (
<View style={styles.windowClosedBanner}>
<Text style={styles.windowClosedText}>{attendanceStatus?.reason || 'Attendance window is closed'}</Text>
</View>
)}

{/* Unlock button for admins when window is closed */}
{isAdmin && !attendanceStatus?.isOpen && (
<TouchableOpacity style={styles.unlockBanner} onPress={handleUnlock}>
<Text style={styles.unlockBannerText}>⏰ {t('attendance')} window closed — tap to unlock for 30 min</Text>
</TouchableOpacity>
)}

{/* Legend */}
<View style={styles.legend}>
{(['present', 'absent', 'late', 'excused'] as const).map((s) => (
<View key={s} style={styles.legendItem}>
<View style={[styles.legendDot, { backgroundColor: statusColors[s] }]} />
<Text style={styles.legendText}>{t(s)}</Text>
</View>
))}
</View>

{students?.length === 0 ? (
<EmptyState message={t('no_results')} />
) : (
students?.map((student: any) => {
const status = getStatus(student._id);
return (
<TouchableOpacity
key={student._id}
style={[styles.studentRow, !canSave && styles.studentRowDisabled]}
onPress={() => canSave && toggleStatus(student._id)}
activeOpacity={canSave ? 0.6 : 1}
disabled={!canSave}
>
<View style={[styles.statusIndicator, { backgroundColor: statusColors[status] }]} />
<Text style={[styles.studentName, !canSave && { color: colors.textTertiary }]}>{student.name || student.email || 'Unknown'}</Text>
<Badge
text={t(status)}
color={canSave ? statusColors[status] : colors.textTertiary}
bgColor={(canSave ? statusColors[status] : colors.textTertiary) + '20'}
/>
</TouchableOpacity>
);
})
)}
</ScrollView>

{canSave && (
<View style={styles.footer}>
<Button
title={t('save')}
onPress={handleSave}
loading={saving}
/>
</View>
)}
</SafeAreaView>
);
}

const styles = StyleSheet.create({
container: { flex: 1, backgroundColor: colors.background },
header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
backBtn: { fontSize: fontSize.md, color: colors.primary, fontWeight: fontWeight.medium },
headerTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },
className: { fontSize: fontSize.md, color: colors.textSecondary, paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
statusBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: spacing.lg, padding: spacing.md, borderRadius: borderRadius.md },
statusText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium },
unlockBtn: { fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.semibold },
content: { padding: spacing.lg, paddingBottom: 120 },
dateBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primaryLight || colors.primary + '15', borderRadius: borderRadius.md, padding: spacing.sm, marginBottom: spacing.md },
dateNavBtn: { padding: spacing.sm },
dateCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
dateBannerText: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.primary },
legend: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: spacing.lg, backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.md },
legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
legendDot: { width: 10, height: 10, borderRadius: 5 },
legendText: { fontSize: fontSize.xs, color: colors.textSecondary },
studentRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.sm },
studentRowDisabled: { opacity: 0.5 },
statusIndicator: { width: 4, height: 32, borderRadius: 2, marginRight: spacing.md },
studentName: { flex: 1, fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.text },
footer: { padding: spacing.lg, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
windowClosedBanner: { backgroundColor: colors.errorLight, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.md },
windowClosedText: { fontSize: fontSize.sm, color: colors.error, textAlign: 'center', fontWeight: fontWeight.medium },
unlockBanner: { backgroundColor: colors.warningLight, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.md },
unlockBannerText: { fontSize: fontSize.sm, color: colors.warning, textAlign: 'center', fontWeight: fontWeight.medium },
});