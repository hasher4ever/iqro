import React, { memo } from 'react';
import {
View,
Text,
TouchableOpacity,
TextInput,
ActivityIndicator,
ViewStyle,
} from 'react-native';
import { colors, spacing, borderRadius, fontSize, fontWeight, useTheme } from '../lib/theme';

export const Card = memo(function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const { colors: c } = useTheme();
  return (
    <View style={[{
      backgroundColor: c.surface,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      marginBottom: spacing.md,
      boxShadow: '0px 1px 4px rgba(0, 0, 0, 0.06)',
      elevation: 1,
    }, style]}>
      {children}
    </View>
  );
});

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
const { colors: c } = useTheme();

const bg = {
primary: c.primary,
secondary: c.surfaceSecondary,
danger: c.error,
ghost: 'transparent',
outline: 'transparent',
}[variant];

const textColor = {
primary: c.textInverse,
secondary: c.text,
danger: c.textInverse,
ghost: c.primary,
outline: c.primary,
}[variant];

const height = { sm: 36, md: 44, lg: 52 }[size];
const textSize = { sm: fontSize.sm, md: fontSize.md, lg: fontSize.lg }[size];

return (
<TouchableOpacity
style={[
{
  borderRadius: borderRadius.md,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  paddingHorizontal: spacing.xl,
  backgroundColor: disabled ? c.border : bg,
  height,
  borderWidth: variant === 'outline' ? 1.5 : 0,
  borderColor: variant === 'outline' ? c.primary : undefined,
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
<Text style={{ color: textColor, fontSize: textSize, fontWeight: fontWeight.semibold }}>
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
keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
autoCapitalize?: 'none' | 'sentences' | 'words';
multiline?: boolean;
style?: ViewStyle;
}) {
const { colors: c } = useTheme();
return (
<View style={[{ marginBottom: spacing.md }, style]}>
{label && <Text style={{ fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: c.textSecondary, marginBottom: spacing.xs }}>{label}</Text>}
<TextInput
style={[{
  backgroundColor: c.surfaceSecondary,
  borderRadius: borderRadius.md,
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.md,
  fontSize: fontSize.md,
  color: c.text,
  borderWidth: 1,
  borderColor: c.border,
}, multiline && { height: 80, textAlignVertical: 'top' as const }]}
value={value}
onChangeText={onChangeText}
placeholder={placeholder}
placeholderTextColor={c.textTertiary}
secureTextEntry={secureTextEntry}
keyboardType={keyboardType}
autoCapitalize={autoCapitalize}
multiline={multiline}
/>
</View>
);
}

function formatPhoneDigits(digits: string): string {
  const d = digits.replace(/\D/g, '').slice(0, 9);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)} ${d.slice(2)}`;
  if (d.length <= 7) return `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5)}`;
  return `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 7)} ${d.slice(7)}`;
}

export function PhoneInput({
  label,
  value,
  onChangeText,
  style,
}: {
  label?: string;
  value: string;
  onChangeText: (digits: string) => void;
  style?: ViewStyle;
}) {
  const { colors: c } = useTheme();
  const handleChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 9);
    onChangeText(digits);
  };

  return (
    <View style={[{ marginBottom: spacing.md }, style]}>
      {label && <Text style={{ fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: c.textSecondary, marginBottom: spacing.xs }}>{label}</Text>}
      <View style={{
        backgroundColor: c.surfaceSecondary,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderWidth: 1,
        borderColor: c.border,
        flexDirection: 'row',
        alignItems: 'center',
      }}>
        <Text style={{ fontSize: fontSize.md, color: c.text, fontWeight: fontWeight.semibold, marginRight: spacing.xs }}>
          +998
        </Text>
        <TextInput
          style={{ flex: 1, fontSize: fontSize.md, color: c.text, padding: 0, margin: 0 }}
          value={formatPhoneDigits(value)}
          onChangeText={handleChange}
          placeholder="XX XXX XX XX"
          placeholderTextColor={c.textTertiary}
          keyboardType="phone-pad"
          maxLength={12}
        />
      </View>
    </View>
  );
}

export function getFullPhone(digits: string): string {
  const clean = digits.replace(/\D/g, '');
  if (clean.length !== 9) return '';
  return `+998${clean}`;
}

export const Badge = memo(function Badge({
text,
color: badgeColor,
bgColor,
}: {
text: string;
color?: string;
bgColor?: string;
}) {
const c = badgeColor || colors.primary;
return (
<View style={{
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
  borderRadius: borderRadius.sm,
  alignSelf: 'flex-start' as const,
  backgroundColor: bgColor || c + '20',
}}>
<Text style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: c }}>{text}</Text>
</View>
);
});

export const SectionTitle = memo(function SectionTitle({ title, action }: { title: string; action?: React.ReactNode }) {
return (
<View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md, marginTop: spacing.lg }}>
<Text style={{ fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text }}>{title}</Text>
{action}
</View>
);
});

export const EmptyState = memo(function EmptyState({ message, icon }: { message: string; icon?: string }) {
return (
<View style={{ alignItems: 'center', paddingVertical: spacing.xxxl }}>
{icon && <Text style={{ fontSize: 48, marginBottom: spacing.md }}>{icon}</Text>}
<Text style={{ fontSize: fontSize.md, color: colors.textSecondary }}>{message}</Text>
</View>
);
});

export const StatusBadge = memo(function StatusBadge({ status }: { status: string }) {
const cfg: Record<string, { color: string; bg: string }> = {
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
const c = cfg[status] || { color: colors.textSecondary, bg: colors.surfaceSecondary };
return <Badge text={status.charAt(0).toUpperCase() + status.slice(1)} color={c.color} bgColor={c.bg} />;
});

export const ListItem = memo(function ListItem({
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
style={{
  flexDirection: 'row',
  alignItems: 'center',
  paddingVertical: spacing.md,
  borderBottomWidth: borderBottom ? 1 : 0,
  borderBottomColor: colors.borderLight,
}}
onPress={onPress}
activeOpacity={0.7}
>
<View style={{ flex: 1 }}>
<Text style={{ fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.text }}>{title}</Text>
{subtitle && <Text style={{ fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 }}>{subtitle}</Text>}
</View>
{right}
</Container>
);
});

export const StatCard = memo(function StatCard({
title,
value,
color: statColor,
subtitle,
}: {
title: string;
value: string | number;
color?: string;
subtitle?: string;
}) {
return (
<Card style={{ flex: 1, marginHorizontal: spacing.xs }}>
<Text style={{ fontSize: fontSize.xs, color: colors.textSecondary, fontWeight: fontWeight.medium, marginBottom: spacing.xs }}>{title}</Text>
<Text style={{ fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: statColor || colors.primary }}>{value}</Text>
{subtitle && <Text style={{ fontSize: fontSize.xs, color: colors.textTertiary, marginTop: spacing.xs }}>{subtitle}</Text>}
</Card>
);
});

export const ScreenLoader = memo(function ScreenLoader() {
return (
<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
<ActivityIndicator size="large" color={colors.primary} />
</View>
);
});
