import { usePathname, useRouter } from 'expo-router';
import { Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { LocalizedText as Text } from '@/i18n/LocalizedText';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppIcon, type AppIconName } from '../icons';
import { GlassBackground, supportsGlassSurface } from '../GlassBackground';
import { AppFooterHeight, DesktopSidebarWidth, Radius, Spacing, Typography, WideLayoutBreakpoint } from '@/theme/tokens';
import { useTheme } from '@/theme/theme-provider';
import { useLanguage } from '@/i18n/language-provider';

const FOOTER_ITEMS: {
  label: string;
  key: 'home' | 'properties' | 'sharedLinks' | 'settings';
  icon: AppIconName;
  href: '/' | '/explore' | '/shared-links' | '/settings';
  matches: (path: string) => boolean;
}[] = [
  { label: 'Home', key: 'home', icon: 'dashboard', href: '/', matches: (path) => path === '/' },
  { label: 'Properties', key: 'properties', icon: 'real_estate_agent', href: '/explore', matches: (path) => path === '/explore' || path.startsWith('/properties/') },
  { label: 'Shared Links', key: 'sharedLinks', icon: 'link', href: '/shared-links', matches: (path) => path === '/shared-links' },
  { label: 'Settings', key: 'settings', icon: 'settings', href: '/settings', matches: (path) => path === '/settings' },
];

export function AppFooter() {
  const colors = useTheme();
  const { t } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const wide = width >= WideLayoutBreakpoint;
  const compact = width <= 430;
  const floating = Platform.OS === 'ios' && !wide;
  const glass = floating && supportsGlassSurface();

  return (
    <SafeAreaView edges={wide ? ['left', 'top', 'bottom'] : ['bottom']} pointerEvents="box-none" style={[styles.safe, wide && styles.safeWide, floating && styles.safeFloating, { backgroundColor: floating ? 'transparent' : colors.surface, borderRightColor: colors.border }]}>
      {wide ? (
        <View style={styles.brandBlock}>
          <View style={[styles.brandIcon, { backgroundColor: colors.accent }]}><AppIcon name="apartment" size={19} color={colors.onPrimary} /></View>
          <View style={styles.brandCopy}>
            <Text style={[styles.brandName, { color: colors.text }]}>Broaker</Text>
            <Text style={[styles.brandCaption, { color: colors.textSecondary }]}>PROPERTY WORKSPACE</Text>
          </View>
        </View>
      ) : null}
      <View accessibilityRole={wide ? 'navigation' : 'tablist'} testID="footer-bar" style={[styles.inner, wide && styles.innerWide, floating && styles.innerFloating, floating && !glass && { backgroundColor: colors.surface }]}>
        {glass ? <GlassBackground radius={Radius.pill} /> : null}
        {FOOTER_ITEMS.map((item) => {
          const selected = item.matches(pathname);
          return (
            <Pressable cssInterop={false}
              key={item.href}
              accessibilityRole={wide ? 'link' : 'tab'}
              accessibilityLabel={t(item.key)}
              accessibilityState={{ selected }}
              onPress={() => { if (pathname !== item.href) router.navigate(item.href); }}
              style={({ pressed }) => [styles.item, wide && styles.itemWide, selected && wide && { backgroundColor: colors.accentContainer }, pressed && styles.pressed]}>
              <AppIcon name={item.icon} size={22} color={selected ? colors.accent : colors.iconMuted} />
              <Text numberOfLines={1} style={[styles.label, wide && styles.labelWide, compact && !wide && styles.labelCompact, { color: selected ? colors.accent : colors.textSecondary }]}>{t(item.key)}</Text>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { width: '100%', alignSelf: 'stretch', alignItems: 'center', flexShrink: 0 },
  safeWide: { width: DesktopSidebarWidth, height: '100%', alignItems: 'stretch', borderRightWidth: StyleSheet.hairlineWidth },
  safeFloating: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.one },
  inner: { width: '100%', alignSelf: 'stretch', minHeight: AppFooterHeight, flexDirection: 'row', alignItems: 'stretch', paddingHorizontal: 0 },
  innerWide: { flex: 1, minHeight: 0, flexDirection: 'column', alignItems: 'stretch', paddingHorizontal: Spacing.two, paddingTop: Spacing.four, gap: Spacing.one },
  innerFloating: { borderRadius: Radius.pill },
  item: { width: '25%', flexBasis: '25%', flexGrow: 0, flexShrink: 0, minWidth: 0, minHeight: 60, alignItems: 'center', justifyContent: 'center', gap: Spacing.half, paddingTop: Spacing.one, paddingHorizontal: 2, position: 'relative' },
  itemWide: { width: '100%', flexBasis: 'auto', minHeight: 48, flexDirection: 'row', justifyContent: 'flex-start', gap: Spacing.three, paddingTop: 0, paddingHorizontal: Spacing.two, borderRadius: Radius.medium },
  label: { ...Typography.labelSmall, fontSize: 10, lineHeight: 14, textAlign: 'center' },
  labelWide: { ...Typography.label, textAlign: 'left' },
  labelCompact: { fontSize: 9, lineHeight: 12, letterSpacing: -0.2 },
  brandBlock: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginHorizontal: Spacing.three, marginTop: Spacing.four, marginBottom: Spacing.three },
  brandIcon: { width: 38, height: 38, borderRadius: Radius.medium, alignItems: 'center', justifyContent: 'center' },
  brandCopy: { gap: Spacing.half },
  brandName: { ...Typography.title, fontWeight: '700' },
  brandCaption: { ...Typography.labelSmall, fontSize: 9, letterSpacing: 0.7 },
  pressed: { opacity: 0.72 },
});
