import { DropdownMenu, DropdownMenuItem, Host, HorizontalDivider, RNHostView, Text } from '@expo/ui/jetpack-compose';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppIcon } from '../icons';
import { useAppTheme } from '@/theme/theme-provider';
import { useLanguage } from '@/i18n/language-provider';
import type { OverflowMenuProps } from './OverflowMenu.types';

export type { OverflowMenuItem, OverflowMenuProps } from './OverflowMenu.types';

export function OverflowMenu({ items, accessibilityLabel = 'More options', style, testID }: OverflowMenuProps) {
  const { colors, scheme } = useAppTheme();
  const { translate } = useLanguage();
  const [open, setOpen] = useState(false);
  return <View style={[styles.anchor, style]} testID={testID}>
    <Host matchContents colorScheme={scheme} seedColor={colors.accent}>
      <DropdownMenu expanded={open} onDismissRequest={() => setOpen(false)} color={colors.surface}>
        <DropdownMenu.Trigger><RNHostView matchContents><Pressable cssInterop={false} accessibilityRole="button" accessibilityLabel={translate(accessibilityLabel)} accessibilityState={{ expanded: open }} onPress={() => setOpen(true)} style={styles.trigger}><AppIcon name="more_vert" size={20} color={colors.iconMuted} /></Pressable></RNHostView></DropdownMenu.Trigger>
        <DropdownMenu.Items>{items.map(item => 'kind' in item
          ? <HorizontalDivider key={item.id} color={colors.divider} />
          : <DropdownMenuItem key={item.id} elementColors={{ textColor: item.tone === 'danger' ? colors.dangerText : colors.text }} onClick={() => { setOpen(false); setTimeout(item.onPress, 250); }}>
            <DropdownMenuItem.Text><Text>{translate(item.label)}</Text></DropdownMenuItem.Text>
            <DropdownMenuItem.LeadingIcon><RNHostView matchContents><AppIcon name={item.icon} size={18} color={item.tone === 'danger' ? colors.danger : colors.iconMuted} /></RNHostView></DropdownMenuItem.LeadingIcon>
          </DropdownMenuItem>)}</DropdownMenu.Items>
      </DropdownMenu>
    </Host>
  </View>;
}

const styles = StyleSheet.create({ anchor: { alignSelf: 'flex-start' }, trigger: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' } });
