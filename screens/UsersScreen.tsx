import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Switch, KeyboardAvoidingView, Platform } from 'react-native';
import { showAlert } from '../lib/utils';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../convex/_generated/api';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../lib/theme';
import { t } from '../lib/i18n';
import { Button, ScreenLoader, EmptyState, SectionTitle, PhoneInput, getFullPhone } from '../components/UI';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ScreenHeader } from '../components/ScreenHeader';
import * as Clipboard from 'expo-clipboard';

const ROLE_LEVEL: Record<string, number> = {
super_admin: 4,
admin: 3,
teacher: 2,
student_parent: 1,
};

const ROLE_SHORT: Record<string, string> = {
super_admin: 'SA',
admin: 'A',
teacher: 'T',
student_parent: 'S',
};

const ROLE_LABELS: Record<string, string> = {
super_admin: 'Super Admin',
admin: 'Admin',
teacher: 'Teacher',
student_parent: 'Student/Parent',
};

const ROLE_COLOR: Record<string, string> = {
super_admin: colors.error,
admin: colors.warning,
teacher: colors.primary,
student_parent: colors.info || colors.textSecondary,
};

const ALL_ROLES = [
{ label: 'Super Admin', value: 'super_admin' },
{ label: 'Admin', value: 'admin' },
{ label: 'Teacher', value: 'teacher' },
{ label: 'Student/Parent', value: 'student_parent' },
] as const;

export default function UsersScreen({ navigation }: any) {
const me = useQuery(api.users.me);
const [filterRole, setFilterRole] = useState<string>('');
const [searchText, setSearchText] = useState('');
const [sortBy, setSortBy] = useState<'name' | 'date' | 'role'>('date');
const [showFilters, setShowFilters] = useState(false);
const [showArchived, setShowArchived] = useState(false);

const users = useQuery(api.users.listUsers, {
role: filterRole || undefined,
search: searchText || undefined,
sortBy,
showArchived,
});
const setUserRole = useMutation(api.users.setUserRole);
const toggleActive = useMutation(api.users.toggleUserActive);
const pendingEnrollments = useQuery(api.classes.listEnrollments, { status: 'pending' as any });
const approveEnrollment = useMutation(api.classes.approveEnrollment);
const rejectEnrollment = useMutation(api.classes.rejectEnrollment);
const adminResetPassword = useAction(api.adminAuthHelpers.adminResetPassword);
const adminUpdateName = useMutation(api.users.adminUpdateUserName);
const archiveUser = useMutation(api.users.archiveUser);
const adminCreateUser = useAction(api.adminAuthHelpers.adminCreateUser);

// Edit modal state
const [editUser, setEditUser] = useState<any>(null);
const [editName, setEditName] = useState('');
const [editRole, setEditRole] = useState('');
const [editActive, setEditActive] = useState(true);
const [editArchived, setEditArchived] = useState(false);
const [editPassword, setEditPassword] = useState('');
const [saving, setSaving] = useState(false);

// Create modal state
const [showCreateModal, setShowCreateModal] = useState(false);
const [createLoginType, setCreateLoginType] = useState<'email' | 'phone'>('phone');
const [createForm, setCreateForm] = useState({ name: '', email: '', phone: '', password: '', role: 'student_parent' });
const [creating, setCreating] = useState(false);

if (users === undefined || me === undefined) return <ScreenLoader />;

if (me && me.role !== 'admin' && me.role !== 'super_admin') {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>{t('no_permission')}</Text>
    </View>
  );
}

const myLevel = ROLE_LEVEL[me?.role || ''] || 0;

const assignableRoles = ALL_ROLES.filter((r) => {
const rLevel = ROLE_LEVEL[r.value] || 0;
if (me?.role === 'super_admin') return rLevel !== 4;
return rLevel < myLevel;
});

const openEditModal = (user: any) => {
const canManage = me?.role === 'super_admin' || (ROLE_LEVEL[user.role || ''] || 0) < myLevel;
const isSelf = user._id === me?._id;
if (!canManage || isSelf || user.role === 'super_admin') return;

setEditUser(user);
setEditName(user.name || '');
setEditRole(user.role || 'student_parent');
setEditActive(user.isActive !== false);
setEditArchived(!!user.isArchived);
setEditPassword('');
};

