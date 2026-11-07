import '@/global.css';

import { DarkTheme, DefaultTheme, Stack, ThemeProvider as RouterThemeProvider, usePathname } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import Constants from 'expo-constants';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { Suspense } from 'react';
import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AppFooter } from '@/components/core/navigation/AppFooter';
import { initializeAppDatabase } from '@/data/database';
import { OfflineSyncRunner } from '@/data/database/OfflineSyncRunner';
import { isMockMode } from '@/data/app-mode';
import { QueryProvider } from '@/providers/query-provider';
import { AppLockProvider } from '@/providers/app-lock-provider';
import { AppThemeProvider, useAppTheme, useTheme } from '@/theme/theme-provider';
import { Radius, Spacing, WideLayoutBreakpoint } from '@/theme/tokens';
import { AuthGate } from '@/auth/auth-gate';
import { AuthProvider } from '@/auth/auth-provider';
import { requiresBrokerAuthentication, shouldShowAppNavigation } from '@/navigation/route-visibility';
import { ToastProvider } from '@/components/core/toast/ToastProvider';
import { LoadingSkeleton, SkeletonBlock } from '@/components/core/LoadingSkeleton';
import { LanguageProvider } from '@/i18n/language-provider';

void SplashScreen.preventAutoHideAsync();

function AppNavigation() {
  const { scheme } = useAppTheme();
  const colors = useTheme();
  const { width } = useWindowDimensions();
  const pathname = usePathname();
  const useNativeIosTabs = Platform.OS === 'ios' && (pathname === '/' || pathname === '/explore' || pathname === '/shared-links' || pathname === '/settings');
  const wide = !useNativeIosTabs && width >= WideLayoutBreakpoint;
  const showNavigation = shouldShowAppNavigation(pathname);
  return (
    <RouterThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <View style={[styles.appShell, wide && styles.appShellWide]}>
        {wide && showNavigation ? <View style={[styles.sidebar, { backgroundColor: colors.surface, borderRightColor: colors.border }]}><AppFooter /></View> : null}
        <View style={[styles.mainArea, wide && styles.mainAreaWide]}>
          <Stack screenOptions={{ headerShown: false, contentStyle: styles.stack }}>
            <Stack.Screen name="(tabs)" options={{ animation: 'none' }} />
            <Stack.Screen name="broker/[token]" />
            <Stack.Screen name="share/[token]" />
            <Stack.Screen name="properties/[id]" />
            <Stack.Screen name="properties/[id]/edit" />
            <Stack.Screen name="properties/create" />
            <Stack.Screen name="privacy" />
            <Stack.Screen name="terms" />
            <Stack.Screen name="help" />
          </Stack>
          {!useNativeIosTabs && !wide && showNavigation ? <View pointerEvents="box-none" style={styles.footer}><AppFooter /></View> : null}
        </View>
      </View>
    </RouterThemeProvider>
  );
}

function DatabaseLoading() {
  return (
    <View style={styles.loading}>
      <LoadingSkeleton label="Preparing local database" style={styles.loadingSkeleton}>
        <SkeletonBlock style={styles.loadingMark} />
        <SkeletonBlock style={styles.loadingLine} />
        <SkeletonBlock style={styles.loadingLineShort} />
        <SkeletonBlock style={styles.loadingCard} />
      </LoadingSkeleton>
    </View>
  );
}

function ThemedStatusBar() {
  const { scheme } = useAppTheme();
  return <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />;
}

function AppContent() {
  const pathname = usePathname();
  return isMockMode || !requiresBrokerAuthentication(pathname)
    ? <AppNavigation />
    : <AuthGate><AppNavigation /></AuthGate>;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppThemeProvider>
        <LanguageProvider>
        <ThemedStatusBar />
        <ToastProvider>
          <QueryProvider>
            <AuthProvider>
              {Platform.OS === 'web' ? (
                <AppLockProvider><AppContent /></AppLockProvider>
              ) : (
                <Suspense fallback={<DatabaseLoading />}>
                  <SQLiteProvider databaseName={Constants.expoGoConfig ? ':memory:' : 'broaker.db'} onInit={initializeAppDatabase} useSuspense>
                    <OfflineSyncRunner />
                    <AppLockProvider><AppContent /></AppLockProvider>
                  </SQLiteProvider>
                </Suspense>
              )}
            </AuthProvider>
          </QueryProvider>
        </ToastProvider>
        </LanguageProvider>
      </AppThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  appShell: { flex: 1, width: '100%', alignSelf: 'stretch', minWidth: 0 },
  appShellWide: { flexDirection: 'row' },
  sidebar: { height: '100%', borderRightWidth: StyleSheet.hairlineWidth },
  mainArea: { flex: 1, minWidth: 0, width: '100%' },
  mainAreaWide: { width: 0 },
  stack: { flex: 1, width: '100%' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 100 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.four },
  loadingSkeleton: { width: '100%', maxWidth: 360, alignItems: 'center', gap: Spacing.two },
  loadingMark: { width: 52, height: 52, borderRadius: Radius.pill, marginBottom: Spacing.one },
  loadingLine: { width: '78%', height: 15 },
  loadingLineShort: { width: '52%', height: 12 },
  loadingCard: { width: '100%', height: 180, borderRadius: Radius.large, marginTop: Spacing.two },
});
