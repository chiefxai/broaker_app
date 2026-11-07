import { Pressable, StyleSheet, View } from 'react-native';
import { LocalizedText as Text } from '@/i18n/LocalizedText';

import { AppIcon } from '@/components/core/icons';
import { Radius, Spacing, Typography } from '@/theme/tokens';
import { useTheme } from '@/theme/theme-provider';
import { formatRupees, pricePerUnit, type MeasurementUnit } from './measurement';
import type { PriceBasis } from './types';

const BASIS: { value: PriceBasis; title: string; unit: string }[] = [
  { value: 'acre', title: 'Price per Acre', unit: 'per Acre' },
  { value: 'cent', title: 'Price per Cent', unit: 'per Cent' },
  { value: 'sq_ft', title: 'Price per Sq.Ft', unit: 'per Sq.Ft' },
  { value: 'total', title: 'Lump Sum Total', unit: 'Fixed Aggregate' },
];

export function PriceBasisSelector({ value, onChange, askingPrice, area, areaUnit }: {
  value: PriceBasis | null; onChange: (value: PriceBasis | null) => void; askingPrice: string; area: string; areaUnit: MeasurementUnit;
}) {
  const colors = useTheme();
  return <View style={styles.section}>
    <View style={styles.labelRow}><Text style={[styles.label, { color: colors.textSecondary }]}>Price Basis & Quotation Metric</Text>{value ? <Pressable accessibilityRole="button" accessibilityLabel="Clear price basis selection" onPress={() => onChange(null)} testID="clear-price-basis"><Text style={[styles.standard, { color: colors.accent }]}>Clear</Text></Pressable> : <Text style={[styles.standard, { color: colors.textSecondary }]}>Optional</Text>}</View>
    <View style={styles.grid}>{BASIS.map((basis) => {
      const selected = value === basis.value;
      const rate = basis.value === 'total' ? (Number(askingPrice) > 0 ? Number(askingPrice) : null) : pricePerUnit(askingPrice, area, areaUnit, basis.value);
      const amount = rate === null ? null : formatRupees(rate, basis.value === 'sq_ft' ? 2 : 0);
      return <Pressable key={basis.value} accessibilityRole="radio" accessibilityLabel={basis.title} accessibilityState={{ checked: selected }} onPress={() => onChange(basis.value)} style={[styles.card, { backgroundColor: selected ? colors.primary : colors.surface, borderColor: selected ? colors.accent : 'transparent' }]} testID={`price-basis-${basis.value}`}>
        <View style={styles.cardHeader}><Text style={[styles.cardTitle, { color: selected ? colors.onPrimary : colors.textSecondary }]} numberOfLines={1}>{basis.title}</Text>{selected ? <AppIcon name="task_alt" size={16} color={colors.accent} /> : <View style={[styles.radio, { borderColor: colors.border }]} />}</View>
        <Text style={[styles.rate, { color: selected ? colors.onPrimary : colors.text }]} numberOfLines={1}>{amount === null ? '—' : `₹${amount}`}</Text>
        <Text style={[styles.unit, { color: selected ? colors.onPrimary : colors.textSecondary }]}>{amount === null ? 'Add price & area' : basis.unit}</Text>
      </Pressable>;
    })}</View>
    <Text style={[styles.helper, { color: colors.textSecondary }]}>Rates update from the total price and area. The backend stores the total asking price.</Text>
  </View>;
}

const styles = StyleSheet.create({
  section: { gap: Spacing.two }, labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two }, label: { ...Typography.labelSmall, textTransform: 'uppercase', letterSpacing: 0.4 }, standard: { ...Typography.labelSmall }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }, card: { flexBasis: '47%', flexGrow: 1, minWidth: 130, minHeight: 96, borderRadius: Radius.medium, borderWidth: 1, padding: Spacing.two, gap: Spacing.half }, cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.one }, cardTitle: { ...Typography.labelSmall, fontWeight: '600', flex: 1 }, radio: { width: 16, height: 16, borderRadius: Radius.pill, borderWidth: 1 }, rate: { ...Typography.title }, unit: { ...Typography.bodySmall }, helper: { ...Typography.bodySmall },
});
