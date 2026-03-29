import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StyleSheet, Text, View, ActivityIndicator, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Authenticated, Unauthenticated, AuthLoading } from 'convex/react';
import { useQuery } from 'convex/react';
import { api } from './convex/_generated/api';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, fontSize, fontWeight, spacing, borderRadius } from './lib/theme';
import { t, setLanguage } from './lib/i18n';
import { BUILD_INFO } from './lib/buildInfo';
import { ThemeProvider } from './components/ThemeProvider';

// Eagerly loaded screens (needed immediately)
import LoginScreen from './screens/LoginScreen';
import NoRoleScreen from './screens/NoRoleScreen';
import CompanyOnboardingScreen from './screens/CompanyOnboardingScreen';

// Lazy loaded screens
const AdminDashboard = React.lazy(() => import('./screens/admin/AdminDashboard'));
const TeacherDashboard = React.lazy(() => import('./screens/teacher/TeacherDashboard'));
const StudentDashboard = React.lazy(() => import('./screens/student/StudentDashboard'));
const ClassesScreen = React.lazy(() => import('./screens/ClassesScreen'));
const ClassDetailScreen = React.lazy(() => import('./screens/ClassDetailScreen'));
const ScheduleScreen = React.lazy(() => import('./screens/ScheduleScreen'));
const ProfileScreen = React.lazy(() => import('./screens/ProfileScreen'));
const AttendanceScreen = React.lazy(() => import('./screens/AttendanceScreen'));
const GradesScreen = React.lazy(() => import('./screens/GradesScreen'));
const PaymentScreen = React.lazy(() => import('./screens/PaymentScreen'));
const TransactionsScreen = React.lazy(() => import('./screens/TransactionsScreen'));
const UsersScreen = React.lazy(() => import('./screens/UsersScreen'));
const AuditLogsScreen = React.lazy(() => import('./screens/AuditLogsScreen'));
const RoomsScreen = React.lazy(() => import('./screens/RoomsScreen'));
const DebtorsScreen = React.lazy(() => import('./screens/DebtorsScreen'));
const GradesTabScreen = React.lazy(() => import('./screens/GradesTabScreen'));
const FinancesScreen = React.lazy(() => import('./screens/FinancesScreen'));
const TelegramSettingsScreen = React.lazy(() => import('./screens/TelegramSettingsScreen'));
const NotificationsScreen = React.lazy(() => import('./screens/NotificationsScreen'));

function LazyScreen(Component: React.LazyExoticComponent<React.ComponentType<any>>) {
  return (props: any) => (
    <React.Suspense fallback={<View style={styles.loader}><ActivityIndicator size="large" color={colors.primary} /></View>}>
      <Component {...props} />
    </React.Suspense>
  );
}

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
<Tab.Screen name="Dashboard" component={LazyScreen(AdminDashboard)} options={{ title: `${t('dashboard')} — Iqro Learn`, tabBarLabel: () => <Text style={tabStyle}>{t('dashboard')}</Text> }} />
<Tab.Screen name="Schedule" component={LazyScreen(ScheduleScreen)} options={{ title: `${t('schedule')} — Iqro Learn`, tabBarLabel: () => <Text style={tabStyle}>{t('schedule')}</Text> }} />
<Tab.Screen name="Courses" component={LazyScreen(ClassesScreen)} options={{ title: `${t('classes')} — Iqro Learn`, tabBarLabel: () => <Text style={tabStyle}>{t('classes')}</Text> }} />
<Tab.Screen name="UsersTab" component={LazyScreen(UsersScreen)} options={{ title: `${t('users')} — Iqro Learn`, tabBarLabel: () => <Text style={tabStyle}>{t('users')}</Text> }} />
<Tab.Screen name="FinancesTab" component={LazyScreen(FinancesScreen)} options={{ title: `${t('finances')} — Iqro Learn`, tabBarLabel: () => <Text style={tabStyle}>{t('finances')}</Text> }} />
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
<Tab.Screen name="Dashboard" component={LazyScreen(TeacherDashboard)} options={{ title: `${t('dashboard')} — Iqro Learn`, tabBarLabel: () => <Text style={tabStyle}>{t('dashboard')}</Text> }} />
<Tab.Screen name="Schedule" component={LazyScreen(ScheduleScreen)} options={{ title: `${t('schedule')} — Iqro Learn`, tabBarLabel: () => <Text style={tabStyle}>{t('schedule')}</Text> }} />
<Tab.Screen name="GradesTab" component={LazyScreen(GradesTabScreen)} options={{ title: `${t('grades')} — Iqro Learn`, tabBarLabel: () => <Text style={tabStyle}>{t('grades')}</Text> }} />
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
<Tab.Screen name="Dashboard" component={LazyScreen(StudentDashboard)} options={{ title: `${t('dashboard')} — Iqro Learn`, tabBarLabel: () => <Text style={tabStyle}>{t('dashboard')}</Text> }} />
<Tab.Screen name="Schedule" component={LazyScreen(ScheduleScreen)} options={{ title: `${t('schedule')} — Iqro Learn`, tabBarLabel: () => <Text style={tabStyle}>{t('schedule')}</Text> }} />
<Tab.Screen name="GradesTab" component={LazyScreen(GradesTabScreen)} options={{ title: `${t('grades')} — Iqro Learn`, tabBarLabel: () => <Text style={tabStyle}>{t('grades')}</Text> }} />
</Tab.Navigator>
);
}

