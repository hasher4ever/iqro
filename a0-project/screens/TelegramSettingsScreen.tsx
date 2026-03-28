import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../convex/_generated/api';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../lib/theme';
import { t } from '../lib/i18n';
import { Card, SectionTitle, EmptyState, Badge, ScreenLoader } from '../components/UI';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../components/ScreenHeader';

export default function TelegramSettingsScreen({ navigation }: any) {
const me = useQuery(api.users.me);
const config = useQuery(api.telegram.getTelegramConfig);
const linkedCount = useQuery(api.telegram.getLinkedUsersCount);
const logs = useQuery(api.telegram.getNotificationLogs, { limit: 30 });
const disableTelegram = useMutation(api.telegram.disableTelegram);
const setupBot = useAction(api.telegramActions.setupBotPublic);

const [botToken, setBotToken] = useState('');
const [settingUp, setSettingUp] = useState(false);

if (config === undefined || me === undefined) return <ScreenLoader />;

if (me && me.role !== 'admin' && me.role !== 'super_admin') {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>{t('no_permission')}</Text>
    </View>
  );
}

if (config === null) {
return (
<SafeAreaView style={styles.container} edges={['top']}>
<ScreenHeader title={t('telegram_integration')} onBack={() => navigation.goBack()} />
<View style={styles.centered}>
<Text style={styles.noPermission}>{t('no_permission')}</Text>
</View>
</SafeAreaView>
);
}

const handleSetup = async () => {
if (!botToken.trim()) {
Alert.alert(t('error'), t('telegram_bot_token_placeholder'));
return;
}

setSettingUp(true);
try {
const result = await setupBot({ botToken: botToken.trim(), siteUrl: 'https://grateful-fly-863.convex.site' });
if (result.success) {
Alert.alert(t('success'), t('telegram_setup_success'));
setBotToken('');
} else {
Alert.alert(t('error'), result.error || t('telegram_setup_error'));
}
} catch (error: any) {
Alert.alert(t('error'), error?.message || t('telegram_setup_error'));
} finally {
setSettingUp(false);
}
};

const handleDisable = async () => {
Alert.alert(t('telegram_disable'), t('confirm') + '?', [
{ text: t('cancel'), style: 'cancel' },
{
text: t('confirm'),
style: 'destructive',
onPress: async () => {
try {
await disableTelegram();
} catch (error: any) {
Alert.alert(t('error'), error?.message || t('error_generic'));
}
},
},
]);
};

const statusColor = config.telegramEnabled ? colors.success : colors.textTertiary;
const statusText = config.telegramEnabled ? t('telegram_connected') : t('telegram_not_connected');

