import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { showAlert } from '../lib/utils';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../lib/theme';
import { t } from '../lib/i18n';
import { Card, ScreenLoader, SectionTitle, Badge, Button, EmptyState } from '../components/UI';
import { ScreenHeader } from '../components/ScreenHeader';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function ClassDetailScreen({ route, navigation }: any) {
const styles = getStyles();

const { classId, className } = route.params;
const me = useQuery(api.users.me);
const classData = useQuery(api.classes.getById, { classId });
const students = useQuery(api.classes.getClassStudents, { classId });
const leaderboard = useQuery(api.grades.getLeaderboard, { classId });
const enrollments = useQuery(api.classes.listEnrollments, { classId });
const allStudents = useQuery(api.classes.listStudentUsers);
const approveEnrollment = useMutation(api.classes.approveEnrollment);
const rejectEnrollment = useMutation(api.classes.rejectEnrollment);
const enrollStudent = useMutation(api.classes.adminEnrollStudent);
const removeEnrollment = useMutation(api.classes.removeEnrollment);
const setClassActive = useMutation(api.classes.setClassActive);

const [showAddStudent, setShowAddStudent] = useState(false);
const [adding, setAdding] = useState<string | null>(null);
const [confirmTerminate, setConfirmTerminate] = useState(false);
const [terminating, setTerminating] = useState(false);
const [saving, setSaving] = useState(false);

if (students === undefined || me === undefined || classData === undefined) return <ScreenLoader />;

const isAdmin = me?.role === 'super_admin' || me?.role === 'admin';
const isTeacherOrAdmin = isAdmin || me?.role === 'teacher';
const isClassActive = classData?.isActive !== false;

// Students already enrolled (approved)
const enrolledIds = new Set(students?.map((s: any) => s._id) || []);

// Pending enrollments
const pendingEnrollments = enrollments?.filter((e: any) => e.status === 'pending') || [];

// Available students (not yet enrolled)
const availableStudents = (allStudents || []).filter((s: any) => !enrolledIds.has(s._id));

const handleApprove = async (enrollmentId: string) => {
setSaving(true);
try { await approveEnrollment({ enrollmentId: enrollmentId as any }); } catch (e: any) {
  showAlert(t('error'), e?.message || t('error_generic'));
} finally { setSaving(false); }
};

const handleReject = async (enrollmentId: string) => {
setSaving(true);
try { await rejectEnrollment({ enrollmentId: enrollmentId as any }); } catch (e: any) {
  showAlert(t('error'), e?.message || t('error_generic'));
} finally { setSaving(false); }
};

const handleAddStudent = async (studentId: string) => {
setAdding(studentId);
try {
await enrollStudent({ classId, studentId: studentId as any });
} catch (e: any) {
  showAlert(t('error'), e?.message || t('error_generic'));
}
setAdding(null);
};

const handleRemoveStudent = async (enrollmentId: string) => {
try { await removeEnrollment({ enrollmentId: enrollmentId as any }); } catch (e: any) {
  showAlert(t('error'), e?.message || t('error_generic'));
}
};

const handleToggleActive = async () => {
  setTerminating(true);
  try {
    const newActive = !isClassActive;
    await setClassActive({ classId: classId as any, isActive: newActive });
    setConfirmTerminate(false);
  } catch (e: any) {
    showAlert(t('error'), e?.message || t('error_generic'));
  }
  setTerminating(false);
};

return (
<SafeAreaView style={styles.container} edges={['top']}>
<ScreenHeader title={className || t('classes')} onBack={() => navigation.goBack()} />

<ScrollView contentContainerStyle={styles.content}>
{/* Inactive Banner */}
{!isClassActive && (
<View style={styles.inactiveBanner}>
<Text style={styles.inactiveBannerText}>{t('class_terminated')}</Text>
</View>
)}

{/* Quick Actions */}
{isTeacherOrAdmin && (
<View style={styles.actionsRow}>
<TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('AttendanceScreen', { classId, className })}>
<Ionicons name="calendar-outline" size={26} color={colors.primary} style={{ marginBottom: spacing.xs }} />
<Text style={styles.actionLabel}>{t('attendance')}</Text>
</TouchableOpacity>
<TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('GradesScreen', { classId, className })}>
<Ionicons name="school-outline" size={26} color={colors.primary} style={{ marginBottom: spacing.xs }} />
<Text style={styles.actionLabel}>{t('grades')}</Text>
</TouchableOpacity>
<TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('PaymentScreen', { classId, className })}>
<Ionicons name="wallet-outline" size={26} color={colors.primary} style={{ marginBottom: spacing.xs }} />
<Text style={styles.actionLabel}>{t('finance')}</Text>
</TouchableOpacity>
</View>
)}

