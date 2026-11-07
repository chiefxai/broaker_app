import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { Platform, StyleSheet, type ColorValue } from 'react-native';

import { useAppTheme } from '@/theme/theme-provider';

/** Whether native Liquid Glass can be rendered by the current iOS runtime. */
export function supportsGlassSurface() {
  return Platform.OS === 'ios' && isLiquidGlassAvailable();
}

export function GlassBackground({ radius = 0, tintColor }: { radius?: number; tintColor?: ColorValue }) {
  const { scheme } = useAppTheme();
  if (!supportsGlassSurface()) return null;
  return <GlassView pointerEvents="none" colorScheme={scheme} glassEffectStyle="regular" tintColor={tintColor} style={[StyleSheet.absoluteFill, { borderRadius: radius }]} />;
}
