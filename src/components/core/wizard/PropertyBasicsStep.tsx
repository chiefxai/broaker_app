import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';
import { LocalizedText as Text } from '@/i18n/LocalizedText';

import type { PropertyCategory } from '@/api/backend-api';
import { CoreTextField } from '@/components/core/forms/CoreTextField';
import { AppIcon, type AppIconName } from '@/components/core/icons';
import { Radius, Spacing, Typography } from '@/theme/tokens';
import { useTheme } from '@/theme/theme-provider';

export type PropertyIntent = 'sale' | 'lease' | 'joint_venture';
export type ListingReadiness = 'draft' | 'active';
export type SecondaryUse = 'plots' | 'house' | 'eco_tourism' | 'commercial' | 'warehouse';

export interface PropertyBasicsStepProps {
  title: string;
  description: string;
  category: PropertyCategory;
  secondaryUses: SecondaryUse[];
  intent: PropertyIntent;
  listingReadiness: ListingReadiness;
  isMockData?: boolean;
  titleError?: string;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onCategoryChange: (value: PropertyCategory) => void;
  onSecondaryUsesChange: (value: SecondaryUse[]) => void;
  onIntentChange: (value: PropertyIntent) => void;
  onListingReadinessChange: (value: ListingReadiness) => void;
}

const CATEGORIES: { value: PropertyCategory; title: string; description: string; icon: AppIconName }[] = [
  { value: 'agriculture', title: 'Agriculture Land', description: 'Farmland, plantations, groves, rural estates', icon: 'eco' },
  { value: 'plots', title: 'Plots & Parcels', description: 'Subdivided layouts, residential plots, land parcels', icon: 'grid_view' },
  { value: 'house_villa', title: 'House / Villa', description: 'Independent homesteads, villas, farm cottages', icon: 'real_estate_agent' },
  { value: 'commercial', title: 'Commercial Real Estate', description: 'Office parks, retail complexes, mixed-use buildings', icon: 'domain' },
  { value: 'apartment', title: 'Apartment Complex', description: 'Penthouses, condominiums, multi-family buildings', icon: 'apartment' },
];
const SECONDARY_USES: { value: SecondaryUse; label: string }[] = [
  { value: 'plots', label: 'Plots Layout' }, { value: 'house', label: 'House / Villa' },
  { value: 'eco_tourism', label: 'Eco-Tourism Resort' }, { value: 'commercial', label: 'Commercial Hub' },
  { value: 'warehouse', label: 'Agro Logistics / Warehouse' },
];
const HERO_IMAGE = 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&q=80';

