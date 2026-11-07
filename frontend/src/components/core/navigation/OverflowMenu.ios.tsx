import { Button, Divider, Host, Menu, RNHostView } from '@expo/ui/swift-ui';
import { accessibilityLabel as nativeAccessibilityLabel } from '@expo/ui/swift-ui/modifiers';
import { StyleSheet, View } from 'react-native';

import { AppIcon, getIosIconSymbol } from '../icons';
import { useAppTheme } from '@/theme/theme-provider';
import { useLanguage } from '@/i18n/language-provider';
import type { OverflowMenuProps } from './OverflowMenu.types';

export type { OverflowMenuItem, OverflowMenuProps } from './OverflowMenu.types';

export function OverflowMenu({ items, accessibilityLabel = 'More options', style, testID }: OverflowMenuProps) {
  const { colors, scheme } = useAppTheme();
  const { translate } = useLanguage();
  return <View style={[styles.anchor, style]} testID={testID}>
    <Host style={styles.host} colorScheme={scheme} seedColor={colors.accent}>
      <Menu modifiers={[nativeAccessibilityLabel(translate(accessibilityLabel))]} label={<RNHostView matchContents><View style={styles.trigger}><AppIcon name="more_vert" size={20} color={colors.iconMuted} /></View></RNHostView>}>
        {items.map(item => 'kind' in item
          ? <Divider key={item.id} />
          : <Button key={item.id} label={translate(item.label)} systemImage={getIosIconSymbol(item.icon)} role={item.tone === 'danger' ? 'destructive' : 'default'} onPress={() => setTimeout(item.onPress, 250)} />)}
      </Menu>
    </Host>
  </View>;
}

const styles = StyleSheet.create({ anchor: { alignSelf: 'flex-start' }, host: { width: 40, height: 40 }, trigger: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' } });
