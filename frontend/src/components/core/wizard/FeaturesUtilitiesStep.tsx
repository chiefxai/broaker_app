import { Image } from 'expo-image';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { LocalizedText as Text } from '@/i18n/LocalizedText';

import { CoreTextField } from '../forms/CoreTextField';
import { AppIcon, type AppIconName } from '../icons';
import { Radius, Spacing, Typography } from '@/theme/tokens';
import { useTheme } from '@/theme/theme-provider';

export type SoilType = 'red' | 'black' | 'alluvial' | 'sandy_loam' | 'other';
export type WaterSource = 'river' | 'canal' | 'borewell' | 'open_well' | 'government_supply';
export type FeatureUtility = 'fencing' | 'electricity' | 'irrigation' | 'road_access' | 'borewell_pump' | 'open_well_pump' | 'insurance';
export type IrrigationMethod = 'drip' | 'sprinkler' | 'flood' | null;

export interface SoilProfileDetails {
  topsoilDepthFt?: string;
  fertilityIndex?: string;
  organicCarbon?: string;
  organicCarbonStatus?: string;
  profileCaption?: string;
  ph?: string;
  labVerified?: boolean;
  imageUri?: string | null;
}

export interface FeaturesUtilitiesStepProps {
  soilType: SoilType;
  soilTypeOther: string;
  waterTdsPpm: string;
  waterSources: WaterSource[];
  utilities: FeatureUtility[];
  agronomistNotes: string;
  irrigationMethod: IrrigationMethod;
  soilProfileDetails?: SoilProfileDetails | null;
  waterSourceDetails?: Partial<Record<WaterSource, string>>;
  irrigationImageUri?: string | null;
  irrigationImageCaption?: string;
  onSoilTypeChange: (value: SoilType) => void;
  onSoilTypeOtherChange: (value: string) => void;
  onWaterTdsChange: (value: string) => void;
  onWaterSourcesChange: (value: WaterSource[]) => void;
  onUtilitiesChange: (value: FeatureUtility[]) => void;
  onAgronomistNotesChange: (value: string) => void;
  onIrrigationMethodChange: (value: IrrigationMethod) => void;
}

const SOILS: { value: SoilType; label: string; icon?: AppIconName }[] = [
  { value: 'red', label: 'Red Soil' }, { value: 'black', label: 'Black Soil' },
  { value: 'alluvial', label: 'Alluvial Soil' }, { value: 'sandy_loam', label: 'Sandy Loam' },
  { value: 'other', label: 'Other Custom Mix / Clay', icon: 'tune' },
];
const WATER_OPTIONS: { value: WaterSource; title: string; description: string; icon: AppIconName; detail?: string }[] = [
  { value: 'river', title: 'River / Canal Frontage', description: 'Perennial flowing canal along perimeter', icon: 'water_drop' },
  { value: 'borewell', title: 'Active Borewell', description: 'Borewell water source on the property', icon: 'download' },
  { value: 'open_well', title: 'Open Stone Well', description: 'Traditional stone masonry well', icon: 'apartment' },
  { value: 'government_supply', title: 'Govt Canal Sluice Supply', description: 'Bi-weekly seasonal irrigation schedule', icon: 'domain' },
];
const INFRASTRUCTURE: { value: FeatureUtility; title: string; description: string; icon: AppIconName; badge?: string }[] = [
  { value: 'fencing', title: 'Fully Fenced Perimeter', description: 'Barbed wire with solar intrusion alert', icon: 'fence' },
  { value: 'electricity', title: 'EB Power / 3-Phase', description: 'Subsidized dedicated transformer feed', icon: 'bolt', badge: '5HP Agri' },
  { value: 'borewell_pump', title: 'Bore Well Energized', description: 'Submersible pump installed & running', icon: 'download' },
  { value: 'open_well_pump', title: 'Open Well Pump House', description: 'Reinforced coping wall with motor shed', icon: 'apartment' },
  { value: 'road_access', title: 'Internal Tractor / Motor Track', description: '16 ft gravel compacted access route', icon: 'add_road' },
  { value: 'insurance', title: 'Land & Crop Insurance', description: 'PMFBY scheme or private multi-peril cover', icon: 'verified_user' },
];
const IRRIGATION: { value: Exclude<IrrigationMethod, null>; label: string; sublabel: string; icon: AppIconName }[] = [
  { value: 'drip', label: 'Auto Drip', sublabel: 'Installed', icon: 'water_drop' },
  { value: 'sprinkler', label: 'Sprinkler', sublabel: 'Portable', icon: 'water_drop' },
  { value: 'flood', label: 'Flood Basin', sublabel: 'Gravity', icon: 'water' },
];
const TDS_PRESETS = [100, 150, 200, 250, 300];

