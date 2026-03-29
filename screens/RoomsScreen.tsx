import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../lib/theme';
import { t } from '../lib/i18n';
import { Card, Button, Input, ScreenLoader, EmptyState, Badge } from '../components/UI';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ScreenHeader } from '../components/ScreenHeader';

export default function RoomsScreen({ navigation }: any) {
const styles = getStyles();

const me = useQuery(api.users.me);
const rooms = useQuery(api.rooms.list);
const createRoom = useMutation(api.rooms.create);
const updateRoom = useMutation(api.rooms.update);

const [showModal, setShowModal] = useState(false);
const [editingRoom, setEditingRoom] = useState<any>(null);
const [roomName, setRoomName] = useState('');
const [capacity, setCapacity] = useState('');
const [saving, setSaving] = useState(false);
const [error, setError] = useState('');

if (rooms === undefined || me === undefined) return <ScreenLoader />;

if (me && me.role !== 'admin' && me.role !== 'super_admin') {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>{t('no_permission')}</Text>
    </View>
  );
}

const openCreate = () => {
setEditingRoom(null);
setRoomName('');
setCapacity('');
setError('');
setShowModal(true);
};

const openEdit = (room: any) => {
setEditingRoom(room);
setRoomName(room.name);
setCapacity(room.capacity ? String(room.capacity) : '');
setError('');
setShowModal(true);
};

const handleSave = async () => {
if (!roomName.trim()) { setError(t('error') + ': ' + t('name')); return; }
setSaving(true);
setError('');
try {
if (editingRoom) {
await updateRoom({
roomId: editingRoom._id,
name: roomName.trim(),
capacity: capacity ? parseInt(capacity) : undefined,
});
} else {
await createRoom({
name: roomName.trim(),
capacity: capacity ? parseInt(capacity) : undefined,
});
}
setShowModal(false);
setRoomName('');
setCapacity('');
setEditingRoom(null);
} catch (err: any) {
setError(err?.message || t('error_generic'));
} finally {
setSaving(false);
}
};

const handleToggle = async (room: any) => {
try {
await updateRoom({ roomId: room._id, isActive: !room.isActive });
} catch (err: any) {
setError(err?.message || t('error_generic'));
}
};

return (
<SafeAreaView style={styles.container} edges={['top']}>
<ScreenHeader
  title={t('manage_rooms')}
  onBack={() => navigation.goBack()}
  rightAction={
    <TouchableOpacity onPress={openCreate} accessibilityLabel={t('add_room')} accessibilityRole="button">
      <Ionicons name="add-circle-outline" size={26} color={colors.primary} />
    </TouchableOpacity>
  }
/>

<ScrollView contentContainerStyle={styles.content}>
{rooms.length === 0 ? (
<EmptyState message={t('no_data')} icon="🏫" />
) : (
rooms.map((room: any) => (
<RoomCard
key={room._id}
room={room}
onEdit={() => openEdit(room)}
onToggle={() => handleToggle(room)}
/>
))
)}
</ScrollView>

{/* Add / Edit Room Modal */}
<Modal visible={showModal} animationType="slide" transparent>
<KeyboardAvoidingView
behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
style={styles.modalOverlay}
>
<View style={styles.modal}>
<Text style={styles.modalTitle}>
{editingRoom ? t('edit_room') : t('add_room')}
</Text>

{error ? <Text style={styles.errorText}>{error}</Text> : null}

<Input
label={t('room')}
value={roomName}
onChangeText={setRoomName}
placeholder={t('room') + ' A'}
/>
<Input
label={t('capacity')}
value={capacity}
onChangeText={setCapacity}
placeholder="20"
keyboardType="numeric"
/>

<View style={styles.modalActions}>
<Button
title={t('cancel')}
onPress={() => { setShowModal(false); setError(''); }}
variant="ghost"
style={{ flex: 1, marginRight: spacing.sm }}
/>
<Button
title={t('save')}
onPress={handleSave}
loading={saving}
style={{ flex: 1 }}
/>
</View>
</View>
</KeyboardAvoidingView>
</Modal>
</SafeAreaView>
);
}

