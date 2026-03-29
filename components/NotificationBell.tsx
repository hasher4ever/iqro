import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, fontSize, fontWeight, useTheme } from '../lib/theme';

export function NotificationBell() {
useTheme(); // subscribe to theme changes
const navigation = useNavigation<any>();
const unreadCount = useQuery(api.notifications.getUnreadCount);
const styles = getStyles();

return (
<TouchableOpacity
style={styles.container}
onPress={() => navigation.navigate('Notifications')}
accessibilityLabel={unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications'}
accessibilityRole="button"
>
<Ionicons name="notifications-outline" size={24} color={colors.text} />
{unreadCount !== undefined && unreadCount > 0 && (
<View style={styles.badge}>
<Text style={styles.badgeText}>
{unreadCount > 99 ? '99+' : unreadCount}
</Text>
</View>
)}
</TouchableOpacity>
);
}

function getStyles() {
return StyleSheet.create({
container: { position: 'relative', padding: 4 },
badge: {
position: 'absolute',
top: 0,
right: 0,
backgroundColor: colors.error,
borderRadius: 10,
minWidth: 18,
height: 18,
alignItems: 'center',
justifyContent: 'center',
paddingHorizontal: 4,
},
badgeText: {
color: '#FFFFFF',
fontSize: 10,
fontWeight: fontWeight.bold,
lineHeight: 14,
},
});
}
