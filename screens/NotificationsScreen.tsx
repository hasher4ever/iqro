import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../lib/theme';
import { t } from '../lib/i18n';
import { ScreenHeader } from '../components/ScreenHeader';
import { ScreenLoader } from '../components/UI';
import Ionicons from '@expo/vector-icons/Ionicons';

const PAGE_SIZE = 20;

const NOTIFICATION_CONFIG: Record<string, { icon: string; color: string }> = {
attendance_marked: { icon: 'checkmark-circle', color: colors.primary },
attendance_marked_batch: { icon: 'people', color: colors.primary },
grade_added: { icon: 'star', color: '#F59E0B' },
grade_edited: { icon: 'create', color: '#F59E0B' },
payment_recorded: { icon: 'cash', color: colors.success },
payment_confirmed: { icon: 'checkmark-done', color: colors.success },
payment_reversed: { icon: 'arrow-undo', color: colors.error },
class_created: { icon: 'book', color: colors.info },
class_cancelled: { icon: 'close-circle', color: colors.error },
student_enrolled: { icon: 'person-add', color: colors.primary },
student_unenrolled: { icon: 'person-remove', color: colors.error },
enrollment_approved: { icon: 'checkmark-circle', color: colors.success },
enrollment_rejected: { icon: 'close-circle', color: colors.error },
teacher_payment: { icon: 'wallet', color: colors.success },
role_changed: { icon: 'shield', color: colors.info },
user_status_changed: { icon: 'toggle', color: '#F59E0B' },
user_archived: { icon: 'archive', color: colors.textSecondary },
user_created: { icon: 'person-add', color: colors.primary },
password_reset: { icon: 'key', color: '#F59E0B' },
};

function getNotificationText(type: string, data: any): { title: string; body: string } {
const d = data || {};
switch (type) {
case 'attendance_marked':
return { title: t('attendance'), body: `${d.className}: ${t(d.status) || d.status}${d.chargeAmount ? ` — ${Number(d.chargeAmount).toLocaleString()} UZS` : ''}` };
case 'attendance_marked_batch':
return { title: t('attendance'), body: `${d.className}: ${d.count} ${t('students').toLowerCase()}` };
case 'grade_added':
return { title: t('grades'), body: `${d.className}: ${d.grade}${d.assignmentName ? ` (${d.assignmentName})` : ''}` };
case 'grade_edited':
return { title: t('grades'), body: `${d.className}: ${d.oldGrade} → ${d.newGrade}` };
case 'payment_recorded':
return { title: t('payment'), body: `${d.studentName}: ${Number(d.amount).toLocaleString()} UZS` };
case 'payment_confirmed':
return { title: t('confirmed'), body: `${d.studentName}: ${Number(d.amount).toLocaleString()} UZS` };
case 'payment_reversed':
return { title: t('reversed') || 'Reversed', body: `${d.studentName}: ${Number(d.amount).toLocaleString()} UZS` };
case 'class_created':
return { title: t('courses'), body: `${d.className}` };
case 'class_cancelled':
return { title: t('class_cancelled'), body: `${d.className} — ${d.date}${d.reason ? `: ${d.reason}` : ''}` };
case 'student_enrolled':
return { title: t('add_student'), body: `${d.studentName} → ${d.className}` };
case 'student_unenrolled':
return { title: t('remove_student'), body: `${d.studentName} ← ${d.className}` };
case 'enrollment_approved':
return { title: t('approved'), body: `${d.studentName} → ${d.className}` };
case 'enrollment_rejected':
return { title: t('rejected'), body: `${d.studentName} ✕ ${d.className}` };
case 'teacher_payment':
return { title: t('fin_pay_teacher'), body: `${d.teacherName}: ${Number(d.amount).toLocaleString()} UZS` };
case 'role_changed':
return { title: t('set_role'), body: `${d.targetName} → ${d.newRole}` };
case 'user_status_changed':
return { title: d.isActive ? t('activate') : t('deactivate'), body: d.targetName || '' };
case 'user_archived':
return { title: d.isArchived ? t('archive') : t('restore'), body: d.targetName || '' };
case 'user_created':
return { title: t('add_user'), body: `${d.email || d.phone || ''} (${d.role})` };
case 'password_reset':
return { title: t('reset_password'), body: d.targetName || '' };
default:
return { title: type, body: JSON.stringify(d) };
}
}

