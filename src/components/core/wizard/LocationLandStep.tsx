import { Pressable, StyleSheet, Switch, View } from 'react-native';
import { LocalizedText as Text } from '@/i18n/LocalizedText';
import { useState } from 'react';

import { CoreTextField } from '../forms/CoreTextField';
import { AppIcon, type AppIconName } from '../icons';
import { PropertyMap, PropertyMapOverlay, isValidCoordinate } from '../maps';
import { Radius, Spacing, Typography } from '@/theme/tokens';
import { useTheme } from '@/theme/theme-provider';

export type TitleClassification = 'ryotwari_patta' | 'natham' | 'gramathu_natham' | 'other';
export interface LocationLandDraft {
  village: string; pincode: string; taluk: string; district: string; state: string; surveyNumbers: string;
  widthFt: string; lengthFt: string; roadWidthFt: string; frontageDirection: string; roadAccessType: string;
  latitude: string; longitude: string; roadSubdivisionBasis: string; highwayDistanceKm: string; assignmentLand: boolean;
}
export interface LocationLandStepProps {
  location: LocationLandDraft;
  titleClassification: TitleClassification;
  accuracyMeters?: number | null;
  detectingLocation?: boolean;
  detectLocationError?: string;
  onLocationChange: (key: keyof LocationLandDraft, value: string | boolean) => void;
  onTitleClassificationChange: (value: TitleClassification) => void;
  onDetectLocation: () => void;
  onCoordinateSelect: (latitude: number, longitude: number) => void;
  onMapInteractionChange?: (active: boolean) => void;
}

const DIRECTIONS = ['North', 'East', 'South', 'West'];
const ROAD_WIDTHS = ['20', '30', '40', '60'];
const DISTANCES = [{ label: 'On Road', value: '0' }, { label: 'Below 500m', value: '0.5' }, { label: '1 km', value: '1' }, { label: '2 km', value: '2' }, { label: '5–10 km', value: '7.5' }];
const ROAD_TYPES: { value: string; label: string; detail: string; icon: AppIconName }[] = [
  { value: 'tar_road', label: 'Tar Road', detail: 'Heavy vehicle', icon: 'real_estate_agent' },
  { value: 'metal_road', label: 'Metal Road', detail: 'Gravel / WBM', icon: 'add_road' },
  { value: 'panchayat_road', label: 'Panchayat', detail: 'Concrete / paver', icon: 'domain' },
];
const TITLE_OPTIONS: { value: TitleClassification; label: string; description: string; badge?: string }[] = [
  { value: 'ryotwari_patta', label: 'Ryotwari Patta', description: 'Standard agricultural title issued by the State Revenue department', badge: 'Standard' },
  { value: 'natham', label: 'Natham Patta', description: 'Residential rural settlement parcel' },
  { value: 'gramathu_natham', label: 'Gramathu Natham', description: 'Village residential land classification' },
  { value: 'other', label: 'Other title classification', description: 'Choose when the deed uses another classification' },
];