{/* Pending Enrollments */}
{isTeacherOrAdmin && pendingEnrollments.length > 0 && (
<>
<SectionTitle title={`${t('pending_enrollments')} (${pendingEnrollments.length})`} />
<Card>
{pendingEnrollments.map((e: any, i: number) => (
<View key={e._id} style={[styles.enrollRow, i < pendingEnrollments.length - 1 && styles.rowBorder]}>
<View style={{ flex: 1 }}>
<Text style={styles.studentName}>{e.studentName || e.studentId}</Text>
<Badge text={t('pending')} color={colors.warning} />
</View>
<View style={styles.enrollActions}>
<TouchableOpacity style={styles.approveBtn} onPress={() => handleApprove(e._id)} disabled={saving}>
<Text style={styles.approveBtnText}>{t('approve')}</Text>
</TouchableOpacity>
<TouchableOpacity style={styles.rejectBtn} onPress={() => handleReject(e._id)} disabled={saving}>
<Text style={styles.rejectBtnText}>{t('reject')}</Text>
</TouchableOpacity>
</View>
</View>
))}
</Card>
</>
)}

{/* Enrolled Students */}
<SectionTitle title={`${t('students')} (${students?.length || 0})`} />
{isAdmin && isClassActive && (
<TouchableOpacity style={styles.addStudentBtn} onPress={() => setShowAddStudent(true)}>
<Text style={styles.addStudentBtnText}>+ {t('add_student')}</Text>
</TouchableOpacity>
)}
<Card>
{(!students || students.length === 0) ? (
<Text style={styles.emptyText}>{t('no_results')}</Text>
) : (
students.map((s: any, i: number) => (
<View key={s._id} style={[styles.studentRow, i < students.length - 1 && styles.rowBorder]}>
<View style={styles.studentAvatar}>
<Text style={styles.studentAvatarText}>{(s.name || '?')[0].toUpperCase()}</Text>
</View>
<View style={{ flex: 1 }}>
<Text style={styles.studentName}>{s.name || s.email || s.phone || 'Unknown'}</Text>
{(s.email || s.phone) && <Text style={styles.studentEmail}>{s.email || s.phone}</Text>}
</View>
{isAdmin && (
<TouchableOpacity
style={styles.removeBtn}
onPress={() => handleRemoveStudent(s.enrollmentId)}
>
<Text style={styles.removeBtnText}>✕</Text>
</TouchableOpacity>
)}
</View>
))
)}
</Card>

{/* Leaderboard */}
{leaderboard && leaderboard.length > 0 && (
<>
<SectionTitle title={t('leaderboard')} />
<Card>
{leaderboard.slice(0, 10).map((entry: any, idx: number) => (
<View key={entry.studentId} style={[styles.leaderRow, idx < leaderboard.length - 1 && styles.rowBorder]}>
<Text style={[styles.rank, idx < 3 && { color: colors.secondary }]}>#{idx + 1}</Text>
<Text style={[styles.studentName, { flex: 1, marginLeft: spacing.md }]}>{entry.studentName || 'Unknown'}</Text>
<Text style={styles.avgScore}>{entry.averageScore}</Text>
</View>
))}
</Card>
</>
)}

{/* Terminate / Reactivate Class */}
{isAdmin && (
<View style={styles.terminateSection}>
{!confirmTerminate ? (
<TouchableOpacity
  style={[styles.terminateBtn, isClassActive ? styles.terminateBtnDanger : styles.terminateBtnSuccess]}
  onPress={() => setConfirmTerminate(true)}
>
  <Text style={[styles.terminateBtnText, isClassActive ? { color: colors.error } : { color: colors.success }]}>
    {isClassActive ? t('terminate_class') : t('reactivate_class')}
  </Text>
</TouchableOpacity>
) : (
<View>
  <Text style={{ fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.md, textAlign: 'center' }}>
    {isClassActive ? t('terminate_class_confirm') : t('reactivate_class_confirm')}
  </Text>
  <View style={{ flexDirection: 'row', gap: spacing.md }}>
    <TouchableOpacity
      style={[styles.terminateBtn, { flex: 1, borderColor: colors.border, backgroundColor: colors.surface }]}
      onPress={() => setConfirmTerminate(false)}
    >
      <Text style={[styles.terminateBtnText, { color: colors.textSecondary }]}>{t('cancel')}</Text>
    </TouchableOpacity>
    <TouchableOpacity
      style={[styles.terminateBtn, { flex: 1 }, isClassActive ? styles.terminateBtnDanger : styles.terminateBtnSuccess]}
      onPress={handleToggleActive}
      disabled={terminating}
    >
      <Text style={[styles.terminateBtnText, isClassActive ? { color: colors.error } : { color: colors.success }]}>
        {terminating ? '...' : (isClassActive ? t('terminate_class') : t('reactivate_class'))}
      </Text>
    </TouchableOpacity>
  </View>
</View>
)}
</View>
)}
</ScrollView>