export function PropertyBasicsStep(props: PropertyBasicsStepProps) {
  const colors = useTheme();
  const readinessScore = Math.min(100, (props.title.trim() ? 30 : 0) + (props.description.trim().length >= 80 ? 30 : Math.round(props.description.trim().length / 80 * 30)) + 20 + Math.min(20, props.secondaryUses.length * 10));
  const toggleUse = (use: SecondaryUse) => props.onSecondaryUsesChange(
    props.secondaryUses.includes(use) ? props.secondaryUses.filter((item) => item !== use) : [...props.secondaryUses, use],
  );
  return <View style={styles.root} testID="property-basics-step">
    <View style={styles.hero}>
      <Image source={{ uri: HERO_IMAGE }} contentFit="cover" transition={180} style={StyleSheet.absoluteFill} accessibilityLabel="Green agricultural estate with open fields" />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.imageScrim }]} />
      <View style={styles.heroContent}>
        <View style={[styles.heroBadge, { backgroundColor: colors.surface }]}><AppIcon name="verified" size={16} color={colors.accent} /><Text style={[styles.heroBadgeText, { color: colors.text }]}>Verified Rural Holding Portfolio</Text></View>
        <Text style={[styles.heroDescription, { color: colors.onScrim }]}>Set the core identity and commercial classification for this property.</Text>
      </View>
    </View>

    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <SectionHeading icon="edit" title="Asset Nomenclature" subtitle="Clear naming helps buyers and your team identify this property." />
      <View style={styles.labelRow}><Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>PROPERTY TITLE <Text style={{ color: colors.danger }}>*</Text></Text><Text style={[styles.counter, { color: colors.textSecondary }]}>{props.title.length}/80</Text></View>
      <View style={styles.titleInputRow}><View style={styles.titleInput}><CoreTextField accessibilityLabel="Property title" value={props.title} onChangeText={props.onTitleChange} errorMessage={props.titleError} placeholder="e.g. Hillcrest Plantation & Timber Estate" maxLength={80} returnKeyType="next" testID="property-title" /></View>{props.title ? <Pressable accessibilityRole="button" accessibilityLabel="Clear property title" onPress={() => props.onTitleChange('')} style={[styles.clearButton, { backgroundColor: colors.surfaceHigh }]} testID="clear-property-title"><AppIcon name="close" size={16} color={colors.textSecondary} /></Pressable> : null}</View>
      <View style={styles.suggestions}><Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Smart suggestions based on topography</Text><View style={styles.chipWrap}>{['Valley View Acreage', 'Golden Crest Enclave', 'Riverfront Coconut Grove'].map((suggestion) => <Pressable key={suggestion} accessibilityRole="button" onPress={() => props.onTitleChange(suggestion)} style={[styles.suggestion, { backgroundColor: colors.surfaceLow }]}><AppIcon name="add" size={14} color={colors.accent} /><Text style={[styles.suggestionText, { color: colors.text }]}>{suggestion}</Text></Pressable>)}</View></View>
      <View style={styles.descriptionLabel}><Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>ASSET MEMORANDUM & OVERVIEW</Text><View style={styles.aiLabel}><AppIcon name="verified" size={14} color={colors.iconMuted} /><Text style={[styles.aiLabelText, { color: colors.textSecondary }]}>AI pitch unavailable</Text></View></View>
      <CoreTextField accessibilityLabel="Asset memorandum and overview" value={props.description} onChangeText={props.onDescriptionChange} placeholder="Describe water rights, boundaries, soil, road access, and current use..." multiline numberOfLines={4} maxLength={2000} testID="property-description" />
    </View>

    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <SectionHeading icon="grid_view" title="Primary Archetype" subtitle="Select the dominant operational zoning classification." />
      <View style={styles.categoryList}>{CATEGORIES.map((item) => {
        const selected = props.category === item.value;
        return <Pressable key={item.value} accessibilityRole="radio" accessibilityLabel={item.title} accessibilityState={{ checked: selected }} onPress={() => props.onCategoryChange(item.value)} style={[styles.categoryOption, { backgroundColor: selected ? colors.accentContainer : colors.surfaceLow }]} testID={`property-category-${item.value}`}>
          <View style={[styles.categoryIcon, { backgroundColor: selected ? colors.accent : colors.surfaceHigh }]}><AppIcon name={item.icon} size={21} color={selected ? colors.onPrimary : colors.textSecondary} /></View>
          <View style={styles.categoryCopy}><View style={styles.categoryTitleRow}><Text style={[styles.categoryTitle, { color: colors.text }]}>{item.title}</Text>{selected ? <Text style={[styles.primaryBadge, { backgroundColor: colors.accent, color: colors.onPrimary }]}>PRIMARY</Text> : null}</View><Text style={[styles.categoryDescription, { color: colors.textSecondary }]} numberOfLines={2}>{item.description}</Text></View>
          <View style={[styles.radio, { backgroundColor: selected ? colors.accent : 'transparent', borderColor: selected ? colors.accent : colors.border }]}>{selected ? <AppIcon name="checkmark" size={15} color={colors.onPrimary} /> : null}</View>
        </Pressable>;
      })}</View>
      <View style={styles.secondaryLabel}><Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>SECONDARY VERSATILITY</Text><Text style={[styles.caption, { color: colors.textSecondary }]}>Also suitable for · Multi-select</Text></View>
      <View style={styles.chipWrap}>{SECONDARY_USES.map((item) => {
        const selected = props.secondaryUses.includes(item.value);
        return <Pressable key={item.value} accessibilityRole="checkbox" accessibilityState={{ checked: selected }} onPress={() => toggleUse(item.value)} style={[styles.useChip, { backgroundColor: selected ? colors.primary : colors.surfaceLow }]} testID={`secondary-use-${item.value}`}><AppIcon name={selected ? 'checkmark' : 'add'} size={15} color={selected ? colors.onPrimary : colors.textSecondary} /><Text style={[styles.useChipText, { color: selected ? colors.onPrimary : colors.text }]}>{item.label}</Text></Pressable>;
      })}</View>
      {!props.isMockData ? <Text style={[styles.apiNote, { color: colors.textSecondary }]}>Secondary use tags are not currently stored by the backend.</Text> : null}
    </View>

    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <SectionHeading icon="handshake" title="Listing Purpose & Intent" subtitle="Specify deal structure and listing readiness." />
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>TRANSACTION FRAMEWORK</Text>
      <View style={[styles.segment, { backgroundColor: colors.surfaceLow }]}>{([{ value: 'sale', label: 'Outright Sale' }, { value: 'lease', label: 'Long Lease' }, { value: 'joint_venture', label: 'Joint Venture' }] as const).map((item) => <Pressable key={item.value} accessibilityRole="radio" accessibilityState={{ checked: props.intent === item.value }} onPress={() => props.onIntentChange(item.value)} style={[styles.segmentOption, props.intent === item.value && { backgroundColor: colors.surface }]} testID={`transaction-${item.value}`}><Text style={[styles.segmentText, { color: props.intent === item.value ? colors.text : colors.textSecondary }]}>{item.label}</Text></Pressable>)}</View>
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>INITIAL CATALOG STATUS</Text>
      <View style={styles.statusGrid}>{([{ value: 'draft', title: 'Private Draft', detail: 'Internal team review only' }, { value: 'active', title: 'Market Ready', detail: 'Broadcast on publish' }] as const).map((item) => <Pressable key={item.value} accessibilityRole="radio" accessibilityState={{ checked: props.listingReadiness === item.value }} onPress={() => props.onListingReadinessChange(item.value)} style={[styles.statusOption, { backgroundColor: colors.surfaceLow }]} testID={`listing-readiness-${item.value}`}><View style={[styles.radio, { borderColor: props.listingReadiness === item.value ? colors.accent : colors.border, backgroundColor: props.listingReadiness === item.value ? colors.accent : 'transparent' }]}>{props.listingReadiness === item.value ? <AppIcon name="checkmark" size={14} color={colors.onPrimary} /> : null}</View><View style={styles.categoryCopy}><Text style={[styles.statusTitle, { color: colors.text }]}>{item.title}</Text><Text style={[styles.categoryDescription, { color: colors.textSecondary }]}>{item.detail}</Text></View></Pressable>)}</View>
      {!props.isMockData ? <Text style={[styles.apiNote, { color: colors.textSecondary }]}>Transaction intent and catalog status are not currently stored by the backend.</Text> : null}
    </View>

    <View style={[styles.scoreCard, { backgroundColor: colors.accentContainer }]} testID="property-readiness-score"><View style={[styles.scoreIcon, { backgroundColor: colors.accent }]}><AppIcon name="dashboard" size={20} color={colors.onPrimary} /></View><View style={styles.scoreCopy}><Text style={[styles.scoreTitle, { color: colors.onAccentContainer }]}>Catalog Rigor: {readinessScore >= 80 ? 'High' : readinessScore >= 50 ? 'Building' : 'Getting started'}</Text><Text style={[styles.categoryDescription, { color: colors.onAccentContainer }]}>Based on the listing details entered so far</Text></View><Text style={[styles.scoreValue, { color: colors.accent }]}>{readinessScore}/100</Text></View>
  </View>;
}