const handleSave = async () => {
if (!editUser) return;
setSaving(true);
try {
// Update name if changed
if (editName.trim() && editName.trim() !== (editUser.name || '')) {
await adminUpdateName({ targetUserId: editUser._id, name: editName.trim() });
}
// Update role if changed
if (editRole !== editUser.role) {
await setUserRole({ targetUserId: editUser._id, role: editRole as any });
}
// Toggle active if changed
const wasActive = editUser.isActive !== false;
if (editActive !== wasActive) {
await toggleActive({ targetUserId: editUser._id });
}
// Toggle archive if changed
if (editArchived !== !!editUser.isArchived) {
await archiveUser({ targetUserId: editUser._id });
}
// Reset password if provided
if (editPassword.length > 0) {
if (editPassword.length < 6) {
showAlert(t('error'), t('password_min_length'));
setSaving(false);
return;
}
await adminResetPassword({ targetUserId: editUser._id, newPassword: editPassword });
}
setEditUser(null);
} catch (error: any) {
showAlert(t('error'), error?.message || t('error_generic'));
}
setSaving(false);
};

const handleApprove = async (id: string) => {
setSaving(true);
try { await approveEnrollment({ enrollmentId: id as any }); }
catch (error: any) { showAlert(t('error'), error?.message || t('error_generic')); }
finally { setSaving(false); }
};

const handleReject = async (id: string) => {
setSaving(true);
try { await rejectEnrollment({ enrollmentId: id as any }); }
catch (error: any) { showAlert(t('error'), error?.message || t('error_generic')); }
finally { setSaving(false); }
};

const handleCopyEmail = (email: string) => {
try { Clipboard.setStringAsync(email); } catch {}
showAlert(email, '', [{ text: 'OK' }]);
};

const handleCreateUser = async () => {
if (!createForm.name || !createForm.password) {
showAlert(t('error'), t('fill_required_fields'));
return;
}
const fullPhone = getFullPhone(createForm.phone);
if (!createForm.email && !fullPhone) {
showAlert(t('error'), t('email_or_phone_required'));
return;
}
if (createForm.phone && !fullPhone) {
showAlert(t('error'), t('invalid_phone'));
return;
}
if (createForm.password.length < 6) {
showAlert(t('error'), t('password_min_length'));
return;
}
try {
setCreating(true);
await adminCreateUser({
  name: createForm.name,
  email: createForm.email || undefined,
  phone: fullPhone || undefined,
  password: createForm.password,
  role: createForm.role,
});
showAlert(t('success'), t('user_created'));
setShowCreateModal(false);
setCreateForm({ name: '', email: '', phone: '', password: '', role: 'student_parent' });
} catch (error: any) {
showAlert(t('error'), error?.message || t('error_generic'));
}
setCreating(false);
};