function RoomCard({ room, onEdit, onToggle }: { room: any; onEdit: () => void; onToggle: () => void }) {
const styles = getStyles();
const schedule = useQuery(api.rooms.getRoomSchedule, { roomId: room._id });

return (
<Card style={{ marginBottom: spacing.md, opacity: room.isActive ? 1 : 0.6 }}>
<View style={styles.roomHeader}>
<View style={{ flex: 1 }}>
<Text style={styles.roomName}>{room.name}</Text>
{room.capacity != null && (
<Text style={styles.roomInfo}>{t('capacity')}: {room.capacity}</Text>
)}
</View>
<Badge
text={room.isActive ? t('active') : t('inactive')}
color={room.isActive ? colors.success : colors.textTertiary}
/>
</View>

{/* Schedule overview */}
{schedule && schedule.length > 0 && (
<View style={styles.scheduleSection}>
<Text style={styles.scheduleSectionTitle}>
{t('schedule')} ({schedule.length})
</Text>
{schedule.map((slot: any) => (
<View key={slot._id} style={styles.slotRow}>
<Text style={styles.slotDay}>{t(slot.dayOfWeek).slice(0, 3)}</Text>
<Text style={styles.slotTime}>{slot.startTime} - {slot.endTime}</Text>
<Text style={styles.slotClass} numberOfLines={1}>{slot.className || '—'}</Text>
</View>
))}
</View>
)}

{schedule && schedule.length === 0 && (
<Text style={styles.noSchedule}>{t('no_data')}</Text>
)}

<View style={styles.roomActions}>
<TouchableOpacity style={styles.editBtn} onPress={onEdit}>
<Text style={styles.editBtnText} numberOfLines={1}>{t('edit')}</Text>
</TouchableOpacity>
<TouchableOpacity style={styles.toggleBtn} onPress={onToggle}>
<Text style={[styles.toggleBtnText, !room.isActive && { color: colors.success }]}>
{room.isActive ? t('deactivate') : t('activate')}
</Text>
</TouchableOpacity>
</View>
</Card>
);
}

function getStyles() { return StyleSheet.create({
container: { flex: 1, backgroundColor: colors.background },
header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
backBtn: { fontSize: fontSize.md, color: colors.primary, fontWeight: fontWeight.medium },
headerTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },
addBtn: { fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.semibold },
content: { padding: spacing.lg, paddingBottom: 100 },
errorText: { color: colors.error, fontSize: fontSize.sm, marginBottom: spacing.md, backgroundColor: colors.errorLight, padding: spacing.md, borderRadius: borderRadius.md },
roomHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.sm },
roomName: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.text },
roomInfo: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
scheduleSection: { marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.borderLight },
scheduleSectionTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textSecondary, marginBottom: spacing.xs },
slotRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
slotDay: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.primary, width: 40 },
slotTime: { fontSize: fontSize.sm, color: colors.text, width: 100 },
slotClass: { fontSize: fontSize.sm, color: colors.textSecondary, flex: 1 },
noSchedule: { fontSize: fontSize.sm, color: colors.textTertiary, fontStyle: 'italic', marginTop: spacing.xs },
roomActions: { flexDirection: 'row', marginTop: spacing.md, gap: spacing.md },
editBtn: { flex: 1, paddingVertical: spacing.sm, borderRadius: borderRadius.md, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
editBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.primary },
toggleBtn: { flex: 1, paddingVertical: spacing.sm, borderRadius: borderRadius.md, backgroundColor: colors.surfaceSecondary, alignItems: 'center' },
toggleBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.error },
modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-start', paddingTop: 60 },
modal: { backgroundColor: colors.surface, borderBottomLeftRadius: borderRadius.xl, borderBottomRightRadius: borderRadius.xl, padding: spacing.xl },
modalTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text, marginBottom: spacing.lg },
modalActions: { flexDirection: 'row', marginTop: spacing.lg },
}); }