export function FeaturesUtilitiesStep(props: FeaturesUtilitiesStepProps) {
  const colors = useTheme();
  const toggleSource = (value: WaterSource) => props.onWaterSourcesChange(
    props.waterSources.includes(value) ? props.waterSources.filter((item) => item !== value) : [...props.waterSources, value],
  );
  const toggleUtility = (value: FeatureUtility) => props.onUtilitiesChange(
    props.utilities.includes(value) ? props.utilities.filter((item) => item !== value) : [...props.utilities, value],
  );
  const surfaceCard = { backgroundColor: colors.surface };

  return (
    <View style={styles.root} testID="features-utilities-content">
      <View style={[styles.progressCard, surfaceCard]}>
        <View style={styles.progressTop}>
          <View style={styles.inline}>
            <View style={[styles.stepBadge, { backgroundColor: colors.primary }]}><Text style={[styles.stepBadgeText, { color: colors.onPrimary }]}>3</Text></View>
            <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>STEP 3 OF 6</Text>
          </View>
          <Text style={[styles.completion, { color: colors.accent }]}>50% completed</Text>
        </View>
        <View accessibilityRole="progressbar" accessibilityLabel="Property form progress, step 3 of 6" accessibilityValue={{ min: 0, max: 100, now: 50 }} testID="features-progressbar" style={[styles.progressTrack, { backgroundColor: colors.surfaceContainer }]}>
          <View style={[styles.progressFill, { backgroundColor: colors.accent, width: '50%' }]} />
        </View>
        <View style={styles.progressLabels}>
          <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>Basic Details & Land</Text>
          <Text style={[styles.progressLabel, styles.progressCurrent, { color: colors.text }]}>Features & Utilities</Text>
          <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>Valuation & Legal</Text>
        </View>
      </View>

      <View style={[styles.insight, { backgroundColor: colors.surfaceLow }]}>
        <View style={[styles.insightIcon, { backgroundColor: colors.surfaceContainer }]}><AppIcon name="eco" size={25} color={colors.accent} /></View>
        <View style={styles.flexCopy}>
          <View style={styles.insightTitleRow}><Text style={[styles.sectionTitle, { color: colors.text }]}>Agronomy & Grid Matrix</Text><Text style={[styles.badge, { backgroundColor: colors.accentContainer, color: colors.onAccentContainer }]}>High yield</Text></View>
          <Text style={[styles.bodyCopy, { color: colors.textSecondary }]}>Define ground resilience, water salinity, and active electrification to calculate an informed property valuation score.</Text>
        </View>
      </View>

      <SectionHeading icon="eco" title="Soil & Agronomy Profile" badge={props.soilProfileDetails?.labVerified ? 'Lab Verified' : props.soilProfileDetails ? 'Not verified' : 'Soil details'} />
      <View style={[styles.card, surfaceCard]}>
        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>DOMINANT SOIL TYPE</Text>
        <View style={styles.soilGrid}>
          {SOILS.map((soil, index) => {
            const selected = props.soilType === soil.value;
            const swatchColors = [colors.warning, colors.text, colors.warningContainer, colors.outline];
            return <Pressable key={soil.value} accessibilityRole="radio" accessibilityLabel={soil.label} accessibilityState={{ checked: selected }} onPress={() => props.onSoilTypeChange(soil.value)} style={[styles.soilChip, index === 4 && styles.fullRow, { backgroundColor: selected ? colors.primary : colors.surfaceLow }]} testID={`soil-option-${soil.value}`}>
              <View style={styles.inline}>{soil.icon ? <AppIcon name={soil.icon} size={18} color={selected ? colors.onPrimary : colors.iconMuted} /> : <View style={[styles.soilSwatch, { backgroundColor: swatchColors[index] }]} />}<Text style={[styles.soilText, { color: selected ? colors.onPrimary : colors.text }]}>{soil.label}</Text></View>
              {selected ? <AppIcon name="task_alt" size={18} color={colors.onPrimary} /> : <View style={styles.iconPlaceholder} />}
            </Pressable>;
          })}
        </View>
        {props.soilType === 'other' ? <CoreTextField label="Custom soil mix" value={props.soilTypeOther} onChangeText={props.onSoilTypeOtherChange} placeholder="Describe the soil mix" testID="property-soil-other" /> : null}
        <View style={[styles.summaryCard, { backgroundColor: colors.surfaceLow }]}>
          <View style={styles.summaryTop}><View style={styles.inline}><AppIcon name="straighten" size={17} color={colors.accent} /><Text style={[styles.summaryTitle, { color: colors.text }]}>Topsoil Depth & Horizon</Text></View><Text style={[styles.badge, { backgroundColor: colors.surfaceContainer, color: colors.textSecondary }]}>{props.soilProfileDetails?.topsoilDepthFt ? `${props.soilProfileDetails.topsoilDepthFt} ft Deep` : 'Not measured'}</Text></View>
          <View style={styles.summaryStats}><View style={styles.summaryColumn}><Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Fertility Index</Text><Text style={[styles.summaryValue, { color: colors.text }]}>{props.soilProfileDetails?.fertilityIndex ?? 'Not assessed'}</Text></View><View style={[styles.summaryColumn, styles.alignEnd]}><Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Organic Carbon</Text><Text style={[styles.summaryValue, { color: colors.accent }]}>{props.soilProfileDetails?.organicCarbon ? `${props.soilProfileDetails.organicCarbon}${props.soilProfileDetails.organicCarbonStatus ? ` (${props.soilProfileDetails.organicCarbonStatus})` : ''}` : 'Not measured'}</Text></View></View>
        </View>
        <View style={[styles.sample, { backgroundColor: colors.surfaceContainer }]}>
          {props.soilProfileDetails?.imageUri ? <Image source={{ uri: props.soilProfileDetails.imageUri }} contentFit="cover" style={StyleSheet.absoluteFill} accessibilityLabel="Soil profile sample" /> : null}
          <View style={[styles.sampleScrim, { backgroundColor: props.soilProfileDetails?.imageUri ? colors.imageScrim : colors.surfaceHigh }]} />
          <View style={styles.sampleCaption}><View style={styles.inline}><AppIcon name="verified" size={15} color={props.soilProfileDetails?.imageUri ? colors.onScrim : colors.accent} /><Text style={[styles.sampleText, { color: props.soilProfileDetails?.imageUri ? colors.onScrim : colors.text }]}>{props.soilProfileDetails?.profileCaption ?? 'Soil profile photo can be added later'}</Text></View><Text style={[styles.sampleText, { color: props.soilProfileDetails?.imageUri ? colors.onScrim : colors.textSecondary }]}>{props.soilProfileDetails?.ph ? `pH ${props.soilProfileDetails.ph}` : 'Optional'}</Text></View>
        </View>
      </View>

      <SectionHeading icon="water_drop" title="Water Sources & TDS" badge={props.waterTdsPpm ? 'TDS recorded' : 'Test needed'} />
      <View style={[styles.card, surfaceCard]}>
        <View style={styles.labelRow}><Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>WATER TDS LEVEL (PPM)</Text><Text style={[styles.microLabel, { color: colors.accent }]}>{tdsLabel(props.waterTdsPpm)}</Text></View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tdsRow}>
          {TDS_PRESETS.map((value) => { const selected = Number(props.waterTdsPpm) === value; return <Pressable key={value} accessibilityRole="button" accessibilityLabel={`Water TDS at most ${value} parts per million`} accessibilityState={{ selected }} onPress={() => props.onWaterTdsChange(String(value))} style={[styles.tdsChip, { backgroundColor: selected ? colors.primary : colors.surfaceLow }]} testID={`tds-${value}`}><Text style={[styles.tdsText, { color: selected ? colors.onPrimary : colors.text }]}>{`≤ ${value} TDS`}</Text></Pressable>; })}
        </ScrollView>
        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>AVAILABLE HYDRATION POINTS</Text>
        <View style={styles.sourceList}>{WATER_OPTIONS.map((source) => { const selected = props.waterSources.includes(source.value); const detail = props.waterSourceDetails?.[source.value]; return <Pressable key={source.value} accessibilityRole="checkbox" accessibilityLabel={source.title} accessibilityState={{ checked: selected }} onPress={() => toggleSource(source.value)} style={[styles.sourceRow, { backgroundColor: colors.surfaceLow }]} testID={`water-source-${source.value}`}>
          <View style={[styles.sourceIcon, { backgroundColor: colors.surfaceContainer }]}><AppIcon name={source.icon} size={19} color={colors.accent} /></View><View style={styles.flexCopy}><View style={styles.sourceTitleRow}><Text style={[styles.sourceTitle, { color: colors.text }]}>{source.title}</Text>{detail ? <Text style={[styles.badge, { backgroundColor: colors.surfaceHigh, color: colors.textSecondary }]}>{detail}</Text> : null}</View><Text style={[styles.sourceDescription, { color: colors.textSecondary }]}>{source.description}</Text></View><View style={[styles.checkbox, { borderColor: selected ? colors.accent : colors.border, backgroundColor: selected ? colors.accent : 'transparent' }]}>{selected ? <AppIcon name="checkmark" size={14} color={colors.onPrimary} /> : null}</View>
        </Pressable>; })}</View>
      </View>

      <SectionHeading icon="fence" title="Essential Infrastructure" badge={`${props.utilities.length} Active Systems`} />
      <View style={[styles.card, styles.infrastructureCard, surfaceCard]}>{INFRASTRUCTURE.map((item) => { const selected = props.utilities.includes(item.value); return <View key={item.value} style={styles.infrastructureRow}>
        <View style={[styles.sourceIcon, { backgroundColor: colors.surfaceLow }]}><AppIcon name={item.icon} size={19} color={colors.text} /></View><View style={styles.flexCopy}><View style={styles.insightTitleRow}><Text style={[styles.sourceTitle, { color: colors.text }]}>{item.title}</Text>{item.badge ? <Text style={[styles.badge, { backgroundColor: colors.surfaceContainer, color: colors.accent }]}>{item.badge}</Text> : null}</View><Text style={[styles.sourceDescription, { color: colors.textSecondary }]}>{item.description}</Text></View><Switch accessibilityLabel={item.title} value={selected} onValueChange={() => toggleUtility(item.value)} trackColor={{ false: colors.toggleTrack, true: colors.accent }} thumbColor={selected ? colors.onPrimary : colors.surface} />
      </View>; })}</View>

      <SectionHeading icon="water_drop" title="Irrigation Architecture" badge="Method" />
      <View style={[styles.card, surfaceCard]}><View style={styles.irrigationGrid}>{IRRIGATION.map((item) => { const selected = props.irrigationMethod === item.value; return <Pressable key={item.value} accessibilityRole="radio" accessibilityLabel={`${item.label}, ${item.sublabel}`} accessibilityState={{ checked: selected }} onPress={() => props.onIrrigationMethodChange(selected ? null : item.value)} style={[styles.irrigationCard, { backgroundColor: selected ? colors.primary : colors.surfaceLow }]} testID={`irrigation-${item.value}`}><AppIcon name={item.icon} size={23} color={selected ? colors.onPrimary : colors.textSecondary} /><Text style={[styles.irrigationTitle, { color: selected ? colors.onPrimary : colors.text }]}>{item.label}</Text><Text style={[styles.irrigationSubtitle, { color: selected ? colors.onPrimary : colors.textSecondary }]}>{item.sublabel}</Text></Pressable>; })}</View>
        <View style={[styles.irrigationPhoto, { backgroundColor: colors.surfaceLow }]}>
          {props.irrigationImageUri ? <Image source={{ uri: props.irrigationImageUri }} contentFit="cover" style={StyleSheet.absoluteFill} accessibilityLabel="Irrigation infrastructure" /> : null}
          <View style={[styles.photoScrim, { backgroundColor: props.irrigationImageUri ? colors.imageScrim : colors.surfaceContainer }]} />
          <View style={styles.photoCaption}><View style={styles.inline}><AppIcon name="water" size={17} color={props.irrigationImageUri ? colors.onScrim : colors.accent} /><Text style={[styles.sourceTitle, { color: props.irrigationImageUri ? colors.onScrim : colors.text }]}>{props.irrigationImageCaption ?? 'Infrastructure photos can be attached in the media step.'}</Text></View>{props.irrigationImageUri ? <Text style={[styles.badge, { color: colors.onScrim, backgroundColor: colors.imageScrim }]}>Zone 1 & 2</Text> : null}</View>
        </View>
      </View>

      <View style={styles.notesField}><Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>AGRONOMIST OBSERVATIONS / NOTES</Text><CoreTextField accessibilityLabel="Agronomist observations and notes" value={props.agronomistNotes} onChangeText={props.onAgronomistNotesChange} placeholder="e.g., Fenced with 7ft stone pillars, solar energized wire, 30 coconut trees along border" testID="property-agronomy-notes" /></View>
    </View>
  );
}

