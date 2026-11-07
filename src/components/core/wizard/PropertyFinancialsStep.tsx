import { Pressable, StyleSheet, View } from 'react-native';
import { LocalizedText as Text } from '@/i18n/LocalizedText';

import { CoreTextField } from '@/components/core/forms/CoreTextField';
import { AppIcon, type AppIconName } from '@/components/core/icons';
import { Radius, Spacing, Typography } from '@/theme/tokens';
import { useTheme } from '@/theme/theme-provider';
import { AreaMeasurementCard } from './property-financials/AreaMeasurementCard';
import { MoneyField } from './property-financials/MoneyField';
import type { PropertyFinancialsStepProps } from './property-financials/types';
import { PriceBasisSelector } from './property-financials/PriceBasisSelector';

export type { PriceBasis, PropertyFinancialsStepProps } from './property-financials/types';
export type { AreaConversions, MeasurementUnit } from './property-financials/measurement';

export function PropertyFinancialsStep(props: PropertyFinancialsStepProps) {
  const colors = useTheme();
  return <View style={styles.root} testID={props.testID ?? 'property-financials-step'}>
    <View style={styles.progressContext}>
      <View style={styles.progressRow}><View style={styles.progressLabel}><View style={[styles.stepBadge, { backgroundColor: colors.accentContainer }]}><Text style={[styles.stepNumber, { color: colors.onAccentContainer }]}>4</Text></View><Text style={[styles.eyebrow, { color: colors.textSecondary }]}>STEP 4 OF 6 · PRICE & PROPERTY STATUS</Text></View><Text style={[styles.percent, { color: colors.accent }]}>67% complete</Text></View>
      <View accessibilityRole="progressbar" accessibilityLabel="Property form progress, step 4 of 6" accessibilityValue={{ min: 0, max: 100, now: 67 }} style={[styles.progressTrack, { backgroundColor: colors.surfaceContainer }]}><View style={[styles.progressFill, { backgroundColor: colors.accent }]} /></View>
    </View>

    <SectionHeading title="Valuation & Asking Price" subtitle="Define your core pricing expectations and rate breakdown" icon="currency_rupee" />
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <MoneyField label="Total Asking Price (₹)" value={props.askingPrice} onChangeText={props.onAskingPriceChange} testID="property-asking-price" prominent required errorMessage={props.askingPriceError} />
      <Text style={[styles.helper, { color: colors.textSecondary }]}>Regional guideline value benchmarks are not available from the current API.</Text>
    </View>
    <PriceBasisSelector value={props.priceBasis} onChange={props.onPriceBasisChange} askingPrice={props.askingPrice} area={props.area} areaUnit={props.areaUnit} />

    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <SwitchRow title="Price Negotiable" description="Interested buyers may propose alternative offers." value={props.negotiable} onChange={props.onNegotiableChange} accessibilityLabel="Price negotiable" />
      {props.negotiable ? <View style={[styles.insetCard, { backgroundColor: colors.surfaceLow }]}>
        <MoneyField label="Minimum Acceptable Floor Price (₹)" value={props.minimumPrice} onChangeText={props.onMinimumPriceChange} testID="property-minimum-price" helperText="Private minimum price for evaluating offers." />
      </View> : null}
    </View>

    <SectionHeading title="Land Extent & Measurement" subtitle="Conversions are calculated from the entered area and unit" icon="straighten" />
    <AreaMeasurementCard area={props.area} areaUnit={props.areaUnit} onAreaChange={props.onAreaChange} onAreaUnitChange={props.onAreaUnitChange} areaError={props.areaError} secondaryAreaAvailable={props.secondaryAreaAvailable} onAddSecondaryArea={props.onAddSecondaryArea} />

    <SectionHeading title="Token Advance & Commercial Terms" subtitle="Set the commitment threshold and installment flexibility" icon="account_balance_wallet" />
    <View style={[styles.card, { backgroundColor: colors.surface }]}><MoneyField label="Advance Token Amount (₹)" value={props.advanceAmount} onChangeText={props.onAdvanceAmountChange} testID="property-advance" helperText="A proposed advance amount, subject to agreement." /></View>
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <SwitchRow title="Payment Milestone Flexibility" description="Indicate willingness to structure staged installments." value={props.paymentMilestoneFlexible} onChange={props.onPaymentMilestoneFlexibleChange} accessibilityLabel="Payment milestone flexibility" disabled={!props.milestoneControlAvailable} />
      {!props.milestoneControlAvailable ? <Text style={[styles.helper, { color: colors.textSecondary }]}>Payment milestone preferences are not stored by the current API.</Text> : null}
    </View>

    <SectionHeading title="Encumbrance & Bank Loan Details" subtitle="Record an active loan or select a clear-title status" icon="account_balance" />
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={styles.loanToggleRow}>
        <View style={[styles.loanIcon, { backgroundColor: colors.surfaceHigh }]}><AppIcon name="verified_user" size={20} color={colors.accent} /></View>
        <View style={styles.loanCopy}><Text style={[styles.loanTitle, { color: colors.text }]}>Under Active Bank Loan?</Text><Text style={[styles.statusBadge, { backgroundColor: props.loanActive ? colors.dangerContainer : colors.surfaceContainer, color: props.loanActive ? colors.dangerText : colors.textSecondary }]}>{props.loanActive ? 'Collateral Active' : 'Clear Title · No Loan'}</Text></View>
        <SwitchRow title="" description="" value={props.loanActive} onChange={props.onLoanActiveChange} accessibilityLabel="Under active bank loan" compact />
      </View>
      {props.loanActive ? <View style={[styles.insetCard, { backgroundColor: colors.surfaceLow }]}>
        <CoreTextField label="Mortgaged Lending Bank" value={props.lendingBank} onChangeText={props.onLendingBankChange} placeholder="Bank name" leadingIcon="domain" maxLength={200} testID="property-lending-bank" />
        <MoneyField label="Outstanding Principal Amount (₹)" value={props.outstandingLoan} onChangeText={props.onOutstandingLoanChange} testID="property-loan" tone="danger" />
        <View style={[styles.notice, { backgroundColor: colors.surface }]}><AppIcon name="lock" size={16} color={colors.iconMuted} /><Text style={[styles.helper, { color: colors.textSecondary, flex: 1 }]}>NOC and deed-release details are not captured by the current API.</Text></View>
      </View> : null}
    </View>
  </View>;
}