function UpdateBanner() {
  const latestBuildId = useQuery(api.appMeta.getLatestBuildId);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || !latestBuildId || latestBuildId === BUILD_INFO.buildId) return null;

  return (
    <View style={styles.updateBanner}>
      <Ionicons name="arrow-up-circle" size={18} color={colors.textInverse} />
      <Text style={styles.updateText}>{t('update_available')}</Text>
      <TouchableOpacity
        onPress={() => {
          if (Platform.OS === 'web') {
            window.location.reload();
          }
          setDismissed(true);
        }}
        style={styles.updateBtn}
      >
        <Text style={styles.updateBtnText}>{t('refresh')}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setDismissed(true)} style={{ padding: 4 }}>
        <Ionicons name="close" size={16} color={colors.textInverse} />
      </TouchableOpacity>
    </View>
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
<View style={{ flex: 1 }}>
<UpdateBanner />
<Stack.Navigator screenOptions={{
  headerShown: true,
  headerBackTitle: t('back'),
  headerTintColor: colors.primary,
  headerStyle: { backgroundColor: colors.background },
  headerShadowVisible: false,
  headerTitleStyle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold as any, color: colors.text },
}}>
<Stack.Screen name="Main" component={TabComponent} options={{ headerShown: false, title: 'Iqro Learn' }} />
<Stack.Screen name="ClassDetail" component={LazyScreen(ClassDetailScreen)} options={{ headerShown: false, title: `${t('classes')} — Iqro Learn` }} />
<Stack.Screen name="AttendanceScreen" component={LazyScreen(AttendanceScreen)} options={{ headerShown: false, title: `${t('attendance')} — Iqro Learn` }} />
<Stack.Screen name="GradesScreen" component={LazyScreen(GradesScreen)} options={{ headerShown: false, title: `${t('grades')} — Iqro Learn` }} />
<Stack.Screen name="PaymentScreen" component={LazyScreen(PaymentScreen)} options={{ headerShown: false, title: `${t('payment')} — Iqro Learn` }} />
<Stack.Screen name="Transactions" component={LazyScreen(TransactionsScreen)} options={{ headerShown: false, title: `${t('transactions')} — Iqro Learn` }} />
<Stack.Screen name="Users" component={LazyScreen(UsersScreen)} options={{ headerShown: false, title: `${t('users')} — Iqro Learn` }} />
<Stack.Screen name="AuditLogs" component={LazyScreen(AuditLogsScreen)} options={{ headerShown: false, title: `${t('audit_logs')} — Iqro Learn` }} />
<Stack.Screen name="Rooms" component={LazyScreen(RoomsScreen)} options={{ headerShown: false, title: `${t('manage_rooms')} — Iqro Learn` }} />
<Stack.Screen name="Debtors" component={LazyScreen(DebtorsScreen)} options={{ headerShown: false, title: `${t('debtors')} — Iqro Learn` }} />
<Stack.Screen name="Finances" component={LazyScreen(FinancesScreen)} options={{ headerShown: false, title: `${t('finances')} — Iqro Learn` }} />
<Stack.Screen name="Profile" component={LazyScreen(ProfileScreen)} options={{ headerShown: false, title: `${t('profile')} — Iqro Learn` }} />
<Stack.Screen name="Classes" component={LazyScreen(ClassesScreen)} options={{ headerShown: false, title: `${t('classes')} — Iqro Learn` }} />
<Stack.Screen name="TelegramSettings" component={LazyScreen(TelegramSettingsScreen)} options={{ headerShown: false, title: `${t('telegram')} — Iqro Learn` }} />
<Stack.Screen name="Notifications" component={LazyScreen(NotificationsScreen)} options={{ headerShown: false, title: `${t('notifications')} — Iqro Learn` }} />
</Stack.Navigator>
</View>
);
}

export default function App() {
return (
<ThemeProvider>
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
</ThemeProvider>
);
}

const tabStyle = { fontSize: fontSize.xs, fontWeight: fontWeight.medium, color: colors.textSecondary };

const styles = {
container: {
flex: 1,
},
loader: {
flex: 1,
justifyContent: 'center' as const,
alignItems: 'center' as const,
backgroundColor: colors.background,
},
loadingText: {
marginTop: 12,
fontSize: fontSize.md,
color: colors.textSecondary,
},
updateBanner: {
flexDirection: 'row' as const,
alignItems: 'center' as const,
backgroundColor: colors.primary,
paddingHorizontal: spacing.md,
paddingVertical: spacing.sm,
gap: spacing.sm,
},
updateText: {
flex: 1,
color: colors.textInverse,
fontSize: fontSize.sm,
fontWeight: fontWeight.medium,
},
updateBtn: {
backgroundColor: 'rgba(255,255,255,0.2)',
paddingHorizontal: spacing.md,
paddingVertical: spacing.xs,
borderRadius: borderRadius.sm,
},
updateBtnText: {
color: colors.textInverse,
fontSize: fontSize.sm,
fontWeight: fontWeight.semibold,
},
};