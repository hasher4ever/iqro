import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, KeyboardAvoidingView, Platform, TextInput } from 'react-native';
import { showAlert } from '../lib/utils';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../lib/theme';
import { t } from '../lib/i18n';
import { Card, ScreenLoader, SectionTitle, Badge, Button, EmptyState, Input } from '../components/UI';
import { ScreenHeader } from '../components/ScreenHeader';
import Ionicons from '@expo/vector-icons/Ionicons';
import { DAYS } from '../lib/constants';
type ScheduleEntry = { days: string[]; startTime: string; endTime: string };

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
const updateClass = useMutation(api.classes.update);
const rooms = useQuery(api.rooms.list);
const teachers = useQuery(api.users.listTeachers);

const [showAddStudent, setShowAddStudent] = useState(false);
const [adding, setAdding] = useState<string | null>(null);
const [confirmTerminate, setConfirmTerminate] = useState(false);
const [terminating, setTerminating] = useState(false);
const [saving, setSaving] = useState(false);
const [showEdit, setShowEdit] = useState(false);
const [editForm, setEditForm] = useState({
name: '', subjectName: '', teacherId: '', roomId: '',
gradingSystem: 'a_f' as 'a_f' | '0_100' | '1_5',
billingType: 'per_lesson' as 'per_lesson' | 'per_month',
pricePerClass: '',
monthlyPrice: '',
chargeAbsent: false,
teacherSharePercent: '50',
});
const [editSchedule, setEditSchedule] = useState<ScheduleEntry[]>([]);
const [editError, setEditError] = useState('');
const [editSaving, setEditSaving] = useState(false);
const [showEditTeacherPicker, setShowEditTeacherPicker] = useState(false);
const [editTeacherSearch, setEditTeacherSearch] = useState('');

const filteredEditTeachers = useMemo(() => {
if (!teachers) return [];
if (!editTeacherSearch) return teachers;
const q = editTeacherSearch.toLowerCase();
return teachers.filter((tc: any) =>
(tc.name || '').toLowerCase().includes(q) || (tc.email || '').toLowerCase().includes(q) || (tc.phone || '').toLowerCase().includes(q)
);
}, [teachers, editTeacherSearch]);

const selectedEditTeacher = teachers?.find((tc: any) => tc._id === editForm.teacherId);

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

const openEditModal = () => {
if (!classData) return;
// Group schedule days by time into entries
const entries: ScheduleEntry[] = [];
for (const sd of classData.scheduleDays || []) {
const existing = entries.find(e => e.startTime === sd.startTime && e.endTime === sd.endTime);
if (existing) {
existing.days.push(sd.dayOfWeek);
} else {
entries.push({ days: [sd.dayOfWeek], startTime: sd.startTime, endTime: sd.endTime });
}
}
if (entries.length === 0) entries.push({ days: ['monday'], startTime: '09:00', endTime: '10:00' });
setEditSchedule(entries);
setEditForm({
name: classData.name || '',
subjectName: classData.subjectName || '',
teacherId: classData.teacherId || '',
roomId: classData.roomId || '',
gradingSystem: classData.gradingSystem || 'a_f',
billingType: classData.billingType || 'per_lesson',
pricePerClass: classData.pricePerClass ? String(classData.pricePerClass) : '',
monthlyPrice: classData.monthlyPrice ? String(classData.monthlyPrice) : '',
chargeAbsent: classData.chargeAbsent || false,
teacherSharePercent: classData.teacherSharePercent !== undefined ? String(classData.teacherSharePercent) : '50',
});
setEditError('');
setShowEdit(true);
};

const toggleEditScheduleDay = (entryIdx: number, day: string) => {
const updated = [...editSchedule];
const entry = { ...updated[entryIdx] };
if (entry.days.includes(day)) {
if (entry.days.length > 1) entry.days = entry.days.filter(d => d !== day);
} else {
entry.days = [...entry.days, day];
}
updated[entryIdx] = entry;
setEditSchedule(updated);
};

const updateEditScheduleTime = (idx: number, field: 'startTime' | 'endTime', value: string) => {
const updated = [...editSchedule];
updated[idx] = { ...updated[idx], [field]: value };
setEditSchedule(updated);
};

