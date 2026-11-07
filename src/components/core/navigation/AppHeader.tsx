import { Pressable, StyleSheet, View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import { LocalizedText as Text } from '@/i18n/LocalizedText';

import { ThemeToggle } from '../ThemeToggle';
import { StatusChip } from '../StatusChip';
import { AppIcon, type AppIconName } from '../icons';
import { isMockMode } from '@/data/app-mode';
import { useLanguage } from '@/i18n/language-provider';
import { MaxContentWidth, Radius, Spacing, Typography } from '@/theme/tokens';
import { useTheme } from '@/theme/theme-provider';

export interface AppHeaderProps {
  brandName?: string;
  workspaceLabel?: string;
  pageTitle?: string;
  brandIcon?: AppIconName;
  actionIcon?: AppIconName;
  actionLabel?: string;
  onAction?: () => void;
  onBack?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function AppHeader({
  brandName = 'Broaker',
  workspaceLabel = 'Solo Broker',
  pageTitle,
  brandIcon,
  actionIcon,
  actionLabel,
  onAction,
  onBack,
  style,
  testID,
}: AppHeaderProps) {
  const colors = useTheme();
  const { t } = useLanguage();
  const { width } = useWindowDimensions();
  const compact = width < 420;
  const veryCompact = width < 361;
  const localizedPageTitle = pageTitle === 'Home' ? t('home')
    : pageTitle === 'Properties' ? t('properties')
      : pageTitle === 'Shared Links' ? t('sharedLinks')
        : pageTitle === 'Settings' ? t('settings') : pageTitle;

  return (
    <View style={[styles.outer, { backgroundColor: colors.surface, borderBottomColor: colors.divider }, style]} testID={testID}>
      <View style={[styles.inner, compact && styles.innerCompact, veryCompact && styles.innerVeryCompact]}>
        {onBack && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('goBack')}
            onPress={onBack}
            hitSlop={8}
            style={styles.backButton}>
            <AppIcon name="chevron_left" size={20} color={colors.text} />
          </Pressable>
        )}
        <View style={[styles.brandGroup, veryCompact && styles.brandGroupVeryCompact]}>
          {brandIcon && !veryCompact ? <View style={[styles.brandIcon, compact && styles.brandIconCompact, { backgroundColor: colors.accent }]}><AppIcon name={brandIcon} size={18} color={colors.onPrimary} /></View> : null}
          <View style={localizedPageTitle ? styles.titleStack : undefined}>
            {localizedPageTitle && !compact ? <Text style={[styles.brandLabel, { color: colors.accent }]} numberOfLines={1}>{brandName}</Text> : null}
            {localizedPageTitle ? <Text style={[styles.pageTitle, compact && styles.pageTitleCompact, { color: colors.text }]} numberOfLines={1}>{localizedPageTitle}</Text> : (
              <Text style={[styles.brand, { color: colors.text }]} numberOfLines={1}>{brandName}</Text>
            )}
          </View>
          {!pageTitle && workspaceLabel ? (
            <View style={[styles.workspace, { backgroundColor: colors.surfaceHigh }]}>
              <Text style={[styles.workspaceText, { color: colors.accent }]} numberOfLines={1}>{workspaceLabel}</Text>
            </View>
          ) : null}
        </View>
        {actionIcon && onAction ? (
          <Pressable accessibilityRole="button" accessibilityLabel={actionLabel ?? 'Header action'} onPress={onAction} hitSlop={8} style={styles.actionButton}>
            <AppIcon name={actionIcon} size={20} color={colors.textSecondary} />
          </Pressable>
        ) : null}
        <View style={styles.headerActions}>
        {isMockMode ? <StatusChip label={t('mock')} tone="info" accessibilityLabel="Mock data mode" /> : null}
          <ThemeToggle style={styles.themeToggle} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { width: '100%', alignSelf: 'stretch', alignItems: 'center' },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'stretch', flexShrink: 1, minHeight: 64, paddingHorizontal: Spacing.three, flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  innerCompact: { minHeight: 60, paddingHorizontal: Spacing.two, gap: Spacing.one },
  innerVeryCompact: { paddingHorizontal: 12, gap: Spacing.one },
  backButton: { width: 36, height: 40, alignItems: 'center', justifyContent: 'center' },
  actionButton: { width: 40, height: 40, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  themeToggle: { flexShrink: 0 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one, flexShrink: 0 },
  brandGroup: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  brandIcon: { width: 32, height: 32, borderRadius: Radius.small, alignItems: 'center', justifyContent: 'center' },
  brandIconCompact: { width: 28, height: 28 },
  brandGroupVeryCompact: { gap: Spacing.one },
  titleStack: { flex: 1, minWidth: 0, gap: Spacing.half },
  brandLabel: { ...Typography.labelSmall, textTransform: 'uppercase', letterSpacing: 1 },
  pageTitle: { ...Typography.title, lineHeight: 22 },
  pageTitleCompact: { fontSize: 16, lineHeight: 20 },
  brand: { ...Typography.title, flexShrink: 1 },
  workspace: { maxWidth: 120, paddingHorizontal: Spacing.two, paddingVertical: Spacing.one, borderRadius: Radius.pill },
  workspaceText: { ...Typography.labelSmall },
});
