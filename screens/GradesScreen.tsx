import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { showAlert } from '../lib/utils';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../lib/theme';
import { t } from '../lib/i18n';
import { Card, Button, ScreenLoader, EmptyState, SectionTitle } from '../components/UI';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ScreenHeader } from '../components/ScreenHeader';

const GRADE_PRESETS: Record<string, string[]> = {
'a_f': ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D', 'F'],
'0_100': ['100', '95', '90', '85', '80', '75', '70', '65', '60', '50', '0'],
'1_5': ['5', '4', '3', '2', '1'],
};

export default function GradesScreen({ route, navigation }: any) {
const styles = getStyles();

const { classId, className } = route.params;
const me = useQuery(api.users.me);
const students = useQuery(api.classes.getClassStudents, { classId });
const leaderboard = useQuery(api.grades.getLeaderboard, { classId });
const classData = useQuery(api.classes.getById, { classId });
const addGrade = useMutation(api.grades.addGrade);
const editGrade = useMutation(api.grades.editGrade);

const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
const [gradeValue, setGradeValue] = useState('');
const [assignmentName, setAssignmentName] = useState('');
const [saving, setSaving] = useState(false);
const [showLeaderboard, setShowLeaderboard] = useState(false);
const [editingGradeId, setEditingGradeId] = useState<string | null>(null);
const [editValue, setEditValue] = useState('');
const [searchText, setSearchText] = useState('');

const gradingSystem = classData?.gradingSystem || 'a_f';
const presets = GRADE_PRESETS[gradingSystem] || GRADE_PRESETS['a_f'];

const validateGrade = (value: string, system: string): boolean => {
  const trimmed = value.trim();
  if (!trimmed) return false;
  switch (system) {
    case '0_100': {
      const num = Number(trimmed);
      return !isNaN(num) && num >= 0 && num <= 100;
    }
    case '0_5': {
      const num = Number(trimmed);
      return !isNaN(num) && num >= 0 && num <= 5;
    }
    case 'a_f':
      return ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D', 'F'].includes(trimmed.toUpperCase());
    case 'pass_fail':
      return ['pass', 'fail'].includes(trimmed.toLowerCase());
    default:
      return true;
  }
};

const filteredStudents = useMemo(() => {
if (!students) return [];
if (!searchText.trim()) return students;
const q = searchText.toLowerCase();
return students.filter((s: any) =>
(s.name || '').toLowerCase().includes(q) ||
(s.email || '').toLowerCase().includes(q) ||
(s.phone || '').toLowerCase().includes(q)
);
}, [students, searchText]);

if (students === undefined || me === undefined) return <ScreenLoader />;

if (me && me.role !== 'admin' && me.role !== 'super_admin' && me.role !== 'teacher') {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>{t('no_permission')}</Text>
    </View>
  );
}

const handleAddGrade = async () => {
if (!selectedStudent || !gradeValue.trim()) {
showAlert(t('error'), t('select_student_and_grade'));
return;
}
if (!validateGrade(gradeValue, gradingSystem)) {
showAlert(t('error'), t('invalid_grade_value'));
return;
}
setSaving(true);
try {
await addGrade({
classId,
studentId: selectedStudent as any,
value: gradeValue.trim(),
assignmentName: assignmentName.trim() || undefined,
});
setGradeValue('');
setAssignmentName('');
// Keep student selected for rapid grading
} catch (error: any) {
showAlert(t('error'), error?.message || t('error_generic'));
} finally {
setSaving(false);
}
};

const handleEditGrade = async () => {
if (!editingGradeId || !editValue.trim()) {
showAlert(t('error'), t('select_student_and_grade'));
return;
}
if (!validateGrade(editValue, gradingSystem)) {
showAlert(t('error'), t('invalid_grade_value'));
return;
}
try {
await editGrade({ gradeId: editingGradeId as any, newValue: editValue.trim() });
setEditingGradeId(null);
setEditValue('');
} catch (error: any) {
showAlert(t('error'), error?.message || t('error_generic'));
}
};

const handleSelectStudent = (id: string) => {
if (selectedStudent === id) {
setSelectedStudent(null);
} else {
setSelectedStudent(id);
setGradeValue('');
setAssignmentName('');
}
};

