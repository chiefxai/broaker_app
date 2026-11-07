import { useCallback, useEffect, useRef, useState, type ElementRef } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { LocalizedText as Text } from '@/i18n/LocalizedText';

import { AppIcon } from '../icons';
import type { OverflowMenuProps } from './OverflowMenu.types';
import { Radius, Spacing, Typography } from '@/theme/tokens';
import { useTheme } from '@/theme/theme-provider';

export type { OverflowMenuItem, OverflowMenuProps } from './OverflowMenu.types';

interface MenuPosition {
  top: number;
  left: number;
}

const MENU_WIDTH = 192;

export function OverflowMenu({
  items,
  accessibilityLabel = 'More options',
  visible,
  onVisibleChange,
  style,
  testID,
}: OverflowMenuProps) {
  const colors = useTheme();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const triggerRef = useRef<ElementRef<typeof View> | null>(null);
  const [localOpen, setLocalOpen] = useState(false);
  const isOpen = visible ?? localOpen;
  const setIsOpen = useCallback((next: boolean) => {
    if (visible === undefined) setLocalOpen(next);
    onVisibleChange?.(next);
  }, [onVisibleChange, visible]);
  const [position, setPosition] = useState<MenuPosition>({ top: Spacing.four, left: Spacing.three });
  const menuWidth = Math.min(MENU_WIDTH, Math.max(0, windowWidth - Spacing.five));

  const measureMenu = useCallback(() => {
    const trigger = triggerRef.current as (View & { measureInWindow?: (callback: (x: number, y: number, width: number, height: number) => void) => void }) | null;
    if (trigger?.measureInWindow) {
      trigger.measureInWindow((x, y, width, height) => {
        const estimatedHeight = items.reduce<number>((total, item) => total + ('kind' in item ? 9 : 44), Spacing.two);
        const left = Math.max(Spacing.two, Math.min(x + width - menuWidth, windowWidth - menuWidth - Spacing.two));
        const below = y + height + Spacing.one;
        const top = below + estimatedHeight > windowHeight - Spacing.two
          ? Math.max(Spacing.two, y - estimatedHeight - Spacing.one)
          : below;
        setPosition({ top, left });
      });
    }
  }, [items, menuWidth, windowHeight, windowWidth]);

  const openMenu = useCallback(() => {
    measureMenu();
    setIsOpen(true);
  }, [measureMenu, setIsOpen]);

  useEffect(() => {
    if (visible) measureMenu();
  }, [measureMenu, visible]);

  return (
    <View ref={triggerRef} style={[styles.anchor, style]} testID={testID}>
      <Pressable cssInterop={false}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ expanded: isOpen }}
        onPress={openMenu}
        hitSlop={6}
        style={({ pressed }) => [styles.trigger, { backgroundColor: pressed ? colors.surfaceContainer : 'transparent' }]}>
        <AppIcon name="more_vert" size={20} color={colors.iconMuted} />
      </Pressable>
      <Modal transparent visible={isOpen} animationType="fade" onRequestClose={() => setIsOpen(false)}>
        <View style={styles.overlay} accessibilityViewIsModal>
          <Pressable cssInterop={false} accessibilityRole="button" accessibilityLabel="Dismiss menu" onPress={() => setIsOpen(false)} style={StyleSheet.absoluteFill} />
          <View
            accessibilityLabel={`${accessibilityLabel} menu`}
            style={[styles.menu, { top: position.top, left: position.left, width: menuWidth, backgroundColor: colors.surface, borderColor: colors.border, shadowColor: colors.text }]}>
            {items.map((item) => 'kind' in item ? (
              <View key={item.id} style={[styles.separator, { backgroundColor: colors.divider }]} />
            ) : (
              <Pressable cssInterop={false}
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={item.label}
                onPress={() => {
                  setIsOpen(false);
                  item.onPress();
                }}
                style={({ pressed }) => [styles.menuItem, pressed && { backgroundColor: colors.surfaceContainer }]}>
                <AppIcon name={item.icon} size={17} color={item.tone === 'danger' ? colors.danger : colors.iconMuted} />
                <Text numberOfLines={1} style={[styles.menuLabel, { color: item.tone === 'danger' ? colors.dangerText : colors.text }]}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  anchor: { alignSelf: 'flex-start', zIndex: 1 },
  trigger: { width: 36, height: 36, borderRadius: Radius.small, alignItems: 'center', justifyContent: 'center' },
  overlay: { flex: 1 },
  menu: { position: 'absolute', paddingVertical: Spacing.one, borderRadius: Radius.medium, overflow: 'hidden', elevation: 12, shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } },
  menuItem: { minHeight: 44, paddingHorizontal: Spacing.three, flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  menuLabel: { ...Typography.bodySmall, flex: 1, fontWeight: '500' },
  separator: { height: StyleSheet.hairlineWidth, marginVertical: Spacing.one, marginHorizontal: Spacing.three },
});
