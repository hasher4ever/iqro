import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, KeyboardAvoidingView, Platform, TouchableOpacity, ScrollView } from 'react-native';
import { showAlert } from '../lib/utils';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation } from 'convex/react';
import { useAuthActions } from '@convex-dev/auth/react';
import { api } from '../convex/_generated/api';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../lib/theme';
import { t } from '../lib/i18n';
import { Button } from '../components/UI';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function CompanyOnboardingScreen() {
const styles = getStyles();

  const { signOut } = useAuthActions();
  const createCompany = useMutation(api.companies.create);
  const joinCompany = useMutation(api.companies.joinByOrgCode);

  const [mode, setMode] = useState<'choose' | 'create' | 'join'>('choose');
  const [companyName, setCompanyName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!companyName.trim()) {
      showAlert(t('error'), t('company_name_required'));
      return;
    }
    setLoading(true);
    try {
      await createCompany({ name: companyName.trim() });
    } catch (e: any) {
      showAlert(t('error'), e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!inviteCode.trim()) {
      showAlert(t('error'), t('enter_org_code'));
      return;
    }
    setLoading(true);
    try {
      await joinCompany({ orgCode: inviteCode.trim().toUpperCase() });
    } catch (e: any) {
      showAlert(t('error'), e.message);
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'choose') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.iconCircle}>
            <Ionicons name="business-outline" size={40} color={colors.primary} />
          </View>
          <Text style={styles.title}>{t('welcome')}</Text>
          <Text style={styles.subtitle}>{t('company_onboarding_desc')}</Text>

          <TouchableOpacity style={styles.optionCard} onPress={() => setMode('create')}>
            <View style={styles.optionIcon}>
              <Ionicons name="add-circle-outline" size={28} color={colors.primary} />
            </View>
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>{t('create_organization')}</Text>
              <Text style={styles.optionDesc}>{t('create_organization_desc')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionCard} onPress={() => setMode('join')}>
            <View style={styles.optionIcon}>
              <Ionicons name="enter-outline" size={28} color={colors.success} />
            </View>
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>{t('join_organization')}</Text>
              <Text style={styles.optionDesc}>{t('join_organization_desc')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.signOutLink} onPress={() => signOut()}>
            <Text style={styles.signOutText}>{t('logout')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.backBtn} onPress={() => { setMode('choose'); }}>
          <Text style={styles.backText}>{t('back')}</Text>
        </TouchableOpacity>

        {mode === 'create' ? (
          <>
            <View style={styles.formIcon}>
              <Ionicons name="add-circle-outline" size={48} color={colors.primary} />
            </View>
            <Text style={styles.formTitle}>{t('create_organization')}</Text>
            <Text style={styles.label}>{t('company_name')}</Text>
            <TextInput
              style={styles.input}
              value={companyName}
              onChangeText={setCompanyName}
              placeholder={t('company_name_placeholder')}
              placeholderTextColor={colors.textTertiary}
            />
            <Button
              title={loading ? t('loading') : t('create_organization')}
              onPress={handleCreate}
              disabled={loading}
              style={{ marginTop: spacing.lg }}
            />
          </>
        ) : (
          <>
            <View style={styles.formIcon}>
              <Ionicons name="key-outline" size={48} color={colors.success} />
            </View>
            <Text style={styles.formTitle}>{t('enter_org_code')}</Text>
            <Text style={styles.hint}>{t('org_code_hint')}</Text>
            <Text style={styles.label}>{t('org_code')}</Text>
            <TextInput
              style={[styles.input, styles.codeInput]}
              value={inviteCode}
              onChangeText={(text: string) => setInviteCode(text.toUpperCase())}
              placeholder="ABCD1234"
              placeholderTextColor={colors.textTertiary}
            />
            <Button
              title={loading ? t('loading') : t('join_organization')}
              onPress={handleJoin}
              disabled={loading}
              style={{ marginTop: spacing.lg }}
            />
          </>
        )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function getStyles() { return StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl },
  iconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center', alignItems: 'center',
    alignSelf: 'center', marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.xxl, fontWeight: fontWeight.bold,
    color: colors.text, textAlign: 'center', marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fontSize.md, color: colors.textSecondary,
    textAlign: 'center', marginBottom: spacing.xxl, lineHeight: 22,
  },
  optionCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    padding: spacing.lg, marginBottom: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  optionIcon: { marginRight: spacing.md },
  optionText: { flex: 1 },
  optionTitle: {
    fontSize: fontSize.md, fontWeight: fontWeight.semibold,
    color: colors.text, marginBottom: 2,
  },
  optionDesc: { fontSize: fontSize.sm, color: colors.textSecondary },
  signOutLink: { alignSelf: 'center', marginTop: spacing.xl },
  signOutText: { fontSize: fontSize.md, color: colors.error },
  backBtn: {
    marginBottom: spacing.xl,
  },
  backText: {
    fontSize: fontSize.md, color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  formIcon: { alignSelf: 'center', marginBottom: spacing.lg },
  formTitle: {
    fontSize: fontSize.xl, fontWeight: fontWeight.bold,
    color: colors.text, textAlign: 'center', marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSize.sm, fontWeight: fontWeight.medium,
    color: colors.textSecondary, marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.surface, borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, fontSize: fontSize.md, color: colors.text,
  },
  codeInput: {
    fontSize: fontSize.xxl, fontWeight: fontWeight.bold,
    textAlign: 'center', letterSpacing: 4,
  },
  hint: {
    fontSize: fontSize.sm, color: colors.textTertiary,
    textAlign: 'center', marginBottom: spacing.lg, lineHeight: 20,
  },
}); }