return (
<SafeAreaView style={styles.container} edges={['top']}>
<ScreenHeader
  title={`${t('grades')} — ${className}`}
  onBack={() => navigation.goBack()}
  rightAction={
    <TouchableOpacity onPress={() => setShowLeaderboard(!showLeaderboard)}>
      <Ionicons name="trophy" size={22} color={showLeaderboard ? colors.secondary : colors.textTertiary} />
    </TouchableOpacity>
  }
/>
<ScrollView
contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
{/* Leaderboard - collapsible */}
{showLeaderboard && (
<View style={styles.leaderboardSection}>
<Text style={styles.sectionLabel}>
<Ionicons name="trophy" size={14} color={colors.secondary} /> {t('leaderboard')}
</Text>
{!leaderboard || leaderboard.length === 0 ? (
<Text style={styles.emptyText}>{t('no_data')}</Text>
) : (
<View style={styles.leaderboardList}>
{leaderboard.map((entry: any, idx: number) => (
<View key={entry.studentId} style={styles.leaderRow}>
<View style={[
styles.rankBadge,
idx === 0 && { backgroundColor: '#FFD700' },
idx === 1 && { backgroundColor: '#C0C0C0' },
idx === 2 && { backgroundColor: '#CD7F32' },
]}>
<Text style={[styles.rankText, idx < 3 && { color: '#fff' }]}>
{idx + 1}
</Text>
</View>
<Text style={styles.leaderName} numberOfLines={1}>
{entry.studentName || 'Unknown'}
</Text>
<View style={styles.leaderStats}>
<Text style={styles.leaderAvg}>{entry.averageScore}</Text>
<Text style={styles.leaderCount}>
{entry.gradeCount} {t('grades').toLowerCase()}
</Text>
</View>
</View>
))}
</View>
)}
</View>
)}

{/* Search */}
{(students?.length || 0) > 5 && (
<View style={styles.searchBox}>
<Ionicons name="search" size={16} color={colors.textTertiary} />
<TextInput
style={styles.searchInput}
placeholder={t('search')}
placeholderTextColor={colors.textTertiary}
value={searchText}
onChangeText={setSearchText}
/>
{searchText.length > 0 && (
<TouchableOpacity onPress={() => setSearchText('')}>
<Ionicons name="close-circle" size={16} color={colors.textTertiary} />
</TouchableOpacity>
)}
</View>
)}

{/* Grade input panel - shown when student selected */}
{selectedStudent && (
<Card>
<Text style={styles.inputSectionTitle}>{t('add_grade')}</Text>

{/* Quick grade buttons */}
<View style={styles.presetRow}>
{presets.map((p: string) => (
<TouchableOpacity
key={p}
style={[styles.presetChip, gradeValue === p && styles.presetChipActive]}
onPress={() => setGradeValue(p)}
>
<Text style={[styles.presetText, gradeValue === p && styles.presetTextActive]}>
{p}
</Text>
</TouchableOpacity>
))}
</View>

{/* Custom value + assignment */}
<View style={styles.inputRow}>
<TextInput
style={[styles.gradeInput, { flex: 1 }]}
placeholder={t('grade_value')}
placeholderTextColor={colors.textTertiary}
value={gradeValue}
onChangeText={setGradeValue}
autoCapitalize="characters"
/>
<TextInput
style={[styles.gradeInput, { flex: 2, marginLeft: spacing.sm }]}
placeholder={t('assignment_name') + ' (' + t('cancel').toLowerCase() + ')'}
placeholderTextColor={colors.textTertiary}
value={assignmentName}
onChangeText={setAssignmentName}
/>
</View>

<TouchableOpacity
style={[styles.addBtn, (!gradeValue.trim() || saving) && styles.addBtnDisabled]}
onPress={handleAddGrade}
disabled={!gradeValue.trim() || saving}
>
<Ionicons name="checkmark-circle" size={18} color={colors.textInverse} />
<Text style={styles.addBtnText}>
{saving ? t('loading') : t('add_grade')}
</Text>
</TouchableOpacity>
</Card>
)}

{/* Students list */}
<Text style={styles.sectionLabel}>{t('students')}</Text>
{filteredStudents.length === 0 ? (
<EmptyState message={t('no_results')} />
) : (
filteredStudents.map((s: any) => (
<StudentGradeCard
key={s._id}
student={s}
classId={classId}
isSelected={selectedStudent === s._id}
onSelect={() => handleSelectStudent(s._id)}
editingGradeId={editingGradeId}
editValue={editValue}
onStartEdit={(gradeId: string, currentValue: string) => {
setEditingGradeId(gradeId);
setEditValue(currentValue);
}}
onEditChange={setEditValue}
onSaveEdit={handleEditGrade}
onCancelEdit={() => { setEditingGradeId(null); setEditValue(''); }}
/>
))
)}
</ScrollView>
</SafeAreaView>
);
}

