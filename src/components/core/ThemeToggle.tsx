import { useEffect, useState } from 'react';
import {
  Animated,
  Pressable,
  Platform,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { AppIcon } from './icons';
import { Radius } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-provider';

export interface ThemeToggleProps {
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function ThemeToggle({
  accessibilityLabel = 'Dark mode',
  style,
  testID = 'theme-toggle',
}: ThemeToggleProps) {
  const { scheme, colors, isHydrated, toggleColorScheme } = useAppTheme();
  const isDark = scheme === 'dark';
  const [slide] = useState(() => new Animated.Value(isDark ? 1 : 0));

  useEffect(() => {
    Animated.spring(slide, {
      toValue: isDark ? 1 : 0,
      useNativeDriver: Platform.OS !== 'web',
      stiffness: 220,
      damping: 22,
      mass: 0.8,
    }).start();
  }, [isDark, slide]);

  const translateX = slide.interpolate({ inputRange: [0, 1], outputRange: [0, 34] });

  return (
    <Pressable cssInterop={false}
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint="Switch between light and dark appearance"
      accessibilityState={{ checked: isDark, disabled: !isHydrated }}
      disabled={!isHydrated}
      onPress={toggleColorScheme}
      style={({ pressed }) => [
        styles.track,
        { backgroundColor: colors.toggleTrack, borderColor: colors.toggleBorder },
        pressed && styles.pressed,
        style,
      ]}
      testID={testID}>
      <View pointerEvents="none" style={styles.trackHints}>
        <AppIcon name="sun" size={14} color={isDark ? colors.iconMuted : colors.warning} />
        <AppIcon name="moon" size={13} color={isDark ? colors.accent : colors.iconMuted} />
      </View>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.thumb,
          { backgroundColor: colors.toggleThumb, transform: [{ translateX }] },
        ]}>
        <AppIcon
          name={isDark ? 'moon' : 'sun'}
          size={16}
          color={isDark ? colors.accent : colors.warning}
        />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 68,
    height: 34,
    padding: 3,
    borderRadius: Radius.pill,
    justifyContent: 'center',
  },
  trackHints: {
    ...StyleSheet.absoluteFill,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  thumb: {
    width: 26,
    height: 26,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  pressed: { opacity: 0.85 },
});
