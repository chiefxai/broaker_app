import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LocalizedText as Text } from '@/i18n/LocalizedText';

import { CoreButton } from './CoreButton';
import { AppIcon, type AppIconName } from './icons';
import { Radius, Spacing, Typography } from '@/theme/tokens';
import { useTheme } from '@/theme/theme-provider';

export interface ActionCalloutCardProps {
  title: string;
  description: string;
  icon: AppIconName;
  actionLabel: string;
  actionIcon?: AppIconName;
  onAction: () => void;
  note?: { icon: AppIconName; text: string };
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  bordered?: boolean;
}

export function ActionCalloutCard({
  title,
  description,
  icon,
  actionLabel,
  actionIcon = 'share',
  onAction,
  note,
  loading = false,
  disabled = false,
  style,
  bordered = false,
}: ActionCalloutCardProps) {
  const colors = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }, bordered && { borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border }, style]}>
      <View style={styles.header}>
        <View style={[styles.iconBox, { backgroundColor: colors.accentContainer }]}>
          <AppIcon name={icon} size={26} color={colors.accent} />
        </View>
        <View style={styles.copy}>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>{description}</Text>
        </View>
      </View>

      <CoreButton
        label={actionLabel}
        leadingIcon={actionIcon}
        fullWidth
        loading={loading}
        disabled={disabled}
        onPress={onAction}
      />

      {note && (
        <View style={[styles.note, { backgroundColor: colors.surfaceLow }]}>
          <AppIcon name={note.icon} size={18} color={colors.accent} />
          <Text style={[styles.noteText, { color: colors.textSecondary }]}>{note.text}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.four,
    borderRadius: Radius.card,
    gap: Spacing.three,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three },
  iconBox: {
    width: 48,
    height: 48,
    flexShrink: 0,
    borderRadius: Radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1, gap: Spacing.one },
  title: { ...Typography.title },
  description: { ...Typography.bodySmall },
  note: {
    minHeight: 44,
    padding: Spacing.two,
    borderRadius: Radius.medium,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  noteText: { ...Typography.bodySmall, flex: 1 },
});