export function LocationLandStep({ location, titleClassification, accuracyMeters, detectingLocation = false, detectLocationError, onLocationChange, onTitleClassificationChange, onDetectLocation, onCoordinateSelect, onMapInteractionChange }: LocationLandStepProps) {
  const colors = useTheme();
  const [mapExpanded, setMapExpanded] = useState(false);
  const latitude = location.latitude.trim() ? Number(location.latitude) : NaN;
  const longitude = location.longitude.trim() ? Number(location.longitude) : NaN;
  const coordinatesAvailable = isValidCoordinate(latitude, longitude);
  const card = { backgroundColor: colors.surface };
  const choose = (key: keyof LocationLandDraft, value: string) => onLocationChange(key, value);

  return (
    <View style={styles.root} testID="location-land-content">
      <View style={[styles.progressCard, card]}>
        <View style={styles.progressTop}>
          <View style={styles.inline}><View style={[styles.stepBadge, { backgroundColor: colors.primary }]}><Text style={[styles.stepBadgeText, { color: colors.onPrimary }]}>2</Text></View><Text style={[styles.stepText, { color: colors.text }]}>Step 2 of 6</Text></View>
          <Text style={[styles.progressPill, { color: colors.accent, backgroundColor: colors.accentContainer }]}>33% completed</Text>
        </View>
        <View accessibilityRole="progressbar" accessibilityLabel="Property form progress, step 2 of 6" accessibilityValue={{ min: 0, max: 100, now: 33 }} testID="location-progressbar" style={[styles.progressTrack, { backgroundColor: colors.surfaceHigh }]}><View style={[styles.progressFill, { backgroundColor: colors.accent, width: '33.33%' }]} /></View>
        <View style={styles.headingCopy}><Text style={[styles.pageTitle, { color: colors.text }]}>Location & Land Details</Text><Text style={[styles.bodyText, { color: colors.textSecondary }]}>Cadastral boundary mapping, coordinates, and road infrastructure classification.</Text></View>
      </View>

      <View style={[styles.card, card]}>
        <SectionHeading icon="compass_calibration" title="Geographic Address & GPS" subtitle="Detect your GPS location, tap the map once to place or move the pin, and swipe to explore." />
        <View style={[styles.mapPreview, { backgroundColor: colors.surfaceLow }]}>
          {!mapExpanded ? <PropertyMap latitude={coordinatesAvailable ? latitude : null} longitude={coordinatesAvailable ? longitude : null} onCoordinateSelect={onCoordinateSelect} onInteractionChange={onMapInteractionChange} /> : null}
          <View style={[styles.geoBadge, { backgroundColor: colors.surface }]}><View style={[styles.liveDot, { backgroundColor: coordinatesAvailable ? colors.success : colors.iconMuted }]} /><Text style={[styles.geoBadgeText, { color: colors.text }]}>{coordinatesAvailable ? 'GPS pin captured' : 'GPS pin not set'}</Text></View>
          <View style={[styles.regionBadge, { backgroundColor: colors.surface }]}><Text style={[styles.regionText, { color: colors.textSecondary }]} numberOfLines={1}>{[location.village, location.district].filter(Boolean).join(', ') || 'Location preview'}</Text></View>
          <Pressable accessibilityRole="button" accessibilityLabel="Expand location map" onPress={() => setMapExpanded(true)} style={[styles.expandMapButton, { backgroundColor: colors.surface }]} testID="expand-location-map"><AppIcon name="open_in_new" size={18} color={colors.accent} /><Text style={[styles.expandMapText, { color: colors.accent }]}>Expand map</Text></Pressable>
        </View>
        <PropertyMapOverlay visible={mapExpanded} latitude={coordinatesAvailable ? latitude : null} longitude={coordinatesAvailable ? longitude : null} address={{ village: location.village, pincode: location.pincode, taluk: location.taluk, district: location.district, state: location.state }} onClose={() => setMapExpanded(false)} onCoordinateSelect={onCoordinateSelect} onInteractionChange={onMapInteractionChange} />
        <View style={styles.mapDetails}><View style={styles.inline}><AppIcon name="location_on" size={17} color={colors.accent} /><Text style={[styles.coordinateText, { color: colors.textSecondary }]}>{coordinatesAvailable ? `Lat ${latitude.toFixed(6)}° · Lng ${longitude.toFixed(6)}°` : 'Tap the map once or detect GPS to set coordinates'}</Text></View><Text style={[styles.accuracyText, { color: colors.textSecondary }]}>{accuracyMeters != null ? `±${Math.round(accuracyMeters)}m` : ''}</Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Detect current GPS pin" accessibilityState={{ busy: detectingLocation }} disabled={detectingLocation} onPress={onDetectLocation} style={[styles.detectButton, { backgroundColor: colors.surfaceLow }]} testID="detect-gps-pin"><AppIcon name="location_on" size={19} color={colors.accent} /><Text style={[styles.detectText, { color: colors.accent }]}>{detectingLocation ? 'Detecting location…' : 'Detect current GPS Pin'}</Text></Pressable>
        {detectLocationError ? <Text accessibilityRole="alert" style={[styles.errorText, { color: colors.dangerText }]}>{detectLocationError}</Text> : null}
        <View style={styles.inputGroup}>
          <CoreTextField label="Address Line / Village" value={location.village} onChangeText={(value) => choose('village', value)} placeholder="Street, landmark, or hamlet name" testID="property-village" />
          <View style={styles.columns}><CoreTextField style={styles.column} label="Pincode" value={location.pincode} onChangeText={(value) => choose('pincode', value)} placeholder="Pincode" keyboardType="numeric" testID="property-pincode" /><CoreTextField style={styles.column} label="Taluk" value={location.taluk} onChangeText={(value) => choose('taluk', value)} placeholder="Taluk" testID="property-taluk" /></View>
          <View style={styles.columns}><CoreTextField style={styles.column} label="District" value={location.district} onChangeText={(value) => choose('district', value)} placeholder="District" testID="property-district" /><CoreTextField style={styles.column} label="State" value={location.state} onChangeText={(value) => choose('state', value)} placeholder="State" testID="property-state" /></View>
        </View>
      </View>

      <View style={[styles.card, card]}>
        <SectionHeading icon="verified" title="Cadastral Survey & Classification" subtitle="Revenue records and Patta encumbrance status" />
        <CoreTextField label="Survey Field Number (SF No.)" value={location.surveyNumbers} onChangeText={(value) => choose('surveyNumbers', value)} placeholder="e.g. 104/3B, 105" helperText="Separate multiple survey subdivisions with commas." testID="property-survey-numbers" />
        <View style={[styles.assignmentCard, { backgroundColor: colors.surfaceLow }]}>
          <View style={styles.assignmentRow}><View style={styles.flexCopy}><Text style={[styles.assignmentTitle, { color: colors.text }]}>Is this Assignment / Patta land?</Text><Text style={[styles.bodyText, { color: colors.textSecondary }]}>Government granted lease or transferable Patta title</Text></View><Switch accessibilityLabel="Assignment or Patta land" value={location.assignmentLand} onValueChange={(value) => onLocationChange('assignmentLand', value)} trackColor={{ false: colors.toggleTrack, true: colors.accent }} thumbColor={location.assignmentLand ? colors.onPrimary : colors.surface} /></View>
          <View style={styles.inline}><AppIcon name="verified" size={15} color={colors.accent} /><Text style={[styles.helperText, { color: colors.textSecondary }]}>Confirm this with the title deed. Assignment rules can affect resale permissions.</Text></View>
        </View>
        <View style={styles.titlePicker}><Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>PATTA / TITLE DEED CLASSIFICATION</Text>{TITLE_OPTIONS.map((item) => { const selected = titleClassification === item.value; return <Pressable key={item.value} accessibilityRole="radio" accessibilityLabel={item.label} accessibilityState={{ checked: selected }} onPress={() => onTitleClassificationChange(item.value)} style={[styles.titleOption, { backgroundColor: selected ? colors.surfaceContainer : colors.surfaceLow }]} testID={`title-class-${item.value}`}><AppIcon name={selected ? 'task_alt' : 'verified_user'} size={19} color={selected ? colors.accent : colors.iconMuted} /><View style={styles.flexCopy}><Text style={[styles.titleOptionLabel, { color: colors.text }]}>{item.label}</Text><Text style={[styles.helperText, { color: colors.textSecondary }]}>{item.description}</Text></View>{item.badge ? <Text style={[styles.badge, { color: colors.accent, backgroundColor: colors.accentContainer }]}>{item.badge}</Text> : null}</Pressable>; })}</View>
      </View>

      <View style={[styles.card, card]}>
        <SectionHeading icon="straighten" title="Dimensions & Frontage" subtitle="Boundary measurements and entry cardinal facing" />
        <View style={styles.columns}><CoreTextField style={styles.column} label="Width (ft)" value={location.widthFt} onChangeText={(value) => choose('widthFt', value)} placeholder="e.g. 320" keyboardType="decimal-pad" testID="property-width" /><CoreTextField style={styles.column} label="Length (ft)" value={location.lengthFt} onChangeText={(value) => choose('lengthFt', value)} placeholder="e.g. 450" keyboardType="decimal-pad" testID="property-length" /></View>
        <View style={styles.inputGroup}><Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>FRONTAGE FACING DIRECTION</Text><View style={styles.directionGrid}>{DIRECTIONS.map((direction) => <SelectChip key={direction} label={direction} selected={location.frontageDirection === direction} onPress={() => choose('frontageDirection', direction)} testID={`frontage-${direction.toLowerCase()}`} />)}</View></View>
        <View style={styles.inputGroup}><View style={styles.labelRow}><Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>FACING ROAD WIDTH</Text><Text style={[styles.selectedValue, { color: colors.accent }]}>{location.roadWidthFt ? `Selected: ${location.roadWidthFt} ft` : 'Optional'}</Text></View><CoreTextField accessibilityLabel="Facing road width in feet" value={location.roadWidthFt} onChangeText={(value) => choose('roadWidthFt', value)} placeholder="Road width in feet" keyboardType="decimal-pad" testID="property-road-width" /><View style={styles.quickChoices}>{ROAD_WIDTHS.map((width) => <SelectChip key={width} label={`${width} ft`} selected={location.roadWidthFt === width} onPress={() => choose('roadWidthFt', width)} testID={`road-width-${width}`} />)}</View></View>
      </View>

      <View style={[styles.card, card]}>
        <SectionHeading icon="add_road" title="Road Connectivity & Access" subtitle="Approaching corridor type and distance to artery" />
        <View style={styles.inputGroup}><Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>ACCESS ROAD TYPE</Text><View style={styles.roadTypeGrid}>{ROAD_TYPES.map((item) => { const selected = location.roadAccessType === item.value; return <Pressable key={item.value} accessibilityRole="radio" accessibilityLabel={`${item.label}, ${item.detail}`} accessibilityState={{ checked: selected }} onPress={() => choose('roadAccessType', item.value)} style={[styles.roadTypeCard, { backgroundColor: selected ? colors.primary : colors.surfaceLow }]} testID={`road-type-${item.value}`}><AppIcon name={item.icon} size={22} color={selected ? colors.onPrimary : colors.iconMuted} /><Text style={[styles.roadTypeTitle, { color: selected ? colors.onPrimary : colors.text }]}>{item.label}</Text><Text style={[styles.helperText, { color: selected ? colors.onPrimary : colors.textSecondary }]}>{item.detail}</Text></Pressable>; })}</View></View>
        <View style={styles.inputGroup}><Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>ROAD SUBDIVISION BASIS</Text><View style={styles.columns}><SelectChip label="Sketch Path" selected={location.roadSubdivisionBasis === 'sketch_path'} onPress={() => choose('roadSubdivisionBasis', 'sketch_path')} icon="document" testID="road-subdivision-sketch" /><SelectChip label="Govt Sub Division" selected={location.roadSubdivisionBasis === 'government_subdivision'} onPress={() => choose('roadSubdivisionBasis', 'government_subdivision')} icon="verified_user" testID="road-subdivision-government" /></View></View>
        <View style={styles.inputGroup}><Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>DISTANCE FROM STATE / NATIONAL HIGHWAY</Text><View style={styles.distanceChoices}>{DISTANCES.map((distance) => <SelectChip key={distance.value} label={distance.label} selected={location.highwayDistanceKm === distance.value} onPress={() => choose('highwayDistanceKm', distance.value)} testID={`highway-distance-${distance.value}`} />)}</View></View>
        <View style={[styles.snapshot, { backgroundColor: colors.surfaceLow }]}><View style={[styles.snapshotIcon, { backgroundColor: colors.accentContainer }]}><AppIcon name="eco" size={20} color={colors.accent} /></View><View style={styles.flexCopy}><Text style={[styles.snapshotTitle, { color: colors.text }]} numberOfLines={1}>{[location.village, location.district].filter(Boolean).join(' · ') || 'Location summary'}</Text><Text style={[styles.helperText, { color: colors.textSecondary }]} numberOfLines={2}>{summaryLine(location)}</Text></View><AppIcon name={coordinatesAvailable ? 'task_alt' : 'location_off'} size={19} color={coordinatesAvailable ? colors.accent : colors.iconMuted} /></View>
      </View>
    </View>
  );
}

