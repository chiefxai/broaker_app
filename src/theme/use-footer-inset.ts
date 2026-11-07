import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform, useWindowDimensions } from 'react-native';
import { AppFooterHeight, Spacing, WideLayoutBreakpoint } from './tokens';

/** Space occupied by the fixed footer, including the device's bottom safe area. */
export function useFooterInset(nativeTabs = false) {
  const { bottom } = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  // Expo's automatic iOS inset applies to ScrollView, but FlatList has gaps in
  // native tab integration. Own the inset on all native-tab screens instead.
  if (Platform.OS === 'ios' && nativeTabs) return 48 + bottom;
  if (width >= WideLayoutBreakpoint) return 0;
  return AppFooterHeight + bottom + (Platform.OS === 'ios' ? Spacing.one : 0);
}

export function useFooterContentPadding(hasFloatingAction = false, nativeTabs = false) {
  const contentGap = Platform.OS === 'ios' && nativeTabs ? Spacing.two : Spacing.four;
  return useFooterInset(nativeTabs) + contentGap + (hasFloatingAction ? 56 + Spacing.two : 0);
}
