import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Modal, KeyboardAvoidingView, Platform, TextInput, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../lib/theme';
import { t } from '../lib/i18n';
import { formatMoney } from '../lib/utils';
import { Ionicons } from '@expo/vector-icons';
import { Card, Button, Input, ScreenLoader, EmptyState, Badge, SectionTitle } from '../components/UI';
import { ScreenHeader } from '../components/ScreenHeader';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const PAGE_SIZE = 4;

type ScheduleEntry = { days: string[]; startTime: string; endTime: string };

export default function ClassesScreen({ navigation }: any) {
const me = useQuery(api.users.me);
const classes = useQuery(api.classes.list);
const rooms = useQuery(api.rooms.list);
const teachers = useQuery(api.users.listTeachers);
const createClass = useMutation(api.classes.create);
const requestEnrollment = useMutation(api.classes.requestEnrollment);

const [showCreate, setShowCreate] = useState(false);
const [searchText, setSearchText] = useState('');
const [statusFilter, setStatusFilter] = useState<'active' | 'terminated' | 'all'>('active');
const [page, setPage] = useState(0);
const [form, setForm] = useState({
name: '', subjectName: '', teacherId: '', roomId: '',
gradingSystem: 'a_f' as 'a_f' | '0_100' | '1_5',
billingType: 'per_lesson' as 'per_lesson' | 'per_month',
pricePerClass: '',
monthlyPrice: '',
chargeAbsent: false,
teacherSharePercent: '50',
});
const [scheduleEntries, setScheduleEntries] = useState<ScheduleEntry[]>([
{ days: ['monday'], startTime: '09:00', endTime: '10:00' },
]);
const [saving, setSaving] = useState(false);
const [error, setError] = useState('');
const [showTeacherPicker, setShowTeacherPicker] = useState(false);
const [teacherSearch, setTeacherSearch] = useState('');

const filteredClasses = useMemo(() => {
if (!classes) return [];
let result = classes;

if (statusFilter === 'active') {
result = result.filter((cls: any) => cls.isActive !== false);
} else if (statusFilter === 'terminated') {
result = result.filter((cls: any) => cls.isActive === false);
}

if (searchText) {
const q = searchText.toLowerCase();
result = result.filter((cls: any) =>
(cls.name || '').toLowerCase().includes(q) ||
(cls.subjectName || '').toLowerCase().includes(q) ||
(cls.teacherName || '').toLowerCase().includes(q)
);
}
return result;
}, [classes, searchText, statusFilter]);

const filteredTeachers = useMemo(() => {
if (!teachers) return [];
if (!teacherSearch) return teachers;
const q = teacherSearch.toLowerCase();
return teachers.filter((tc: any) =>
(tc.name || '').toLowerCase().includes(q) || (tc.email || '').toLowerCase().includes(q)
);
}, [teachers, teacherSearch]);

const totalPages = Math.max(1, Math.ceil(filteredClasses.length / PAGE_SIZE));
const safePage = Math.min(page, totalPages - 1);
const pagedClasses = filteredClasses.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

if (classes === undefined || me === undefined) return <ScreenLoader />;

const isAdmin = me?.role === 'super_admin' || me?.role === 'admin';
const selectedTeacher = teachers?.find((tc: any) => tc._id === form.teacherId);


const toggleScheduleDay = (entryIdx: number, day: string) => {
const updated = [...scheduleEntries];
const entry = { ...updated[entryIdx] };
if (entry.days.includes(day)) {
if (entry.days.length > 1) {
entry.days = entry.days.filter((d) => d !== day);
}
} else {
entry.days = [...entry.days, day];
}
updated[entryIdx] = entry;
setScheduleEntries(updated);
};

const addScheduleEntry = () => {
setScheduleEntries([...scheduleEntries, { days: ['tuesday'], startTime: '09:00', endTime: '10:00' }]);
};

const removeScheduleEntry = (idx: number) => {
if (scheduleEntries.length <= 1) return;
setScheduleEntries(scheduleEntries.filter((_: any, i: number) => i !== idx));
};

const updateScheduleTime = (idx: number, field: 'startTime' | 'endTime', value: string) => {
const updated = [...scheduleEntries];
updated[idx] = { ...updated[idx], [field]: value };
setScheduleEntries(updated);
};

const handleCreate = async () => {
setError('');
const share = parseFloat(form.teacherSharePercent);
if (isNaN(share) || share < 0 || share > 100) {
Alert.alert(t('error'), t('invalid_teacher_share') || 'Teacher share must be 0-100%');
return;
}
const priceValid = form.billingType === 'per_month' ? !!form.monthlyPrice : !!form.pricePerClass;
if (!form.name || !form.subjectName || !form.teacherId || !form.roomId || !priceValid) {
setError('Fill all required fields');
return;
}
if (scheduleEntries.length === 0) {
setError('Add at least one schedule day');
return;
}
// Flatten multi-day entries into individual schedule days for the API
const scheduleDays = scheduleEntries.flatMap((entry) =>
entry.days.map((day) => ({
dayOfWeek: day,
startTime: entry.startTime,
endTime: entry.endTime,
}))
);
setSaving(true);
try {
await createClass({
name: form.name,
subjectName: form.subjectName,
teacherId: form.teacherId as any,
roomId: form.roomId as any,
gradingSystem: form.gradingSystem,
billingType: form.billingType,
pricePerClass: parseFloat(form.pricePerClass),
monthlyPrice: form.billingType === 'per_month' ? parseFloat(form.monthlyPrice) || 0 : undefined,
chargeAbsent: form.chargeAbsent,
teacherSharePercent: parseFloat(form.teacherSharePercent) || 50,
scheduleDays,
});
setShowCreate(false);
setForm({ name: '', subjectName: '', teacherId: '', roomId: '', gradingSystem: 'a_f', billingType: 'per_lesson', pricePerClass: '', monthlyPrice: '', chargeAbsent: false, teacherSharePercent: '50' });
setScheduleEntries([{ days: ['monday'], startTime: '09:00', endTime: '10:00' }]);
} catch (err: any) {
setError(err?.message || t('error_generic'));
} finally {
setSaving(false);
}
};

const handleEnroll = async (classId: string) => {
try {
await requestEnrollment({ classId: classId as any });
} catch (err: any) {
Alert.alert(t('error'), err?.message || t('error_generic'));
}
};

const formatSchedule = (days: any[]) => {
return days.map((d: any) => `${t(d.dayOfWeek || d).slice(0, 3)} ${d.startTime}-${d.endTime}`).join(' | ');
};

const goPage = (dir: number) => {
const next = safePage + dir;
if (next >= 0 && next < totalPages) setPage(next);
};

return (
<SafeAreaView style={styles.container} edges={['top']}>
<ScreenHeader
  title={t('classes')}
  onBack={() => navigation.goBack()}
  rightAction={isAdmin ? (
    <TouchableOpacity onPress={() => setShowCreate(true)}>
      <Ionicons name="add-circle-outline" size={26} color={colors.primary} />
    </TouchableOpacity>
  ) : undefined}
/>

{/* Search */}
<View style={styles.searchBox}>
<TextInput
value={searchText}
onChangeText={(v) => { setSearchText(v); setPage(0); }}
placeholder={t('search')}
placeholderTextColor={colors.textTertiary}
style={styles.searchInput}
/>
</View>

{/* Status filter */}
<View style={styles.filterRow}>
{(['active', 'all', 'terminated'] as const).map((s) => (
<TouchableOpacity
key={s}
style={[styles.filterChip, statusFilter === s && styles.filterChipActive]}
onPress={() => { setStatusFilter(s); setPage(0); }}
>
<Text style={[styles.filterChipText, statusFilter === s && { color: colors.textInverse }]}>
{s === 'active' ? t('active') : s === 'terminated' ? t('terminated') : t('all')}
</Text>
</TouchableOpacity>
))}
<View style={{ flex: 1 }} />
<Text style={styles.countText}>{filteredClasses.length} {t('classes').toLowerCase()}</Text>
</View>

{/* Course list */}
<ScrollView style={styles.content}>
{pagedClasses.length === 0 ? (
<EmptyState message={t('no_data')} />
) : (
pagedClasses.map((cls: any) => (
<View key={cls._id}>
<Card>
<TouchableOpacity
onPress={() => navigation.navigate('ClassDetail', { classId: cls._id, className: cls.name })}
activeOpacity={0.7}
>
<View style={styles.classHeader}>
<View style={{ flex: 1 }}>
<View style={styles.nameRow}>
<Text style={[styles.className, cls.isActive === false && styles.classNameInactive]}>
{cls.name}
</Text>
{cls.isActive === false ? (
<View style={styles.statusBadgeTerminated}>
<Text style={styles.statusBadgeTerminatedText}>{t('terminated')}</Text>
</View>
) : (
<View style={styles.statusBadgeActive}>
<Text style={styles.statusBadgeActiveText}>{t('active')}</Text>
</View>
)}
</View>
<Text style={styles.classSubject}>{cls.subjectName}</Text>
</View>
<Badge text={`${cls.enrolledCount} ${t('enrolled')}`} color={colors.primary} />
</View>
<Text style={styles.classInfo}>
{cls.teacherName || t('teacher')} • {cls.roomName || t('room')}
</Text>
<Text style={styles.classSchedule}>
{formatSchedule(cls.scheduleDays || [])}
</Text>
<Text style={styles.classPrice}>{formatMoney(cls.pricePerClass)} / class</Text>
{cls.teacherSharePercent !== undefined && (
<Text style={styles.classSchedule}>{t('teacher_share_percent')}: {cls.teacherSharePercent}%</Text>
)}
</TouchableOpacity>
{me?.role === 'student_parent' && cls.isActive !== false && (
<Button
title={t('enroll')}
onPress={() => handleEnroll(cls._id)}
variant="outline"
size="sm"
style={{ marginTop: spacing.md }}
/>
)}
</Card>
</View>
))
)}
</ScrollView>

{/* Pagination */}
{totalPages > 1 && (
<View style={styles.pagination}>
<TouchableOpacity
style={[styles.pageBtn, safePage === 0 && styles.pageBtnDisabled]}
onPress={() => goPage(-1)}
disabled={safePage === 0}
>
<Text style={[styles.pageBtnText, safePage === 0 && styles.pageBtnTextDisabled]}>‹</Text>
</TouchableOpacity>

{Array.from({ length: totalPages }, (_, i) => (
<TouchableOpacity
key={i}
style={[styles.pageNum, i === safePage && styles.pageNumActive]}
onPress={() => setPage(i)}
>
<Text style={[styles.pageNumText, i === safePage && styles.pageNumTextActive]}>
{i + 1}
</Text>
</TouchableOpacity>
))}

<TouchableOpacity
style={[styles.pageBtn, safePage >= totalPages - 1 && styles.pageBtnDisabled]}
onPress={() => goPage(1)}
disabled={safePage >= totalPages - 1}
>
<Text style={[styles.pageBtnText, safePage >= totalPages - 1 && styles.pageBtnTextDisabled]}>›</Text>
</TouchableOpacity>
</View>
)}

{/* Create Class Modal */}
<Modal visible={showCreate} animationType="slide" transparent>
<KeyboardAvoidingView
behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
style={styles.modalOverlay}
>
<View style={styles.modal}>
{/* Modal header with Save/Cancel at top */}
<View style={styles.modalHeader}>
<TouchableOpacity onPress={() => { setShowCreate(false); setError(''); }}>
<Text style={styles.modalCancelText}>{t('cancel')}</Text>
</TouchableOpacity>
<Text style={styles.modalTitle}>{t('create_class')}</Text>
<TouchableOpacity onPress={handleCreate} disabled={saving}>
<Text style={[styles.modalSaveText, saving && { opacity: 0.5 }]}>
{saving ? '...' : t('save')}
</Text>
</TouchableOpacity>
</View>

<ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
{error ? <Text style={styles.errorText}>{error}</Text> : null}

<Input label={t('class_name')} value={form.name} onChangeText={(v: string) => setForm({ ...form, name: v })} placeholder={t('class_name')} />
<Input label={t('subject')} value={form.subjectName} onChangeText={(v: string) => setForm({ ...form, subjectName: v })} placeholder={t('subject')} />

{/* Teacher dropdown selector */}
<Text style={styles.label}>{t('teacher')}</Text>
<TouchableOpacity
style={styles.dropdownTrigger}
onPress={() => setShowTeacherPicker(!showTeacherPicker)}
>
<Text style={selectedTeacher ? styles.dropdownValue : styles.dropdownPlaceholder}>
{selectedTeacher ? (selectedTeacher.name || selectedTeacher.email) : t('select_teacher')}
</Text>
<Ionicons
name={showTeacherPicker ? 'chevron-up' : 'chevron-down'}
size={20}
color={colors.textSecondary}
/>
</TouchableOpacity>
{showTeacherPicker && (
<View style={styles.dropdownList}>
{(teachers?.length || 0) > 5 && (
<TextInput
value={teacherSearch}
onChangeText={setTeacherSearch}
placeholder={t('search')}
placeholderTextColor={colors.textTertiary}
style={styles.dropdownSearch}
/>
)}
<ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
{filteredTeachers.map((tc: any) => (
<TouchableOpacity
key={tc._id}
style={[styles.dropdownItem, form.teacherId === tc._id && styles.dropdownItemActive]}
onPress={() => {
setForm({ ...form, teacherId: tc._id });
setShowTeacherPicker(false);
setTeacherSearch('');
}}
>
<View style={{ flex: 1 }}>
<Text style={[styles.dropdownItemText, form.teacherId === tc._id && { color: colors.primary, fontWeight: fontWeight.semibold }]}>
{tc.name || tc.email}
</Text>
{tc.name && <Text style={styles.dropdownItemSub}>{tc.email}</Text>}
</View>
{form.teacherId === tc._id && (
<Ionicons name="checkmark" size={20} color={colors.primary} />
)}
</TouchableOpacity>
))}
{filteredTeachers.length === 0 && (
<Text style={styles.dropdownEmpty}>{t('no_data')}</Text>
)}
</ScrollView>
</View>
)}

{/* Room selector */}
<Text style={styles.label}>{t('room')}</Text>
<ScrollView horizontal style={styles.pickerRow} showsHorizontalScrollIndicator={false}>
{rooms?.map((r: any) => (
<TouchableOpacity
key={r._id}
style={[styles.chip, form.roomId === r._id && styles.chipActive]}
onPress={() => setForm({ ...form, roomId: r._id })}
>
<Text style={[styles.chipText, form.roomId === r._id && { color: colors.textInverse }]}>
{r.name}
</Text>
</TouchableOpacity>
))}
</ScrollView>

<Text style={styles.label}>{t('grading_system')}</Text>
<View style={styles.pickerRow}>
{[{ label: 'A-F', value: 'a_f' }, { label: '0-100', value: '0_100' }, { label: '1-5', value: '1_5' }].map((gs) => (
<TouchableOpacity
key={gs.value}
style={[styles.chip, form.gradingSystem === gs.value && styles.chipActive]}
onPress={() => setForm({ ...form, gradingSystem: gs.value as any })}
>
<Text style={[styles.chipText, form.gradingSystem === gs.value && { color: colors.textInverse }]}>
{gs.label}
</Text>
</TouchableOpacity>
))}
</View>

{/* Billing type */}
<Text style={styles.label}>{t('billing_type')}</Text>
<View style={styles.pickerRow}>
  <TouchableOpacity
    style={[styles.chip, form.billingType === 'per_lesson' && styles.chipActive]}
    onPress={() => setForm({ ...form, billingType: 'per_lesson' })}
  >
    <Text style={[styles.chipText, form.billingType === 'per_lesson' && { color: colors.textInverse }]}>
      {t('per_lesson')}
    </Text>
  </TouchableOpacity>
  <TouchableOpacity
    style={[styles.chip, form.billingType === 'per_month' && styles.chipActive]}
    onPress={() => setForm({ ...form, billingType: 'per_month' })}
  >
    <Text style={[styles.chipText, form.billingType === 'per_month' && { color: colors.textInverse }]}>
      {t('per_month')}
    </Text>
  </TouchableOpacity>
</View>

{form.billingType === 'per_lesson' ? (
  <Input label={t('price_per_class') + ' (UZS)'} value={form.pricePerClass} onChangeText={(v: string) => setForm({ ...form, pricePerClass: v })} keyboardType="numeric" placeholder="0" />
) : (
  <Input label={t('monthly_price') + ' (UZS)'} value={form.monthlyPrice} onChangeText={(v: string) => setForm({ ...form, monthlyPrice: v })} keyboardType="numeric" placeholder="0" />
)}

<Input label={t('teacher_share_percent')} value={form.teacherSharePercent} onChangeText={(v: string) => setForm({ ...form, teacherSharePercent: v })} keyboardType="numeric" placeholder="50" />

{/* Charge absent toggle */}
<TouchableOpacity
  style={styles.toggleRow}
  onPress={() => setForm({ ...form, chargeAbsent: !form.chargeAbsent })}
  activeOpacity={0.6}
>
  <View style={{ flex: 1 }}>
    <Text style={styles.toggleLabel}>{t('charge_absent')}</Text>
    <Text style={styles.toggleHint}>{t('charge_absent_hint')}</Text>
  </View>
  <View style={[styles.toggleTrack, form.chargeAbsent && styles.toggleTrackActive]}>
    <View style={[styles.toggleThumb, form.chargeAbsent && styles.toggleThumbActive]} />
  </View>
</TouchableOpacity>

{/* Schedule section */}
<View style={styles.scheduleHeader}>
<Text style={styles.label}>{t('schedule')}</Text>
<TouchableOpacity onPress={addScheduleEntry}>
<Text style={styles.addDayBtn}>+ {t('add_day')}</Text>
</TouchableOpacity>
</View>

{scheduleEntries.map((entry, idx) => (
<View key={idx} style={styles.scheduleRow}>
{/* Day grid - single row, all 7 days, multi-select */}
<View style={styles.dayGrid}>
{DAYS.map((d) => {
const isSelected = entry.days.includes(d);
return (
<TouchableOpacity
key={d}
style={[styles.dayGridItem, isSelected && styles.dayGridItemActive]}
onPress={() => toggleScheduleDay(idx, d)}
activeOpacity={0.6}
>
<Text style={[styles.dayGridText, isSelected && styles.dayGridTextActive]}>
{t(d).slice(0, 2)}
</Text>
</TouchableOpacity>
);
})}
</View>
<View style={styles.timeRow}>
<View style={{ flex: 1 }}>
<Input label={t('start_time')} value={entry.startTime} onChangeText={(v: string) => updateScheduleTime(idx, 'startTime', v)} placeholder="09:00" />
</View>
<View style={{ flex: 1 }}>
<Input label={t('end_time')} value={entry.endTime} onChangeText={(v: string) => updateScheduleTime(idx, 'endTime', v)} placeholder="10:00" />
</View>
{scheduleEntries.length > 1 && (
<TouchableOpacity style={styles.removeDay} onPress={() => removeScheduleEntry(idx)}>
<Text style={styles.removeDayText}>✕</Text>
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

const styles = StyleSheet.create({
container: { flex: 1, backgroundColor: colors.background },
header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
headerTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text },
backBtn: { fontSize: fontSize.md, color: colors.primary, fontWeight: fontWeight.medium },
addBtn: { fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.semibold },
searchBox: { paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
searchInput: { backgroundColor: colors.surface, borderRadius: borderRadius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: fontSize.sm, color: colors.text, borderWidth: 1, borderColor: colors.border },
filterRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, marginBottom: spacing.sm, gap: spacing.xs },
filterChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.full, backgroundColor: colors.surfaceSecondary },
filterChipActive: { backgroundColor: colors.primary },
filterChipText: { fontSize: fontSize.xs, color: colors.text, fontWeight: fontWeight.medium },
countText: { fontSize: fontSize.xs, color: colors.textTertiary },
content: { flex: 1, paddingHorizontal: spacing.lg },
classHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.xs },
nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
className: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.text },
classNameInactive: { color: colors.textTertiary },
classSubject: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
classInfo: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.xs },
classSchedule: { fontSize: fontSize.sm, color: colors.textTertiary, marginTop: 2 },
classPrice: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.primary, marginTop: spacing.sm },
statusBadgeActive: { backgroundColor: colors.successLight, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.full },
statusBadgeActiveText: { fontSize: fontSize.xs, color: colors.success, fontWeight: fontWeight.semibold },
statusBadgeTerminated: { backgroundColor: colors.errorLight, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.full },
statusBadgeTerminatedText: { fontSize: fontSize.xs, color: colors.error, fontWeight: fontWeight.semibold },
pagination: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: spacing.md, gap: spacing.xs },
pageBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
pageBtnDisabled: { opacity: 0.3 },
pageBtnText: { fontSize: fontSize.xl, color: colors.text, fontWeight: fontWeight.bold },
pageBtnTextDisabled: { color: colors.textTertiary },
pageNum: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
pageNumActive: { backgroundColor: colors.primary },
pageNumText: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: fontWeight.medium },
pageNumTextActive: { color: colors.textInverse, fontWeight: fontWeight.bold },
errorText: { color: colors.error, fontSize: fontSize.sm, marginBottom: spacing.md, backgroundColor: colors.errorLight, padding: spacing.md, borderRadius: borderRadius.md },
// Modal styles
modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-start', paddingTop: 40 },
modal: { backgroundColor: colors.surface, borderBottomLeftRadius: borderRadius.xl, borderBottomRightRadius: borderRadius.xl, padding: spacing.xl, maxHeight: '90%' },
modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: spacing.md },
modalTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },
modalCancelText: { fontSize: fontSize.md, color: colors.textSecondary, fontWeight: fontWeight.medium },
modalSaveText: { fontSize: fontSize.md, color: colors.primary, fontWeight: fontWeight.bold },
label: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.textSecondary, marginBottom: spacing.xs, marginTop: spacing.sm },
// Teacher dropdown
dropdownTrigger: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md, paddingHorizontal: spacing.md, paddingVertical: 14, marginBottom: spacing.xs },
dropdownValue: { fontSize: fontSize.md, color: colors.text, fontWeight: fontWeight.medium },
dropdownPlaceholder: { fontSize: fontSize.md, color: colors.textTertiary },
dropdownList: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md, marginBottom: spacing.md, overflow: 'hidden' },
dropdownSearch: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: fontSize.sm, color: colors.text, borderBottomWidth: 1, borderBottomColor: colors.border },
dropdownScroll: { maxHeight: 180 },
dropdownItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
dropdownItemActive: { backgroundColor: colors.primaryLight || colors.successLight },
dropdownItemText: { fontSize: fontSize.sm, color: colors.text },
dropdownItemSub: { fontSize: fontSize.xs, color: colors.textTertiary, marginTop: 1 },
dropdownEmpty: { padding: spacing.md, textAlign: 'center', color: colors.textTertiary, fontSize: fontSize.sm },
// Chips for room, grading
pickerRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.full, backgroundColor: colors.surfaceSecondary, marginRight: spacing.xs },
chipActive: { backgroundColor: colors.primary },
chipText: { fontSize: fontSize.sm, color: colors.text, fontWeight: fontWeight.medium },
// Schedule
scheduleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.md, marginBottom: spacing.xs },
addDayBtn: { fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.semibold },
scheduleRow: { backgroundColor: colors.surfaceSecondary, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.sm },
// Day grid - 7 items in a single row
dayGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
dayGridItem: { flex: 1, marginHorizontal: 2, paddingVertical: 10, borderRadius: borderRadius.sm, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
dayGridItemActive: { backgroundColor: colors.primary, borderColor: colors.primary },
dayGridText: { fontSize: fontSize.sm, color: colors.text, fontWeight: fontWeight.semibold },
dayGridTextActive: { color: colors.textInverse },
timeRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-end' },
removeDay: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.errorLight, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.sm },
removeDayText: { fontSize: fontSize.md, color: colors.error, fontWeight: fontWeight.bold },
toggleRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceSecondary, borderRadius: borderRadius.md, padding: spacing.md, marginTop: spacing.sm, marginBottom: spacing.md },
toggleLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.text },
toggleHint: { fontSize: fontSize.xs, color: colors.textTertiary, marginTop: 2 },
toggleTrack: { width: 48, height: 28, borderRadius: 14, backgroundColor: colors.border, justifyContent: 'center', padding: 2 },
toggleTrackActive: { backgroundColor: colors.primary },
toggleThumb: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.surface },
toggleThumbActive: { alignSelf: 'flex-end' as const },
});

// ... existing code ...