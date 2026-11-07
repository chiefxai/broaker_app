import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LocalizedText as Text } from '@/i18n/LocalizedText';

import { AppIcon, type AppIconName } from '../icons';
import { StatusChip } from '../StatusChip';
import { Radius, Spacing, Typography, type StatusTone } from '@/theme/tokens';
import { useTheme } from '@/theme/theme-provider';

export type DocumentVerificationState = 'pending' | 'verifying' | 'verified' | 'error';

export interface DocumentFileRowProps {
  id: string;
  name: string;
  detail?: string;
  sizeLabel?: string;
  state: DocumentVerificationState;
  icon?: AppIconName;
  statusLabel?: string;
  statusTone?: StatusTone;
  onPress?: (id: string) => void;
  onRemove?: (id: string) => void;
  onMoreActions?: (id: string) => void;
  onRetry?: (id: string) => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const stateLabel: Record<DocumentVerificationState, string> = {
  pending: 'Pending',
  verifying: 'Verifying',
  verified: 'Verified',
  error: 'Needs review',
};

const stateTone: Record<DocumentVerificationState, StatusTone> = {
  pending: 'neutral',
  verifying: 'info',
  verified: 'success',
  error: 'danger',
};

export function DocumentFileRow({
  id,
  name,
  detail,
  sizeLabel,
  state,
  icon = 'document',
  statusLabel,
  statusTone,
  onPress,
  onRemove,
  onMoreActions,
  onRetry,
  style,
  testID,
}: DocumentFileRowProps) {
  const colors = useTheme();
  const content = (
    <>
      <View style={[styles.fileIcon, { backgroundColor: colors.surfaceContainer }]}>
        <AppIcon name={icon} size={19} color={colors.accent} />
      </View>
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{name}</Text>
        {detail || sizeLabel ? <Text style={[styles.detail, { color: colors.textSecondary }]} numberOfLines={2}>{[sizeLabel, detail].filter(Boolean).join(' · ')}</Text> : null}
        <View style={styles.statusRow}>
          <StatusChip label={statusLabel ?? stateLabel[state]} tone={statusTone ?? stateTone[state]} size="small" />
        </View>
      </View>
    </>
  );
  const actions = (
    <>
      {state === 'error' && onRetry && (
        <Pressable cssInterop={false} accessibilityRole="button" accessibilityLabel={`Retry verification for ${name}`} onPress={() => onRetry(id)} hitSlop={8} style={styles.action}>
          <Text style={[styles.retry, { color: colors.accent }]}>Retry</Text>
        </Pressable>
      )}
      {onRemove && state !== 'verifying' && (
        <Pressable cssInterop={false} accessibilityRole="button" accessibilityLabel={`Remove ${name}`} onPress={() => onRemove(id)} hitSlop={8} style={styles.action}>
          <AppIcon name="delete" size={17} color={colors.iconMuted} />
        </Pressable>
      )}
      {onMoreActions && <Pressable cssInterop={false} accessibilityRole="button" accessibilityLabel={`More actions for ${name}`} onPress={() => onMoreActions(id)} hitSlop={8} style={styles.action}><AppIcon name="more_vert" size={18} color={colors.iconMuted} /></Pressable>}
    </>
  );
  const containerStyle = [styles.row, { backgroundColor: colors.surface, borderColor: colors.border }, style];

  return (
    <View style={containerStyle} testID={testID}>
      {onPress ? (
        <Pressable cssInterop={false} accessibilityRole="button" accessibilityLabel={name} onPress={() => onPress(id)} style={({ pressed }) => [styles.main, pressed && styles.pressed]}>
          {content}
        </Pressable>
      ) : <View style={styles.main}>{content}</View>}
      {actions}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: Spacing.two, borderWidth: 1, borderRadius: Radius.medium, padding: Spacing.two },
  main: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  fileIcon: { width: 38, height: 38, borderRadius: Radius.small, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, minWidth: 0, gap: Spacing.one },
  name: { ...Typography.label },
  detail: { ...Typography.bodySmall },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  retry: { ...Typography.labelSmall },
  action: { minWidth: 32, minHeight: 36, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.8 },
});