return (
<SafeAreaView style={styles.container} edges={['top']}>
<ScreenHeader
title={t('manage_users')}
onBack={() => navigation.goBack()}
rightAction={
<View style={{ flexDirection: 'row', gap: spacing.sm }}>
<TouchableOpacity onPress={() => setShowCreateModal(true)}>
<Ionicons name="person-add-outline" size={22} color={colors.primary} />
</TouchableOpacity>
<TouchableOpacity onPress={() => setShowFilters(!showFilters)}>
<Ionicons name={showFilters ? 'filter' : 'filter-outline'} size={22} color={colors.primary} />
</TouchableOpacity>
</View>
}
/>

{showFilters && (
<View style={styles.filterSection}>
<View style={styles.searchInput}>
<Ionicons name="search-outline" size={16} color={colors.textTertiary} />
<TextInput
value={searchText}
onChangeText={setSearchText}
placeholder={t('search')}
placeholderTextColor={colors.textTertiary}
style={styles.searchInputText}
/>
{searchText.length > 0 && (
<TouchableOpacity onPress={() => setSearchText('')}>
<Ionicons name="close-circle" size={16} color={colors.textTertiary} />
</TouchableOpacity>
)}
</View>

<View style={styles.filterRow}>
<TouchableOpacity
style={[styles.filterChip, filterRole === '' && styles.filterChipActive]}
onPress={() => setFilterRole('')}
>
<Text style={[styles.filterChipText, filterRole === '' && styles.filterChipTextActive]}>{t('all')}</Text>
</TouchableOpacity>
{ALL_ROLES.map((role) => (
<TouchableOpacity
key={role.value}
style={[styles.filterChip, filterRole === role.value && styles.filterChipActive]}
onPress={() => setFilterRole(role.value)}
>
<Text style={[styles.filterChipText, filterRole === role.value && styles.filterChipTextActive]}>
{ROLE_SHORT[role.value]}
</Text>
</TouchableOpacity>
))}
</View>

<View style={styles.filterRow}>
{(['name', 'date', 'role'] as const).map((s) => (
<TouchableOpacity
key={s}
style={[styles.filterChip, sortBy === s && styles.filterChipActive]}
onPress={() => setSortBy(s)}
>
<Text style={[styles.filterChipText, sortBy === s && styles.filterChipTextActive]}>
{s === 'name' ? t('name') : s === 'date' ? 'Date' : t('role')}
</Text>
</TouchableOpacity>
))}
</View>
</View>
)}

<View style={styles.tabRow}>
<TouchableOpacity
style={[styles.tab, !showArchived && styles.tabActive]}
onPress={() => setShowArchived(false)}
>
<Text style={[styles.tabText, !showArchived && styles.tabTextActive]}>
{t('active')} ({users.length})
</Text>
</TouchableOpacity>
<TouchableOpacity
style={[styles.tab, showArchived && styles.tabActive]}
onPress={() => setShowArchived(true)}
>
<Ionicons name="archive-outline" size={14} color={showArchived ? colors.surface : colors.textSecondary} style={{ marginRight: 4 }} />
<Text style={[styles.tabText, showArchived && styles.tabTextActive]}>{t('archived')}</Text>
</TouchableOpacity>
</View>

<ScrollView contentContainerStyle={styles.content}>
{!showArchived && pendingEnrollments && pendingEnrollments.length > 0 && (
<>
<SectionTitle title={t('pending_enrollments')} />
{pendingEnrollments.map((e: any) => (
<View key={e._id} style={styles.enrollCard}>
<View style={{ flex: 1 }}>
<Text style={styles.enrollName}>{e.studentName || 'Unknown'}</Text>
<Text style={styles.enrollClass}>{e.className}</Text>
</View>
<View style={styles.enrollActions}>
<TouchableOpacity style={styles.approveBtn} onPress={() => handleApprove(e._id)} disabled={saving}>
<Ionicons name="checkmark" size={18} color={colors.success} />
</TouchableOpacity>
<TouchableOpacity style={styles.rejectBtn} onPress={() => handleReject(e._id)} disabled={saving}>
<Ionicons name="close" size={18} color={colors.error} />
</TouchableOpacity>
</View>
</View>
))}
</>
)}

{users.length === 0 ? (
<EmptyState message={t('no_results')} />
) : (
users.map((user: any) => {
const canManage = me?.role === 'super_admin' || (ROLE_LEVEL[user.role || ''] || 0) < myLevel;
const isSelf = user._id === me?._id;
const canEdit = canManage && !isSelf && user.role !== 'super_admin';
const roleColor = ROLE_COLOR[user.role] || colors.textSecondary;

return (
<TouchableOpacity
key={user._id}
style={[styles.row, user.isArchived && styles.rowArchived]}
activeOpacity={canEdit ? 0.6 : 1}
onPress={() => { if (canEdit) openEditModal(user); }}
>
{/* Role badge */}
<View style={[styles.roleBadge, { backgroundColor: roleColor + '18' }]}>
<Text style={[styles.roleShort, { color: roleColor }]}>
{ROLE_SHORT[user.role] || '?'}
</Text>
</View>

{/* Name + Email */}
<View style={styles.nameCol}>
<Text style={styles.userName} numberOfLines={1}>{user.name || 'No name'}</Text>
<Text style={styles.userEmail} numberOfLines={1}>{user.email || user.phone || ''}</Text>
</View>

{/* Status dot */}
<View style={[styles.statusDot, { backgroundColor: user.isActive ? colors.success : colors.error }]} />

{/* Chevron if editable */}
{canEdit && (
<Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
)}
</TouchableOpacity>
);
})
)}
</ScrollView>

{/* ─── Edit User Modal ─── */}
<Modal visible={!!editUser} animationType="slide" transparent>
<KeyboardAvoidingView
behavior={Platform.OS === 'ios' ? 'padding' : undefined}
style={styles.modalOverlay}
>
<View style={styles.modalSheet}>
{/* Header */}
<View style={styles.modalHeader}>
<TouchableOpacity onPress={() => setEditUser(null)}>
<Text style={styles.modalCancel}>{t('cancel')}</Text>
</TouchableOpacity>
<Text style={styles.modalTitle}>{t('edit_user') || 'Edit User'}</Text>
<TouchableOpacity onPress={handleSave} disabled={saving}>
<Text style={[styles.modalSave, saving && { opacity: 0.4 }]}>{t('save')}</Text>
</TouchableOpacity>
</View>

<ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
{/* Name */}
<Text style={styles.fieldLabel}>{t('name')}</Text>
<TextInput
style={styles.fieldInput}
value={editName}
onChangeText={setEditName}
placeholder={t('name')}
placeholderTextColor={colors.textTertiary}
autoCapitalize="words"
/>

{/* Email/Phone (read-only) */}
<Text style={styles.fieldLabel}>{t('email_or_phone')}</Text>
<TouchableOpacity
style={[styles.fieldInput, styles.fieldReadonly]}
onPress={() => {
  const val = editUser?.email || editUser?.phone;
  if (val) handleCopyEmail(val);
}}
>
<Text style={styles.fieldReadonlyText}>{editUser?.email || editUser?.phone || ''}</Text>
<Ionicons name="copy-outline" size={14} color={colors.textTertiary} />
</TouchableOpacity>

{/* Role */}
<Text style={styles.fieldLabel}>{t('role')}</Text>
<View style={styles.roleChipsRow}>
{assignableRoles.map((r) => {
const rc = ROLE_COLOR[r.value] || colors.textSecondary;
const selected = editRole === r.value;
return (
<TouchableOpacity
key={r.value}
style={[styles.roleChip, selected && { backgroundColor: rc + '20', borderColor: rc }]}
onPress={() => setEditRole(r.value)}
>
<Text style={[styles.roleChipText, selected && { color: rc, fontWeight: fontWeight.semibold }]}>
{r.label}
</Text>
</TouchableOpacity>
);
})}
</View>

{/* Status toggle */}
<View style={styles.toggleRow}>
<View style={{ flex: 1 }}>
<Text style={styles.toggleLabel}>{t('active')}</Text>
<Text style={styles.toggleHint}>{editActive ? t('active') : t('inactive')}</Text>
</View>
<Switch
value={editActive}
onValueChange={setEditActive}
trackColor={{ false: colors.border, true: colors.success + '80' }}
thumbColor={editActive ? colors.success : colors.textTertiary}
/>
</View>

{/* Archive toggle */}
<View style={styles.toggleRow}>
<View style={{ flex: 1 }}>
<Text style={styles.toggleLabel}>{t('archive')}</Text>
<Text style={styles.toggleHint}>
{editArchived ? t('archived') : t('active')}
</Text>
</View>
<Switch
value={editArchived}
onValueChange={setEditArchived}
trackColor={{ false: colors.border, true: colors.error + '80' }}
thumbColor={editArchived ? colors.error : colors.textTertiary}
/>
</View>

{/* Password reset */}
{me?.role === 'super_admin' && (
<>
<Text style={styles.fieldLabel}>{t('new_password')}</Text>
<TextInput
style={styles.fieldInput}
value={editPassword}
onChangeText={setEditPassword}
placeholder={t('password_min_length')}
placeholderTextColor={colors.textTertiary}
secureTextEntry
autoComplete="off"
/>
</>
)}
</ScrollView>
</View>
</KeyboardAvoidingView>
</Modal>

{/* ─── Create User Modal ─── */}
<Modal visible={showCreateModal} animationType="slide" transparent>
<KeyboardAvoidingView
behavior={Platform.OS === 'ios' ? 'padding' : undefined}
style={styles.modalOverlay}
>
<View style={styles.modalSheet}>
<View style={styles.modalHeader}>
<TouchableOpacity onPress={() => setShowCreateModal(false)}>
<Text style={styles.modalCancel}>{t('cancel')}</Text>
</TouchableOpacity>
<Text style={styles.modalTitle}>{t('add_user')}</Text>
<TouchableOpacity onPress={handleCreateUser} disabled={creating}>
<Text style={[styles.modalSave, creating && { opacity: 0.4 }]}>{t('save')}</Text>
</TouchableOpacity>
</View>

<ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
<Text style={styles.fieldLabel}>{t('name')}</Text>
<TextInput
style={styles.fieldInput}
value={createForm.name}
onChangeText={(v: string) => setCreateForm((p: typeof createForm) => ({ ...p, name: v }))}
placeholder={t('name')}
placeholderTextColor={colors.textTertiary}
autoCapitalize="words"
/>

{/* Email / Phone toggle */}
<View style={styles.idToggleRow}>
<TouchableOpacity
style={[styles.idToggleBtn, createLoginType === 'phone' && styles.idToggleBtnActive]}
onPress={() => { setCreateLoginType('phone'); setCreateForm((p: typeof createForm) => ({ ...p, email: '' })); }}
>
<Text style={[styles.idToggleText, createLoginType === 'phone' && styles.idToggleTextActive]}>{t('phone')}</Text>
</TouchableOpacity>
<TouchableOpacity
style={[styles.idToggleBtn, createLoginType === 'email' && styles.idToggleBtnActive]}
onPress={() => { setCreateLoginType('email'); setCreateForm((p: typeof createForm) => ({ ...p, phone: '' })); }}
>
<Text style={[styles.idToggleText, createLoginType === 'email' && styles.idToggleTextActive]}>{t('email')}</Text>
</TouchableOpacity>
</View>

{createLoginType === 'email' ? (
<>
<Text style={styles.fieldLabel}>{t('email')}</Text>
<TextInput
style={styles.fieldInput}
value={createForm.email}
onChangeText={(v: string) => setCreateForm((p: typeof createForm) => ({ ...p, email: v }))}
placeholder="email@example.com"
placeholderTextColor={colors.textTertiary}
keyboardType="email-address"
autoCapitalize="none"
/>
</>
) : (
<PhoneInput
label={t('phone')}
value={createForm.phone}
onChangeText={(v: string) => setCreateForm((p: typeof createForm) => ({ ...p, phone: v }))}
/>
)}

<Text style={styles.fieldLabel}>{t('password')}</Text>
<TextInput
style={styles.fieldInput}
value={createForm.password}
onChangeText={(v: string) => setCreateForm((p: typeof createForm) => ({ ...p, password: v }))}
placeholder={t('password')}
placeholderTextColor={colors.textTertiary}
secureTextEntry
/>

<Text style={styles.fieldLabel}>{t('role')}</Text>
<View style={styles.roleChipsRow}>
{assignableRoles.map((r) => {
const rc = ROLE_COLOR[r.value] || colors.textSecondary;
const selected = createForm.role === r.value;
return (
<TouchableOpacity
key={r.value}
style={[styles.roleChip, selected && { backgroundColor: rc + '20', borderColor: rc }]}
onPress={() => setCreateForm((p: typeof createForm) => ({ ...p, role: r.value }))}
>
<Text style={[styles.roleChipText, selected && { color: rc, fontWeight: fontWeight.semibold }]}>
{r.label}
</Text>
</TouchableOpacity>
);
})}
</View>
</ScrollView>
</View>
</KeyboardAvoidingView>
</Modal>
</SafeAreaView>
);
}

