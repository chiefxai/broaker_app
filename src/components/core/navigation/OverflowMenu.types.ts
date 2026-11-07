import type { StyleProp, ViewStyle } from 'react-native';
import type { AppIconName } from '../icons';

export type OverflowMenuItem =
  | { id: string; label: string; icon: AppIconName; tone?: 'default' | 'danger'; onPress: () => void }
  | { id: string; kind: 'separator' };

export interface OverflowMenuProps {
  items: OverflowMenuItem[];
  accessibilityLabel?: string;
  visible?: boolean;
  onVisibleChange?: (visible: boolean) => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}
