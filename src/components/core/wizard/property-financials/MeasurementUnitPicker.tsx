import { useState } from 'react';
import { Modal, Pressable, StyleSheet } from 'react-native';
import { LocalizedText as Text } from '@/i18n/LocalizedText';

import { AppIcon } from '@/components/core/icons';
import { Radius, Spacing, Typography } from '@/theme/tokens';
import { useTheme } from '@/theme/theme-provider';
import { MEASUREMENT_UNITS, type MeasurementUnit } from './measurement';

export function MeasurementUnitPicker({ value, onChange }: { value: MeasurementUnit; onChange: (value: MeasurementUnit) => void }) {
  const colors = useTheme();
  const [visible, setVisible] = useState(false);
  const label = MEASUREMENT_UNITS.find((item) => item.value === value)?.label ?? value;
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel={`Measurement unit, ${label}`} accessibilityState={{ expanded: visible }} onPress={() => setVisible(true)} style={[styles.trigger, { backgroundColor: colors.surfaceLow }]} testID="area-unit-picker">
      <Text style={[styles.triggerText, { color: colors.text }]} numberOfLines={1}>{label}</Text><AppIcon name="expand_more" size={18} color={colors.textSecondary} />
    </Pressable>
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
      <Pressable accessibilityRole="button" accessibilityLabel="Close measurement unit options" onPress={() => setVisible(false)} style={styles.scrim}>
        <Pressable onPress={(event) => event.stopPropagation()} style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <Text style={[styles.title, { color: colors.text }]}>Measurement Unit</Text>
          {MEASUREMENT_UNITS.map((item) => <Pressable key={item.value} accessibilityRole="radio" accessibilityState={{ checked: value === item.value }} onPress={() => { onChange(item.value); setVisible(false); }} style={[styles.option, { backgroundColor: value === item.value ? colors.accentContainer : colors.surfaceLow }]}>
            <Text style={[styles.optionText, { color: value === item.value ? colors.onAccentContainer : colors.text }]}>{item.label}</Text>{value === item.value ? <AppIcon name="checkmark" size={18} color={colors.accent} /> : null}
          </Pressable>)}
        </Pressable>
      </Pressable>
    </Modal>
  </>;
}

const styles = StyleSheet.create({
  trigger: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.one, paddingHorizontal: Spacing.two, borderRadius: Radius.medium }, triggerText: { ...Typography.label, flex: 1 }, scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.36)', justifyContent: 'center', padding: Spacing.four }, sheet: { alignSelf: 'center', width: '100%', maxWidth: 420, borderRadius: Radius.large, padding: Spacing.three, gap: Spacing.one }, title: { ...Typography.title, marginBottom: Spacing.one }, option: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.two, borderRadius: Radius.medium }, optionText: { ...Typography.label },
});
