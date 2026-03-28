import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../lib/theme';
import { t } from '../lib/i18n';
import { Card, ScreenLoader, EmptyState } from '../components/UI';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../components/ScreenHeader';

const PAGE_SIZE = 20;

export default function AuditLogsScreen({ navigation }: any) {
const me = useQuery(api.users.me);
const logs = useQuery(api.auditLogs.list, {});
const [searchText, setSearchText] = useState('');
const [actionFilter, setActionFilter] = useState('');
const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

const actionTypes = useMemo(() => {
if (!logs) return [];
const types = new Set<string>();
logs.forEach((log: any) => types.add(log.action));
return Array.from(types).sort();
}, [logs]);

const filtered = useMemo(() => {
if (!logs) return [];
let result = [...logs];
if (searchText) {
const q = searchText.toLowerCase();
result = result.filter((log: any) =>
(log.action || '').toLowerCase().includes(q) ||
(log.userName || '').toLowerCase().includes(q) ||
(log.details || '').toLowerCase().includes(q) ||
(log.entityType || '').toLowerCase().includes(q)
);
}
if (actionFilter) {
result = result.filter((log: any) => log.action === actionFilter);
}
return result;
}, [logs, searchText, actionFilter]);

if (logs === undefined || me === undefined) return <ScreenLoader />;

if (me && me.role !== 'admin' && me.role !== 'super_admin') {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>{t('no_permission')}</Text>
    </View>
  );
}

return (
<SafeAreaView style={styles.container} edges={['top']}>
<ScreenHeader title={t('audit_logs')} onBack={() => navigation.goBack()} />

<View style={styles.searchBox}>
<TextInput
value={searchText}
onChangeText={setSearchText}
placeholder={t('search')}
placeholderTextColor={colors.textTertiary}
style={styles.searchInput}
/>
</View>

<ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContent}>
<TouchableOpacity
style={[styles.chip, !actionFilter && styles.chipActive]}
onPress={() => setActionFilter('')}
>
<Text style={[styles.chipText, !actionFilter && styles.chipTextActive]}>{t('all')}</Text>
</TouchableOpacity>
{actionTypes.map((action: string) => (
<TouchableOpacity
key={action}
style={[styles.chip, actionFilter === action && styles.chipActive]}
onPress={() => setActionFilter(action)}
>
<Text style={[styles.chipText, actionFilter === action && styles.chipTextActive]}>
{action.replace(/_/g, ' ')}
</Text>
</TouchableOpacity>
))}
</ScrollView>

<ScrollView contentContainerStyle={styles.content}>
{filtered.length === 0 ? (
<EmptyState message={t('no_data')} />
) : (
filtered.slice(0, visibleCount).map((log: any) => (
<View key={log._id}>
<Card>
<View style={styles.logRow}>
<View style={styles.logDot} />
<View style={{ flex: 1 }}>
<Text style={styles.logAction}>{log.action.replace(/_/g, ' ')}</Text>
<Text style={styles.logMeta}>
{log.userName || 'System'} • {log.entityType}
</Text>
{log.details && (
<Text style={styles.logDetails} numberOfLines={2}>{log.details}</Text>
)}
<Text style={styles.logTime}>{new Date(log.timestamp).toLocaleString()}</Text>
</View>
</View>
</Card>
</View>
))
)}
{filtered.length > visibleCount && (
<TouchableOpacity
  style={{ padding: 12, alignItems: 'center' }}
  onPress={() => setVisibleCount(prev => prev + PAGE_SIZE)}
>
  <Text style={{ color: colors.primary, fontWeight: '600' }}>{t('load_more')}</Text>
</TouchableOpacity>
)}
</ScrollView>
</SafeAreaView>
);
}

const styles = StyleSheet.create({
container: { flex: 1, backgroundColor: colors.background },
header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
backBtn: { fontSize: fontSize.md, color: colors.primary, fontWeight: fontWeight.medium },
headerTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },
searchBox: { paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
searchInput: { backgroundColor: colors.surface, borderRadius: borderRadius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: fontSize.sm, color: colors.text, borderWidth: 1, borderColor: colors.border },
filterScroll: { maxHeight: 44, marginBottom: spacing.md },
filterContent: { paddingHorizontal: spacing.lg, gap: spacing.sm },
chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.full, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
chipText: { fontSize: fontSize.sm, color: colors.text },
chipTextActive: { fontSize: fontSize.sm, color: colors.textInverse, fontWeight: fontWeight.semibold },
content: { padding: spacing.lg, paddingBottom: 100 },
logRow: { flexDirection: 'row' },
logDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginTop: 6, marginRight: spacing.md },
logAction: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text, textTransform: 'capitalize' },
logMeta: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
logDetails: { fontSize: fontSize.xs, color: colors.textTertiary, marginTop: 4, fontFamily: 'monospace' },
logTime: { fontSize: fontSize.xs, color: colors.textTertiary, marginTop: 4 },
});

