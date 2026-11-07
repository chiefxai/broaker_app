import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Switch, View } from 'react-native';
import { LocalizedText as Text } from '@/i18n/LocalizedText';
import { AppIcon, CoreButton, PinCodeInput, SettingsRow } from '@/components/core';
import { useAppLock } from '@/providers/app-lock-provider';
import { Radius, Spacing, Typography } from '@/theme/tokens';
import { useTheme } from '@/theme/theme-provider';
import { SettingsIntro, SettingsPage, SettingsSection } from './settings-ui';
import { useToast } from '@/components/core/toast/ToastProvider';

export default function SecurityScreen() {
  const colors = useTheme(); const lock = useAppLock(); const { showToast } = useToast();
  const [setupOpen, setSetupOpen] = useState(false); const [changeOpen, setChangeOpen] = useState(false);
  const [currentPin, setCurrentPin] = useState(''); const [pin, setPin] = useState(''); const [confirm, setConfirm] = useState(''); const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  const resetForm = () => { setCurrentPin(''); setPin(''); setConfirm(''); setError(''); };
  const submit = async () => {
    setError('');
    if (changeOpen && !await lock.unlock(currentPin)) { setError('Current PIN is incorrect.'); return; }
    if (!/^\d{4}$/.test(pin)) { setError('Enter a four-digit PIN.'); return; }
    if (pin !== confirm) { setError('The PINs do not match.'); return; }
    setSaving(true);
    try { await lock.setPin(pin); setSetupOpen(false); setChangeOpen(false); resetForm(); showToast('App lock PIN saved securely on this device.', 'success'); }
    catch { setError('Could not save the PIN securely. Try again.'); }
    finally { setSaving(false); }
  };
  const disable = async () => { try { await lock.disable(); showToast('App lock is off.', 'success'); } catch { showToast('Could not remove the PIN from secure storage.', 'error'); } };
  return <SettingsPage title="Security & PIN">
    <SettingsIntro title="App security & session PIN" description="Protect access to your workspace on this device. Your PIN stays in secure device storage and is never sent to the API." />
    <View style={[styles.vault, { backgroundColor: colors.accentContainer }]}><AppIcon name="verified_user" size={22} color={colors.accent} /><View style={styles.vaultCopy}><Text style={[styles.vaultTitle, { color: colors.onAccentContainer }]}>Broaker Vault · Encrypted</Text><Text style={[styles.body, { color: colors.onAccentContainer }]}>Device-level app lock</Text></View></View>
    <SettingsSection title="App lock">
      <SettingsRow title="Require PIN on app launch" description="Lock when the app moves to the background" icon="lock" switchValue={lock.isEnabled} onSwitchChange={(enabled) => { if (enabled) { setSetupOpen(true); setChangeOpen(false); } else void disable(); }} />
      {lock.isEnabled ? <SettingsRow title="Active PIN" description="Change your four-digit app lock PIN" icon="verified" valueLabel="Enabled" onPress={() => { resetForm(); setChangeOpen(true); setSetupOpen(false); }} /> : <Text style={[styles.body, { color: colors.textSecondary }]}>Set a PIN before the app lock can be enabled.</Text>}
    </SettingsSection>
    {(setupOpen || changeOpen) && <View style={[styles.form, { backgroundColor: colors.surfaceLow }]}>
      <Text style={[styles.formTitle, { color: colors.text }]}>{changeOpen ? 'Change app lock PIN' : 'Set app lock PIN'}</Text>
      {changeOpen ? <PinCodeInput label="Current PIN" value={currentPin} onChangeText={(value) => { setCurrentPin(value); setError(''); }} /> : null}
      <PinCodeInput label="New PIN" value={pin} onChangeText={(value) => { setPin(value); setError(''); }} autoFocus={!changeOpen} />
      <PinCodeInput label="Confirm new PIN" value={confirm} onChangeText={(value) => { setConfirm(value); setError(''); }} />
      {error ? <Text accessibilityRole="alert" style={[styles.body, { color: colors.dangerText }]}>{error}</Text> : null}
      <View style={styles.actions}><CoreButton label={saving ? 'Saving…' : 'Save PIN'} loading={saving} disabled={saving} onPress={() => void submit()} /><CoreButton label="Cancel" variant="ghost" disabled={saving} onPress={() => { setSetupOpen(false); setChangeOpen(false); resetForm(); }} /></View>
    </View>}
    <SettingsSection title="Additional protection">
      <View style={[styles.unavailable, { backgroundColor: colors.surface }]}><AppIcon name="fingerprint" size={20} color={lock.canUseBiometrics ? colors.accent : colors.iconMuted} /><View style={styles.vaultCopy}><Text style={[styles.formTitle, { color: colors.text }]}>Biometric unlock</Text><Text style={[styles.body, { color: colors.textSecondary }]}>{!lock.isEnabled ? 'Set an app lock PIN before enabling biometrics.' : lock.canUseBiometrics ? 'Use this device’s fingerprint or face recognition to unlock.' : 'No enrolled fingerprint or face recognition is available on this device.'}</Text></View><Switch accessibilityLabel="Biometric unlock" value={lock.biometricEnabled} disabled={!lock.isEnabled || !lock.canUseBiometrics} onValueChange={(enabled) => { void lock.setBiometricEnabled(enabled).catch(() => showToast('Could not update biometric unlock.', 'error')); }} trackColor={{ false: colors.toggleTrack, true: colors.accent }} /></View>
      <Text style={[styles.body, { color: colors.textSecondary }]}>Auto-lock timing is controlled by the current system lock behavior. Timed lock preferences are not supported by the installed security provider.</Text>
    </SettingsSection>
    <SettingsSection title="Signed-in devices"><View style={[styles.session, { backgroundColor: colors.surface }]}><AppIcon name="smartphone" size={22} color={colors.accent} /><View style={styles.vaultCopy}><Text style={[styles.formTitle, { color: colors.text }]}>This device</Text><Text style={[styles.body, { color: colors.textSecondary }]}>Current session · Protected by app lock</Text></View><Text style={[styles.current, { color: colors.successText }]}>CURRENT</Text></View><Text style={[styles.body, { color: colors.textSecondary }]}>Account-wide session management is not available in the current API contract.</Text></SettingsSection>
    {lock.isEnabled ? <Pressable accessibilityRole="button" onPress={() => { lock.lock(); showToast('Workspace locked. Enter your PIN to continue.', 'warning'); }} style={styles.lockAction}><AppIcon name="lock" size={18} color={colors.dangerText} /><Text style={[styles.danger, { color: colors.dangerText }]}>Lock workspace now</Text></Pressable> : null}
    {Platform.OS === 'web' ? <Text style={[styles.body, { color: colors.textSecondary }]}>On web, this privacy lock lasts for the current browser tab session.</Text> : null}
  </SettingsPage>;
}

const styles = StyleSheet.create({ vault: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.large }, vaultCopy: { flex: 1, gap: Spacing.half }, vaultTitle: Typography.label, body: Typography.bodySmall, form: { gap: Spacing.three, padding: Spacing.three, borderRadius: Radius.large }, formTitle: Typography.label, actions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }, unavailable: { minHeight: 64, borderRadius: Radius.medium, padding: Spacing.two, flexDirection: 'row', alignItems: 'center', gap: Spacing.two }, session: { minHeight: 64, borderRadius: Radius.medium, padding: Spacing.three, flexDirection: 'row', alignItems: 'center', gap: Spacing.two }, current: { ...Typography.labelSmall }, lockAction: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, alignSelf: 'flex-start', paddingVertical: Spacing.two }, danger: Typography.label });
