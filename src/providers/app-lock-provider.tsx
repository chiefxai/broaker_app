import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { ActivityIndicator, AppState, Keyboard, Platform, Pressable, StyleSheet, View } from 'react-native';
import { LocalizedText as Text } from '@/i18n/LocalizedText';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppIcon } from '@/components/core/icons';
import { CoreButton } from '@/components/core/CoreButton';
import { PinCodeInput } from '@/components/core/forms/PinCodeInput';
import { Spacing, Typography } from '@/theme/tokens';
import { useTheme } from '@/theme/theme-provider';

interface AppLockContextValue {
  isEnabled: boolean;
  isLocked: boolean;
  isLoading: boolean;
  storageError: boolean;
  biometricEnabled: boolean;
  canUseBiometrics: boolean;
  setBiometricEnabled: (enabled: boolean) => Promise<void>;
  unlockWithBiometrics: () => Promise<boolean>;
  setPin: (pin: string) => Promise<void>;
  disable: () => Promise<void>;
  unlock: (pin: string) => Promise<boolean>;
  lock: () => void;
  retryStorage: () => Promise<void>;
}

const AppLockContext = createContext<AppLockContextValue | null>(null);
const STORAGE_KEY = 'estateflow.app-lock.pin.v1';
const BIOMETRIC_KEY = 'estateflow.app-lock.biometric.v1';

async function readStoredPin() {
  if (Platform.OS === 'web') return globalThis.sessionStorage?.getItem(STORAGE_KEY) ?? null;
  return SecureStore.getItemAsync(STORAGE_KEY);
}

