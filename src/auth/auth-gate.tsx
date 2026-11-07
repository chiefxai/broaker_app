import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { LocalizedText as Text } from '@/i18n/LocalizedText';
import { LocalizedTextInput } from '@/i18n/LocalizedTextInput';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CoreButton } from '@/components/core/CoreButton';
import { LoadingSkeleton, SkeletonBlock } from '@/components/core/LoadingSkeleton';
import { ThemeToggle } from '@/components/core/ThemeToggle';
import { AppIcon } from '@/components/core/icons';
import { Radius, Spacing, Typography } from '@/theme/tokens';
import { useTheme } from '@/theme/theme-provider';
import { useAuth } from './auth-provider';

function isValidEmail(value: string) {
  const email = value.trim();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(value: string) {
  const phone = value.trim();
  return phone.length >= 7 && phone.length <= 32;
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const colors = useTheme();
  const auth = useAuth();
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const emailValid = isValidEmail(email);
  const fullNameValid = fullName.trim().length >= 2 && fullName.trim().length <= 120;
  const phoneValid = isValidPhone(phoneNumber);

  if (auth.isAuthenticated) return children;
  if (!auth.isReady || (auth.isLoading && !auth.isAuthenticated)) {
    return <SafeAreaView style={[styles.safe, styles.loading, { backgroundColor: colors.background }]}>
      <LoadingSkeleton label="Preparing sign in" style={styles.loadingSkeleton}>
        <SkeletonBlock style={styles.loadingMark} /><SkeletonBlock style={styles.loadingLine} /><SkeletonBlock style={styles.loadingLineShort} />
      </LoadingSkeleton>
    </SafeAreaView>;
  }

  const handleSubmit = async () => {
    auth.clearError();
    try {
      if (isCreatingAccount) await auth.signUp({ fullName, email, phoneNumber, password });
      else await auth.signIn(email, password);
    } catch {
      // AuthProvider exposes a safe request error below.
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.container}>
          <View style={styles.topRow}>
            <View style={styles.brand}>
              <View style={[styles.brandMark, { backgroundColor: colors.accentContainer }]}>
                <AppIcon name="domain" size={21} color={colors.accent} />
              </View>
              <Text style={[styles.brandName, { color: colors.text }]}>Broaker</Text>
            </View>
            <ThemeToggle accessibilityLabel="Toggle dark theme" />
          </View>

          <View style={styles.headingGroup}>
            <Text style={[styles.eyebrow, { color: colors.accent }]}>BROKER WORKSPACE</Text>
            <Text style={[styles.heading, { color: colors.text }]}>Welcome to Broaker</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Sign in to manage your broker workspace.</Text>
          </View>

          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            {auth.error ? <Text accessibilityRole="alert" testID="auth-error" style={[styles.errorBanner, { color: colors.dangerText, backgroundColor: colors.dangerContainer }]}>{auth.error}</Text> : null}
            {isCreatingAccount ? <>
              <LocalizedTextInput accessibilityLabel="Full name" placeholder="Full name" autoComplete="name" maxLength={120} value={fullName} onChangeText={setFullName} style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceLow }]} />
              {fullName.length > 0 && !fullNameValid ? <Text accessibilityRole="alert" style={[styles.fieldError, { color: colors.dangerText }]}>Enter your full name (2–120 characters).</Text> : null}
              <LocalizedTextInput accessibilityLabel="Phone number" placeholder="Phone number" autoComplete="tel" keyboardType="phone-pad" maxLength={32} value={phoneNumber} onChangeText={setPhoneNumber} style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceLow }]} />
              {phoneNumber.length > 0 && !phoneValid ? <Text accessibilityRole="alert" style={[styles.fieldError, { color: colors.dangerText }]}>Enter a phone number between 7 and 32 characters.</Text> : null}
            </> : null}
            <LocalizedTextInput accessibilityLabel="Email" placeholder="name@example.com" autoComplete="email" keyboardType="email-address" autoCapitalize="none" maxLength={254} value={email} onChangeText={setEmail} style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceLow }]} />
            {email.length > 0 && !emailValid ? <Text accessibilityRole="alert" testID="email-validation-error" style={[styles.fieldError, { color: colors.dangerText }]}>Enter a valid email address. Use your email, not a username.</Text> : null}
            <LocalizedTextInput accessibilityLabel="Password" placeholder="Password" autoComplete={isCreatingAccount ? 'new-password' : 'current-password'} secureTextEntry maxLength={128} value={password} onChangeText={setPassword} style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceLow }]} />
            <CoreButton
              label={isCreatingAccount ? 'Create account' : 'Sign in'}
              trailingIcon="arrow_forward"
              size="large"
              fullWidth
              loading={auth.isLoading}
              disabled={!emailValid || !password || password.length > 128 || (isCreatingAccount && (!fullNameValid || !phoneValid || password.length < 12))}
              onPress={() => void handleSubmit()}
              testID="password-auth-submit"
            />
            {isCreatingAccount ? <Text style={[styles.helper, { color: colors.textSecondary }]}>Use at least 12 characters for your password.</Text> : null}
            <CoreButton label={isCreatingAccount ? 'Already have an account? Sign in' : 'Create an account'} variant="ghost" fullWidth onPress={() => { setIsCreatingAccount(!isCreatingAccount); auth.clearError(); }} testID="toggle-auth-mode" />
          </View>
          <Text style={[styles.legal, { color: colors.textSecondary }]}>Secure access to your broker workspace</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  loading: { alignItems: 'center', justifyContent: 'center' },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: Spacing.three, paddingVertical: Spacing.four },
  container: { width: '100%', maxWidth: 460, alignSelf: 'center', gap: Spacing.four },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  brandMark: { width: 40, height: 40, borderRadius: Radius.medium, alignItems: 'center', justifyContent: 'center' },
  brandName: { fontSize: 18, lineHeight: 24, fontWeight: '700' },
  headingGroup: { gap: Spacing.two },
  eyebrow: { ...Typography.labelSmall, letterSpacing: 1.2 },
  heading: { fontSize: 30, lineHeight: 38, fontWeight: '700' },
  subtitle: { ...Typography.body, maxWidth: 390 },
  card: { padding: Spacing.three, borderRadius: Radius.large, gap: Spacing.three },
  errorBanner: { ...Typography.bodySmall, padding: Spacing.two, borderRadius: Radius.small }, fieldError: { ...Typography.labelSmall, marginTop: -Spacing.two },
  input: { minHeight: 48, borderWidth: StyleSheet.hairlineWidth, borderRadius: Radius.medium, paddingHorizontal: Spacing.three, ...Typography.body },
  helper: { ...Typography.bodySmall, textAlign: 'center' },
  legal: { ...Typography.bodySmall, textAlign: 'center' },
  loadingSkeleton: { width: '100%', maxWidth: 320, alignItems: 'center', gap: Spacing.two },
  loadingMark: { width: 48, height: 48, borderRadius: Radius.pill, marginBottom: Spacing.one },
  loadingLine: { width: '84%', height: 14 },
  loadingLineShort: { width: '56%', height: 12 },
});