const handleEditSave = async () => {
setEditError('');
const share = parseFloat(editForm.teacherSharePercent);
if (isNaN(share) || share < 0 || share > 100) {
showAlert(t('error'), t('invalid_teacher_share') || 'Teacher share must be 0-100%');
return;
}
const priceValid = editForm.billingType === 'per_month' ? !!editForm.monthlyPrice : !!editForm.pricePerClass;
const missing: string[] = [];
if (!editForm.name) missing.push(t('class_name'));
if (!editForm.subjectName) missing.push(t('subject'));
if (!editForm.teacherId) missing.push(t('teacher'));
if (!editForm.roomId) missing.push(t('room'));
if (!priceValid) missing.push(editForm.billingType === 'per_month' ? t('monthly_price') : t('price_per_class'));
if (missing.length > 0) {
setEditError(t('fill_required_fields') + ': ' + missing.join(', '));
return;
}
if (editSchedule.length === 0) {
setEditError(t('add_schedule_day') || 'Add at least one schedule day');
return;
}
const scheduleDays = editSchedule.flatMap(entry =>
entry.days.map(day => ({ dayOfWeek: day, startTime: entry.startTime, endTime: entry.endTime }))
);
setEditSaving(true);
try {
await updateClass({
classId: classId as any,
name: editForm.name,
subjectName: editForm.subjectName,
teacherId: editForm.teacherId as any,
roomId: editForm.roomId as any,
gradingSystem: editForm.gradingSystem,
billingType: editForm.billingType,
pricePerClass: editForm.billingType === 'per_lesson' ? parseFloat(editForm.pricePerClass) || 0 : 0,
monthlyPrice: editForm.billingType === 'per_month' ? parseFloat(editForm.monthlyPrice) || 0 : 0,
chargeAbsent: editForm.chargeAbsent,
teacherSharePercent: share,
scheduleDays,
});
setShowEdit(false);
} catch (err: any) {
setEditError(err?.message || t('error_generic'));
}
setEditSaving(false);
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
<ScreenHeader
  title={className || t('classes')}
  onBack={() => navigation.goBack()}
  rightAction={isAdmin ? (
    <TouchableOpacity onPress={openEditModal} accessibilityLabel={t('edit_class')} accessibilityRole="button">
      <Ionicons name="create-outline" size={24} color={colors.primary} />
    </TouchableOpacity>
  ) : undefined}
/>

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

{/* Edit Class Modal */}
<Modal visible={showEdit} animationType="slide" transparent>
<KeyboardAvoidingView
behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
style={styles.editModalOverlay}
>
<View style={styles.editModal}>
<View style={styles.editModalHeader}>
<TouchableOpacity onPress={() => { setShowEdit(false); setEditError(''); }}>
<Text style={styles.editCancelText}>{t('cancel')}</Text>
</TouchableOpacity>
<Text style={styles.editModalTitle}>{t('edit_class')}</Text>
<TouchableOpacity onPress={handleEditSave} disabled={editSaving}>
<Text style={[styles.editSaveText, editSaving && { opacity: 0.5 }]}>
{editSaving ? '...' : t('save')}
</Text>
</TouchableOpacity>
</View>

<ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
{editError ? <Text style={styles.editErrorText}>{editError}</Text> : null}

<Input label={t('class_name')} value={editForm.name} onChangeText={(v: string) => setEditForm({ ...editForm, name: v })} placeholder={t('class_name')} />
<Input label={t('subject')} value={editForm.subjectName} onChangeText={(v: string) => setEditForm({ ...editForm, subjectName: v })} placeholder={t('subject')} />

{/* Teacher dropdown */}
<Text style={styles.editLabel}>{t('teacher')}</Text>
<TouchableOpacity
style={styles.editDropdownTrigger}
onPress={() => setShowEditTeacherPicker(!showEditTeacherPicker)}
>
<Text style={selectedEditTeacher ? styles.editDropdownValue : styles.editDropdownPlaceholder}>
{selectedEditTeacher ? (selectedEditTeacher.name || selectedEditTeacher.email || selectedEditTeacher.phone) : t('select_teacher')}
</Text>
<Ionicons name={showEditTeacherPicker ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
</TouchableOpacity>
{showEditTeacherPicker && (
<View style={styles.editDropdownList}>
{(teachers?.length || 0) > 5 && (
<TextInput
value={editTeacherSearch}
onChangeText={setEditTeacherSearch}
placeholder={t('search')}
placeholderTextColor={colors.textTertiary}
style={styles.editDropdownSearch}
/>
)}
<ScrollView style={styles.editDropdownScroll} nestedScrollEnabled>
{filteredEditTeachers.map((tc: any) => (
<TouchableOpacity
key={tc._id}
style={[styles.editDropdownItem, editForm.teacherId === tc._id && styles.editDropdownItemActive]}
onPress={() => { setEditForm({ ...editForm, teacherId: tc._id }); setShowEditTeacherPicker(false); setEditTeacherSearch(''); }}
>
<View style={{ flex: 1 }}>
<Text style={[styles.editDropdownItemText, editForm.teacherId === tc._id && { color: colors.primary, fontWeight: fontWeight.semibold }]}>
{tc.name || tc.email || tc.phone}
</Text>
{tc.name && <Text style={styles.editDropdownItemSub}>{tc.email || tc.phone}</Text>}
</View>
{editForm.teacherId === tc._id && <Ionicons name="checkmark" size={20} color={colors.primary} />}
</TouchableOpacity>
))}
{filteredEditTeachers.length === 0 && <Text style={styles.editDropdownEmpty}>{t('no_data')}</Text>}
</ScrollView>
</View>
)}

{/* Room selector */}
<Text style={styles.editLabel}>{t('room')}</Text>
{rooms && rooms.length === 0 ? (
<Text style={styles.editDropdownEmpty}>{t('no_rooms_hint')}</Text>
) : (
<ScrollView horizontal style={styles.editPickerRow} showsHorizontalScrollIndicator={false}>
{rooms?.map((r: any) => (
<TouchableOpacity
key={r._id}
style={[styles.editChip, editForm.roomId === r._id && styles.editChipActive]}
onPress={() => setEditForm({ ...editForm, roomId: r._id })}
>
<Text style={[styles.editChipText, editForm.roomId === r._id && { color: colors.textInverse }]}>
{r.name}
</Text>
</TouchableOpacity>
))}
</ScrollView>
)}

{/* Grading system */}
<Text style={styles.editLabel}>{t('grading_system')}</Text>
<View style={styles.editPickerRow}>
{[{ label: 'A-F', value: 'a_f' }, { label: '0-100', value: '0_100' }, { label: '1-5', value: '1_5' }].map((gs) => (
<TouchableOpacity
key={gs.value}
style={[styles.editChip, editForm.gradingSystem === gs.value && styles.editChipActive]}
onPress={() => setEditForm({ ...editForm, gradingSystem: gs.value as any })}
>
<Text style={[styles.editChipText, editForm.gradingSystem === gs.value && { color: colors.textInverse }]}>
{gs.label}
</Text>
</TouchableOpacity>
))}
</View>

{/* Billing type */}
<Text style={styles.editLabel}>{t('billing_type')}</Text>
<View style={styles.editPickerRow}>
<TouchableOpacity
style={[styles.editChip, editForm.billingType === 'per_lesson' && styles.editChipActive]}
onPress={() => setEditForm({ ...editForm, billingType: 'per_lesson' })}
>
<Text style={[styles.editChipText, editForm.billingType === 'per_lesson' && { color: colors.textInverse }]}>
{t('per_lesson')}
</Text>
</TouchableOpacity>
<TouchableOpacity
style={[styles.editChip, editForm.billingType === 'per_month' && styles.editChipActive]}
onPress={() => setEditForm({ ...editForm, billingType: 'per_month' })}
>
<Text style={[styles.editChipText, editForm.billingType === 'per_month' && { color: colors.textInverse }]}>
{t('per_month')}
</Text>
</TouchableOpacity>
</View>

{editForm.billingType === 'per_lesson' ? (
<Input label={t('price_per_class') + ' (UZS)'} value={editForm.pricePerClass} onChangeText={(v: string) => setEditForm({ ...editForm, pricePerClass: v })} keyboardType="numeric" placeholder="0" />
) : (
<Input label={t('monthly_price') + ' (UZS)'} value={editForm.monthlyPrice} onChangeText={(v: string) => setEditForm({ ...editForm, monthlyPrice: v })} keyboardType="numeric" placeholder="0" />
)}

<Input label={t('teacher_share_percent')} value={editForm.teacherSharePercent} onChangeText={(v: string) => setEditForm({ ...editForm, teacherSharePercent: v })} keyboardType="numeric" placeholder="50" />

{/* Charge absent toggle */}
<TouchableOpacity
style={styles.editToggleRow}
onPress={() => setEditForm({ ...editForm, chargeAbsent: !editForm.chargeAbsent })}
activeOpacity={0.6}
>
<View style={{ flex: 1 }}>
<Text style={styles.editToggleLabel}>{t('charge_absent')}</Text>
<Text style={styles.editToggleHint}>{t('charge_absent_hint')}</Text>
</View>
<View style={[styles.editToggleTrack, editForm.chargeAbsent && styles.editToggleTrackActive]}>
<View style={[styles.editToggleThumb, editForm.chargeAbsent && styles.editToggleThumbActive]} />
</View>
</TouchableOpacity>

{/* Schedule */}
<View style={styles.editScheduleHeader}>
<Text style={styles.editLabel}>{t('schedule')}</Text>
<TouchableOpacity onPress={() => setEditSchedule([...editSchedule, { days: ['monday'], startTime: '09:00', endTime: '10:00' }])}>
<Text style={styles.editAddDayBtn}>+ {t('add_day')}</Text>
</TouchableOpacity>
</View>

{editSchedule.map((entry, idx) => (
<View key={idx} style={styles.editScheduleRow}>
<View style={styles.editDayGrid}>
{DAYS.map((d) => {
const isSelected = entry.days.includes(d);
return (
<TouchableOpacity
key={d}
style={[styles.editDayGridItem, isSelected && styles.editDayGridItemActive]}
onPress={() => toggleEditScheduleDay(idx, d)}
activeOpacity={0.6}
>
<Text style={[styles.editDayGridText, isSelected && styles.editDayGridTextActive]}>
{t(d).slice(0, 2)}
</Text>
</TouchableOpacity>
);
})}
</View>
<View style={styles.editTimeRow}>
<View style={{ flex: 1 }}>
<Input label={t('start_time')} value={entry.startTime} onChangeText={(v: string) => updateEditScheduleTime(idx, 'startTime', v)} placeholder="09:00" />
</View>
<View style={{ flex: 1 }}>
<Input label={t('end_time')} value={entry.endTime} onChangeText={(v: string) => updateEditScheduleTime(idx, 'endTime', v)} placeholder="10:00" />
</View>
{editSchedule.length > 1 && (
<TouchableOpacity style={styles.editRemoveDay} onPress={() => setEditSchedule(editSchedule.filter((_, i) => i !== idx))}>
<Text style={styles.editRemoveDayText}>✕</Text>
</TouchableOpacity>
)}
</View>
</View>
))}
</ScrollView>
</View>
</KeyboardAvoidingView>
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
// Edit modal styles
editModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-start', paddingTop: 40 },
editModal: { backgroundColor: colors.surface, borderBottomLeftRadius: borderRadius.xl, borderBottomRightRadius: borderRadius.xl, padding: spacing.xl, maxHeight: '90%', paddingBottom: 80 },
editModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: spacing.md },
editModalTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },
editCancelText: { fontSize: fontSize.md, color: colors.textSecondary, fontWeight: fontWeight.medium },
editSaveText: { fontSize: fontSize.md, color: colors.primary, fontWeight: fontWeight.bold },
editErrorText: { color: colors.error, fontSize: fontSize.sm, marginBottom: spacing.md, backgroundColor: colors.errorLight, padding: spacing.md, borderRadius: borderRadius.md },
editLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.textSecondary, marginBottom: spacing.xs, marginTop: spacing.sm },
editDropdownTrigger: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md, paddingHorizontal: spacing.md, paddingVertical: 14, marginBottom: spacing.xs },
editDropdownValue: { fontSize: fontSize.md, color: colors.text, fontWeight: fontWeight.medium },
editDropdownPlaceholder: { fontSize: fontSize.md, color: colors.textTertiary },
editDropdownList: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md, marginBottom: spacing.md, overflow: 'hidden' },
editDropdownSearch: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: fontSize.sm, color: colors.text, borderBottomWidth: 1, borderBottomColor: colors.border },
editDropdownScroll: { maxHeight: 180 },
editDropdownItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
editDropdownItemActive: { backgroundColor: colors.primaryLight || colors.successLight },
editDropdownItemText: { fontSize: fontSize.sm, color: colors.text },
editDropdownItemSub: { fontSize: fontSize.xs, color: colors.textTertiary, marginTop: 1 },
editDropdownEmpty: { padding: spacing.md, textAlign: 'center', color: colors.textTertiary, fontSize: fontSize.sm },
editPickerRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
editChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.full, backgroundColor: colors.surfaceSecondary, marginRight: spacing.xs },
editChipActive: { backgroundColor: colors.primary },
editChipText: { fontSize: fontSize.sm, color: colors.text, fontWeight: fontWeight.medium },
editToggleRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceSecondary, borderRadius: borderRadius.md, padding: spacing.md, marginTop: spacing.sm, marginBottom: spacing.md },
editToggleLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.text },
editToggleHint: { fontSize: fontSize.xs, color: colors.textTertiary, marginTop: 2 },
editToggleTrack: { width: 48, height: 28, borderRadius: 14, backgroundColor: colors.border, justifyContent: 'center', padding: 2 },
editToggleTrackActive: { backgroundColor: colors.primary },
editToggleThumb: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.surface },
editToggleThumbActive: { alignSelf: 'flex-end' as const },
editScheduleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.md, marginBottom: spacing.xs },
editAddDayBtn: { fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.semibold },
editScheduleRow: { backgroundColor: colors.surfaceSecondary, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.sm },
editDayGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
editDayGridItem: { flex: 1, marginHorizontal: 2, paddingVertical: 10, borderRadius: borderRadius.sm, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
editDayGridItemActive: { backgroundColor: colors.primary, borderColor: colors.primary },
editDayGridText: { fontSize: fontSize.sm, color: colors.text, fontWeight: fontWeight.semibold },
editDayGridTextActive: { color: colors.textInverse },
editTimeRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-end' },
editRemoveDay: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.errorLight, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.sm },
editRemoveDayText: { fontSize: fontSize.md, color: colors.error, fontWeight: fontWeight.bold },
}); }