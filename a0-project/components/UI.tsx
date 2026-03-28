import React from 'react';
import {
View,
Text,
TouchableOpacity,
TextInput,
StyleSheet,
ActivityIndicator,
ViewStyle,
TextStyle,
} from 'react-native';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../lib/theme';

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
return <View style={[styles.card, style]}>{children}</View>;
}

export function Button({
title,
onPress,
variant = 'primary',
size = 'md',
loading = false,
disabled = false,
style,
}: {
title: string;
onPress: () => void;
variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
size?: 'sm' | 'md' | 'lg';
loading?: boolean;
disabled?: boolean;
style?: ViewStyle;
}) {
const bg = {
primary: colors.primary,
secondary: colors.surfaceSecondary,
danger: colors.error,
ghost: 'transparent',
outline: 'transparent',
}[variant];

const textColor = {
primary: colors.textInverse,
secondary: colors.text,
danger: colors.textInverse,
ghost: colors.primary,
outline: colors.primary,
}[variant];

const height = { sm: 36, md: 44, lg: 52 }[size];
const textSize = { sm: fontSize.sm, md: fontSize.md, lg: fontSize.lg }[size];

return (
<TouchableOpacity
style={[
styles.button,
{
backgroundColor: disabled ? colors.border : bg,
height,
borderWidth: variant === 'outline' ? 1.5 : 0,
borderColor: variant === 'outline' ? colors.primary : undefined,
},
style,
]}
onPress={onPress}
disabled={disabled || loading}
activeOpacity={0.7}
>
{loading ? (
<ActivityIndicator color={textColor} size="small" />
) : (
<Text style={[styles.buttonText, { color: textColor, fontSize: textSize }]}>
{title}
</Text>
)}
</TouchableOpacity>
);
}

export function Input({
label,
value,
onChangeText,
placeholder,
secureTextEntry,
keyboardType,
autoCapitalize,
multiline,
style,
}: {
label?: string;
value: string;
onChangeText: (text: string) => void;
placeholder?: string;
secureTextEntry?: boolean;
keyboardType?: 'default' | 'email-address' | 'numeric';
autoCapitalize?: 'none' | 'sentences' | 'words';
multiline?: boolean;
style?: ViewStyle;
}) {
return (
<View style={[{ marginBottom: spacing.md }, style]}>
{label && <Text style={styles.inputLabel}>{label}</Text>}
<TextInput
style={[styles.input, multiline && { height: 80, textAlignVertical: 'top' }]}
value={value}
onChangeText={onChangeText}
placeholder={placeholder}
placeholderTextColor={colors.textTertiary}
secureTextEntry={secureTextEntry}
keyboardType={keyboardType}
autoCapitalize={autoCapitalize}
multiline={multiline}
/>
</View>
);
}

export function Badge({
text,
color = colors.primary,
bgColor,
}: {
text: string;
color?: string;
bgColor?: string;
}) {
return (
<View style={[styles.badge, { backgroundColor: bgColor || color + '20' }]}>
<Text style={[styles.badgeText, { color }]}>{text}</Text>
</View>
);
}

export function SectionTitle({ title, action }: { title: string; action?: React.ReactNode }) {
return (
<View style={styles.sectionHeader}>
<Text style={styles.sectionTitle}>{title}</Text>
{action}
</View>
);
}

export function EmptyState({ message, icon }: { message: string; icon?: string }) {
return (
<View style={styles.emptyState}>
{icon && <Text style={styles.emptyIcon}>{icon}</Text>}
<Text style={styles.emptyText}>{message}</Text>
</View>
);
}

export function StatusBadge({ status }: { status: string }) {
const statusConfig: Record<string, { color: string; bg: string }> = {
present: { color: colors.present, bg: colors.successLight },
absent: { color: colors.absent, bg: colors.errorLight },
late: { color: colors.late, bg: colors.warningLight },
excused: { color: colors.excused, bg: colors.surfaceSecondary },
pending: { color: colors.pending, bg: colors.warningLight },
confirmed: { color: colors.confirmed, bg: colors.successLight },
reversed: { color: colors.reversed, bg: colors.errorLight },
approved: { color: colors.confirmed, bg: colors.successLight },
rejected: { color: colors.error, bg: colors.errorLight },
payment: { color: colors.success, bg: colors.successLight },
reversal: { color: colors.error, bg: colors.errorLight },
active: { color: colors.success, bg: colors.successLight },
inactive: { color: colors.textTertiary, bg: colors.surfaceSecondary },
};

const config = statusConfig[status] || { color: colors.textSecondary, bg: colors.surfaceSecondary };

return <Badge text={status.charAt(0).toUpperCase() + status.slice(1)} color={config.color} bgColor={config.bg} />;
}