return (
<SafeAreaView style={styles.container} edges={['top']}>
<ScreenHeader title={t('telegram_integration')} onBack={() => navigation.goBack()} />
<ScrollView contentContainerStyle={styles.content}>
{/* Status Card */}
<Card>
<View style={styles.statusRow}>
<View style={[styles.statusDot, { backgroundColor: statusColor }]} />
<Text style={[styles.statusText, { color: statusColor }]}>{statusText}</Text>
</View>
{config.telegramEnabled && config.telegramBotUsername && (
<View style={styles.botInfoRow}>
<Ionicons name="paper-plane" size={16} color={colors.primary} />
<Text style={styles.botUsername}>@{config.telegramBotUsername}</Text>
</View>
)}
{config.telegramEnabled && (
<View style={styles.statsRow}>
<View style={styles.statItem}>
<Text style={styles.statValueText}>{linkedCount ?? 0}</Text>
<Text style={styles.statLabel}>{t('telegram_linked_users')}</Text>
</View>
</View>
)}
</Card>

{/* Setup Section */}
{!config.telegramEnabled && (
<>
<SectionTitle title={t('telegram_setup')} />
<Card>
<Text style={styles.setupHint}>
1. Create a bot via @BotFather in Telegram{'\n'}
2. Copy the bot token{'\n'}
3. Paste it below and press Setup
</Text>
<TextInput
style={styles.tokenInput}
value={botToken}
onChangeText={setBotToken}
placeholder={t('telegram_bot_token_placeholder')}
placeholderTextColor={colors.textTertiary}
autoCapitalize="none"
autoCorrect={false}
/>
<TouchableOpacity
style={[styles.setupBtn, settingUp && styles.setupBtnDisabled]}
onPress={handleSetup}
disabled={settingUp}
>
{settingUp ? (
<ActivityIndicator color={colors.textInverse} size="small" />
) : (
<Text style={styles.setupBtnText}>{t('telegram_setup')}</Text>
)}
</TouchableOpacity>
</Card>
</>
)}

{config.telegramEnabled && (
<TouchableOpacity style={styles.disableBtn} onPress={handleDisable}>
<Ionicons name="close-circle-outline" size={18} color={colors.error} />
<Text style={styles.disableBtnText}>{t('telegram_disable')}</Text>
</TouchableOpacity>
)}

{/* Notification Logs */}
{config.telegramEnabled && (
<>
<SectionTitle title={t('telegram_notification_logs')} />
{logs && logs.length > 0 ? (
<Card>
{logs.map((log, idx) => (
<View key={log._id} style={[styles.logItem, idx < logs.length - 1 && styles.logBorder]}>
<View style={styles.logHeader}>
<Text style={styles.logUser}>{log.userName || 'Unknown'}</Text>
<Badge
text={log.status === 'sent' ? t('telegram_sent') : log.status === 'failed' ? t('telegram_failed') : t('telegram_pending')}
color={log.status === 'sent' ? colors.success : log.status === 'failed' ? colors.error : colors.warning}
/>
</View>
<Text style={styles.logEvent}>{log.eventType}</Text>
{log.lastError && <Text style={styles.logError}>{log.lastError}</Text>}
<Text style={styles.logTime}>
{new Date(log._creationTime).toLocaleString()} • {log.attempts} attempt{log.attempts !== 1 ? 's' : ''}
</Text>
</View>
))}
</Card>
) : (
<EmptyState message={t('telegram_no_logs')} />
)}
</>
)}
</ScrollView>
</SafeAreaView>
);
}

const styles = StyleSheet.create({
container: { flex: 1, backgroundColor: colors.background },
content: { padding: spacing.lg, paddingBottom: 100 },
centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
noPermission: { fontSize: fontSize.md, color: colors.textSecondary },
statusRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: spacing.sm },
statusText: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
botInfoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.md },
botUsername: { fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.medium },
statsRow: { flexDirection: 'row', marginTop: spacing.sm },
statItem: { alignItems: 'center', flex: 1 },
statValueText: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.primary },
statLabel: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
setupHint: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 22, marginBottom: spacing.md },
tokenInput: {
backgroundColor: colors.surfaceSecondary,
borderRadius: borderRadius.md,
paddingHorizontal: spacing.lg,
paddingVertical: spacing.md,
fontSize: fontSize.md,
color: colors.text,
borderWidth: 1,
borderColor: colors.border,
marginBottom: spacing.md,
},
setupBtn: {
backgroundColor: colors.primary,
borderRadius: borderRadius.md,
paddingVertical: spacing.md,
alignItems: 'center',
},
setupBtnDisabled: { opacity: 0.6 },
setupBtnText: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textInverse },
disableBtn: {
flexDirection: 'row',
alignItems: 'center',
justifyContent: 'center',
gap: spacing.xs,
paddingVertical: spacing.md,
marginTop: spacing.sm,
},
disableBtnText: { fontSize: fontSize.sm, color: colors.error, fontWeight: fontWeight.medium },
logItem: { paddingVertical: spacing.sm },
logBorder: { borderBottomWidth: 1, borderBottomColor: colors.borderLight },
logHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
logUser: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.text },
logEvent: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
logError: { fontSize: fontSize.xs, color: colors.error, marginTop: 2 },
logTime: { fontSize: fontSize.xs, color: colors.textTertiary, marginTop: 4 },
});

// ... existing code ...