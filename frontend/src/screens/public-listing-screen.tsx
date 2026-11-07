import { createElement, useEffect, useRef, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Image, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { LocalizedText as Text } from '@/i18n/LocalizedText';

import { getPublicListing, type ApiPublicListing } from '@/api/backend-api';
import { AppHeader } from '@/components/core/navigation/AppHeader';
import { CoreButton } from '@/components/core/CoreButton';
import { AppIcon } from '@/components/core/icons';
import { LoadingSkeleton, SkeletonBlock } from '@/components/core/LoadingSkeleton';
import { formatInr } from '@/utils/formatters';
import { MaxContentWidth, Radius, Spacing, Typography } from '@/theme/tokens';
import { useTheme } from '@/theme/theme-provider';
import { CoreTextField } from '@/components/core/forms/CoreTextField';
import { useOptionalAuth } from '@/auth/auth-provider';
import { AuthGate } from '@/auth/auth-gate';
import { isMockMode } from '@/data/app-mode';

export default function PublicListingScreen({ authenticatedOnly = false }: { authenticatedOnly?: boolean } = {}) {
  const colors = useTheme();
  const auth = useOptionalAuth();
  const { token: rawToken } = useLocalSearchParams<{ token?: string | string[] }>();
  const token = Array.isArray(rawToken) ? rawToken[0] : rawToken;
  const [passcodeInput, setPasscodeInput] = useState('');
  const [submittedPasscode, setSubmittedPasscode] = useState('');
  const submittedPasscodeRef = useRef('');
  const [gallerySelection, setGallerySelection] = useState<{ token?: string; index: number }>({ token, index: 0 });
  const selectedMediaIndex = gallerySelection.token === token ? gallerySelection.index : 0;
  const [selectedDocument, setSelectedDocument] = useState<{ url: string; name: string } | null>(null);
  const [documentError, setDocumentError] = useState<string | null>(null);
  useEffect(() => {
    const url = selectedDocument?.url;
    return () => {
      if (Platform.OS === 'web' && url?.startsWith('blob:')) URL.revokeObjectURL(url);
    };
  }, [selectedDocument]);
  const query = useQuery({
    queryKey: ['public-listing', token, Boolean(auth?.accessToken)],
    queryFn: () => isMockMode && token?.startsWith('mock-profile~')
      ? Promise.resolve<ApiPublicListing>(token.endsWith('highland-orchard')
        ? { title: 'Highland Orchard', category: 'agriculture', specifications: { area: 150, area_unit: 'cent' }, approximate_location: 'Tenkasi, Tamil Nadu' }
        : { title: 'Green Valley Farm', description: 'Agricultural land with established water access.', category: 'agriculture', asking_price_inr: 2400000, specifications: { area: 92, area_unit: 'acre' }, approximate_location: 'Tirunelveli, Tamil Nadu' })
      : getPublicListing(token!, submittedPasscodeRef.current || undefined, auth?.accessToken ?? undefined),
    enabled: Boolean(token),
    retry: (failureCount, error) => {
      const status = (error as { response?: { status?: number } })?.response?.status;
      return status !== 401 && failureCount < 1;
    },
  });
  const responseError = query.error as { response?: { data?: { detail?: unknown }; status?: number } } | null;
  const errorStatus = responseError?.response?.status;
  const errorDetail = responseError?.response?.data?.detail;
  const requiresOwnerSignIn = errorDetail === 'Sign in to view this private share link';
  const isPasscodeError = errorStatus === 401 && !requiresOwnerSignIn;
  const isLoading = Boolean(token) && query.isPending;
  const sharedDocuments = [
    ...(query.data?.reports ?? []).map((item) => ({ ...item, category: 'Report' })),
    ...(query.data?.documents ?? []).map((item) => ({ ...item, category: item.category.replaceAll('_', ' ') })),
  ];
  const media = query.data?.media ?? [];
  const selectedMedia = media[Math.min(selectedMediaIndex, Math.max(0, media.length - 1))];
  const brokerContact = query.data?.broker_contact;
  const brokerLocation = [brokerContact?.city, brokerContact?.district, brokerContact?.state].filter(Boolean).join(', ');
  const specifications = query.data?.specifications;
  const specificationRows = [
    ...(specifications?.soil_type || specifications?.soil_type_other
      ? [{ label: 'Soil', value: (specifications.soil_type_other || specifications.soil_type || '').replaceAll('_', ' ') }]
      : []),
    ...(specifications?.water_tds_ppm != null
      ? [{ label: 'Water quality', value: `${specifications.water_tds_ppm} ppm TDS` }]
      : []),
    ...(specifications?.water_sources ?? []).map((source, index) => ({
      label: index === 0 ? 'Water sources' : '',
      value: [source.label || source.source_type.replaceAll('_', ' '), source.details].filter(Boolean).join(' · '),
    })),
    ...(specifications?.utilities ?? []).filter((utility) => utility.available).map((utility, index) => ({
      label: index === 0 ? 'Utilities' : '',
      value: utility.details || utility.utility_type.replaceAll('_', ' '),
    })),
  ];
  const category = (specifications?.category ?? query.data?.category ?? '').replaceAll('_', ' ');
  const hasContactActions = Boolean(brokerContact?.public_phone || brokerContact?.public_email);

  if (requiresOwnerSignIn && !auth?.accessToken && !authenticatedOnly) {
    return <AuthGate><PublicListingScreen authenticatedOnly /></AuthGate>;
  }

  const openSharedDocument = async (document: { url: string; name: string }) => {
    if (Platform.OS !== 'web') {
      setSelectedDocument(document);
      return;
    }
    try {
      const response = await fetch(document.url, {
        headers: {
          ...(submittedPasscode ? { 'X-Share-Passcode': submittedPasscode } : {}),
          ...(auth?.accessToken ? { Authorization: `Bearer ${auth.accessToken}` } : {}),
        },
      });
      if (!response.ok) throw new Error('Unable to open this shared document.');
      const fileUrl = URL.createObjectURL(await response.blob());
      setDocumentError(null);
      setSelectedDocument({ url: fileUrl, name: document.name });
    } catch {
      setDocumentError('Could not open this shared document. Check the passcode and try again.');
    }
  };

  const openContact = async (url: string, errorMessage: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      setDocumentError(errorMessage);
    }
  };

  const propertyHasDetails = Boolean(
    query.data?.title || query.data?.description || category || query.data?.asking_price_inr != null
    || query.data?.area != null || query.data?.specifications?.area != null
    || query.data?.approximate_location || media.length || specificationRows.length
    || query.data?.road_access_type || query.data?.road_width_ft != null || sharedDocuments.length
    || (brokerContact && Object.values(brokerContact).some(Boolean)),
  );
  const documentViewer = selectedDocument ? <SafeAreaView style={[styles.documentModal, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
    <View style={[styles.documentHeader, { borderBottomColor: colors.border }]}>
      <Text numberOfLines={1} style={[styles.sectionTitle, styles.documentTitle, { color: colors.text }]}>{selectedDocument.name}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Close shared document" onPress={() => setSelectedDocument(null)} style={styles.documentClose}>
        <AppIcon name="close" size={20} color={colors.text} />
      </Pressable>
    </View>
    <View style={styles.documentWebView}>
      {Platform.OS === 'web'
        ? createElement('iframe', { title: selectedDocument.name, 'aria-label': `Shared document viewer: ${selectedDocument.name}`, src: selectedDocument.url, style: { width: '100%', height: '100%', border: 0 }, referrerPolicy: 'no-referrer' })
        : <WebView style={styles.documentWebView} source={{ uri: selectedDocument.url, headers: { ...(submittedPasscode ? { 'X-Share-Passcode': submittedPasscode } : {}), ...(auth?.accessToken ? { Authorization: `Bearer ${auth.accessToken}` } : {}) } }} />}
    </View>
  </SafeAreaView> : null;

  return <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
    <AppHeader pageTitle="Property details" brandIcon="apartment" />
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.container}>
        {isLoading ? <LoadingSkeleton label="Loading property preview" style={styles.loadingLayout}>
          <SkeletonBlock style={styles.loadingHero} />
          <SkeletonBlock style={styles.loadingTitle} />
          <SkeletonBlock style={styles.loadingLine} />
          <SkeletonBlock style={styles.loadingCard} />
        </LoadingSkeleton> : null}

        {query.isError || !token ? <View style={[styles.stateCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.stateIcon, { backgroundColor: isPasscodeError ? colors.accentContainer : colors.surfaceContainer }]}>
            <AppIcon name={isPasscodeError ? 'lock' : 'location_off'} size={23} color={isPasscodeError ? colors.accent : colors.iconMuted} />
          </View>
          {isPasscodeError ? <>
            <Text style={[styles.stateTitle, { color: colors.text }]}>{submittedPasscode ? 'That passcode did not work' : 'Passcode required'}</Text>
            <Text style={[styles.body, styles.centerText, { color: colors.textSecondary }]}>{submittedPasscode ? 'Check the passcode from the broker and try again.' : 'Enter the passcode provided by the property broker to view this listing.'}</Text>
            <CoreTextField label="Share passcode" accessibilityLabel="Property share passcode" value={passcodeInput} onChangeText={(value) => setPasscodeInput(value.replace(/\D/g, '').slice(0, 12))} keyboardType="number-pad" secureTextEntry maxLength={12} />
            <CoreButton label={submittedPasscode ? 'Try again' : 'Unlock property'} variant="primary" fullWidth disabled={passcodeInput.length < 6} onPress={() => { submittedPasscodeRef.current = passcodeInput; setSubmittedPasscode(passcodeInput); void query.refetch(); }} />
          </> : <>
            <Text style={[styles.stateTitle, { color: colors.text }]}>{!token ? 'This link is incomplete' : errorStatus === 404 ? 'This property link is unavailable' : 'We could not load this property'}</Text>
            <Text style={[styles.body, styles.centerText, { color: colors.textSecondary }]}>{!token ? 'Check that you copied the complete link and try again.' : errorStatus === 404 ? 'The link may have expired or been revoked by the broker.' : 'Check your connection and try again in a moment.'}</Text>
            {token ? <CoreButton label="Retry" variant="secondary" fullWidth onPress={() => void query.refetch()} /> : null}
          </>}
        </View> : null}

        {query.data && !propertyHasDetails ? <View style={[styles.stateCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.stateIcon, { backgroundColor: colors.surfaceContainer }]}><AppIcon name="contact_page" size={23} color={colors.iconMuted} /></View>
          <Text style={[styles.stateTitle, { color: colors.text }]}>No public details are available</Text>
          <Text style={[styles.body, styles.centerText, { color: colors.textSecondary }]}>The broker has not added any information for this share link yet.</Text>
        </View> : null}

        {query.data && propertyHasDetails ? <View style={styles.listing}>
          {media.length ? <View style={styles.gallery}>
            <View style={styles.sectionHeadingRow}><View><Text style={[styles.sectionTitle, { color: colors.text }]}>Property photos</Text><Text style={[styles.caption, { color: colors.textSecondary }]}>A closer look at the property</Text></View><View style={[styles.galleryBadge, { backgroundColor: colors.accentContainer }]}><AppIcon name="shield" size={14} color={colors.accent} /><Text style={[styles.galleryBadgeText, { color: colors.onAccentContainer }]}>Shared preview</Text></View></View>
            <View style={[styles.heroFrame, { backgroundColor: colors.surfaceContainer }]}>
              <Image source={{ uri: selectedMedia.url, headers: { ...(submittedPasscode ? { 'X-Share-Passcode': submittedPasscode } : {}), ...(auth?.accessToken ? { Authorization: `Bearer ${auth.accessToken}` } : {}) } }} accessibilityLabel={selectedMedia.name || query.data.title || 'Property photo'} resizeMode="cover" style={styles.heroImage} />
              <View style={[styles.photoCount, { backgroundColor: colors.imageScrim }]}><AppIcon name="photo_camera" size={14} color={colors.onScrim} /><Text style={[styles.photoCountText, { color: colors.onScrim }]}>{selectedMediaIndex + 1} / {media.length}</Text></View>
            </View>
            {selectedMedia.name ? <Text style={[styles.caption, { color: colors.textSecondary }]}>{selectedMedia.name}</Text> : null}
            {media.length > 1 ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbnailList} accessibilityLabel="Property photos">
              {media.map((photo, index) => <Pressable key={`${photo.url}-${index}`} accessibilityRole="button" accessibilityLabel={`Show photo ${index + 1}${photo.name ? `: ${photo.name}` : ''}`} accessibilityState={{ selected: selectedMediaIndex === index }} onPress={() => setGallerySelection({ token, index })} style={[styles.thumbnailButton, { backgroundColor: colors.surface, borderColor: selectedMediaIndex === index ? colors.accent : colors.border }]} testID={`shared-photo-${index + 1}`}>
                <Image source={{ uri: photo.url, headers: { ...(submittedPasscode ? { 'X-Share-Passcode': submittedPasscode } : {}), ...(auth?.accessToken ? { Authorization: `Bearer ${auth.accessToken}` } : {}) } }} accessibilityLabel={photo.name || `Property photo ${index + 1}`} resizeMode="cover" style={styles.thumbnailImage} />
                <Text numberOfLines={1} style={[styles.thumbnailLabel, { color: colors.textSecondary }]}>{photo.name || `Photo ${index + 1}`}</Text>
              </Pressable>)}
            </ScrollView> : null}
          </View> : <View accessibilityRole="text" accessibilityLabel="No property photos are shared" style={[styles.photoPlaceholder, { backgroundColor: colors.surfaceContainer, borderColor: colors.border }]}><View style={[styles.placeholderIcon, { backgroundColor: colors.surface }]}><AppIcon name="photo_camera" size={24} color={colors.accent} /></View><Text style={[styles.placeholderTitle, { color: colors.text }]}>A closer look</Text><Text style={[styles.body, { color: colors.textSecondary }]}>No property photos are included in this preview.</Text></View>}

          <View style={[styles.summary, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.summaryTopline}><View style={[styles.sharedBadge, { backgroundColor: colors.surfaceLow }]}><AppIcon name="verified_user" size={14} color={colors.accent} /><Text style={[styles.sharedBadgeText, { color: colors.textSecondary }]}>BROKER SHARED</Text></View>{category ? <View style={[styles.categoryPill, { backgroundColor: colors.accentContainer }]}><Text style={[styles.eyebrow, { color: colors.onAccentContainer }]}>{category}</Text></View> : null}</View>
            {query.data.title ? <Text style={[styles.heading, { color: colors.text }]}>{query.data.title}</Text> : null}
            {query.data.approximate_location ? <View style={styles.metaRow}><AppIcon name="location_on" size={18} color={colors.accent} /><Text style={[styles.body, styles.flex, { color: colors.textSecondary }]}>{query.data.approximate_location}</Text></View> : null}
            {(query.data.asking_price_inr != null || (query.data.specifications?.area ?? query.data.area) != null) ? <View style={styles.factRow}>
              {query.data.asking_price_inr != null ? <View style={[styles.fact, { backgroundColor: colors.surfaceLow }]}><View style={styles.factHeading}><AppIcon name="currency_rupee" size={17} color={colors.accent} /><Text style={[styles.factLabel, { color: colors.textSecondary }]}>Asking price</Text></View><Text style={[styles.price, { color: colors.text }]}>{formatInr(query.data.asking_price_inr)}</Text></View> : null}
              {(query.data.specifications?.area ?? query.data.area) != null && (query.data.specifications?.area_unit ?? query.data.area_unit) ? <View style={[styles.fact, { backgroundColor: colors.surfaceLow }]}><View style={styles.factHeading}><AppIcon name="straighten" size={17} color={colors.accent} /><Text style={[styles.factLabel, { color: colors.textSecondary }]}>Land area</Text></View><Text style={[styles.factValue, { color: colors.text }]}>{query.data.specifications?.area ?? query.data.area} {query.data.specifications?.area_unit ?? query.data.area_unit}</Text></View> : null}
            </View> : null}
          </View>

          {query.data.description ? <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.sectionTitle, { color: colors.text }]}>About this property</Text><Text style={[styles.body, styles.description, { color: colors.textSecondary }]}>{query.data.description}</Text></View> : null}

          {specificationRows.length ? <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Property details</Text>
            <View style={styles.specificationGrid}>{specificationRows.map((row, index) => <View key={`${row.label}-${row.value}-${index}`} style={[styles.specificationItem, { backgroundColor: colors.surfaceLow }]}>
              {row.label ? <Text style={[styles.factLabel, { color: colors.textSecondary }]}>{row.label}</Text> : null}
              <Text style={[styles.factValue, { color: colors.text }]}>{row.value}</Text>
            </View>)}</View>
          </View> : null}

          {query.data.road_access_type || query.data.road_width_ft != null ? <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.sectionHeadingRow}><View style={styles.sectionHeading}><AppIcon name="add_road" size={19} color={colors.accent} /><Text style={[styles.sectionTitle, { color: colors.text }]}>Approach</Text></View></View>
            <Text style={[styles.body, { color: colors.textSecondary }]}>{[query.data.road_access_type, query.data.road_width_ft != null ? `${query.data.road_width_ft} ft road` : null].filter(Boolean).join(' · ')}</Text>
          </View> : null}

          {sharedDocuments.length ? <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.sectionHeadingRow}><View style={styles.sectionHeading}><AppIcon name="document" size={19} color={colors.accent} /><Text style={[styles.sectionTitle, { color: colors.text }]}>Shared documents</Text></View><Text style={[styles.eyebrow, { color: colors.textSecondary }]}>{sharedDocuments.length} {sharedDocuments.length === 1 ? 'file' : 'files'}</Text></View>
            {sharedDocuments.map((document, index) => <View key={`${document.url}-${index}`} style={[styles.documentRow, { backgroundColor: colors.surfaceLow, borderColor: colors.border }]}>
              <View style={[styles.documentIcon, { backgroundColor: colors.accentContainer }]}><AppIcon name="document" size={19} color={colors.accent} /></View>
              <View style={styles.documentCopy}><Text numberOfLines={2} style={[styles.documentName, { color: colors.text }]}>{document.name}</Text><Text style={[styles.caption, { color: colors.textSecondary }]}>{document.category}</Text></View>
              <CoreButton label="Open" accessibilityLabel={`Open shared ${document.category.toLowerCase()} ${document.name}`} size="small" variant="tertiary" leadingIcon="visibility" onPress={() => void openSharedDocument(document)} />
            </View>)}
          </View> : null}

          {brokerContact && Object.values(brokerContact).some(Boolean) ? <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.sectionHeadingRow}><View style={styles.sectionHeading}><AppIcon name="verified_user" size={19} color={colors.accent} /><Text style={[styles.sectionTitle, { color: colors.text }]}>Contact the broker</Text></View></View>
            {brokerContact.business_name ? <Text style={[styles.businessName, { color: colors.text }]}>{brokerContact.business_name}</Text> : null}
            {brokerLocation ? <View style={styles.contactLine}><AppIcon name="location_on" size={17} color={colors.accent} /><Text style={[styles.body, { color: colors.textSecondary }]}>{brokerLocation}</Text></View> : null}
            {brokerContact.public_phone ? <Text style={[styles.body, { color: colors.textSecondary }]}>{brokerContact.public_phone}</Text> : null}
            {brokerContact.public_email ? <Text style={[styles.body, { color: colors.textSecondary }]}>{brokerContact.public_email}</Text> : null}
          </View> : null}

          {documentError ? <Text accessibilityRole="alert" style={[styles.body, { color: colors.danger }]}>{documentError}</Text> : null}
          <Text style={[styles.privacy, { color: colors.textSecondary }]}>Shared securely by Broaker. Details shown depend on the broker’s sharing settings.</Text>
        </View> : null}
      </View>
    </ScrollView>

    {hasContactActions ? <View style={[styles.contactDock, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
      <Text style={[styles.dockTitle, { color: colors.text }]}>Interested? Contact the broker</Text>
      <View style={styles.contactActions}>
        {brokerContact?.public_phone ? <CoreButton label="Call broker" accessibilityLabel={`Call broker at ${brokerContact.public_phone}`} variant="primary" leadingIcon="phone" fullWidth style={styles.contactAction} onPress={() => void openContact(`tel:${brokerContact.public_phone}`, 'Could not open the phone action on this device.')} /> : null}
        {brokerContact?.public_email ? <CoreButton label="Email broker" accessibilityLabel={`Email broker at ${brokerContact.public_email}`} variant="secondary" leadingIcon="mail" fullWidth style={styles.contactAction} onPress={() => void openContact(`mailto:${brokerContact.public_email}`, 'Could not open the email action on this device.')} /> : null}
      </View>
    </View> : null}

    {Platform.OS === 'web'
      ? selectedDocument ? <View style={[styles.webDocumentOverlay, { backgroundColor: colors.background }]}>{documentViewer}</View> : null
      : <Modal visible={selectedDocument !== null} animationType="slide" onRequestClose={() => setSelectedDocument(null)}>{documentViewer}</Modal>}
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flex: 1 },
  content: { width: '100%', alignItems: 'center', padding: Spacing.three, paddingBottom: Spacing.four },
  container: { width: '100%', maxWidth: MaxContentWidth, gap: Spacing.three },
  listing: { gap: Spacing.three },
  loadingLayout: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', gap: Spacing.two },
  loadingHero: { height: 240, borderRadius: Radius.large },
  loadingTitle: { width: '75%', height: 28, marginTop: Spacing.one },
  loadingLine: { width: '45%', height: 15 },
  loadingCard: { height: 120, borderRadius: Radius.large, marginTop: Spacing.one },
  gallery: { gap: Spacing.one },
  galleryBadge: { minHeight: 30, flexDirection: 'row', alignItems: 'center', gap: Spacing.one, paddingHorizontal: Spacing.two, borderRadius: Radius.pill },
  galleryBadgeText: { ...Typography.labelSmall },
  heroFrame: { width: '100%', height: 300, borderRadius: Radius.large, overflow: 'hidden' },
  heroImage: { width: '100%', height: '100%' },
  photoCount: { position: 'absolute', right: Spacing.two, bottom: Spacing.two, flexDirection: 'row', alignItems: 'center', gap: Spacing.one, paddingHorizontal: Spacing.two, paddingVertical: Spacing.one, borderRadius: Radius.pill },
  photoCountText: { ...Typography.labelSmall, fontWeight: '600' },
  photoPlaceholder: { minHeight: 220, alignItems: 'center', justifyContent: 'center', gap: Spacing.two, padding: Spacing.four, borderWidth: StyleSheet.hairlineWidth, borderRadius: Radius.large },
  placeholderIcon: { width: 52, height: 52, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  placeholderTitle: { ...Typography.title },
  thumbnailList: { gap: Spacing.one, paddingVertical: Spacing.half },
  thumbnailButton: { width: 96, minHeight: 82, borderWidth: 2, borderRadius: Radius.medium, overflow: 'hidden', padding: Spacing.half, gap: Spacing.half },
  thumbnailImage: { width: '100%', height: 50, borderRadius: Radius.small },
  thumbnailLabel: { ...Typography.labelSmall },
  caption: { ...Typography.bodySmall },
  summary: { padding: Spacing.three, gap: Spacing.two, borderWidth: StyleSheet.hairlineWidth, borderRadius: Radius.large },
  categoryPill: { alignSelf: 'flex-start', paddingHorizontal: Spacing.two, paddingVertical: Spacing.half, borderRadius: Radius.pill },
  summaryTopline: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.one },
  sharedBadge: { minHeight: 28, flexDirection: 'row', alignItems: 'center', gap: Spacing.one, paddingHorizontal: Spacing.two, borderRadius: Radius.pill },
  sharedBadgeText: { ...Typography.labelSmall, letterSpacing: 0.5 },
  eyebrow: { ...Typography.labelSmall, textTransform: 'uppercase' },
  heading: { ...Typography.heading },
  price: { ...Typography.title, fontSize: 22 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  flex: { flex: 1 },
  factRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginTop: Spacing.one },
  fact: { flexGrow: 1, flexBasis: 145, minWidth: 0, padding: Spacing.two, borderRadius: Radius.medium, gap: Spacing.one },
  factHeading: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  factLabel: { ...Typography.labelSmall },
  factValue: { ...Typography.label },
  section: { padding: Spacing.three, gap: Spacing.two, borderWidth: StyleSheet.hairlineWidth, borderRadius: Radius.large },
  sectionHeadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  sectionTitle: { ...Typography.title },
  body: { ...Typography.body },
  description: { lineHeight: 25 },
  specificationGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
  specificationItem: { minWidth: '46%', flexGrow: 1, flexBasis: 140, padding: Spacing.two, borderRadius: Radius.medium, gap: Spacing.half },
  documentRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, padding: Spacing.two, borderWidth: StyleSheet.hairlineWidth, borderRadius: Radius.medium },
  documentIcon: { width: 38, height: 38, borderRadius: Radius.small, alignItems: 'center', justifyContent: 'center' },
  documentCopy: { flex: 1, minWidth: 0, gap: Spacing.one },
  documentName: { ...Typography.label },
  businessName: { ...Typography.title },
  contactLine: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  stateCard: { width: '100%', maxWidth: 440, alignSelf: 'center', alignItems: 'center', gap: Spacing.two, padding: Spacing.four, borderWidth: StyleSheet.hairlineWidth, borderRadius: Radius.large },
  stateIcon: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.pill, marginBottom: Spacing.one },
  stateTitle: { ...Typography.title, textAlign: 'center' },
  centerText: { textAlign: 'center' },
  privacy: { ...Typography.bodySmall, textAlign: 'center', paddingVertical: Spacing.two },
  contactDock: { paddingHorizontal: Spacing.three, paddingTop: Spacing.two, paddingBottom: Spacing.one, borderTopWidth: StyleSheet.hairlineWidth, gap: Spacing.one },
  dockTitle: { ...Typography.label },
  contactActions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  contactAction: { flex: 1, minWidth: 130 },
  documentModal: { flex: 1 },
  webDocumentOverlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 1000 },
  documentHeader: { minHeight: 52, paddingHorizontal: Spacing.three, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  documentTitle: { flex: 1 },
  documentClose: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  documentWebView: { flex: 1, backgroundColor: 'transparent' },
});
