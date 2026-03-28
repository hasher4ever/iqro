import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthActions } from '@convex-dev/auth/react';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../lib/theme';
import { t, setLanguage, getLanguage, LANGUAGES, getLanguageLabel, Language } from '../lib/i18n';
import { Button, Input } from '../components/UI';

export default function LoginScreen() {
  const { signIn } = useAuthActions();

  const [step, setStep] = useState<'signIn' | 'signUp'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lang, setLang] = useState<Language>(getLanguage());
  const [showLangPicker, setShowLangPicker] = useState(false);

  const handleLanguageChange = (newLang: Language) => {
    setLanguage(newLang);
    setLang(newLang);
    setShowLangPicker(false);
  };

  const handleSignIn = async () => {
    setError('');
    if (!email || !password) {
      setError(t('error') + ': ' + t('fill_all_fields'));
      return;
    }
    setLoading(true);
    try {
      await signIn('password', { email, password, flow: 'signIn' });
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('InvalidAccountId') || msg.includes('InvalidSecret') || msg.includes('invalid')) {
        setError(t('invalid_credentials'));
      } else if (msg.includes('already exists') || msg.includes('AccountAlreadyExists')) {
        setError(t('email_already_exists'));
      } else {
        setError(msg || t('error_generic'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    setError('');
    if (!name || !email || !password) {
      setError(t('fill_all_fields'));
      return;
    }
    if (password.length < 6) {
      setError(t('password_min_length'));
      return;
    }
    setLoading(true);
    try {
      await signIn('password', { email, password, name, flow: 'signUp' });
      // After signUp, user becomes Authenticated.
      // App.tsx RoleRouter will show CompanyOnboardingScreen automatically.
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('already exists') || msg.includes('AccountAlreadyExists')) {
        setError(t('email_already_exists'));
      } else {
        setError(msg || t('error_generic'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Language selector */}
          <TouchableOpacity
            style={styles.langButton}
            onPress={() => setShowLangPicker(!showLangPicker)}
          >
            <Text style={styles.langButtonText}>{getLanguageLabel(lang)}</Text>
          </TouchableOpacity>

          {showLangPicker && (
            <View style={styles.langPicker}>
              {LANGUAGES.map((l) => (
                <TouchableOpacity
                  key={l}
                  style={[styles.langOption, l === lang && styles.langOptionActive]}
                  onPress={() => handleLanguageChange(l)}
                >
                  <Text style={[styles.langOptionText, l === lang && styles.langOptionTextActive]}>
                    {getLanguageLabel(l)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Logo area */}
          <View style={styles.logoArea}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>IQ</Text>
            </View>
            <Text style={styles.appName}>{t('app_name')}</Text>
            <Text style={styles.appSubtitle}>Learning Center ERP</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {error ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {step === 'signUp' && (
              <Input
                label={t('name')}
                value={name}
                onChangeText={setName}
                placeholder={t('name')}
                autoCapitalize="words"
              />
            )}

            <Input
              label={t('email')}
              value={email}
              onChangeText={setEmail}
              placeholder={t('email')}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Input
              label={t('password')}
              value={password}
              onChangeText={setPassword}
              placeholder={t('password')}
              secureTextEntry
            />

            <Button
              title={loading ? t('loading') : step === 'signIn' ? t('login') : t('register')}
              onPress={step === 'signIn' ? handleSignIn : handleSignUp}
              loading={loading}
              style={{ marginTop: spacing.md }}
            />

            <TouchableOpacity
              style={styles.switchButton}
              onPress={() => {
                setStep(step === 'signIn' ? 'signUp' : 'signIn');
                setError('');
              }}
            >
              <Text style={styles.switchText}>
                {step === 'signIn' ? t('sign_up_instead') : t('sign_in_instead')}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.xl,
    justifyContent: 'center',
  },
  langButton: {
    alignSelf: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  langButtonText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  langPicker: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    padding: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  langOption: {
    padding: spacing.md,
    borderRadius: borderRadius.sm,
  },
  langOptionActive: {
    backgroundColor: colors.primaryLight,
  },
  langOptionText: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  langOptionTextActive: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  logoArea: {
    alignItems: 'center',
    marginBottom: spacing.xxxl,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  logoText: {
    fontSize: 32,
    fontWeight: fontWeight.bold,
    color: colors.textInverse,
  },
  appName: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  appSubtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  form: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  errorBanner: {
    backgroundColor: '#FEE2E2',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
  },
  errorText: {
    color: colors.error,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  switchButton: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  switchText: {
    fontSize: fontSize.md,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
});