function tdsLabel(value: string) { const ppm = Number(value); return !value || !Number.isFinite(ppm) ? 'Not measured' : ppm <= 150 ? 'Low TDS' : ppm <= 300 ? 'Moderate TDS' : 'High TDS'; }

function SectionHeading({ icon, title, badge }: { icon: AppIconName; title: string; badge: string }) {
  const colors = useTheme();
  return <View style={styles.sectionHeading}><View style={styles.inline}><AppIcon name={icon} size={19} color={colors.accent} /><Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text></View><Text style={[styles.microLabel, { color: colors.accent }]}>{badge}</Text></View>;
}

const styles = StyleSheet.create({
  root: { gap: Spacing.three },
  progressCard: { padding: Spacing.three, borderRadius: Radius.medium, gap: Spacing.two },
  progressTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  inline: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  stepBadge: { width: 24, height: 24, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  stepBadgeText: { ...Typography.labelSmall }, eyebrow: { ...Typography.labelSmall, letterSpacing: 0.6 },
  completion: { ...Typography.labelSmall }, progressTrack: { height: 7, overflow: 'hidden', borderRadius: Radius.pill }, progressFill: { height: '100%', borderRadius: Radius.pill },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.one }, progressLabel: { ...Typography.labelSmall, flexShrink: 1 }, progressCurrent: { fontWeight: '700' },
  insight: { padding: Spacing.three, borderRadius: Radius.large, flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three }, insightIcon: { width: 44, height: 44, borderRadius: Radius.medium, alignItems: 'center', justifyContent: 'center' },
  flexCopy: { flex: 1, minWidth: 0, gap: Spacing.one }, insightTitleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: Spacing.one }, sectionTitle: { ...Typography.title, flexShrink: 1 }, bodyCopy: { ...Typography.bodySmall }, badge: { ...Typography.labelSmall, overflow: 'hidden', borderRadius: Radius.pill, paddingHorizontal: Spacing.two, paddingVertical: Spacing.half },
  sectionHeading: { minHeight: 32, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two, paddingHorizontal: Spacing.one }, microLabel: { ...Typography.labelSmall }, card: { padding: Spacing.three, borderRadius: Radius.large, gap: Spacing.three },
  fieldLabel: { ...Typography.labelSmall, letterSpacing: 0.5 }, soilGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }, soilChip: { flexBasis: '48%', flexGrow: 1, minHeight: 48, paddingHorizontal: Spacing.two, paddingVertical: Spacing.two, borderRadius: Radius.medium, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.one }, fullRow: { flexBasis: '100%' }, soilSwatch: { width: 14, height: 14, borderRadius: Radius.pill }, soilText: { ...Typography.bodySmall, fontWeight: '600', flexShrink: 1 }, iconPlaceholder: { width: 18 },
  summaryCard: { padding: Spacing.two, borderRadius: Radius.medium, gap: Spacing.two }, summaryTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.one }, summaryTitle: { ...Typography.label }, summaryStats: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.two }, summaryColumn: { flex: 1, minWidth: 0, gap: Spacing.half }, alignEnd: { alignItems: 'flex-end' }, summaryLabel: { ...Typography.labelSmall }, summaryValue: { ...Typography.label, flexShrink: 1 },
  sample: { minHeight: 112, borderRadius: Radius.medium, overflow: 'hidden', justifyContent: 'flex-end', padding: Spacing.two }, sampleScrim: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }, sampleCaption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.one }, sampleText: { ...Typography.labelSmall, flexShrink: 1 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.two }, tdsRow: { gap: Spacing.two, paddingBottom: Spacing.one }, tdsChip: { minHeight: 38, paddingHorizontal: Spacing.three, borderRadius: Radius.small, alignItems: 'center', justifyContent: 'center' }, tdsText: { ...Typography.bodySmall, fontWeight: '600' }, sourceList: { gap: Spacing.two }, sourceRow: { minHeight: 68, padding: Spacing.two, borderRadius: Radius.medium, flexDirection: 'row', alignItems: 'center', gap: Spacing.two }, sourceIcon: { width: 36, height: 36, borderRadius: Radius.small, alignItems: 'center', justifyContent: 'center' }, sourceTitleRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.one }, sourceTitle: { ...Typography.label, fontSize: 13, lineHeight: 18, flexShrink: 1 }, sourceDescription: { ...Typography.bodySmall }, checkbox: { width: 20, height: 20, borderWidth: 1.5, borderRadius: Radius.small, alignItems: 'center', justifyContent: 'center' },
  infrastructureCard: { gap: Spacing.two }, infrastructureRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: Spacing.two }, irrigationGrid: { flexDirection: 'row', gap: Spacing.two }, irrigationCard: { flex: 1, minWidth: 0, minHeight: 96, padding: Spacing.two, borderRadius: Radius.medium, alignItems: 'center', justifyContent: 'center', gap: Spacing.one }, irrigationTitle: { ...Typography.labelSmall, textAlign: 'center' }, irrigationSubtitle: { ...Typography.labelSmall, textAlign: 'center', fontWeight: '400' }, irrigationPhoto: { minHeight: 128, borderRadius: Radius.medium, overflow: 'hidden', justifyContent: 'flex-end', padding: Spacing.two }, photoScrim: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }, photoCaption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two }, notesField: { gap: Spacing.two },
});
