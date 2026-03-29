import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../lib/theme';
import { t } from '../lib/i18n';
import { ScreenLoader, EmptyState } from '../components/UI';
import { formatTimestamp } from '../lib/utils';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ScreenHeader } from '../components/ScreenHeader';

const PAGE_SIZE = 20;

export default function AuditLogsScreen({ navigation }: any) {
const styles = getStyles();

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
<View style={styles.chipContainer} accessibilityRole="radiogroup" accessibilityLabel={t('filter')}>
<TouchableOpacity
style={[styles.chip, !actionFilter && styles.chipActive]}
onPress={() => setActionFilter('')}
accessibilityRole="radio"
accessibilityState={{ checked: !actionFilter }}
>
<Text style={[styles.chipText, !actionFilter && styles.chipTextActive]}>{t('all')}</Text>
</TouchableOpacity>
{actionTypes.map((action: string) => (
<TouchableOpacity
key={action}
style={[styles.chip, actionFilter === action && styles.chipActive]}
onPress={() => setActionFilter(action)}
accessibilityRole="radio"
accessibilityState={{ checked: actionFilter === action }}
>
<Text style={[styles.chipText, actionFilter === action && styles.chipTextActive]}>
{action.replace(/_/g, ' ')}
</Text>
</TouchableOpacity>
))}
</View>
</ScrollView>

<ScrollView contentContainerStyle={styles.content}>
{filtered.length === 0 ? (
<EmptyState message={t('no_data')} icon="📋" />
) : (
filtered.slice(0, visibleCount).map((log: any, index: number) => (
<View key={log._id} style={styles.logCard}>
<View style={styles.logHeader}>
<View style={styles.actionBadge}>
<Text style={styles.actionBadgeText}>{log.action.replace(/_/g, ' ')}</Text>
</View>
<Text style={styles.logTime}>{formatTimestamp(log.timestamp)}</Text>
</View>
<View style={styles.logBody}>
<View style={styles.logMetaRow}>
<Ionicons name="person-outline" size={14} color={colors.textTertiary} />
<Text style={styles.logMeta}>{log.userName || 'System'}</Text>
<View style={styles.metaDot} />
<Ionicons name="folder-outline" size={14} color={colors.textTertiary} />
<Text style={styles.logMeta}>{log.entityType}</Text>
</View>
{log.details && (
<View style={styles.detailsBox}>
<Text style={styles.logDetails} numberOfLines={2}>{log.details}</Text>
</View>
)}
</View>
</View>
))
)}
{filtered.length > visibleCount && (
<TouchableOpacity style={styles.loadMoreBtn} onPress={() => setVisibleCount(prev => prev + PAGE_SIZE)}>
<Text style={styles.loadMoreText}>{t('load_more')}</Text>
</TouchableOpacity>
)}
</ScrollView>
</SafeAreaView>
);
}

function getStyles() { return StyleSheet.create({
container: { flex: 1, backgroundColor: colors.background },
searchBox: { paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
searchInput: { backgroundColor: colors.surface, borderRadius: borderRadius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: fontSize.sm, color: colors.text, borderWidth: 1, borderColor: colors.border },
filterScroll: { maxHeight: 52, marginBottom: spacing.md },
filterContent: { paddingHorizontal: spacing.lg, alignItems: 'center' as const },
chipContainer: { flexDirection: 'row', backgroundColor: colors.surfaceSecondary, borderRadius: borderRadius.lg, padding: 3, gap: 2 },
chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.md, alignItems: 'center' },
chipActive: { backgroundColor: colors.surface, elevation: 1, boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.08)' },
chipText: { fontSize: fontSize.sm, color: colors.textTertiary, fontWeight: fontWeight.medium },
chipTextActive: { fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.semibold },
content: { padding: spacing.lg, paddingBottom: 100 },
logCard: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, marginBottom: spacing.md, overflow: 'hidden', boxShadow: '0px 1px 4px rgba(0, 0, 0, 0.06)', elevation: 1 },
logHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
actionBadge: { backgroundColor: colors.primaryLight, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.sm },
actionBadgeText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.primary, textTransform: 'capitalize' },
logBody: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
logMetaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
metaDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: colors.textTertiary, marginHorizontal: spacing.xs },
logMeta: { fontSize: fontSize.sm, color: colors.textSecondary },
detailsBox: { backgroundColor: colors.surfaceSecondary, borderRadius: borderRadius.sm, padding: spacing.sm, marginTop: spacing.sm },
logDetails: { fontSize: fontSize.xs, color: colors.textTertiary, fontFamily: 'monospace' },
logTime: { fontSize: fontSize.xs, color: colors.textTertiary },
loadMoreBtn: { paddingVertical: spacing.md, alignItems: 'center', backgroundColor: colors.surface, borderRadius: borderRadius.md, marginTop: spacing.sm },
loadMoreText: { color: colors.primary, fontWeight: fontWeight.semibold, fontSize: fontSize.sm },
}); }

