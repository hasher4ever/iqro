import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../lib/theme';
import { t } from '../lib/i18n';
import { ScreenLoader, EmptyState } from '../components/UI';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function GradesTabScreen({ navigation }: any) {
const me = useQuery(api.users.me);
const allClasses = useQuery(api.classes.list);
const teacherClasses = useQuery(api.classes.getByTeacher, {});
const enrollments = useQuery(api.classes.listEnrollments, { status: 'approved' as any });

const [searchText, setSearchText] = useState('');

const myClasses = useMemo(() => {
if (!me) return [];
if (me.role === 'super_admin' || me.role === 'admin') {
return (allClasses || []).filter((c: any) => c.isActive);
}
if (me.role === 'teacher') {
return teacherClasses || [];
}
// student_parent
const myEnrollments = (enrollments || []).filter((e: any) => e.studentId === me._id);
return myEnrollments.map((e: any) => ({
_id: e.classId,
name: e.className || 'Unknown',
subjectName: '',
}));
}, [me, allClasses, teacherClasses, enrollments]);

const filtered = useMemo(() => {
if (!searchText.trim()) return myClasses;
const q = searchText.toLowerCase();
return myClasses.filter((c: any) =>
(c.name || '').toLowerCase().includes(q) ||
(c.subjectName || '').toLowerCase().includes(q)
);
}, [myClasses, searchText]);

if (me === undefined) return <ScreenLoader />;

return (
<SafeAreaView style={styles.container} edges={['top']}>
<View style={styles.headerRow}>
<Text style={styles.title}>{t('grades')}</Text>
<TouchableOpacity
style={styles.profileBtn}
onPress={() => navigation.navigate('Profile')}
>
<Ionicons name="person-outline" size={20} color={colors.text} />
</TouchableOpacity>
</View>

{myClasses.length > 3 && (
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

<ScrollView contentContainerStyle={styles.content}>
{filtered.length === 0 ? (
<EmptyState message={t('no_data')} />
) : (
filtered.map((cls: any) => (
<TouchableOpacity
key={cls._id}
style={styles.classCard}
activeOpacity={0.7}
onPress={() => navigation.navigate('GradesScreen', {
classId: cls._id,
className: cls.name,
})}
>
<View style={styles.classIcon}>
<Ionicons name="school-outline" size={20} color={colors.primary} />
</View>
<View style={{ flex: 1 }}>
<Text style={styles.className}>{cls.name}</Text>
{cls.subjectName ? (
<Text style={styles.classSub}>{cls.subjectName}</Text>
) : null}
</View>
<Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
</TouchableOpacity>
))
)}
</ScrollView>
</SafeAreaView>
);
}

const styles = StyleSheet.create({
container: { flex: 1, backgroundColor: colors.background },
headerRow: {
flexDirection: 'row',
alignItems: 'center',
justifyContent: 'space-between',
paddingHorizontal: spacing.lg,
paddingTop: spacing.md,
paddingBottom: spacing.sm,
},
title: {
fontSize: fontSize.xxl,
fontWeight: fontWeight.bold,
color: colors.text,
},
profileBtn: {
width: 36,
height: 36,
borderRadius: 18,
backgroundColor: colors.surfaceSecondary,
alignItems: 'center',
justifyContent: 'center',
},
searchBox: {
flexDirection: 'row',
alignItems: 'center',
backgroundColor: colors.surface,
borderRadius: borderRadius.md,
paddingHorizontal: spacing.md,
paddingVertical: spacing.sm,
marginHorizontal: spacing.lg,
marginBottom: spacing.sm,
borderWidth: 1,
borderColor: colors.borderLight,
},
searchInput: {
flex: 1,
fontSize: fontSize.sm,
color: colors.text,
marginLeft: spacing.sm,
paddingVertical: 2,
},
content: { padding: spacing.lg, paddingTop: spacing.sm, paddingBottom: 100 },
classCard: {
flexDirection: 'row',
alignItems: 'center',
backgroundColor: colors.surface,
borderRadius: borderRadius.lg,
padding: spacing.md,
marginBottom: spacing.sm,
borderWidth: 1,
borderColor: colors.borderLight,
},
classIcon: {
width: 40,
height: 40,
borderRadius: 20,
backgroundColor: colors.primaryLight,
alignItems: 'center',
justifyContent: 'center',
marginRight: spacing.md,
},
className: {
fontSize: fontSize.md,
fontWeight: fontWeight.semibold,
color: colors.text,
},
classSub: {
fontSize: fontSize.sm,
color: colors.textSecondary,
marginTop: 1,
},
});
