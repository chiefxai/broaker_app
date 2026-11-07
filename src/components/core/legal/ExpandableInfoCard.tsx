import { useState, type PropsWithChildren } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { LocalizedText as Text } from '@/i18n/LocalizedText';

import { AppIcon, type AppIconName } from '../icons';
import { Radius, Spacing, Typography } from '@/theme/tokens';
import { useTheme } from '@/theme/theme-provider';

export interface ExpandableInfoCardProps extends PropsWithChildren {
  title: string;
  icon: AppIconName;
  eyebrow?: string;
  defaultExpanded?: boolean;
  accessibilityLabel?: string;
}

export function ExpandableInfoCard({ title, icon, eyebrow, defaultExpanded = false, accessibilityLabel, children }: ExpandableInfoCardProps) {
  const colors = useTheme();
  const [expanded, setExpanded] = useState(defaultExpanded);
  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <Pressable cssInterop={false} accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? title} accessibilityState={{ expanded }} onPress={() => setExpanded((open) => !open)} style={({ pressed }) => [styles.trigger, pressed && styles.pressed]}>
        <View style={[styles.iconBox, { backgroundColor: colors.surfaceContainer }]}><AppIcon name={icon} size={20} color={colors.accent} /></View>
        <View style={styles.heading}>
          {eyebrow ? <Text style={[styles.eyebrow, { color: colors.accent }]}>{eyebrow}</Text> : null}
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        </View>
        <AppIcon name="expand_more" size={20} color={colors.iconMuted} style={expanded ? styles.rotated : undefined} />
      </Pressable>
      {expanded ? <View style={[styles.content, { borderTopColor: colors.divider }]}>{children}</View> : null}
    </View>
  );
}

export function InfoParagraph({ children }: PropsWithChildren) {
  const colors = useTheme();
  return <Text style={[styles.paragraph, { color: colors.textSecondary }]}>{children}</Text>;
}

export function InfoBullet({ icon = 'checkmark', children }: PropsWithChildren<{ icon?: AppIconName }>) {
  const colors = useTheme();
  return <View style={styles.bullet}><AppIcon name={icon} size={16} color={colors.accent} /><Text style={[styles.bulletText, { color: colors.textSecondary }]}>{children}</Text></View>;
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.large, overflow: 'hidden' },
  trigger: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: Spacing.two, padding: Spacing.three },
  iconBox: { width: 40, height: 40, borderRadius: Radius.medium, alignItems: 'center', justifyContent: 'center' },
  heading: { flex: 1, gap: Spacing.half },
  eyebrow: { ...Typography.labelSmall, textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: '700' },
  title: { ...Typography.label, fontWeight: '700' },
  content: { paddingHorizontal: Spacing.three, paddingTop: Spacing.three, paddingBottom: Spacing.four, gap: Spacing.two, borderTopWidth: StyleSheet.hairlineWidth },
  paragraph: { ...Typography.bodySmall, lineHeight: 20 },
  bullet: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  bulletText: { ...Typography.bodySmall, flex: 1, lineHeight: 20 },
  pressed: { opacity: 0.76 },
  rotated: { transform: [{ rotate: '180deg' }] },
});
