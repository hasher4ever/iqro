import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, spacing, fontSize, fontWeight, useTheme } from '../lib/theme';

interface ScreenHeaderProps {
title: string;
onBack: () => void;
rightAction?: React.ReactNode;
}

export function ScreenHeader({ title, onBack, rightAction }: ScreenHeaderProps) {
useTheme(); // subscribe to theme changes
const styles = getStyles();
return (
<View style={styles.header}>
<TouchableOpacity onPress={onBack} style={styles.backBtn} accessibilityLabel={title ? `Back from ${title}` : 'Back'} accessibilityRole="button">
<Ionicons name="chevron-back" size={28} color={colors.primary} />
</TouchableOpacity>
<Text style={styles.title} numberOfLines={1}>{title}</Text>
<View style={styles.rightSlot}>
{rightAction || null}
</View>
</View>
);
}

function getStyles() {
return StyleSheet.create({
header: {
flexDirection: 'row',
alignItems: 'center',
paddingHorizontal: spacing.lg,
paddingVertical: spacing.md,
},
backBtn: {
width: 40,
alignItems: 'flex-start',
},
title: {
flex: 1,
textAlign: 'center',
fontSize: fontSize.lg,
fontWeight: fontWeight.bold,
color: colors.text,
},
rightSlot: {
width: 40,
alignItems: 'flex-end',
},
});
}
