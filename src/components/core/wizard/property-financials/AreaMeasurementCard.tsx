import { Pressable, StyleSheet, View } from 'react-native';
import { LocalizedText as Text } from '@/i18n/LocalizedText';

import { CoreTextField } from '@/components/core/forms/CoreTextField';
import { AppIcon } from '@/components/core/icons';
import { Radius, Spacing, Typography } from '@/theme/tokens';
import { useTheme } from '@/theme/theme-provider';
import { formatArea, MEASUREMENT_UNITS, sanitizeAreaInput, toAreaConversions, type MeasurementUnit } from './measurement';
import { MeasurementUnitPicker } from './MeasurementUnitPicker';

export function AreaMeasurementCard({ area, areaUnit, onAreaChange, onAreaUnitChange, areaError, secondaryAreaAvailable = false, onAddSecondaryArea }: {
  area: string; areaUnit: MeasurementUnit; onAreaChange: (value: string) => void; onAreaUnitChange: (value: MeasurementUnit) => void; areaError?: string; secondaryAreaAvailable?: boolean; onAddSecondaryArea?: () => void;
}) {
  const colors = useTheme();
  const conversions = toAreaConversions(area, areaUnit);
  const unitLabel = MEASUREMENT_UNITS.find((item) => item.value === areaUnit)?.label ?? areaUnit;
  return <View style={styles.section}>
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={styles.row}>
        <View style={styles.areaInput}><CoreTextField label="Primary Area Extent" required errorMessage={areaError} value={area} onChangeText={(value) => onAreaChange(sanitizeAreaInput(value))} placeholder="e.g. 150" keyboardType="decimal-pad" testID="property-area" /></View>
        <View style={styles.unitInput}><Text style={[styles.label, { color: colors.text }]}>Measurement Unit</Text><MeasurementUnitPicker value={areaUnit} onChange={onAreaUnitChange} /></View>
      </View>
    </View>
    <View style={[styles.conversionCard, { backgroundColor: colors.surfaceLow }]}>
      <View style={styles.conversionHeader}><View style={styles.headerLabel}><AppIcon name="sync_alt" size={17} color={colors.accent} /><Text style={[styles.label, { color: colors.accent }]}>System Conversion Matrix</Text></View><Text style={[styles.calculatedBadge, { backgroundColor: colors.accentContainer, color: colors.onAccentContainer }]}>Calculated</Text></View>
      <View style={[styles.conversionResult, { backgroundColor: colors.surface }]}>
        {conversions ? <>
          <Text style={[styles.primaryConversion, { color: colors.text }]}>{formatArea(conversions.acres)} Acres <Text style={[styles.separator, { color: colors.textSecondary }]}>·</Text> {formatArea(conversions.squareFeet, 0)} Sq.Ft <Text style={[styles.separator, { color: colors.textSecondary }]}>·</Text> {formatArea(conversions.squareMeters)} Sq.M</Text>
          <View style={styles.secondaryRow}><Text style={[styles.detail, { color: colors.textSecondary }]}>Grounds: {formatArea(conversions.grounds)}</Text><Text style={[styles.detail, { color: colors.textSecondary }]}>1 {unitLabel.replace(/s$/, '')} = {formatArea(conversions.squareFeet / Number(area))} Sq.Ft</Text></View>
        </> : area ? <Text style={[styles.detail, { color: colors.textSecondary }]}>No standardized conversion is available for {unitLabel}.</Text> : <Text style={[styles.detail, { color: colors.textSecondary }]}>Enter an area to see its equivalent land units.</Text>}
      </View>
      <Text style={[styles.helper, { color: colors.textSecondary }]}>Ground conversion uses 2,400 sq ft per ground. Local Kuli, Ma, and Veli definitions vary and are not auto-converted.</Text>
    </View>
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: !secondaryAreaAvailable }} disabled={!secondaryAreaAvailable} onPress={onAddSecondaryArea} style={[styles.secondaryButton, { backgroundColor: colors.surface }, !secondaryAreaAvailable && styles.disabled]} testID="add-secondary-area">
      <AppIcon name="add" size={18} color={colors.accent} /><Text style={[styles.buttonText, { color: colors.accent }]}>Add secondary area breakdown</Text>
    </Pressable>
    {!secondaryAreaAvailable ? <Text style={[styles.helper, { color: colors.textSecondary }]}>The current API stores one primary area and unit per property.</Text> : null}
  </View>;
}

const styles = StyleSheet.create({
  section: { gap: Spacing.two }, card: { padding: Spacing.three, borderRadius: Radius.large }, row: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.two }, areaInput: { flex: 7, minWidth: 0 }, unitInput: { flex: 5, minWidth: 0, gap: Spacing.one }, label: { ...Typography.labelSmall, textTransform: 'uppercase', letterSpacing: 0.4 }, conversionCard: { padding: Spacing.three, borderRadius: Radius.large, gap: Spacing.two }, conversionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two }, headerLabel: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.one }, calculatedBadge: { ...Typography.labelSmall, borderRadius: Radius.pill, paddingHorizontal: Spacing.two, paddingVertical: Spacing.half }, conversionResult: { padding: Spacing.two, borderRadius: Radius.medium, gap: Spacing.two }, primaryConversion: { ...Typography.label, flexWrap: 'wrap' }, separator: { fontWeight: '400' }, secondaryRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: Spacing.two }, detail: { ...Typography.bodySmall }, helper: { ...Typography.bodySmall }, secondaryButton: { minHeight: 44, borderRadius: Radius.medium, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.one }, buttonText: { ...Typography.label }, disabled: { opacity: 0.55 },
});