const styles = StyleSheet.create({
container: { flex: 1, backgroundColor: colors.background },

// Filters
filterSection: {
paddingHorizontal: spacing.lg,
paddingVertical: spacing.md,
backgroundColor: colors.surfaceSecondary,
borderBottomWidth: 1,
borderBottomColor: colors.border,
gap: spacing.sm,
},
searchInput: {
flexDirection: 'row',
alignItems: 'center',
backgroundColor: colors.surface,
borderRadius: borderRadius.md,
borderWidth: 1,
borderColor: colors.border,
paddingHorizontal: spacing.md,
gap: spacing.sm,
},
searchInputText: {
flex: 1,
fontSize: fontSize.sm,
color: colors.text,
paddingVertical: spacing.sm,
},
filterRow: {
flexDirection: 'row',
flexWrap: 'wrap',
gap: spacing.sm,
},
filterChip: {
paddingHorizontal: spacing.md,
paddingVertical: spacing.xs,
borderRadius: borderRadius.full,
backgroundColor: colors.surface,
borderWidth: 1,
borderColor: colors.border,
},
filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
filterChipText: { fontSize: fontSize.sm, color: colors.text },
filterChipTextActive: { color: colors.surface, fontWeight: fontWeight.semibold },

// Tabs
tabRow: {
flexDirection: 'row',
paddingHorizontal: spacing.lg,
paddingVertical: spacing.sm,
gap: spacing.sm,
},
tab: {
flexDirection: 'row',
alignItems: 'center',
paddingHorizontal: spacing.lg,
paddingVertical: spacing.sm,
borderRadius: borderRadius.full,
backgroundColor: colors.surfaceSecondary,
},
tabActive: { backgroundColor: colors.primary },
tabText: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: fontWeight.medium },
tabTextActive: { color: colors.surface, fontWeight: fontWeight.semibold },

// Content
content: { paddingHorizontal: spacing.md, paddingBottom: 100 },

// Enrollment cards
enrollCard: {
flexDirection: 'row',
alignItems: 'center',
backgroundColor: colors.surface,
borderRadius: borderRadius.md,
padding: spacing.md,
marginBottom: spacing.sm,
},
enrollName: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text },
enrollClass: { fontSize: fontSize.sm, color: colors.textSecondary },
enrollActions: { flexDirection: 'row', gap: spacing.sm },
approveBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.successLight, alignItems: 'center', justifyContent: 'center' },
rejectBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.errorLight, alignItems: 'center', justifyContent: 'center' },