function SectionHeading({ title, subtitle, icon }: { title: string; subtitle: string; icon: AppIconName }) {
  const colors = useTheme();
  return <View style={styles.sectionHeading}><View style={styles.headingCopy}><Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text><Text style={[styles.helper, { color: colors.textSecondary }]}>{subtitle}</Text></View><View style={[styles.sectionIcon, { backgroundColor: colors.surfaceHigh }]}><AppIcon name={icon} size={19} color={colors.accent} /></View></View>;
}

function SwitchRow({ title, description, value, onChange, accessibilityLabel, disabled = false, compact = false }: { title: string; description: string; value: boolean; onChange: (value: boolean) => void; accessibilityLabel: string; disabled?: boolean; compact?: boolean }) {
  const colors = useTheme();
  return <View style={[styles.switchRow, compact && styles.compactSwitch, disabled && styles.disabled]}>
    {!compact ? <View style={styles.switchCopy}><Text style={[styles.switchTitle, { color: colors.text }]}>{title}</Text><Text style={[styles.helper, { color: colors.textSecondary }]}>{description}</Text></View> : null}
    <Pressable accessibilityRole="switch" accessibilityLabel={accessibilityLabel} accessibilityState={{ checked: value, disabled }} disabled={disabled} onPress={() => onChange(!value)} style={[styles.switchTrack, { backgroundColor: value ? colors.accent : colors.surfaceContainer }]} testID={`switch-${accessibilityLabel.toLowerCase().replaceAll(' ', '-')}`}><View style={[styles.switchKnob, { backgroundColor: colors.surface, transform: [{ translateX: value ? 18 : 0 }] }]} /></Pressable>
  </View>;
}

const styles = StyleSheet.create({
  root: { gap: Spacing.three }, progressContext: { gap: Spacing.two, marginBottom: Spacing.one }, progressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two }, progressLabel: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: Spacing.one }, stepBadge: { width: 25, height: 25, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' }, stepNumber: { ...Typography.labelSmall }, eyebrow: { ...Typography.labelSmall, fontWeight: '600' }, percent: { ...Typography.labelSmall, fontWeight: '600' }, progressTrack: { height: 6, borderRadius: Radius.pill, overflow: 'hidden' }, progressFill: { width: '67%', height: '100%', borderRadius: Radius.pill }, sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two, marginTop: Spacing.one }, headingCopy: { flex: 1, minWidth: 0, gap: Spacing.half }, sectionTitle: { ...Typography.title }, sectionIcon: { width: 34, height: 34, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' }, card: { padding: Spacing.three, borderRadius: Radius.large, gap: Spacing.two }, insetCard: { padding: Spacing.two, borderRadius: Radius.medium, gap: Spacing.two }, helper: { ...Typography.bodySmall }, switchRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two }, compactSwitch: { justifyContent: 'flex-end' }, switchCopy: { flex: 1, minWidth: 0, gap: Spacing.half }, switchTitle: { ...Typography.label }, switchTrack: { width: 48, height: 28, borderRadius: Radius.pill, padding: 3, justifyContent: 'center' }, switchKnob: { width: 22, height: 22, borderRadius: Radius.pill }, disabled: { opacity: 0.65 }, loanToggleRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: Spacing.two }, loanIcon: { width: 40, height: 40, borderRadius: Radius.small, alignItems: 'center', justifyContent: 'center' }, loanCopy: { flex: 1, minWidth: 0, gap: Spacing.half }, loanTitle: { ...Typography.label }, statusBadge: { alignSelf: 'flex-start', borderRadius: Radius.pill, paddingHorizontal: Spacing.two, paddingVertical: Spacing.half, ...Typography.labelSmall }, notice: { minHeight: 42, padding: Spacing.two, flexDirection: 'row', alignItems: 'center', gap: Spacing.one, borderRadius: Radius.small },
});