function SectionHeading({ icon, title, subtitle }: { icon: AppIconName; title: string; subtitle: string }) {
  const colors = useTheme();
  return <View style={styles.sectionHeading}><View style={[styles.sectionIcon, { backgroundColor: colors.surfaceLow }]}><AppIcon name={icon} size={20} color={colors.accent} /></View><View style={styles.sectionCopy}><Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text><Text style={[styles.categoryDescription, { color: colors.textSecondary }]}>{subtitle}</Text></View></View>;
}

const styles = StyleSheet.create({
  root: { gap: Spacing.three },
  hero: { minHeight: 176, borderRadius: Radius.large, overflow: 'hidden', justifyContent: 'flex-end' },
  heroContent: { padding: Spacing.three, gap: Spacing.one },
  heroBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: Spacing.one, paddingHorizontal: Spacing.two, paddingVertical: Spacing.one, borderRadius: Radius.pill },
  heroBadgeText: { ...Typography.labelSmall, fontWeight: '600' },
  heroDescription: { ...Typography.bodySmall, fontWeight: '500' },
  card: { padding: Spacing.three, borderRadius: Radius.large, gap: Spacing.two },
  sectionHeading: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two, marginBottom: Spacing.one },
  sectionIcon: { width: 36, height: 36, borderRadius: Radius.medium, alignItems: 'center', justifyContent: 'center' },
  sectionCopy: { flex: 1, minWidth: 0, gap: Spacing.half },
  sectionTitle: { ...Typography.title },
  categoryDescription: { ...Typography.bodySmall },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fieldLabel: { ...Typography.labelSmall, letterSpacing: 0.5 },
  counter: { ...Typography.labelSmall },
  titleInputRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  titleInput: { flex: 1, minWidth: 0 },
  clearButton: { width: 34, height: 34, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  suggestions: { gap: Spacing.one, marginTop: Spacing.half },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
  suggestion: { minHeight: 30, flexDirection: 'row', alignItems: 'center', gap: Spacing.half, paddingHorizontal: Spacing.two, borderRadius: Radius.pill },
  suggestionText: { ...Typography.labelSmall },
  descriptionLabel: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.one, marginTop: Spacing.one },
  aiLabel: { flexDirection: 'row', alignItems: 'center', gap: Spacing.half },
  aiLabelText: { ...Typography.labelSmall },
  categoryList: { gap: Spacing.one },
  categoryOption: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: Spacing.two, padding: Spacing.two, borderRadius: Radius.large },
  categoryIcon: { width: 40, height: 40, borderRadius: Radius.medium, alignItems: 'center', justifyContent: 'center' },
  categoryCopy: { flex: 1, minWidth: 0, gap: Spacing.half },
  categoryTitleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: Spacing.one },
  categoryTitle: { ...Typography.label },
  primaryBadge: { ...Typography.labelSmall, paddingHorizontal: Spacing.one, paddingVertical: 2, overflow: 'hidden', borderRadius: Radius.pill },
  radio: { width: 22, height: 22, borderWidth: 1.5, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  secondaryLabel: { gap: Spacing.half, marginTop: Spacing.two },
  caption: { ...Typography.bodySmall },
  useChip: { minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: Spacing.one, paddingHorizontal: Spacing.two, borderRadius: Radius.pill },
  useChipText: { ...Typography.labelSmall },
  apiNote: { ...Typography.bodySmall },
  segment: { flexDirection: 'row', gap: Spacing.half, padding: Spacing.half, borderRadius: Radius.large },
  segmentOption: { flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.half, borderRadius: Radius.medium },
  segmentText: { ...Typography.labelSmall, textAlign: 'center', fontWeight: '600' },
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
  statusOption: { flexBasis: '48%', flexGrow: 1, minWidth: 145, minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: Spacing.one, padding: Spacing.two, borderRadius: Radius.large },
  statusTitle: { ...Typography.label },
  scoreCard: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.large },
  scoreIcon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.pill },
  scoreCopy: { flex: 1, minWidth: 0, gap: Spacing.half },
  scoreTitle: { ...Typography.label, fontWeight: '700' },
  scoreValue: { ...Typography.title, fontWeight: '700' },
});
