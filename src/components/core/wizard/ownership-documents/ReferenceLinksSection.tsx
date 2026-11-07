import { Pressable, StyleSheet, View } from 'react-native';
import { LocalizedText as Text } from '@/i18n/LocalizedText';

import { AppIcon } from '../../icons';
import { Radius, Spacing, Typography } from '@/theme/tokens';
import { useTheme } from '@/theme/theme-provider';
import type { PropertyReferenceLink } from './types';

export function ReferenceLinksSection({ links, onAdd, onOpen, available = true }: {
  links: PropertyReferenceLink[];
  onAdd: () => void;
  onOpen: (link: PropertyReferenceLink) => void;
  available?: boolean;
}) {
  const colors = useTheme();
  return <View style={styles.section}>
    <View style={styles.headingCopy}><Text style={[styles.heading, { color: colors.text }]}>Property Reference Links</Text><Text style={[styles.description, { color: colors.textSecondary }]}>Government portals, GIS maps, & cadastral data registries</Text></View>
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      {links.length ? <View style={styles.linkList}>{links.map((link) => <View key={link.id} style={[styles.linkRow, { backgroundColor: colors.surfaceLow }]}>
        <View style={[styles.linkIcon, { backgroundColor: colors.surfaceContainer }]}><AppIcon name="map" size={18} color={colors.text} /></View>
        <View style={styles.linkCopy}><Text style={[styles.linkTitle, { color: colors.text }]} numberOfLines={1}>{link.title}</Text><Text style={[styles.linkUrl, { color: colors.accent }]} numberOfLines={1}>{link.url}</Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel={`Open ${link.title} in external browser`} onPress={() => onOpen(link)} style={styles.openButton}><AppIcon name="open_in_new" size={18} color={colors.iconMuted} /></Pressable>
      </View>)}</View> : <Text style={[styles.description, { color: colors.textSecondary }]}>No property links added.</Text>}
      {available ? <Pressable accessibilityRole="button" accessibilityLabel="Add another property reference link" onPress={onAdd} style={[styles.addButton, { backgroundColor: colors.surfaceLow }]}><AppIcon name="add_link" size={17} color={colors.text} /><Text style={[styles.addText, { color: colors.text }]}>Add another link</Text></Pressable> : <Text style={[styles.description, { color: colors.textSecondary }]}>Reference link management is not available in this release.</Text>}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  section: { gap: Spacing.two }, headingCopy: { gap: Spacing.half }, heading: { ...Typography.title }, description: { ...Typography.bodySmall }, card: { padding: Spacing.three, borderRadius: Radius.medium, gap: Spacing.two }, linkList: { gap: Spacing.two },
  linkRow: { minHeight: 58, padding: Spacing.two, borderRadius: Radius.small, flexDirection: 'row', alignItems: 'center', gap: Spacing.two }, linkIcon: { width: 34, height: 34, borderRadius: Radius.small, alignItems: 'center', justifyContent: 'center' }, linkCopy: { flex: 1, minWidth: 0, gap: Spacing.half }, linkTitle: { ...Typography.label }, linkUrl: { ...Typography.bodySmall }, openButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  addButton: { minHeight: 40, borderRadius: Radius.small, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.one }, addText: { ...Typography.labelSmall },
});
