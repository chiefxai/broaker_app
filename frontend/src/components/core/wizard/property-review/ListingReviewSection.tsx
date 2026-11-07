import { Pressable, StyleSheet, View } from 'react-native';
import { LocalizedText as Text } from '@/i18n/LocalizedText';

import { AppIcon } from '@/components/core/icons';
import { Radius, Spacing, Typography } from '@/theme/tokens';
import { useTheme } from '@/theme/theme-provider';
import type { ReviewItem } from './types';

export function ListingReviewSection({ items, onEditStep }: { items: ReviewItem[]; onEditStep: (step: number) => void }) {
  const colors = useTheme();
  return <View style={styles.section} testID="review-listing-details">
    <View style={styles.sectionHeading}><View style={styles.heading}><AppIcon name="verified" size={20} color={colors.accent} /><Text style={[styles.headingText, { color: colors.text }]}>Review Listing Details</Text></View><Text style={[styles.readyText, { color: colors.accent }]}>Review details</Text></View>
    <View style={[styles.card, { backgroundColor: colors.surface }]}>{items.map((item, index) => <View key={item.id} style={[styles.row, index < items.length - 1 && { borderBottomColor: colors.divider, borderBottomWidth: StyleSheet.hairlineWidth }]}>
      <View style={[styles.iconBox, { backgroundColor: colors.surfaceContainer }]}><AppIcon name={item.icon} size={18} color={colors.textSecondary} /></View>
      <View style={styles.copy}><Text style={[styles.label, { color: colors.textSecondary }]}>{item.label}</Text><Text style={[styles.value, { color: colors.text }]}>{item.value}</Text>{item.detail ? <Text style={[styles.detail, { color: colors.textSecondary }]}>{item.detail}</Text> : null}{item.tags?.length ? <View style={styles.tags}>{item.tags.map((tag) => <Text key={tag} style={[styles.tag, { color: colors.textSecondary, backgroundColor: colors.surfaceLow }]}>{tag}</Text>)}</View> : null}</View>
      <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${item.label}`} onPress={() => onEditStep(item.editStep)} style={[styles.edit, { backgroundColor: colors.surfaceContainer }]}><Text style={[styles.editText, { color: colors.accent }]}>Edit</Text></Pressable>
    </View>)}</View>
  </View>;
}

const styles = StyleSheet.create({
  section: { gap: Spacing.two }, sectionHeading: { minHeight: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two }, heading: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one }, headingText: { ...Typography.title }, readyText: { ...Typography.labelSmall }, card: { borderRadius: Radius.medium, overflow: 'hidden' }, row: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two, padding: Spacing.three }, iconBox: { width: 34, height: 34, borderRadius: Radius.small, alignItems: 'center', justifyContent: 'center' }, copy: { flex: 1, minWidth: 0, gap: Spacing.half }, label: { ...Typography.labelSmall }, value: { ...Typography.body, fontWeight: '600' }, detail: { ...Typography.bodySmall }, tags: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one, marginTop: Spacing.half }, tag: { ...Typography.labelSmall, borderRadius: Radius.pill, paddingHorizontal: Spacing.two, paddingVertical: Spacing.half }, edit: { minHeight: 30, minWidth: 52, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.two, borderRadius: Radius.small }, editText: { ...Typography.labelSmall },
});
