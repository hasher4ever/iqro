import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthActions } from '@convex-dev/auth/react';
import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../lib/theme';
import { t } from '../lib/i18n';
import { Button } from '../components/UI';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function NoRoleScreen() {
  const { signOut } = useAuthActions();
  const company = useQuery(api.companies.myCompany);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Ionicons name="time-outline" size={40} color={colors.warning} />
        </View>
        <Text style={styles.title}>{company?.name || t('app_name')}</Text>
        <Text style={styles.message}>{t('role_not_assigned')}</Text>
        {company && (
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>{t('organization')}: {company.name}</Text>
          </View>
        )}
        <Button
          title={t('logout')}
          onPress={() => signOut()}
          variant="outline"
          style={{ marginTop: spacing.xxl }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.warningLight, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.lg },
  title: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.text, marginBottom: spacing.md },
  message: { fontSize: fontSize.md, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  infoBox: {
    marginTop: spacing.lg,
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  infoText: { fontSize: fontSize.sm, color: colors.textSecondary },
});