function timeAgo(timestamp: number): string {
const diff = Date.now() - timestamp;
const mins = Math.floor(diff / 60000);
if (mins < 1) return t('just_now') || 'Just now';
if (mins < 60) return `${mins}m`;
const hours = Math.floor(mins / 60);
if (hours < 24) return `${hours}h`;
const days = Math.floor(hours / 24);
return `${days}d`;
}

export default function NotificationsScreen({ navigation }: any) {
const notifications = useQuery(api.notifications.list, { limit: 100 });
const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
const markAsRead = useMutation(api.notifications.markAsRead);
const markAllAsRead = useMutation(api.notifications.markAllAsRead);
const unreadCount = useQuery(api.notifications.getUnreadCount);

if (notifications === undefined) return <ScreenLoader />;

const handlePress = async (id: any) => {
await markAsRead({ notificationId: id });
};

const renderItem = ({ item }: any) => {
const config = NOTIFICATION_CONFIG[item.type] || { icon: 'notifications', color: colors.textSecondary };
const { title, body } = getNotificationText(item.type, item.data);

return (
<TouchableOpacity
style={[styles.item, !item.isRead && styles.itemUnread]}
onPress={() => handlePress(item._id)}
activeOpacity={0.7}
>
<View style={[styles.iconCircle, { backgroundColor: config.color + '20' }]}>
<Ionicons name={config.icon as any} size={20} color={config.color} />
</View>
<View style={styles.itemContent}>
<View style={styles.itemHeader}>
<Text style={[styles.itemTitle, !item.isRead && styles.itemTitleUnread]}>{title}</Text>
<Text style={styles.itemTime}>{timeAgo(item._creationTime)}</Text>
</View>
<Text style={styles.itemBody} numberOfLines={2}>{body}</Text>
{item.actorName && (
<Text style={styles.itemActor}>{item.actorName}</Text>
)}
</View>
{!item.isRead && <View style={styles.unreadDot} />}
</TouchableOpacity>
);
};

return (
<SafeAreaView style={styles.container}>
<ScreenHeader
title={t('notifications') || 'Notifications'}
onBack={() => navigation.goBack()}
rightAction={
unreadCount && unreadCount > 0 ? (
<TouchableOpacity onPress={() => markAllAsRead()}>
<Ionicons name="checkmark-done" size={24} color={colors.primary} />
</TouchableOpacity>
) : undefined
}
/>
<FlatList
data={(notifications || []).slice(0, visibleCount)}
renderItem={renderItem}
keyExtractor={(item) => item._id}
contentContainerStyle={styles.list}
ListFooterComponent={
(notifications || []).length > visibleCount ? (
<TouchableOpacity
  style={{ padding: 12, alignItems: 'center' }}
  onPress={() => setVisibleCount(prev => prev + PAGE_SIZE)}
>
  <Text style={{ color: colors.primary, fontWeight: '600' }}>{t('load_more')}</Text>
</TouchableOpacity>
) : null
}
ListEmptyComponent={
<View style={styles.empty}>
<Ionicons name="notifications-off-outline" size={48} color={colors.textTertiary} />
<Text style={styles.emptyText}>{t('no_notifications') || 'No notifications'}</Text>
</View>
}
/>
</SafeAreaView>
);
}

const styles = StyleSheet.create({
container: { flex: 1, backgroundColor: colors.background },
list: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
item: {
flexDirection: 'row',
alignItems: 'center',
paddingVertical: spacing.md,
paddingHorizontal: spacing.sm,
borderBottomWidth: 1,
borderBottomColor: colors.border,
},
itemUnread: { backgroundColor: colors.primaryLight },
iconCircle: {
width: 40,
height: 40,
borderRadius: 20,
alignItems: 'center',
justifyContent: 'center',
marginRight: spacing.sm,
},
itemContent: { flex: 1 },
itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
itemTitle: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: fontWeight.medium },
itemTitleUnread: { color: colors.text, fontWeight: fontWeight.semibold },
itemTime: { fontSize: fontSize.xs, color: colors.textTertiary },
itemBody: { fontSize: fontSize.md, color: colors.text, marginTop: 2 },
itemActor: { fontSize: fontSize.xs, color: colors.textTertiary, marginTop: 2 },
unreadDot: {
width: 8,
height: 8,
borderRadius: 4,
backgroundColor: colors.primary,
marginLeft: spacing.sm,
},
empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 100 },
emptyText: { fontSize: fontSize.md, color: colors.textTertiary, marginTop: spacing.sm },
});
