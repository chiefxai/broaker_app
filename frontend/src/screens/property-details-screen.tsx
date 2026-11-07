import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Platform, ActivityIndicator, Linking, ScrollView, StyleSheet, View } from 'react-native';
import { LocalizedText as Text } from '@/i18n/LocalizedText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';

import { getBrokerProfile, getBusinessProfile, getPropertyDocumentDownloadUrl, getPropertyDocuments } from '@/api/backend-api';
import { useOptionalAuth } from '@/auth/auth-provider';
import { AppHeader, AppIcon, CoreButton, PropertyFactRow, PropertyPhotoGallery, StatusChip } from '@/components/core';
import { LoadingSkeleton, SkeletonBlock } from '@/components/core/LoadingSkeleton';
import { useLocalProperty } from '@/data/database';
import { isMockMode } from '@/data/app-mode';
import { mockBrokerProfile, mockBusinessProfile } from '@/data/mock/settings';
import { MaxContentWidth, Radius, Spacing, Typography } from '@/theme/tokens';
import { useTheme } from '@/theme/theme-provider';
import { useFooterContentPadding } from '@/theme/use-footer-inset';
import { formatArea, formatInr } from '@/utils/formatters';
import { useToast } from '@/components/core/toast/ToastProvider';

export default function PropertyDetailsScreen() {
  const footerPadding = useFooterContentPadding();
  const colors = useTheme();
  const router = useRouter();
  const auth = useOptionalAuth();
  const { showToast } = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: property, isPending, isError, refetch } = useLocalProperty(id);
  const [photoIndex, setPhotoIndex] = useState(0);
  const documentsQuery = useQuery({ queryKey: ['backend', 'property-documents', id], queryFn: () => auth?.accessToken ? getPropertyDocuments(auth.accessToken, id) : Promise.reject(new Error('Sign in to load property documents.')), enabled: !isMockMode && Boolean(auth?.accessToken && id) });
  const brokerQuery = useQuery({ queryKey: ['backend', 'broker-profile'], queryFn: () => auth?.accessToken ? getBrokerProfile(auth.accessToken) : Promise.reject(new Error('Sign in to load broker details.')), enabled: !isMockMode && Boolean(auth?.accessToken) });
  const businessQuery = useQuery({ queryKey: ['backend', 'business-profile'], queryFn: () => auth?.accessToken ? getBusinessProfile(auth.accessToken) : Promise.reject(new Error('Sign in to load business contact details.')), enabled: !isMockMode && Boolean(auth?.accessToken) });
  const facts = property?.facts ?? [];
  const frontage = facts.find((fact) => fact.label.toLowerCase().includes('frontage'));
  const access = facts.find((fact) => fact.label.toLowerCase().includes('road access'));
  const documents = useMemo(() => {
    if (isMockMode) return property?.documents ?? [];
    return (documentsQuery.data ?? []).filter((document) => document.category !== 'photo').map((document) => ({
      id: document.id,
      title: document.display_name || document.filename,
      categoryLabel: document.category,
      detailLabel: document.content_type,
      sizeLabel: '',
      statusLabel: undefined,
    }));
  }, [documentsQuery.data, property?.documents]);
  const broker = isMockMode ? mockBrokerProfile : brokerQuery.data;
  const business = isMockMode ? mockBusinessProfile : businessQuery.data;
  const openDocument = async (documentId: string) => {
    if (isMockMode) { showToast('Document preview is available when a file is attached to this property.', 'info'); return; }
    if (!auth?.accessToken) { showToast('Sign in to open this document.', 'warning'); return; }
    try { const url = await getPropertyDocumentDownloadUrl(auth.accessToken, documentId); await Linking.openURL(url); }
    catch { showToast('Could not open this document. Try again.', 'error'); }
  };
  const contactBroker = async () => {
    const value = business?.public_phone || business?.public_email;
    if (!value) { showToast('Broker contact details are not available.', 'warning'); return; }
    const url = business?.public_phone ? `tel:${business.public_phone.replace(/[^+\d]/g, '')}` : `mailto:${business?.public_email}`;
    try { await Linking.openURL(url); } catch { showToast('This device could not open the contact action.', 'error'); }
  };
  const reference = property?.referenceCode ?? (property?.id ? `ID ${property.id.slice(0, 8).toUpperCase()}` : '');

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: Platform.OS === 'ios' ? colors.surface : colors.background }]} edges={['top']}>
      <AppHeader onBack={() => router.canGoBack() ? router.back() : router.replace('/explore')} actionIcon="share" actionLabel="Open shared links" onAction={() => router.push('/shared-links')} workspaceLabel="" />
      <ScrollView style={[styles.scroll, { backgroundColor: colors.background }]} contentContainerStyle={[styles.content, { paddingBottom: footerPadding }]}>
        <View style={styles.container}>
          {isPending ? <LoadingSkeleton label="Loading property details" style={[styles.loadingDetails, { backgroundColor: colors.surface }]}>
            <SkeletonBlock style={styles.loadingPhoto} />
            <SkeletonBlock style={styles.loadingTitle} />
            <SkeletonBlock style={styles.loadingLine} />
            <View style={styles.loadingFacts}><SkeletonBlock style={styles.loadingFact} /><SkeletonBlock style={styles.loadingFact} /></View>
            <SkeletonBlock style={styles.loadingPanel} />
          </LoadingSkeleton> : null}
          {isError ? <View style={[styles.state, { backgroundColor: colors.surface }]}><Text style={{ color: colors.text }}>Property details could not be loaded.</Text><CoreButton label="Retry" onPress={() => void refetch()} /></View> : null}
          {!isPending && !isError && !property ? <View style={[styles.state, { backgroundColor: colors.surface }]}><Text style={{ color: colors.text }}>{isMockMode ? 'This property is not available on this device.' : 'This property was not found in your account.'}</Text></View> : null}
          {property ? <>
            <View style={styles.heroSection} testID="property-media-heading-group">
            <View style={styles.sectionHeader}><Text style={[styles.sectionTitle, { color: colors.text }]}>Field media</Text><Text style={[styles.eyebrow, { color: colors.accent }]}>{property.photoCount ?? property.photos?.length ?? (property.image ? 1 : 0)} PHOTOS</Text></View>
            <PropertyPhotoGallery
              photos={property.photos ?? (property.image ? [property.image] : [])}
              currentIndex={photoIndex}
              onIndexChange={setPhotoIndex}
              aspectRatio={4 / 3}
              topOverlay={<View style={styles.heroBadges}><StatusChip label={property.status.label === 'Available' ? 'Available for Acquisition' : property.status.label} tone={property.status.tone} /><StatusChip label={property.categoryLabel} tone="neutral" /></View>}
              bottomOverlay={<View style={[styles.galleryHint, { backgroundColor: colors.surface }]}><AppIcon name="photo_camera" size={15} color={colors.accent} /><Text style={[styles.galleryHintText, { color: colors.text }]}>{property.photos?.length ?? property.photoCount ?? (property.image ? 1 : 0)} photos · Use arrows to browse</Text></View>}
            />
            <View style={styles.headingBlock}>
              <View style={styles.referenceRow}><Text style={[styles.eyebrow, { color: colors.accent }]}>PROPERTY LISTING</Text><Text style={[styles.dot, { color: colors.border }]}>·</Text><Text style={[styles.reference, { color: colors.textSecondary }]}>{reference}</Text></View>
              <Text style={[styles.title, { color: colors.text }]}>{property.title}</Text>
              <View style={styles.locationRow}><AppIcon name="location_on" size={18} color={colors.accent} /><Text style={[styles.location, { color: colors.text }]}>{property.location ?? 'Location not added'}</Text></View>
              <View style={[styles.privacy, { backgroundColor: colors.surfaceContainer }]}><AppIcon name="verified_user" size={16} color={colors.accent} /><Text style={[styles.privacyText, { color: colors.textSecondary }]}>Exact survey coordinates remain private in public views.</Text></View>
            </View>
            </View>
            <View style={[styles.valuationCard, { backgroundColor: colors.surface }]}>
              <View style={styles.valuationHeader}><Text style={[styles.caption, { color: colors.textSecondary }]}>ASKING PRICE</Text>{property.negotiable != null ? <StatusChip label={property.negotiable ? 'Negotiable' : 'Price fixed'} tone={property.negotiable ? 'success' : 'neutral'} /> : null}</View>
              <Text style={[styles.price, { color: colors.text }]}>{property.priceInr == null ? 'Price not added' : formatInr(property.priceInr)}</Text>
              {property.minimumPriceInr != null ? <Text style={[styles.subtle, { color: colors.textSecondary }]}>Minimum price {formatInr(property.minimumPriceInr)}</Text> : null}
              {property.advanceAmountInr != null || property.outstandingLoanInr != null ? <View style={[styles.financialBand, { backgroundColor: colors.surfaceLow }]}>
                {property.advanceAmountInr != null ? <View style={styles.financialItem}><Text style={[styles.caption, { color: colors.textSecondary }]}>Advance</Text><Text style={[styles.financialValue, { color: colors.text }]}>{formatInr(property.advanceAmountInr)}</Text></View> : null}
                {property.outstandingLoanInr != null ? <View style={styles.financialItem}><Text style={[styles.caption, { color: colors.textSecondary }]}>Outstanding loan</Text><Text style={[styles.financialValue, { color: colors.text }]}>{formatInr(property.outstandingLoanInr)}</Text></View> : null}
              </View> : null}
              <View style={styles.quickMetrics}>
                <Metric icon="straighten" label="Extent" value={formatArea(property.area)} detail={property.area && property.area.unit.toLowerCase().startsWith('cent') ? `(${(property.area.value / 100).toFixed(2)} acres)` : undefined} />
                <Metric icon="compass_calibration" label="Frontage" value={frontage?.value ?? 'Not recorded'} detail={frontage?.detail} />
                <Metric icon="add_road" label="Access" value={access?.value ?? 'Not recorded'} detail={access?.detail} />
              </View>
            </View>
            {property.description ? <View style={styles.section}><Text style={[styles.sectionTitle, { color: colors.text }]}>About this property</Text><Text style={[styles.body, { color: colors.textSecondary }]}>{property.description}</Text></View> : null}
            {facts.length ? <View style={styles.section}>
              <View style={styles.sectionHeader}><Text style={[styles.sectionTitle, { color: colors.text }]}>Property specifications</Text><Text style={[styles.eyebrow, { color: colors.accent }]}>{property.categoryLabel.toUpperCase()}</Text></View>
              <View style={[styles.factsCard, { backgroundColor: colors.surface }]}>{facts.map((fact) => <PropertyFactRow key={`${fact.label}-${fact.value}`} {...fact} />)}</View>
            </View> : null}
            {property.legalTitle ? <View style={[styles.titleCard, { backgroundColor: colors.surface }]}><AppIcon name="verified_user" size={20} color={colors.success} /><View style={styles.flex}><Text style={[styles.sectionTitle, { color: colors.text }]}>Title classification</Text><Text style={[styles.body, { color: colors.textSecondary }]}>{property.legalTitle}</Text></View><StatusChip label="Recorded" tone="success" /></View> : null}
            <View style={[styles.documentsCard, { backgroundColor: colors.surface }]}>
              <View style={styles.documentsHeading}><View style={[styles.folderIcon, { backgroundColor: colors.accentContainer }]}><AppIcon name="folder_managed" size={18} color={colors.accent} /></View><View style={styles.flex}><Text style={[styles.sectionTitle, { color: colors.text }]}>Property documents</Text><Text style={[styles.subtle, { color: colors.textSecondary }]}>Legal records, reports, and supporting files.</Text></View>{documents.length ? <StatusChip label={`${documents.length} files`} tone="success" /> : null}</View>
              {!isMockMode && documentsQuery.isLoading ? <ActivityIndicator accessibilityLabel="Loading property documents" color={colors.accent} /> : null}
              {!isMockMode && documentsQuery.isError ? <Text accessibilityRole="alert" style={[styles.subtle, { color: colors.dangerText }]}>Could not load documents. Reopen the property to retry.</Text> : null}
              {documents.length ? documents.map((document) => <View key={document.id} style={[styles.documentRow, { backgroundColor: colors.surfaceLow }]}>
                <View style={[styles.documentIcon, { backgroundColor: colors.surfaceContainer }]}><AppIcon name={document.categoryLabel.toLowerCase().includes('map') ? 'map' : 'document'} size={20} color={colors.accent} /></View>
                <View style={styles.documentCopy}><View style={styles.documentTitleRow}><Text style={[styles.documentTitle, { color: colors.text }]} numberOfLines={2}>{document.title}</Text>{document.statusLabel ? <StatusChip label={document.statusLabel} tone="neutral" /> : null}</View><Text style={[styles.subtle, { color: colors.textSecondary }]} numberOfLines={2}>{document.categoryLabel}{document.sizeLabel ? ` · ${document.sizeLabel}` : ''} · {document.detailLabel}</Text></View>
                <CoreButton label="Open" leadingIcon="visibility" size="small" variant="tertiary" onPress={() => void openDocument(document.id)} />
              </View>) : !documentsQuery.isLoading ? <Text style={[styles.subtle, { color: colors.textSecondary }]}>No documents have been added to this listing.</Text> : null}
            </View>
            <View style={[styles.brokerCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>LISTING BROKER</Text>
              <View style={styles.brokerRow}><View style={[styles.avatar, { backgroundColor: colors.accentContainer }]}><AppIcon name="person" size={24} color={colors.accent} /></View><View style={styles.flex}><View style={styles.brokerNameRow}><Text style={[styles.sectionTitle, { color: colors.text }]}>{broker?.legal_name ?? 'Broker profile'}</Text>{broker?.license_number ? <AppIcon name="verified" size={18} color={colors.accent} /> : null}</View><Text style={[styles.subtle, { color: colors.textSecondary }]}>{broker?.designation ?? 'Property listing contact'}</Text>{broker?.license_number ? <Text style={[styles.subtle, { color: colors.textSecondary }]}>License {broker.license_number} · {broker.license_jurisdiction ?? 'Verified'}</Text> : null}</View></View>
              {business?.public_phone || business?.public_email ? <CoreButton label="Contact Broker" leadingIcon={business.public_phone ? 'phone' : 'mail'} fullWidth onPress={() => void contactBroker()} /> : null}
            </View>
            <View style={[styles.footerNote, { backgroundColor: colors.surfaceLow }]}><AppIcon name="lock" size={16} color={colors.accent} /><Text style={[styles.subtle, { color: colors.textSecondary }]}>Broaker Direct Client Link · Property details are only shared according to each link’s disclosure settings.</Text></View>
          </> : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Metric({ icon, label, value, detail }: { icon: 'straighten' | 'compass_calibration' | 'add_road'; label: string; value: string | null; detail?: string }) {
  const colors = useTheme();
  return <View style={[styles.metric, { backgroundColor: colors.surfaceLow }]}><AppIcon name={icon} size={19} color={colors.accent} /><Text style={[styles.metricLabel, { color: colors.textSecondary }]}>{label}</Text><Text style={[styles.metricValue, { color: colors.text }]} numberOfLines={2}>{value ?? 'Not recorded'}</Text>{detail ? <Text style={[styles.subtle, { color: colors.textSecondary }]} numberOfLines={2}>{detail}</Text> : null}</View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1 }, scroll: { flex: 1 }, content: { paddingHorizontal: Spacing.three, paddingTop: Spacing.three, alignItems: 'center' }, container: { width: '100%', maxWidth: MaxContentWidth, gap: Spacing.four }, heroSection: { gap: Spacing.three },
  state: { minHeight: 160, alignItems: 'center', justifyContent: 'center', padding: Spacing.four, gap: Spacing.three, borderRadius: Radius.large },
  loadingDetails: { width: '100%', minHeight: 420, padding: Spacing.three, borderRadius: Radius.large, gap: Spacing.three },
  loadingPhoto: { width: '100%', height: 210, borderRadius: Radius.large },
  loadingTitle: { width: '78%', height: 28 },
  loadingLine: { width: '54%', height: 14 },
  loadingFacts: { flexDirection: 'row', gap: Spacing.two },
  loadingFact: { flex: 1, height: 68, borderRadius: Radius.medium },
  loadingPanel: { width: '100%', height: 104, borderRadius: Radius.medium },
  heroBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one, maxWidth: '88%' }, galleryHint: { paddingHorizontal: Spacing.two, paddingVertical: Spacing.one, borderRadius: Radius.pill, flexDirection: 'row', alignItems: 'center', gap: Spacing.one }, galleryHintText: Typography.bodySmall,
  headingBlock: { gap: Spacing.two }, referenceRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one }, eyebrow: { ...Typography.labelSmall, letterSpacing: 0.7, textTransform: 'uppercase' }, dot: Typography.bodySmall, reference: { ...Typography.bodySmall, fontFamily: 'monospace' }, title: { ...Typography.heading, lineHeight: 32 }, locationRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.one }, location: { ...Typography.body, flex: 1 }, privacy: { alignSelf: 'flex-start', maxWidth: '100%', flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.one, paddingHorizontal: Spacing.two, paddingVertical: Spacing.two, borderRadius: Radius.small }, privacyText: { ...Typography.bodySmall, flexShrink: 1 },
  valuationCard: { borderRadius: Radius.large, padding: Spacing.three, gap: Spacing.two }, valuationHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two }, caption: { ...Typography.labelSmall, letterSpacing: 0.5 }, price: { ...Typography.heading, fontSize: 28, lineHeight: 36 }, subtle: Typography.bodySmall, financialBand: { flexDirection: 'row', flexWrap: 'wrap', borderRadius: Radius.medium, padding: Spacing.two, gap: Spacing.three }, financialItem: { minWidth: 120, flex: 1, gap: Spacing.one }, financialValue: Typography.label,
  quickMetrics: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.one }, metric: { flex: 1, minWidth: 0, alignItems: 'center', textAlign: 'center', gap: Spacing.one, borderRadius: Radius.medium, padding: Spacing.two }, metricLabel: { ...Typography.bodySmall, textAlign: 'center' }, metricValue: { ...Typography.label, textAlign: 'center' },
  section: { gap: Spacing.two }, sectionHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two }, sectionTitle: Typography.title, body: Typography.body, factsCard: { paddingHorizontal: Spacing.three, borderRadius: Radius.large }, titleCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.large }, flex: { flex: 1, minWidth: 0, gap: Spacing.one },
  documentsCard: { padding: Spacing.three, borderRadius: Radius.large, gap: Spacing.two }, documentsHeading: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two }, folderIcon: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.small }, documentRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: Spacing.two, padding: Spacing.two, borderRadius: Radius.medium }, documentIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.small }, documentCopy: { flex: 1, minWidth: 140, gap: Spacing.one }, documentTitleRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.one }, documentTitle: { ...Typography.label, flexShrink: 1 },
  brokerCard: { padding: Spacing.three, gap: Spacing.two, borderRadius: Radius.large }, brokerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two }, avatar: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.pill }, brokerNameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one }, footerNote: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.medium },
});