// User row
row: {
flexDirection: 'row',
alignItems: 'center',
paddingVertical: spacing.md,
paddingHorizontal: spacing.md,
borderBottomWidth: StyleSheet.hairlineWidth,
borderBottomColor: colors.border,
backgroundColor: colors.surface,
gap: spacing.md,
},
rowArchived: { opacity: 0.5 },
roleBadge: {
width: 36,
height: 36,
borderRadius: 8,
alignItems: 'center',
justifyContent: 'center',
},
roleShort: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
nameCol: { flex: 1, minWidth: 0 },
userName: { fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.text },
userEmail: { fontSize: fontSize.xs, color: colors.textTertiary, marginTop: 1 },
statusDot: { width: 8, height: 8, borderRadius: 4 },

// Modal
modalOverlay: {
flex: 1,
backgroundColor: 'rgba(0,0,0,0.4)',
justifyContent: 'flex-end',
},
modalSheet: {
backgroundColor: colors.surface,
borderTopLeftRadius: borderRadius.xl,
borderTopRightRadius: borderRadius.xl,
paddingHorizontal: spacing.xl,
maxHeight: '85%',
},
modalHeader: {
flexDirection: 'row',
justifyContent: 'space-between',
alignItems: 'center',
paddingVertical: spacing.lg,
borderBottomWidth: StyleSheet.hairlineWidth,
borderBottomColor: colors.border,
marginBottom: spacing.md,
},
modalCancel: { fontSize: fontSize.md, color: colors.error },
modalTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },
modalSave: { fontSize: fontSize.md, color: colors.primary, fontWeight: fontWeight.semibold },