{/* Add Student Modal */}
<Modal visible={showAddStudent} animationType="slide" transparent>
<View style={styles.modalOverlay}>
<View style={styles.modal}>
<View style={styles.modalHeader}>
<Text style={styles.modalTitle}>{t('add_student')}</Text>
<TouchableOpacity onPress={() => setShowAddStudent(false)}>
<Text style={styles.closeBtn}>{t('close')}</Text>
</TouchableOpacity>
</View>

<ScrollView style={styles.studentList} showsVerticalScrollIndicator={false}>
{availableStudents.length === 0 ? (
<EmptyState message={t('no_results')} />
) : (
availableStudents.map((s: any) => (
<View key={s._id} style={styles.addStudentRow}>
<View style={styles.studentAvatar}>
<Text style={styles.studentAvatarText}>{(s.name || '?')[0].toUpperCase()}</Text>
</View>
<View style={{ flex: 1 }}>
<Text style={styles.studentName}>{s.name || 'No name'}</Text>
<Text style={styles.studentEmail}>{s.email || s.phone}</Text>
</View>
<Button
title={adding === s._id ? '...' : '+ ' + t('enroll')}
onPress={() => handleAddStudent(s._id)}
variant="outline"
size="sm"
loading={adding === s._id}
/>
</View>
))
)}
</ScrollView>
</View>
</View>
</Modal>
</SafeAreaView>
);
}

function getStyles() { return StyleSheet.create({
container: { flex: 1, backgroundColor: colors.background },
header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
backBtn: { fontSize: fontSize.md, color: colors.primary, fontWeight: fontWeight.medium },
headerTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text, flex: 1, textAlign: 'center' },
content: { padding: spacing.lg, paddingBottom: 100 },
actionsRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
actionCard: { flex: 1, backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.lg, alignItems: 'center', boxShadow: '0px 0px 4px rgba(0, 0, 0, 0.03)', elevation: 1 },
actionLabel: { fontSize: fontSize.xs, color: colors.textSecondary, fontWeight: fontWeight.medium },
emptyText: { fontSize: fontSize.sm, color: colors.textTertiary, textAlign: 'center', paddingVertical: spacing.lg },
studentRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md },
rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.borderLight },
studentAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center', marginRight: spacing.md },
studentAvatarText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.primary },
studentName: { fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.text },
studentEmail: { fontSize: fontSize.xs, color: colors.textTertiary, marginTop: 1 },
leaderRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md },
rank: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textSecondary, width: 30 },
avgScore: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.primary },
enrollRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md },
enrollActions: { flexDirection: 'row', gap: spacing.sm },
approveBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.md, backgroundColor: colors.successLight },
approveBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.success },
rejectBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.md, backgroundColor: colors.errorLight },
rejectBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.error },
addStudentBtn: { alignSelf: 'flex-start', paddingVertical: spacing.sm, paddingHorizontal: spacing.md, backgroundColor: colors.primaryLight, borderRadius: borderRadius.md, marginBottom: spacing.md },
addStudentBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.primary },
removeBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.errorLight, justifyContent: 'center', alignItems: 'center' },
removeBtnText: { fontSize: fontSize.sm, color: colors.error, fontWeight: fontWeight.bold },
modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-start', paddingTop: 60 },
modal: { backgroundColor: colors.surface, borderBottomLeftRadius: borderRadius.xl, borderBottomRightRadius: borderRadius.xl, padding: spacing.xl, maxHeight: '85%' },
modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
modalTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text },
closeBtn: { fontSize: fontSize.md, color: colors.primary, fontWeight: fontWeight.medium },
studentList: { maxHeight: 400 },
addStudentRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
inactiveBanner: { backgroundColor: colors.errorLight, paddingVertical: spacing.md, paddingHorizontal: spacing.lg, borderRadius: borderRadius.md, alignItems: 'center', marginBottom: spacing.lg },
inactiveBannerText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.error, textAlign: 'center' },
terminateSection: { marginTop: spacing.xl, paddingTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors.borderLight },
terminateBtn: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg, borderRadius: borderRadius.md, alignItems: 'center', borderWidth: 1 },
terminateBtnDanger: { borderColor: colors.error, backgroundColor: colors.errorLight },
terminateBtnSuccess: { borderColor: colors.success, backgroundColor: colors.successLight },
terminateBtnText: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
}); }