function StudentGradeCard({
student,
classId,
isSelected,
onSelect,
editingGradeId,
editValue,
onStartEdit,
onEditChange,
onSaveEdit,
onCancelEdit,
}: any) {
const styles = getStyles();
const grades = useQuery(api.grades.getStudentGrades, {
studentId: student._id,
classId,
});

const gradeCount = grades?.length || 0;
const avgScore = useMemo(() => {
if (!grades || grades.length === 0) return null;
const nums = grades.map((g: any) => {
const n = parseFloat(g.value);
return isNaN(n) ? null : n;
}).filter((n: number | null) => n !== null) as number[];
if (nums.length === 0) return null;
return (nums.reduce((a: number, b: number) => a + b, 0) / nums.length).toFixed(1);
}, [grades]);

return (
<TouchableOpacity
style={[styles.studentCard, isSelected && styles.studentCardActive]}
onPress={onSelect}
activeOpacity={0.7}
>
{/* Student header row */}
<View style={styles.studentHeader}>
<View style={{ flex: 1 }}>
<Text style={styles.studentName}>
{student.name || student.email || student.phone || 'Unknown'}
</Text>
<View style={styles.studentMeta}>
{gradeCount > 0 && (
<Text style={styles.metaText}>
{gradeCount} {t('grades').toLowerCase()}
</Text>
)}
{avgScore && (
<View style={styles.avgBadge}>
<Text style={styles.avgText}>{avgScore}</Text>
</View>
)}
{gradeCount === 0 && (
<Text style={styles.metaTextEmpty}>{t('no_data')}</Text>
)}
</View>
</View>
<View style={[styles.selectIndicator, isSelected && styles.selectIndicatorActive]}>
{isSelected && <Ionicons name="pencil" size={12} color={colors.textInverse} />}
</View>
</View>

{/* Grade chips */}
{grades && grades.length > 0 && (
<View style={styles.gradesRow}>
{grades.slice(0, 12).map((g: any) => {
const isEditing = editingGradeId === g._id;
return (
<View key={g._id}>
{isEditing ? (
<View style={styles.editChipWrap}>
<TextInput
style={styles.editChipInput}
value={editValue}
onChangeText={onEditChange}
autoFocus
autoCapitalize="characters"
onSubmitEditing={onSaveEdit}
/>
<TouchableOpacity onPress={onSaveEdit} style={styles.editChipAction}>
<Ionicons name="checkmark" size={14} color={colors.success} />
</TouchableOpacity>
<TouchableOpacity onPress={onCancelEdit} style={styles.editChipAction}>
<Ionicons name="close" size={14} color={colors.error} />
</TouchableOpacity>
</View>
) : (
<TouchableOpacity
style={[styles.gradeChip, g.isEdited && styles.gradeChipEdited]}
onLongPress={() => onStartEdit(g._id, g.value)}
>
<Text style={styles.gradeChipValue}>{g.value}</Text>
{g.assignmentName ? (
<Text style={styles.gradeChipLabel} numberOfLines={1}>
{g.assignmentName}
</Text>
) : null}
</TouchableOpacity>
)}
</View>
);
})}
{grades.length > 12 && (
<View style={styles.moreChip}>
<Text style={styles.moreChipText}>+{grades.length - 12}</Text>
</View>
)}
</View>
)}
</TouchableOpacity>
);
}