// Fields
fieldLabel: {
fontSize: fontSize.sm,
fontWeight: fontWeight.semibold,
color: colors.textSecondary,
marginTop: spacing.lg,
marginBottom: spacing.xs,
},
fieldInput: {
fontSize: fontSize.md,
color: colors.text,
backgroundColor: colors.surfaceSecondary,
borderRadius: borderRadius.md,
paddingHorizontal: spacing.md,
paddingVertical: spacing.md,
borderWidth: 1,
borderColor: colors.border,
},
fieldReadonly: {
flexDirection: 'row',
alignItems: 'center',
justifyContent: 'space-between',
},
fieldReadonlyText: {
fontSize: fontSize.md,
color: colors.textSecondary,
flex: 1,
},

// Role chips
roleChipsRow: {
flexDirection: 'row',
flexWrap: 'wrap',
gap: spacing.sm,
},
roleChip: {
paddingHorizontal: spacing.md,
paddingVertical: spacing.sm,
borderRadius: borderRadius.full,
backgroundColor: colors.surfaceSecondary,
borderWidth: 1,
borderColor: colors.border,
},
roleChipText: {
fontSize: fontSize.sm,
color: colors.text,
},

// Toggle rows
toggleRow: {
flexDirection: 'row',
alignItems: 'center',
marginTop: spacing.lg,
paddingVertical: spacing.sm,
borderBottomWidth: StyleSheet.hairlineWidth,
borderBottomColor: colors.border,
},
toggleLabel: {
fontSize: fontSize.md,
fontWeight: fontWeight.medium,
color: colors.text,
},
toggleHint: {
fontSize: fontSize.xs,
color: colors.textTertiary,
marginTop: 1,
},
idToggleRow: {
flexDirection: 'row',
backgroundColor: colors.surfaceSecondary,
borderRadius: borderRadius.md,
padding: 3,
marginBottom: spacing.md,
},
idToggleBtn: {
flex: 1,
paddingVertical: spacing.sm,
alignItems: 'center' as const,
borderRadius: borderRadius.sm,
},
idToggleBtnActive: {
backgroundColor: colors.primary,
},
idToggleText: {
fontSize: fontSize.sm,
fontWeight: fontWeight.semibold,
color: colors.textSecondary,
},
idToggleTextActive: {
color: colors.textInverse,
},
});

// ... existing code ...