export function ListItem({
title,
subtitle,
right,
onPress,
borderBottom = true,
}: {
title: string;
subtitle?: string;
right?: React.ReactNode;
onPress?: () => void;
borderBottom?: boolean;
}) {
const Container = onPress ? TouchableOpacity : View;
return (
<Container
style={[styles.listItem, borderBottom && { borderBottomWidth: 1, borderBottomColor: colors.borderLight }]}
onPress={onPress}
activeOpacity={0.7}
>
<View style={{ flex: 1 }}>
<Text style={styles.listItemTitle}>{title}</Text>
{subtitle && <Text style={styles.listItemSubtitle}>{subtitle}</Text>}
</View>
{right}
</Container>
);
}

export function StatCard({
title,
value,
color: statColor = colors.primary,
subtitle,
}: {
title: string;
value: string | number;
color?: string;
subtitle?: string;
}) {
return (
<Card style={{ flex: 1, marginHorizontal: spacing.xs }}>
<Text style={styles.statTitle}>{title}</Text>
<Text style={[styles.statValue, { color: statColor }]}>{value}</Text>
{subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
</Card>
);
}

export function ScreenLoader() {
return (
<View style={styles.loader}>
<ActivityIndicator size="large" color={colors.primary} />
</View>
);
}

const styles = StyleSheet.create({
card: {
backgroundColor: colors.surface,
borderRadius: borderRadius.lg,
padding: spacing.lg,
marginBottom: spacing.md,
shadowColor: '#000',
shadowOffset: { width: 0, height: 1 },
shadowOpacity: 0.05,
shadowRadius: 3,
elevation: 1,
},
button: {
borderRadius: borderRadius.md,
alignItems: 'center',
justifyContent: 'center',
paddingHorizontal: spacing.xl,
},
buttonText: {
fontWeight: fontWeight.semibold,
},
input: {
backgroundColor: colors.surfaceSecondary,
borderRadius: borderRadius.md,
paddingHorizontal: spacing.lg,
paddingVertical: spacing.md,
fontSize: fontSize.md,
color: colors.text,
borderWidth: 1,
borderColor: colors.border,
},
inputLabel: {
fontSize: fontSize.sm,
fontWeight: fontWeight.medium,
color: colors.textSecondary,
marginBottom: spacing.xs,
},
badge: {
paddingHorizontal: spacing.sm,
paddingVertical: spacing.xs,
borderRadius: borderRadius.sm,
alignSelf: 'flex-start',
},
badgeText: {
fontSize: fontSize.xs,
fontWeight: fontWeight.semibold,
},
sectionHeader: {
flexDirection: 'row',
justifyContent: 'space-between',
alignItems: 'center',
marginBottom: spacing.md,
marginTop: spacing.lg,
},
sectionTitle: {
fontSize: fontSize.lg,
fontWeight: fontWeight.bold,
color: colors.text,
},
emptyState: {
alignItems: 'center',
paddingVertical: spacing.xxxl,
},
emptyIcon: {
fontSize: 48,
marginBottom: spacing.md,
},
emptyText: {
fontSize: fontSize.md,
color: colors.textSecondary,
},
listItem: {
flexDirection: 'row',
alignItems: 'center',
paddingVertical: spacing.md,
},
listItemTitle: {
fontSize: fontSize.md,
fontWeight: fontWeight.medium,
color: colors.text,
},
listItemSubtitle: {
fontSize: fontSize.sm,
color: colors.textSecondary,
marginTop: 2,
},
statTitle: {
fontSize: fontSize.xs,
color: colors.textSecondary,
fontWeight: fontWeight.medium,
marginBottom: spacing.xs,
},
statValue: {
fontSize: fontSize.xxl,
fontWeight: fontWeight.bold,
},
statSubtitle: {
fontSize: fontSize.xs,
color: colors.textTertiary,
marginTop: spacing.xs,
},
loader: {
flex: 1,
justifyContent: 'center',
alignItems: 'center',
backgroundColor: colors.background,
},
});
