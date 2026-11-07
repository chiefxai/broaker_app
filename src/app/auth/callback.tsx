import { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { LocalizedText as Text } from '@/i18n/LocalizedText';
import * as WebBrowser from 'expo-web-browser';

import { useTheme } from '@/theme/theme-provider';
import { Typography } from '@/theme/tokens';

export default function AuthCallbackScreen() {
  const colors = useTheme();
  useEffect(() => {
    if (Platform.OS === 'web') WebBrowser.maybeCompleteAuthSession();
  }, []);

  return <View style={[styles.container, { backgroundColor: colors.background }]}>
    <Text style={[styles.message, { color: colors.textSecondary }]}>Returning to Broaker…</Text>
  </View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  message: { ...Typography.body },
});
