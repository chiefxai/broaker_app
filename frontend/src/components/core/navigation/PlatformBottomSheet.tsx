import NativeBottomSheet from '@expo/ui/community/bottom-sheet';
import type { PropsWithChildren } from 'react';

import { useTheme } from '@/theme/theme-provider';

export interface PlatformBottomSheetProps extends PropsWithChildren {
  visible: boolean;
  onClose: () => void;
  testID?: string;
  snapPoints?: ('half' | 'full')[];
}

/** Native iOS and Android sheets with a web implementation from Expo UI. */
export function PlatformBottomSheet({ visible, onClose, testID, children, snapPoints = ['half', 'full'] }: PlatformBottomSheetProps) {
  const colors = useTheme();
  // The community sheet resets inherited VirtualizedList/ScrollView contexts on iOS.
  // Sheets opened from a FlatList otherwise make their own vertical ScrollViews non-scrollable.
  return <NativeBottomSheet
    index={visible ? snapPoints.length - 1 : -1}
    onClose={onClose}
    snapPoints={snapPoints.map((point) => point === 'half' ? '50%' : '100%')}
    backgroundStyle={{ backgroundColor: colors.surface }}
    enablePanDownToClose
    testID={testID}>
    {children}
  </NativeBottomSheet>;
}