function getStyles() { return StyleSheet.create({
container: { flex: 1, backgroundColor: colors.background },
header: {
flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
},
backBtn: { fontSize: fontSize.md, color: colors.primary, fontWeight: fontWeight.medium },
headerTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },
className: {
fontSize: fontSize.md, color: colors.textSecondary,
paddingHorizontal: spacing.lg, marginBottom: spacing.sm,
},
content: { padding: spacing.lg, paddingBottom: 100 },

// Leaderboard
leaderboardSection: {
backgroundColor: colors.secondaryLight,
borderRadius: borderRadius.lg,
padding: spacing.lg,
marginBottom: spacing.lg,
},
leaderboardList: {},
leaderRow: {
flexDirection: 'row', alignItems: 'center',
paddingVertical: spacing.sm,
},
rankBadge: {
width: 26, height: 26, borderRadius: 13,
backgroundColor: colors.surfaceSecondary,
justifyContent: 'center', alignItems: 'center',
},
rankText: {
fontSize: fontSize.xs, fontWeight: fontWeight.bold,
color: colors.textSecondary,
},
leaderName: {
flex: 1, fontSize: fontSize.sm, fontWeight: fontWeight.medium,
color: colors.text, marginLeft: spacing.sm,
},
leaderStats: { alignItems: 'flex-end' },
leaderAvg: {
fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.primary,
},
leaderCount: {
fontSize: fontSize.xs, color: colors.textTertiary,
},

// Search
searchBox: {
flexDirection: 'row', alignItems: 'center',
backgroundColor: colors.surface, borderRadius: borderRadius.md,
paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
marginBottom: spacing.md, borderWidth: 1, borderColor: colors.borderLight,
},
searchInput: {
flex: 1, fontSize: fontSize.sm, color: colors.text,
marginLeft: spacing.sm, paddingVertical: 2,
},

// Section
sectionLabel: {
fontSize: fontSize.md, fontWeight: fontWeight.semibold,
color: colors.text, marginBottom: spacing.md,
},
emptyText: {
fontSize: fontSize.sm, color: colors.textTertiary, textAlign: 'center',
paddingVertical: spacing.md,
},

// Grade input
inputSectionTitle: {
fontSize: fontSize.sm, fontWeight: fontWeight.semibold,
color: colors.primary, marginBottom: spacing.md,
},
presetRow: {
flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs,
marginBottom: spacing.md,
},
presetChip: {
paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
borderRadius: borderRadius.full, backgroundColor: colors.surfaceSecondary,
borderWidth: 1.5, borderColor: 'transparent',
},
presetChipActive: {
backgroundColor: colors.primaryLight, borderColor: colors.primary,
},
presetText: {
fontSize: fontSize.sm, fontWeight: fontWeight.semibold,
color: colors.textSecondary,
},
presetTextActive: { color: colors.primary },
inputRow: {
flexDirection: 'row', marginBottom: spacing.md,
},
gradeInput: {
backgroundColor: colors.surfaceSecondary, borderRadius: borderRadius.md,
paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
fontSize: fontSize.sm, color: colors.text,
borderWidth: 1, borderColor: colors.borderLight,
},
addBtn: {
flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
backgroundColor: colors.primary, borderRadius: borderRadius.md,
paddingVertical: spacing.md, gap: spacing.xs,
},
addBtnDisabled: { opacity: 0.5 },
addBtnText: {
fontSize: fontSize.sm, fontWeight: fontWeight.semibold,
color: colors.textInverse,
},

// Student card
studentCard: {
backgroundColor: colors.surface, borderRadius: borderRadius.lg,
padding: spacing.md, marginBottom: spacing.sm,
borderWidth: 1.5, borderColor: colors.borderLight,
},
studentCardActive: {
borderColor: colors.primary, backgroundColor: colors.primaryLight,
},
studentHeader: {
flexDirection: 'row', alignItems: 'center',
},
studentName: {
fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.text,
},
studentMeta: {
flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 2,
},
metaText: { fontSize: fontSize.xs, color: colors.textSecondary },
metaTextEmpty: { fontSize: fontSize.xs, color: colors.textTertiary, fontStyle: 'italic' },
avgBadge: {
backgroundColor: colors.primaryLight, borderRadius: borderRadius.sm,
paddingHorizontal: spacing.xs, paddingVertical: 1,
},
avgText: {
fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.primary,
},
selectIndicator: {
width: 24, height: 24, borderRadius: 12,
borderWidth: 2, borderColor: colors.border,
justifyContent: 'center', alignItems: 'center',
},
selectIndicatorActive: {
borderColor: colors.primary, backgroundColor: colors.primary,
},

// Grade chips
gradesRow: {
flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs,
marginTop: spacing.sm, paddingTop: spacing.sm,
borderTopWidth: 1, borderTopColor: colors.borderLight,
},
gradeChip: {
backgroundColor: colors.surfaceSecondary, borderRadius: borderRadius.sm,
paddingHorizontal: spacing.sm, paddingVertical: spacing.xs,
minWidth: 32, alignItems: 'center',
},
gradeChipEdited: {
borderWidth: 1, borderColor: colors.warning, borderStyle: 'dashed',
},
gradeChipValue: {
fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.text,
},
gradeChipLabel: {
fontSize: 9, color: colors.textTertiary, maxWidth: 60,
},
moreChip: {
backgroundColor: colors.surfaceSecondary, borderRadius: borderRadius.sm,
paddingHorizontal: spacing.sm, paddingVertical: spacing.xs,
justifyContent: 'center',
},
moreChipText: {
fontSize: fontSize.xs, color: colors.textTertiary, fontWeight: fontWeight.medium,
},

// Inline edit
editChipWrap: {
flexDirection: 'row', alignItems: 'center',
backgroundColor: colors.surface, borderRadius: borderRadius.sm,
borderWidth: 1.5, borderColor: colors.primary,
paddingLeft: spacing.xs,
},
editChipInput: {
fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.text,
width: 36, paddingVertical: 2, textAlign: 'center',
},
editChipAction: { padding: 4 },
}); }
