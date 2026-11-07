import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Radius } from '@/theme/tokens';
import { useTheme } from '@/theme/theme-provider';

export function SkeletonBlock({ style, testID }: { style?: StyleProp<ViewStyle>; testID?: string }) {
  const colors = useTheme();
  return <View testID={testID} style={[styles.block, { backgroundColor: colors.surfaceContainer }, style]} />;
}

export function LoadingSkeleton({ label, children, style, testID }: { label: string; children: React.ReactNode; style?: StyleProp<ViewStyle>; testID?: string }) {
  return <View accessibilityRole="progressbar" accessibilityLabel={label} style={style} testID={testID}>{children}</View>;
}

const styles = StyleSheet.create({
  block: { borderRadius: Radius.small },
});
