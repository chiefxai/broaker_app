import type { ReactNode } from 'react';
import { View } from 'react-native';

export default function MockCommunityBottomSheet({ index, children, testID }: { index: number; children: ReactNode; testID?: string }) {
  return index < 0 ? null : <View testID={testID}>{children}</View>;
}
