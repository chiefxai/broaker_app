import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LocalizedText as Text } from '@/i18n/LocalizedText';

import { CoreButton } from '../CoreButton';
import { AppIcon } from '../icons';
import { Radius, Spacing, Typography } from '@/theme/tokens';
import { useTheme } from '@/theme/theme-provider';

export interface WizardProgressHeaderProps {
  step: number;
  totalSteps: number;
  title: string;
  description?: string;
  statusLabel?: string;
  onBack?: () => void;
  onSaveDraft?: () => void;
  saving?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function WizardProgressHeader({
  step,
  totalSteps,
  title,
  description,
  statusLabel,
  onBack,
  onSaveDraft,
  saving = false,
  style,
  testID,
}: WizardProgressHeaderProps) {
  const colors = useTheme();
  const safeTotal = Math.max(1, Math.floor(totalSteps));
  const safeStep = Math.min(safeTotal, Math.max(1, Math.floor(step)));
  const progress = Math.round((safeStep / safeTotal) * 100);

  return (
    <View style={[styles.container, style]} testID={testID}>
      <View style={styles.topRow}>
        {onBack && (
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={onBack} hitSlop={8} style={styles.backButton}>
            <AppIcon name="chevron_left" size={20} color={colors.text} />
          </Pressable>
        )}
        <View style={styles.stepLabels}>
          <Text style={[styles.step, { color: colors.textSecondary }]}>Step {safeStep} of {safeTotal}</Text>
          {statusLabel ? <Text style={[styles.status, { color: colors.accent }]}>{statusLabel}</Text> : null}
        </View>
        {onSaveDraft && <CoreButton label="Save draft" variant="secondary" size="small" loading={saving} onPress={onSaveDraft} />}
      </View>
      <View
        accessibilityRole="progressbar"
        accessibilityLabel={`Listing progress, step ${safeStep} of ${safeTotal}`}
        accessibilityValue={{ min: 0, max: 100, now: progress }}
        style={[styles.progressTrack, { backgroundColor: colors.surfaceContainer }]}>
        <View style={[styles.progressFill, { backgroundColor: colors.accent, width: `${progress}%` }]} />
      </View>
      <View style={styles.headingBlock}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        {description ? <Text style={[styles.description, { color: colors.textSecondary }]}>{description}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.three },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  backButton: { width: 36, height: 36, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  stepLabels: { flex: 1, gap: Spacing.half },
  step: { ...Typography.labelSmall },
  status: { ...Typography.bodySmall, fontWeight: '600' },
  progressTrack: { height: 6, overflow: 'hidden', borderRadius: Radius.pill },
  progressFill: { height: '100%', borderRadius: Radius.pill },
  headingBlock: { gap: Spacing.one },
  title: { ...Typography.heading },
  description: { ...Typography.body },
});
