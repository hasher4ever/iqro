import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Authenticated, Unauthenticated, AuthLoading } from 'convex/react';
import { useQuery } from 'convex/react'; // Edited: added useQuery import
import { api } from './convex/_generated/api';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight } from './lib/theme';
import { t, setLanguage } from './lib/i18n';

// Screens
import LoginScreen from './screens/LoginScreen';
import AdminDashboard from './screens/admin/AdminDashboard';
import TeacherDashboard from './screens/teacher/TeacherDashboard';
import StudentDashboard from './screens/student/StudentDashboard';
import NoRoleScreen from './screens/NoRoleScreen';
import ClassesScreen from './screens/ClassesScreen';
import ClassDetailScreen from './screens/ClassDetailScreen';
import ScheduleScreen from './screens/ScheduleScreen';
import ProfileScreen from './screens/ProfileScreen';
import AttendanceScreen from './screens/AttendanceScreen';
import GradesScreen from './screens/GradesScreen';
import PaymentScreen from './screens/PaymentScreen';
import TransactionsScreen from './screens/TransactionsScreen';
import UsersScreen from './screens/UsersScreen';
import AuditLogsScreen from './screens/AuditLogsScreen';
import RoomsScreen from './screens/RoomsScreen';
import DebtorsScreen from './screens/DebtorsScreen';
import GradesTabScreen from './screens/GradesTabScreen';
import CompanyOnboardingScreen from './screens/CompanyOnboardingScreen';
import FinancesScreen from './screens/FinancesScreen';
import TelegramSettingsScreen from './screens/TelegramSettingsScreen';
import NotificationsScreen from './screens/NotificationsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Tab navigators for each role
function AdminTabs() {
return (
<Tab.Navigator
screenOptions={({ route }) => ({
headerShown: false,
tabBarActiveTintColor: colors.primary,
tabBarInactiveTintColor: colors.textTertiary,
tabBarStyle: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 4, height: 85 },
tabBarLabelStyle: { fontSize: fontSize.xs, fontWeight: fontWeight.medium },
tabBarIcon: ({ color, size }) => {
let iconName: keyof typeof Ionicons.glyphMap = 'home';
if (route.name === 'Dashboard') iconName = 'grid-outline';
if (route.name === 'Schedule') iconName = 'calendar-outline';
if (route.name === 'Courses') iconName = 'book-outline';
if (route.name === 'UsersTab') iconName = 'people-outline';
if (route.name === 'FinancesTab') iconName = 'cash-outline';
return <Ionicons name={iconName} size={size} color={color} />;
},
})}
>
<Tab.Screen name="Dashboard" component={AdminDashboard} options={{ title: `${t('dashboard')} — Iqro Learn`, tabBarLabel: () => <Text style={tabStyle}>{t('dashboard')}</Text> }} />
<Tab.Screen name="Schedule" component={ScheduleScreen} options={{ title: `${t('schedule')} — Iqro Learn`, tabBarLabel: () => <Text style={tabStyle}>{t('schedule')}</Text> }} />
<Tab.Screen name="Courses" component={ClassesScreen} options={{ title: `${t('classes')} — Iqro Learn`, tabBarLabel: () => <Text style={tabStyle}>{t('classes')}</Text> }} />
<Tab.Screen name="UsersTab" component={UsersScreen} options={{ title: `${t('users')} — Iqro Learn`, tabBarLabel: () => <Text style={tabStyle}>{t('users')}</Text> }} />
<Tab.Screen name="FinancesTab" component={FinancesScreen} options={{ title: `${t('finances')} — Iqro Learn`, tabBarLabel: () => <Text style={tabStyle}>{t('finances')}</Text> }} />
</Tab.Navigator>
);
}

function TeacherTabs() {
return (
<Tab.Navigator
screenOptions={({ route }) => ({
headerShown: false,
tabBarActiveTintColor: colors.primary,
tabBarInactiveTintColor: colors.textTertiary,
tabBarStyle: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 4, height: 85 },
tabBarLabelStyle: { fontSize: fontSize.xs, fontWeight: fontWeight.medium },
tabBarIcon: ({ color, size }) => {
let iconName: keyof typeof Ionicons.glyphMap = 'home';
if (route.name === 'Dashboard') iconName = 'grid-outline';
if (route.name === 'Schedule') iconName = 'calendar-outline';
if (route.name === 'GradesTab') iconName = 'star-outline';
return <Ionicons name={iconName} size={size} color={color} />;
},
})}
>
<Tab.Screen name="Dashboard" component={TeacherDashboard} options={{ title: `${t('dashboard')} — Iqro Learn`, tabBarLabel: () => <Text style={tabStyle}>{t('dashboard')}</Text> }} />
<Tab.Screen name="Schedule" component={ScheduleScreen} options={{ title: `${t('schedule')} — Iqro Learn`, tabBarLabel: () => <Text style={tabStyle}>{t('schedule')}</Text> }} />
<Tab.Screen name="GradesTab" component={GradesTabScreen} options={{ title: `${t('grades')} — Iqro Learn`, tabBarLabel: () => <Text style={tabStyle}>{t('grades')}</Text> }} />
</Tab.Navigator>
);
}