function SectionHeading({ icon, title, subtitle }: { icon: AppIconName; title: string; subtitle: string }) {
  const colors = useTheme();
  return <View style={styles.sectionHeading}><View style={[styles.headingIcon, { backgroundColor: colors.surfaceContainer }]}><AppIcon name={icon} size={19} color={colors.accent} /></View><View style={styles.flexCopy}><Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text><Text style={[styles.helperText, { color: colors.textSecondary }]}>{subtitle}</Text></View></View>;
}

function SelectChip({ label, selected, onPress, icon, testID }: { label: string; selected: boolean; onPress: () => void; icon?: AppIconName; testID: string }) {
  const colors = useTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected }} onPress={onPress} style={[styles.selectChip, { backgroundColor: selected ? colors.primary : colors.surfaceLow }]} testID={testID}>{icon ? <AppIcon name={icon} size={17} color={selected ? colors.onPrimary : colors.iconMuted} /> : null}<Text style={[styles.selectChipText, { color: selected ? colors.onPrimary : colors.text }]}>{label}</Text></Pressable>;
}

function summaryLine(location: LocationLandDraft) {
  const measurements = location.widthFt && location.lengthFt ? `${location.widthFt} × ${location.lengthFt} ft` : null;
  const entries = [location.surveyNumbers || null, measurements, location.roadAccessType?.replaceAll('_', ' ') || null].filter(Boolean);
  return entries.join(' · ') || 'Add survey, dimensions, or road access details';
}

