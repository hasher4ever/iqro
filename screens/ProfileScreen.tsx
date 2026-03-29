import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { showAlert } from '../lib/utils';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useAction } from 'convex/react';
import { useAuthActions } from '@convex-dev/auth/react';
import { api } from '../convex/_generated/api';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../lib/theme';
import { t, setLanguage, getLanguage, LANGUAGES, getLanguageLabel, Language } from '../lib/i18n';
import { Card, Button, Input, ScreenLoader, SectionTitle, ListItem } from '../components/UI';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ScreenHeader } from '../components/ScreenHeader';
import * as Linking from 'expo-linking';
import { BUILD_INFO } from '../lib/buildInfo';

export default function ProfileScreen({ navigation }: any) {
  const { signOut } = useAuthActions();
  const me = useQuery(api.users.me);
  const company = useQuery(api.companies.myCompany);
  const updateProfile = useMutation(api.users.updateProfile);
  const updateLanguage = useMutation(api.users.updateLanguage);
  const regenerateCode = useMutation(api.companies.regenerateOrgCode);
  const selfResetPassword = useAction(api.adminAuthHelpers.selfResetPassword);
  const telegramStatus = useQuery(api.telegram.getTelegramLinkStatus);
  const generateLinkCode = useMutation(api.telegram.generateTelegramLinkCode);
  const unlinkTelegram = useMutation(api.telegram.unlinkTelegram);

  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);

  // Password change
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Telegram linking
  const [linkCode, setLinkCode] = useState<string | null>(null);
  const [linkBotUsername, setLinkBotUsername] = useState<string | null>(null);

  useEffect(() => {
    if (me?.name) setName(me.name);
    if (me?.language) setLanguage(me.language);
  }, [me]);

  if (me === undefined) return <ScreenLoader />;

  const handleSaveName = async () => {
    if (name.trim() === (me?.name || '')) {
      showAlert(t('success'), t('profile_updated'));
      return;
    }
    setSaving(true);
    try {
      await updateProfile({ name: name.trim() });
      showAlert(t('success'), t('profile_updated'));
    } catch (error: any) {
      showAlert(t('error'), error?.message || t('error_generic'));
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (newPassword.length < 6) {
      showAlert(t('error'), t('password_min_length'));
      return;
    }
    if (newPassword !== confirmPassword) {
      showAlert(t('error'), t('passwords_dont_match'));
      return;
    }
    try {
      await selfResetPassword({ newPassword });
      showAlert(t('success'), t('password_updated'));
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordChange(false);
    } catch (error: any) {
      showAlert(t('error'), error?.message || t('error_generic'));
    }
  };

  const handleLanguageChange = async (lang: Language) => {
    setLanguage(lang);
    try {
      await updateLanguage({ language: lang });
    } catch (_) {}
  };

  const handleSignOut = async () => {
    if (!confirmLogout) {
      setConfirmLogout(true);
      return;
    }
    try {
      await signOut();
    } catch (e) {
      console.log('signOut error', e);
    }
  };

  const roleLabels: Record<string, string> = {
    super_admin: t('super_admin'),
    admin: t('admin'),
    teacher: t('teacher'),
    student_parent: t('student_parent'),
  };

  const isAdmin = me?.role === 'super_admin' || me?.role === 'admin';
  const isSuperAdmin = me?.role === 'super_admin';
  const nameChanged = name.trim() !== (me?.name || '');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader
        title={t('profile')}
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity 
            onPress={handleSignOut}
            style={[styles.signOutBtn, confirmLogout && styles.signOutBtnConfirm]}
          >
            <Ionicons 
              name="log-out" 
              size={20} 
              color={confirmLogout ? colors.background : colors.error}
            />
          </TouchableOpacity>
        }
      />
      <ScrollView contentContainerStyle={styles.content}>
        {confirmLogout && (
          <View style={styles.confirmLogoutRow}>
            <Text style={styles.confirmLogoutText}>{t('confirm_logout')}?</Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity onPress={handleSignOut} style={styles.confirmBtn}>
                <Text style={styles.confirmBtnText}>{t('confirm')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setConfirmLogout(false)} style={[styles.confirmBtn, styles.cancelBtn]}>
                <Text style={styles.cancelBtnText}>{t('cancel')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        {/* User info + edit name + password — all in one card */}
        <Card>
          {/* Avatar + info row */}
          <View style={styles.avatarRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(me?.name || me?.email || me?.phone || '?')[0].toUpperCase()}
              </Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.userEmail}>{me?.email || me?.phone}</Text>
              <Text style={styles.userRole}>
                {me?.role ? roleLabels[me.role] || me.role : t('role_not_assigned')}
              </Text>
            </View>
          </View>

          {/* Name edit */}
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>{t('name')}</Text>
            <View style={styles.nameRow}>
              <TextInput
                style={styles.nameInput}
                value={name}
                onChangeText={setName}
                placeholder={t('name')}
                placeholderTextColor={colors.textTertiary}
              />
              {nameChanged && (
                <TouchableOpacity
                  style={styles.saveNameBtn}
                  onPress={handleSaveName}
                  disabled={saving}
                >
                  <Ionicons name="checkmark" size={18} color={colors.textInverse} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Password section */}
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.passwordToggle}
            onPress={() => setShowPasswordChange(!showPasswordChange)}
          >
            <Text style={styles.fieldLabel}>{t('password')}</Text>
            <Ionicons
              name={showPasswordChange ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
          {showPasswordChange && (
            <View style={styles.passwordFields}>
              <TextInput
                style={styles.passwordInput}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder={t('new_password')}
                placeholderTextColor={colors.textTertiary}
                secureTextEntry
              />
              <TextInput
                style={styles.passwordInput}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder={t('confirm_password')}
                placeholderTextColor={colors.textTertiary}
                secureTextEntry
              />
              <Button
                title={t('save')}
                onPress={handlePasswordChange}
                size="sm"
                style={{ marginTop: spacing.xs }}
              />
            </View>
          )}
        </Card>

        {/* Admin tools */}
        {isAdmin && (
          <>
            <SectionTitle title={t('organization')} />
            <Card>
              {company && (
                <>
                  <View style={styles.companyRow}>
                    <Text style={styles.companyName}>{company.name}</Text>
                    <Text style={styles.companyMembers}>{company.memberCount} {t('members')}</Text>
                  </View>
                  <View style={styles.codeRow}>
                    <Text style={styles.codeLabel}>{t('org_code')}</Text>
                    <Text style={styles.codeValue}>{company.inviteCode}</Text>
                    <TouchableOpacity
                      style={styles.regenerateBtn}
                      onPress={async () => {
                        try { await regenerateCode(); }
                        catch (e: any) { showAlert(t('error'), e.message); }
                      }}
                    >
                      <Ionicons name="refresh" size={16} color={colors.primary} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.divider} />
                </>
              )}
              <ListItem
                title={t('manage_users')}
                subtitle={t('roles_permissions')}
                onPress={() => navigation.navigate('Users')}
              />
              <ListItem
                title={t('manage_rooms')}
                subtitle={t('rooms_classrooms')}
                onPress={() => navigation.navigate('Rooms')}
              />
              <ListItem
                title={t('transactions')}
                subtitle={t('financial_records')}
                onPress={() => navigation.navigate('Transactions')}
              />
              <ListItem
                title={t('audit_logs')}
                subtitle={t('system_activity')}
                onPress={() => navigation.navigate('AuditLogs')}
                borderBottom={isSuperAdmin}
              />
              {isSuperAdmin && (
                <ListItem
                  title={t('telegram_integration')}
                  subtitle={t('telegram_notifications')}
                  onPress={() => navigation.navigate('TelegramSettings')}
                  borderBottom={false}
                />
              )}
            </Card>
          </>
        )}

        {/* Telegram — permanent section for all users when enabled */}
        {telegramStatus && telegramStatus.telegramEnabled && (() => {
          const botUser = telegramStatus.botUsername || linkBotUsername;
          return (
            <>
              <SectionTitle title="Telegram" />
              <Card>
                {telegramStatus.linked && !telegramStatus.blocked && (
                  <View>
                    {/* Status indicator */}
                    <View style={styles.telegramStatusRow}>
                      <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                      <Text style={styles.telegramLinkedText}>{t('telegram_linked')}</Text>
                    </View>

                    {/* Primary action: Open bot */}
                    {botUser && (
                      <TouchableOpacity
                        style={styles.botLinkBtn}
                        onPress={() => Linking.openURL(`https://t.me/${botUser}`)}
                      >
                        <Ionicons name="paper-plane" size={18} color={colors.textInverse} />
                        <Text style={styles.botLinkBtnText}>@{botUser}</Text>
                      </TouchableOpacity>
                    )}

                    {/* Command hints */}
                    <View style={styles.commandHints}>
                      <Text style={styles.commandHintsTitle}>{t('telegram_commands')}:</Text>
                      <Text style={styles.commandHintItem}>/balance — {t('telegram_cmd_balance')}</Text>
                      <Text style={styles.commandHintItem}>/courses — {t('telegram_cmd_courses')}</Text>
                      <Text style={styles.commandHintItem}>/grades — {t('telegram_cmd_grades')}</Text>
                      <Text style={styles.commandHintItem}>/language — {t('telegram_cmd_language')}</Text>
                    </View>

                    {/* Disconnect - subtle */}
                    <TouchableOpacity
                      style={styles.telegramUnlinkBtn}
                      onPress={async () => {
                        try {
                          await unlinkTelegram();
                          setLinkCode(null);
                        } catch (e: any) {
                          showAlert(t('error'), e.message);
                        }
                      }}
                    >
                      <Text style={styles.telegramUnlinkText}>{t('telegram_disconnect')}</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {telegramStatus.linked && telegramStatus.blocked && (
                  <View>
                    <View style={styles.telegramStatusRow}>
                      <Ionicons name="warning" size={20} color={colors.warning} />
                      <Text style={styles.telegramBlockedText}>{t('telegram_blocked')}</Text>
                    </View>
                    <Text style={styles.telegramHint}>{t('telegram_blocked_hint')}</Text>
                    {botUser && (
                      <TouchableOpacity
                        style={[styles.botLinkBtn, { backgroundColor: colors.warning }]}
                        onPress={() => Linking.openURL(`https://t.me/${botUser}`)}
                      >
                        <Ionicons name="paper-plane" size={18} color={colors.textInverse} />
                        <Text style={styles.botLinkBtnText}>{t('telegram_unblock_and_open')} @{botUser}</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={styles.telegramUnlinkBtn}
                      onPress={async () => {
                        try {
                          await unlinkTelegram();
                          setLinkCode(null);
                        } catch (e: any) {
                          showAlert(t('error'), e.message);
                        }
                      }}
                    >
                      <Text style={styles.telegramUnlinkText}>{t('telegram_disconnect')}</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {!telegramStatus.linked && (
                  <View>
                    {linkCode ? (
                      <View>
                        <Text style={styles.telegramHint}>{t('telegram_link_instructions')}</Text>
                        {botUser && (
                          <TouchableOpacity
                            style={styles.botLinkBtn}
                            onPress={() => Linking.openURL(`https://t.me/${botUser}`)}
                          >
                            <Ionicons name="paper-plane" size={18} color={colors.textInverse} />
                            <Text style={styles.botLinkBtnText}>@{botUser}</Text>
                          </TouchableOpacity>
                        )}
                        <View style={styles.codeDisplayContainer}>
                          <Text style={styles.codeDisplayLabel}>{t('send_this_code')}:</Text>
                          <View style={styles.codeDisplay}>
                            <Text style={styles.codeDisplayText}>{linkCode}</Text>
                          </View>
                        </View>
                        <Text style={styles.telegramExpiry}>{t('telegram_code_expires')}</Text>
                      </View>
                    ) : (
                      <View>
                        {botUser && (
                          <Text style={styles.telegramBotHint}>
                            {t('telegram_connect_hint')} @{botUser}
                          </Text>
                        )}
                        <TouchableOpacity
                          style={styles.connectTelegramBtn}
                          onPress={async () => {
                            try {
                              const result = await generateLinkCode();
                              setLinkCode(result.code);
                              setLinkBotUsername(result.botUsername || null);
                            } catch (e: any) {
                              showAlert(t('error'), e.message);
                            }
                          }}
                        >
                          <Ionicons name="paper-plane-outline" size={18} color={colors.primary} />
                          <Text style={styles.connectTelegramText}>{t('telegram_connect')}</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}
              </Card>
            </>
          );
        })()}

        {/* Language — at the end */}
        <SectionTitle title={t('language')} />
        <Card>
          {LANGUAGES.map((lang) => (
            <TouchableOpacity
              key={lang}
              style={[styles.langOption, getLanguage() === lang && styles.langOptionActive]}
              onPress={() => handleLanguageChange(lang)}
            >
              <Text style={[styles.langText, getLanguage() === lang && styles.langTextActive]}>
                {getLanguageLabel(lang)}
              </Text>
              {getLanguage() === lang && <View style={styles.checkmark} />}
            </TouchableOpacity>
          ))}
        </Card>

        <Text style={styles.buildVersion}>Build: {BUILD_INFO.buildId} ({BUILD_INFO.buildTime})</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, flexDirection: 'row', alignItems: 'center' },
  content: { padding: spacing.lg, paddingBottom: 100 },
  signOutRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  signOutBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.errorLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutBtnConfirm: {
    backgroundColor: colors.error,
  },
  signOutText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.error,
  },
  cancelLogoutText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    justifyContent: 'space-between',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textInverse,
  },
  infoCol: {
    flex: 1,
    marginLeft: spacing.md,
  },
  userEmail: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  userRole: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
    marginTop: 2,
  },
  fieldRow: {
    marginTop: spacing.sm,
  },
  fieldLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  nameInput: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  saveNameBtn: {
    width: 34,
    height: 34,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  passwordToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  passwordFields: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  passwordInput: {
    fontSize: fontSize.md,
    color: colors.text,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  langOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
  },
  langOptionActive: { backgroundColor: colors.primaryLight },
  langText: { fontSize: fontSize.md, color: colors.text },
  langTextActive: { color: colors.primary, fontWeight: fontWeight.semibold },
  checkmark: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
  },
  companyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  companyName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  companyMembers: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  codeLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginRight: spacing.sm,
  },
  codeValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    letterSpacing: 3,
    flex: 1,
  },
  regenerateBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmLogoutRow: {
    backgroundColor: colors.errorLight,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  confirmLogoutText: {
    fontSize: fontSize.sm,
    color: colors.error,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.sm,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.error,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
  },
  confirmBtnText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textInverse,
  },
  cancelBtn: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.error,
  },
  cancelBtnText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.error,
  },
  telegramStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  telegramLinkedText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.success,
  },
  telegramBlockedText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.warning,
  },
  telegramHint: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  telegramUnlinkBtn: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  telegramUnlinkText: {
    fontSize: fontSize.sm,
    color: colors.error,
    fontWeight: fontWeight.medium,
  },
  codeDisplay: {
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  codeDisplayText: {
    fontSize: 32,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    letterSpacing: 8,
  },
  openBotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
  openBotText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textInverse,
  },
  telegramExpiry: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    textAlign: 'center',
  },
  connectTelegramBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: borderRadius.md,
  },
  connectTelegramText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  botLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
  botLinkBtnText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textInverse,
  },
  codeDisplayContainer: {
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  codeDisplayLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  commandHints: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  commandHintsTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  commandHintItem: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: 2,
    fontFamily: 'monospace',
  },
  telegramBotHint: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  buildVersion: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
});