import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { AppIcon, type AppIconName } from './icons';
import { GlassBackground, supportsGlassSurface } from './GlassBackground';
import { Radius, Spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/theme-provider';
import { useFooterInset } from '@/theme/use-footer-inset';
import { useLanguage } from '@/i18n/language-provider';

export interface FloatingActionButtonProps {
  accessibilityLabel: string;
  onPress: () => void;
  icon?: AppIconName;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  nativeTabs?: boolean;
}

export function FloatingActionButton({
  accessibilityLabel,
  onPress,
  icon = 'add',
  style,
  testID,
  nativeTabs = false,
}: FloatingActionButtonProps) {
  const colors = useTheme();
  const { translate } = useLanguage();
  const footerInset = useFooterInset(nativeTabs);
  const glass = supportsGlassSurface();
  return (
    <Pressable cssInterop={false}
      accessibilityRole="button"
      accessibilityLabel={translate(accessibilityLabel)}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        styles.button,
        { bottom: footerInset + Spacing.three },
        { backgroundColor: glass ? 'transparent' : colors.primary, shadowColor: colors.text },
        pressed && styles.pressed,
        style,
      ]}
      testID={testID}>
      {glass ? <GlassBackground radius={Radius.pill} tintColor={colors.primary} /> : null}
      <AppIcon name={icon} size={26} color={colors.onPrimary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    right: Spacing.three,
    bottom: Spacing.three,
    zIndex: 20,
    width: 56,
    height: 56,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.24,
    shadowRadius: 6,
  },
  pressed: { opacity: 0.86, transform: [{ scale: 0.96 }] },
});