const styles = StyleSheet.create({
  root: { gap: Spacing.three }, progressCard: { padding: Spacing.three, borderRadius: Radius.medium, gap: Spacing.two }, progressTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two }, inline: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two }, stepBadge: { width: 24, height: 24, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' }, stepBadgeText: { ...Typography.labelSmall }, stepText: { ...Typography.label }, progressPill: { ...Typography.labelSmall, paddingHorizontal: Spacing.two, paddingVertical: Spacing.half, borderRadius: Radius.pill }, progressTrack: { height: 7, overflow: 'hidden', borderRadius: Radius.pill }, progressFill: { height: '100%', borderRadius: Radius.pill }, headingCopy: { gap: Spacing.half }, pageTitle: { ...Typography.title }, bodyText: { ...Typography.bodySmall },
  card: { padding: Spacing.three, borderRadius: Radius.large, gap: Spacing.three }, sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two }, headingIcon: { width: 34, height: 34, borderRadius: Radius.small, alignItems: 'center', justifyContent: 'center' }, flexCopy: { flex: 1, minWidth: 0, gap: Spacing.half }, sectionTitle: { ...Typography.title, flexShrink: 1 }, helperText: { ...Typography.bodySmall },
  mapPreview: { height: 176, borderRadius: Radius.medium, overflow: 'hidden', position: 'relative' }, geoBadge: { position: 'absolute', top: Spacing.two, left: Spacing.two, flexDirection: 'row', alignItems: 'center', gap: Spacing.one, paddingHorizontal: Spacing.two, paddingVertical: Spacing.one, borderRadius: Radius.pill }, liveDot: { width: 8, height: 8, borderRadius: Radius.pill }, geoBadgeText: { ...Typography.labelSmall }, regionBadge: { position: 'absolute', top: Spacing.two, right: Spacing.two, maxWidth: '54%', paddingHorizontal: Spacing.two, paddingVertical: Spacing.one, borderRadius: Radius.small }, regionText: { ...Typography.labelSmall }, expandMapButton: { position: 'absolute', right: Spacing.two, bottom: Spacing.two, minHeight: 40, paddingHorizontal: Spacing.two, borderRadius: Radius.medium, flexDirection: 'row', alignItems: 'center', gap: Spacing.one }, expandMapText: { ...Typography.labelSmall }, mapDetails: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.one }, coordinateText: { ...Typography.labelSmall, flexShrink: 1 }, accuracyText: { ...Typography.labelSmall }, detectButton: { minHeight: 48, borderRadius: Radius.medium, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.two }, detectText: { ...Typography.label }, errorText: { ...Typography.bodySmall }, inputGroup: { gap: Spacing.two }, columns: { flexDirection: 'row', gap: Spacing.two }, column: { flex: 1, minWidth: 0 },
  assignmentCard: { padding: Spacing.two, borderRadius: Radius.medium, gap: Spacing.two }, assignmentRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two }, assignmentTitle: { ...Typography.label }, fieldLabel: { ...Typography.labelSmall, letterSpacing: 0.45 }, titlePicker: { gap: Spacing.two }, titleOption: { minHeight: 68, padding: Spacing.two, borderRadius: Radius.medium, flexDirection: 'row', alignItems: 'center', gap: Spacing.two }, titleOptionLabel: { ...Typography.label }, badge: { ...Typography.labelSmall, paddingHorizontal: Spacing.two, paddingVertical: Spacing.half, borderRadius: Radius.pill }, directionGrid: { flexDirection: 'row', gap: Spacing.two }, labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.two }, selectedValue: { ...Typography.labelSmall }, quickChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }, selectChip: { minHeight: 40, paddingHorizontal: Spacing.three, borderRadius: Radius.medium, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.one, flexGrow: 1 }, selectChipText: { ...Typography.bodySmall, fontWeight: '600' }, roadTypeGrid: { flexDirection: 'row', gap: Spacing.two }, roadTypeCard: { flex: 1, minWidth: 0, minHeight: 92, borderRadius: Radius.medium, alignItems: 'center', justifyContent: 'center', padding: Spacing.one, gap: Spacing.one }, roadTypeTitle: { ...Typography.labelSmall, textAlign: 'center' }, distanceChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }, snapshot: { minHeight: 60, padding: Spacing.two, borderRadius: Radius.medium, flexDirection: 'row', alignItems: 'center', gap: Spacing.two }, snapshotIcon: { width: 38, height: 38, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' }, snapshotTitle: { ...Typography.label },
});