function StudentTabs() {
return (
<Tab.Navigator
screenOptions={({ route }) => ({
headerShown: false,
tabBarActiveTintColor: colors.primary,
tabBarInactiveTintColor: colors.textTertiary,
tabBarStyle: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 4, height: 85 },
tabBarLabelStyle: { fontSize: fontSize.xs, fontWeight: fontWeight.medium },
tabBarIcon: ({ color, size }) => {
let iconName: keyof typeof Ionicons.glyphMap = 'home';
if (route.name === 'Dashboard') iconName = 'grid-outline';
if (route.name === 'Schedule') iconName = 'calendar-outline';
if (route.name === 'GradesTab') iconName = 'star-outline';
return <Ionicons name={iconName} size={size} color={color} />;
},
})}
>
<Tab.Screen name="Dashboard" component={StudentDashboard} options={{ title: `${t('dashboard')} — Iqro Learn`, tabBarLabel: () => <Text style={tabStyle}>{t('dashboard')}</Text> }} />
<Tab.Screen name="Schedule" component={ScheduleScreen} options={{ title: `${t('schedule')} — Iqro Learn`, tabBarLabel: () => <Text style={tabStyle}>{t('schedule')}</Text> }} />
<Tab.Screen name="GradesTab" component={GradesTabScreen} options={{ title: `${t('grades')} — Iqro Learn`, tabBarLabel: () => <Text style={tabStyle}>{t('grades')}</Text> }} />
</Tab.Navigator>
);
}

function RoleRouter() {
const me = useQuery(api.users.me);

// All hooks must be before any conditional returns
React.useEffect(() => {
  if (me?.language) {
    setLanguage(me.language);
  }
}, [me?.language]);

// Loading
if (me === undefined) {
return (
<View style={styles.loader}>
<ActivityIndicator size="large" color={colors.primary} />
</View>
);
}

// me is null — user authenticated but no user record found
if (me === null || !me.companyId) {
  return <CompanyOnboardingScreen />;
}

// User has company but no role — waiting for admin to assign
if (!me.role) {
  return <NoRoleScreen />;
}

let TabComponent;
if (me.role === 'super_admin' || me.role === 'admin') {
TabComponent = AdminTabs;
} else if (me.role === 'teacher') {
TabComponent = TeacherTabs;
} else if (me.role === 'student_parent') {
TabComponent = StudentTabs;
} else {
return <NoRoleScreen />;
}

return (
<Stack.Navigator screenOptions={{
  headerShown: true,
  headerBackTitle: t('back'),
  headerTintColor: colors.primary,
  headerStyle: { backgroundColor: colors.background },
  headerShadowVisible: false,
  headerTitleStyle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold as any, color: colors.text },
}}>
<Stack.Screen name="Main" component={TabComponent} options={{ headerShown: false, title: 'Iqro Learn' }} />
<Stack.Screen name="ClassDetail" component={ClassDetailScreen} options={{ headerShown: false, title: `${t('classes')} — Iqro Learn` }} />
<Stack.Screen name="AttendanceScreen" component={AttendanceScreen} options={{ headerShown: false, title: `${t('attendance')} — Iqro Learn` }} />
<Stack.Screen name="GradesScreen" component={GradesScreen} options={{ headerShown: false, title: `${t('grades')} — Iqro Learn` }} />
<Stack.Screen name="PaymentScreen" component={PaymentScreen} options={{ headerShown: false, title: `${t('payment')} — Iqro Learn` }} />
<Stack.Screen name="Transactions" component={TransactionsScreen} options={{ headerShown: false, title: `${t('transactions')} — Iqro Learn` }} />
<Stack.Screen name="Users" component={UsersScreen} options={{ headerShown: false, title: `${t('users')} — Iqro Learn` }} />
<Stack.Screen name="AuditLogs" component={AuditLogsScreen} options={{ headerShown: false, title: `${t('audit_logs')} — Iqro Learn` }} />
<Stack.Screen name="Rooms" component={RoomsScreen} options={{ headerShown: false, title: `${t('manage_rooms')} — Iqro Learn` }} />
<Stack.Screen name="Debtors" component={DebtorsScreen} options={{ headerShown: false, title: `${t('debtors')} — Iqro Learn` }} />
<Stack.Screen name="Finances" component={FinancesScreen} options={{ headerShown: false, title: `${t('finances')} — Iqro Learn` }} />
<Stack.Screen name="Profile" component={ProfileScreen} options={{ headerShown: false, title: `${t('profile')} — Iqro Learn` }} />
<Stack.Screen name="Classes" component={ClassesScreen} options={{ headerShown: false, title: `${t('classes')} — Iqro Learn` }} />
<Stack.Screen name="TelegramSettings" component={TelegramSettingsScreen} options={{ headerShown: false, title: `${t('telegram')} — Iqro Learn` }} />
<Stack.Screen name="Notifications" component={NotificationsScreen} options={{ headerShown: false, title: `${t('notifications')} — Iqro Learn` }} />
</Stack.Navigator>
);
}

export default function App() {
return (
<SafeAreaProvider style={styles.container}>
<NavigationContainer
	documentTitle={{
		formatter: (options, route) =>
			options?.title ?? route?.name ?? 'Iqro Learn',
	}}
>
<AuthLoading>
<View style={styles.loader}>
<ActivityIndicator size="large" color={colors.primary} />
<Text style={styles.loadingText}>{t('loading')}</Text>
</View>
</AuthLoading>

<Unauthenticated>
<LoginScreen />
</Unauthenticated>

<Authenticated>
<RoleRouter />
</Authenticated>
</NavigationContainer>
</SafeAreaProvider>
);
}

const tabStyle = { fontSize: fontSize.xs, fontWeight: fontWeight.medium, color: colors.textSecondary };

const styles = StyleSheet.create({
container: {
flex: 1,
},
loader: {
flex: 1,
justifyContent: 'center',
alignItems: 'center',
backgroundColor: colors.background,
},
loadingText: {
marginTop: 12,
fontSize: fontSize.md,
color: colors.textSecondary,
},
});