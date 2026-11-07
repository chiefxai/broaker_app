import type { PropsWithChildren } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LocalizedText as Text } from '@/i18n/LocalizedText';

import { AppIcon } from '../icons';
import { CoreButton } from '../CoreButton';
import { PlatformBottomSheet } from '../navigation/PlatformBottomSheet';
import { Radius, Spacing, Typography } from '@/theme/tokens';
import { useTheme } from '@/theme/theme-provider';

export interface FilterBottomSheetProps extends PropsWithChildren {
  visible: boolean;
  title: string;
  activeCount?: number;
  resultsCount?: number;
  onClose: () => void;
  onReset: () => void;
  onApply: () => void;
  applyLabel?: string;
}

export function FilterBottomSheet({
  visible,
  title,
  activeCount = 0,
  resultsCount,
  onClose,
  onReset,
  onApply,
  applyLabel = 'Show results',
  children,
}: FilterBottomSheetProps) {
  const colors = useTheme();

  return (
    <PlatformBottomSheet visible={visible} onClose={onClose} testID="filter-options-sheet">
        <View style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.header, { borderBottomColor: colors.divider }]}>
            <View style={styles.titleRow}>
              <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
              {activeCount > 0 && (
                <View style={[styles.countBadge, { backgroundColor: colors.accentContainer }]}>
                  <Text style={[styles.countText, { color: colors.onAccentContainer }]}>{activeCount} active</Text>
                </View>
              )}
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Close filters" onPress={onClose} style={[styles.closeButton, { backgroundColor: colors.surfaceLow }]}>
              <AppIcon name="close" size={18} color={colors.textSecondary} />
            </Pressable>
          </View>
          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
          <View style={[styles.footer, { borderTopColor: colors.divider, backgroundColor: colors.surface }]}>
            <CoreButton label="Reset" leadingIcon="restart_alt" variant="secondary" onPress={onReset} style={styles.resetButton} />
            <CoreButton label={`${applyLabel}${resultsCount === undefined ? '' : ` (${resultsCount})`}`} trailingIcon="arrow_forward" onPress={onApply} style={styles.applyButton} />
          </View>
        </View>
    </PlatformBottomSheet>
  );
}

export interface FilterOptionGroupProps extends PropsWithChildren {
  title: string;
  summary?: string;
}

export function FilterOptionGroup({ title, summary, children }: FilterOptionGroupProps) {
  const colors = useTheme();
  return (
    <View style={styles.group}>
      <View style={styles.groupHeader}>
        <Text style={[styles.groupTitle, { color: colors.text }]}>{title}</Text>
        {summary ? <Text style={[styles.summary, { color: colors.accent }]}>{summary}</Text> : null}
      </View>
      <View style={styles.options}>{children}</View>
    </View>
  );
}

export interface FilterChoiceProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export function FilterChoice({ label, selected, onPress, accessibilityLabel, style }: FilterChoiceProps) {
  const colors = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.choice,
        {
          backgroundColor: selected ? colors.accentContainer : colors.surfaceLow,
          borderColor: selected ? colors.accent : colors.border,
        },
        style,
      ]}>
      <Text style={[styles.choiceText, { color: selected ? colors.onAccentContainer : colors.textSecondary }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, minHeight: 0, overflow: 'hidden' },
  header: { minHeight: 58, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  titleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  title: { ...Typography.title },
  countBadge: { paddingHorizontal: Spacing.two, paddingVertical: Spacing.half, borderRadius: Radius.pill },
  countText: { ...Typography.labelSmall },
  closeButton: { width: 36, height: 36, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  body: { flexGrow: 0 },
  bodyContent: { padding: Spacing.three, gap: Spacing.four },
  group: { gap: Spacing.two },
  groupHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  groupTitle: { ...Typography.label },
  summary: { ...Typography.bodySmall },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  choice: { minHeight: 38, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: Radius.medium, borderWidth: StyleSheet.hairlineWidth, justifyContent: 'center' },
  choiceText: { ...Typography.bodySmall, fontWeight: '600' },
  footer: { padding: Spacing.three, paddingBottom: Spacing.four, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: Spacing.two },
  resetButton: { flex: 1 },
  applyButton: { flex: 2 },
});