async function writeStoredPin(pin: string) {
  if (Platform.OS === 'web') {
    globalThis.sessionStorage?.setItem(STORAGE_KEY, pin);
    return;
  }
  await SecureStore.setItemAsync(STORAGE_KEY, pin, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
}

async function removeStoredPin() {
  if (Platform.OS === 'web') {
    globalThis.sessionStorage?.removeItem(STORAGE_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(STORAGE_KEY);
}

export function AppLockProvider({ children }: PropsWithChildren) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [storageError, setStorageError] = useState(false);
  const [biometricEnabled, setBiometricEnabledState] = useState(false);
  const [canUseBiometrics, setCanUseBiometrics] = useState(false);

  const retryStorage = useCallback(async () => {
    setIsLoading(true);
    try {
      const pin = await readStoredPin();
      const biometricPreference = Platform.OS !== 'web' && await SecureStore.getItemAsync(BIOMETRIC_KEY) === 'true';
      setIsEnabled(pin !== null);
      setIsLocked(pin !== null);
      setBiometricEnabledState(pin !== null && biometricPreference);
      setStorageError(false);
    } catch {
      setStorageError(true);
      setIsLocked(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    readStoredPin()
      .then(async (pin) => {
        if (!mounted) return;
        const biometricPreference = Platform.OS !== 'web' && await SecureStore.getItemAsync(BIOMETRIC_KEY) === 'true';
        if (Platform.OS !== 'web') {
          const [hardware, enrolled] = await Promise.all([LocalAuthentication.hasHardwareAsync(), LocalAuthentication.isEnrolledAsync()]);
          if (mounted) setCanUseBiometrics(hardware && enrolled);
        }
        setIsEnabled(pin !== null);
        setIsLocked(pin !== null);
        setBiometricEnabledState(pin !== null && biometricPreference);
        setStorageError(false);
      })
      .catch(() => {
        if (!mounted) return;
        setStorageError(true);
        setIsLocked(true);
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const lockIfEnabled = () => setIsLocked((locked) => isEnabled || locked);
    const stateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') lockIfEnabled();
    });
    // React Native only emits the blur event on Android; avoid subscribing to it on web/iOS.
    const blurSubscription = Platform.OS === 'android'
      ? AppState.addEventListener('blur', lockIfEnabled)
      : null;
    return () => {
      stateSubscription.remove();
      blurSubscription?.remove();
    };
  }, [isEnabled]);

  const setPin = useCallback(async (pin: string) => {
    if (!/^\d{4}$/.test(pin)) throw new Error('PIN must contain exactly four digits.');
    await writeStoredPin(pin);
    setIsEnabled(true);
    setIsLocked(false);
    setStorageError(false);
  }, []);

  const disable = useCallback(async () => {
    await removeStoredPin();
    if (Platform.OS !== 'web') await SecureStore.deleteItemAsync(BIOMETRIC_KEY);
    setIsEnabled(false);
    setIsLocked(false);
    setBiometricEnabledState(false);
    setStorageError(false);
  }, []);

  const setBiometricEnabled = useCallback(async (enabled: boolean) => {
    if (enabled) {
      if (Platform.OS === 'web' || !isEnabled || !canUseBiometrics) throw new Error('Biometric unlock is unavailable on this device.');
      await SecureStore.setItemAsync(BIOMETRIC_KEY, 'true', { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
    } else if (Platform.OS !== 'web') {
      await SecureStore.deleteItemAsync(BIOMETRIC_KEY);
    }
    setBiometricEnabledState(enabled);
  }, [isEnabled, canUseBiometrics]);

  const unlock = useCallback(async (pin: string) => {
    try {
      const storedPin = await readStoredPin();
      if (storedPin && storedPin === pin) {
        setIsLocked(false);
        return true;
      }
      return false;
    } catch {
      setStorageError(true);
      return false;
    }
  }, []);

  const unlockWithBiometrics = useCallback(async () => {
    if (!biometricEnabled || !canUseBiometrics || !isEnabled) return false;
    try {
      const result = await LocalAuthentication.authenticateAsync({ promptMessage: 'Unlock Broaker', cancelLabel: 'Use PIN', disableDeviceFallback: true });
      if (result.success) setIsLocked(false);
      return result.success;
    } catch { return false; }
  }, [biometricEnabled, canUseBiometrics, isEnabled]);

  const lock = useCallback(() => {
    if (isEnabled) setIsLocked(true);
  }, [isEnabled]);

  const value = useMemo(() => ({ isEnabled, isLocked, isLoading, storageError, biometricEnabled, canUseBiometrics, setBiometricEnabled, unlockWithBiometrics, setPin, disable, unlock, lock, retryStorage }), [isEnabled, isLocked, isLoading, storageError, biometricEnabled, canUseBiometrics, setBiometricEnabled, unlockWithBiometrics, setPin, disable, unlock, lock, retryStorage]);

  return (
    <AppLockContext.Provider value={value}>
      {children}
      {(isLoading || isLocked || storageError) && <AppLockOverlay />}
    </AppLockContext.Provider>
  );
}

export function useAppLock() {
  const context = useContext(AppLockContext);
  if (!context) throw new Error('useAppLock must be used within AppLockProvider');
  return context;
}

function AppLockOverlay() {
  const colors = useTheme();
  const { isLoading, isLocked, storageError, biometricEnabled, unlockWithBiometrics, unlock, retryStorage } = useAppLock();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const biometricAttempted = useRef(false);

  useEffect(() => {
    if (!isLocked) {
      biometricAttempted.current = false;
      return;
    }
    if (!biometricEnabled) {
      return;
    }
    if (biometricAttempted.current) return;
    biometricAttempted.current = true;
    let active = true;
    Keyboard.dismiss();
    setIsChecking(true);
    void unlockWithBiometrics().finally(() => {
      if (active) {
        setIsChecking(false);
      }
    });
    return () => { active = false; };
  }, [isLocked, biometricEnabled, unlockWithBiometrics]);

  const submit = async (enteredPin = pin) => {
    if (enteredPin.length !== 4 || isChecking) return;
    Keyboard.dismiss();
    setIsChecking(true);
    const accepted = await unlock(enteredPin);
    setIsChecking(false);
    if (accepted) {
      setPin('');
      setError('');
    } else {
      setPin('');
      setError('That PIN is incorrect. Try again.');
    }
  };

  return (
    <SafeAreaView accessibilityViewIsModal style={[styles.overlay, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <Pressable accessibilityElementsHidden style={StyleSheet.absoluteFill} onPress={Keyboard.dismiss} />
      {isLoading ? (
        <ActivityIndicator accessibilityLabel="Checking app lock" size="large" color={colors.accent} />
      ) : storageError ? (
        <View style={styles.lockContent}>
          <AppIcon name="lock" size={34} color={colors.danger} />
          <Text style={[styles.title, { color: colors.text }]}>App lock unavailable</Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>Secure storage could not be read. Retry before continuing.</Text>
          <CoreButton label="Retry" onPress={() => void retryStorage()} />
        </View>
      ) : (
        <View style={styles.lockContent}>
          <View style={[styles.lockIcon, { backgroundColor: colors.accentContainer }]}><AppIcon name="lock" size={28} color={colors.accent} /></View>
          <Text style={[styles.title, { color: colors.text }]}>Broaker is locked</Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>Enter your four-digit PIN to return to your workspace.</Text>
          <PinCodeInput label="App lock PIN" value={pin} onChangeText={(next) => { setPin(next); setError(''); if (next.length === 4) void submit(next); }} errorMessage={error} autoFocus={!isChecking} editable={!isChecking} testID="app-lock-pin" />
          <CoreButton label={isChecking ? 'Checking…' : 'Unlock'} fullWidth disabled={pin.length !== 4 || isChecking} loading={isChecking} onPress={() => void submit()} />
          {biometricEnabled ? <CoreButton label="Unlock with biometrics" variant="secondary" fullWidth onPress={() => void unlockWithBiometrics()} /> : null}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, zIndex: 10000, elevation: 10000, alignItems: 'center', justifyContent: 'center', padding: Spacing.four },
  lockContent: { width: '100%', maxWidth: 380, alignItems: 'center', gap: Spacing.three },
  lockIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  title: { ...Typography.heading, textAlign: 'center' },
  body: { ...Typography.body, textAlign: 'center' },
});
