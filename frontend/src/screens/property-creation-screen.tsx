import * as Location from 'expo-location';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import { File as ExpoFile } from 'expo-file-system';
import * as Clipboard from 'expo-clipboard';
import { isAxiosError } from 'axios';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { LocalizedText as Text } from '@/i18n/LocalizedText';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useOptionalAuth } from '@/auth/auth-provider';
import {
  createPropertyShareLink, deletePropertyDocument, deletePropertyShareLink, getPropertyDocumentDownloadUrl, getPropertyDocuments, getPropertyPrivateNotes, getPropertyRecord, getPropertyShareLinks, getPropertySigningAuthorities, preparePropertyAssetsForShare, replacePropertySigningAuthorities, toPublicListingAppUrl, updatePropertyShareLink,
  type ApiProperty, type ApiShareDisclosures, type ApiShareLink, type ApiSigningAuthorityInput,
  type PropertyCategory,
} from '@/api/backend-api';
import { CoreButton, CoreTextField, ThemeToggle, WizardProgressHeader } from '@/components/core';
import { AppIcon } from '@/components/core/icons';
import { FeaturesUtilitiesStep, type IrrigationMethod } from '@/components/core/wizard/FeaturesUtilitiesStep';
import { PropertyBasicsStep } from '@/components/core/wizard/PropertyBasicsStep';
import { PropertyFinancialsStep, type PriceBasis, type MeasurementUnit } from '@/components/core/wizard/PropertyFinancialsStep';
import { OwnershipDocumentsStep, type LegalDocument, type SigningAuthority, type SigningAuthorityDetails } from '@/components/core/wizard/OwnershipDocumentsStep';
import { PropertyReviewPublishStep, type ReviewPhoto } from '@/components/core/wizard/PropertyReviewPublishStep';
import { compressPropertyPhoto, compressedPropertyPhotoFilename } from '@/api/property-photo-compression';
import { validateLegalDocumentAsset, type LegalDocumentCategory } from '@/api/legal-document-upload';
import { LocationLandStep } from '@/components/core/wizard/LocationLandStep';
import { useLocalProperty, useSaveLocalProperty, useOfflinePropertyStore } from '@/data/database';
import { isMockMode } from '@/data/app-mode';
import { createPropertyReviewItems, mockPublicShareUrl, mockReviewPhotos, mockReviewVoiceMemos } from '@/data/mock/property-review';
import { mockFieldAssociate, mockOwnershipDocuments, mockPrivateBrokerNotes, mockPropertyReferenceLinks, mockSigningAuthorities } from '@/data/mock/ownership-documents';
import { mockPropertyFinancials } from '@/data/mock/property-financials';
import { mockPropertyBasics } from '@/data/mock/property-basics';
import { emptyPropertyWizardDraft, propertyCategoryOptions, type PropertyWizardDraft } from '@/data/mock/property-wizard';
import type { LocalProperty } from '@/data/mock/properties';
import { MaxContentWidth, Radius, Spacing, Typography } from '@/theme/tokens';
import { useTheme } from '@/theme/theme-provider';
import { useToast } from '@/components/core/toast/ToastProvider';
import { createUuid } from '@/utils/uuid';

const STEP_TITLES = ['Basic Information', 'Location & Land Details', 'Features & Utilities', 'Financials & Pricing', 'Ownership & Documents', 'Photos, Review & Save'];
const SOIL_TYPES = [{ value: 'red', label: 'Red Soil' }, { value: 'black', label: 'Black Soil' }, { value: 'alluvial', label: 'Alluvial Soil' }, { value: 'sandy_loam', label: 'Sandy Loam' }, { value: 'other', label: 'Other Mix / Clay' }] as const;
const CATEGORY_LABELS: Record<PropertyCategory, string> = Object.fromEntries(propertyCategoryOptions.map((item) => [item.value, item.label])) as Record<PropertyCategory, string>;

function numberOrNull(value: string) {
  const number = Number(value.trim());
  return value.trim() && Number.isFinite(number) && number >= 0 ? number : null;
}

function coordinateOrNull(value: string, min: number, max: number) {
  const coordinate = Number(value.trim());
  return value.trim() && Number.isFinite(coordinate) && coordinate >= min && coordinate <= max ? coordinate : null;
}

function numberText(value: number | null | undefined) { return value == null ? '' : String(value); }

function toSigningAuthorityView(authority: Awaited<ReturnType<typeof getPropertySigningAuthorities>>[number]): SigningAuthority {
  return {
    id: authority.id,
    name: authority.name,
    phone: authority.phone ?? '',
    relationship: authority.relationship,
    recordLabel: authority.record_label || 'Ownership record',
    recordValue: authority.record_value ?? '',
    verificationLabel: 'Pending review',
    verificationState: 'pending',
    signatureLabel: 'Pending signature',
    signatureState: 'pending',
  };
}

function toSigningAuthorityInput(authority: SigningAuthorityDetails): ApiSigningAuthorityInput {
  return {
    name: authority.name.trim(),
    phone: authority.phone?.trim() || null,
    relationship: authority.relationship.trim(),
    record_label: authority.recordLabel.trim() || null,
    record_value: authority.recordValue.trim() || null,
  };
}

function toWizardDraft(property: ApiProperty, privateNotes: string | null): PropertyWizardDraft {
  const location = property.location ?? {};
  const features = property.features ?? {};
  const financials = property.financials ?? {};
  const legal = property.legal ?? {};
  const validWaterSources = ['river', 'canal', 'borewell', 'open_well', 'government_supply'] as const;
  const waterSources = (features.water_sources ?? []).map((source) => source.source_type).filter((source): source is PropertyWizardDraft['waterSources'][number] => validWaterSources.includes(source as typeof validWaterSources[number]));
  const standardUtilities = ['fencing', 'electricity', 'irrigation', 'road_access'] as const;
  const utilities: PropertyWizardDraft['utilities'] = (features.utilities ?? []).filter((utility) => utility.available).flatMap((utility) => {
    if (standardUtilities.includes(utility.utility_type as typeof standardUtilities[number])) return [utility.utility_type as PropertyWizardDraft['utilities'][number]];
    const details = utility.details?.toLowerCase() ?? '';
    if (utility.utility_type === 'other' && details.includes('bore well energized')) return ['borewell_pump'];
    if (utility.utility_type === 'other' && details.includes('open well pump')) return ['open_well_pump'];
    if (utility.utility_type === 'other' && details.includes('insurance')) return ['insurance'];
    return [];
  });
  const soilType = features.soil_type ?? 'red';
  return {
    ...emptyPropertyWizardDraft,
    title: property.title, description: property.description ?? '', category: property.category,
    location: {
      ...emptyPropertyWizardDraft.location,
      village: location.village ?? location.address_line ?? '', pincode: location.pincode ?? '', taluk: location.taluk ?? '', district: location.district ?? '', state: location.state ?? '',
      surveyNumbers: location.survey_numbers?.join(', ') ?? '', widthFt: numberText(location.width_ft), lengthFt: numberText(location.length_ft), roadWidthFt: numberText(location.road_width_ft),
      frontageDirection: location.frontage_direction ?? '', roadAccessType: location.road_access_type ?? '', latitude: numberText(location.latitude), longitude: numberText(location.longitude),
      roadSubdivisionBasis: location.road_subdivision_basis ?? '', highwayDistanceKm: numberText(location.highway_distance_km),
    },
    soilType: soilType === 'red' || soilType === 'black' || soilType === 'alluvial' || soilType === 'sandy_loam' || soilType === 'other' ? soilType : 'other',
    soilTypeOther: features.soil_type_other ?? '', waterTdsPpm: numberText(features.water_tds_ppm), waterSources, utilities,
    agronomistNotes: features.agronomist_notes ?? '', askingPrice: numberText(financials.asking_price_inr), minimumPrice: numberText(financials.minimum_price_inr),
    area: numberText(financials.area), areaUnit: financials.area_unit ?? 'cent', negotiable: financials.negotiable ?? true,
    advanceAmount: numberText(financials.advance_amount_inr), outstandingLoan: numberText(financials.outstanding_loan_inr), lendingBank: financials.lending_bank ?? '',
    titleClassification: legal.title_classification ?? 'ryotwari_patta', legalSummary: legal.legal_summary ?? '', privateNotes: privateNotes ?? '',
  };
}

function localPropertyToWizardDraft(property: LocalProperty): PropertyWizardDraft {
  const category = propertyCategoryOptions.find((item) => item.label === property.categoryLabel || (item.value === 'plots' && property.categoryLabel === 'Plot'))?.value ?? 'agriculture';
  return { ...emptyPropertyWizardDraft, title: property.title, description: property.description ?? '', category, location: { ...emptyPropertyWizardDraft.location, village: property.location ?? '' }, askingPrice: numberText(property.priceInr), minimumPrice: numberText(property.minimumPriceInr), area: numberText(property.area?.value), areaUnit: property.area?.unit ?? 'cent', negotiable: property.negotiable ?? true, advanceAmount: numberText(property.advanceAmountInr), outstandingLoan: numberText(property.outstandingLoanInr), privateNotes: property.privateNotes ?? '' };
}

function getErrorMessage(error: unknown) {
  if (isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) return detail.map((item: { msg?: string }) => item.msg).filter(Boolean).join(' ');
  }
  return error instanceof Error ? error.message : 'Could not save this property. Please try again.';
}

export default function PropertyCreationScreen() {
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ propertyId?: string | string[]; id?: string | string[] }>();
  const routePropertyId = params.propertyId ?? params.id;
  const requestedPropertyId = Array.isArray(routePropertyId) ? routePropertyId[0] : routePropertyId;
  const colors = useTheme();
  const { showToast } = useToast();
  const auth = useOptionalAuth();
  const queryClient = useQueryClient();
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder);
  const audioPlayer = useAudioPlayer(null);
  const audioPlayerStatus = useAudioPlayerStatus(audioPlayer);
  const saveLocalProperty = useSaveLocalProperty();
  const offlineStore = useOfflinePropertyStore();
  const [hydratedEditId, setHydratedEditId] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [mapInteractionActive, setMapInteractionActive] = useState(false);
  const [draft, setDraft] = useState<PropertyWizardDraft>(() => ({ ...emptyPropertyWizardDraft, ...(isMockMode ? mockPropertyBasics : {}), ...(isMockMode ? mockPropertyFinancials : {}) }));
  const [propertyId, setPropertyId] = useState<string | null>(requestedPropertyId ?? null);
  const localEditQuery = useLocalProperty(propertyId ?? requestedPropertyId ?? '');
  const serverPropertyId = localEditQuery.data
    ? localEditQuery.data.remoteId ?? (localEditQuery.data.syncStatus === 'synced' ? localEditQuery.data.id : null)
    : requestedPropertyId ?? null;
  const liveEditQuery = useQuery({
    queryKey: ['property-editor', requestedPropertyId, serverPropertyId],
    queryFn: async () => {
      if (!auth?.accessToken || !serverPropertyId) throw new Error('Sign in to edit this property.');
      const [property, privateNotes] = await Promise.all([
        getPropertyRecord(auth.accessToken, serverPropertyId),
        getPropertyPrivateNotes(auth.accessToken, serverPropertyId),
      ]);
      return { property, privateNotes };
    },
    enabled: Boolean(requestedPropertyId && !isMockMode && auth?.accessToken && serverPropertyId
      && (Platform.OS !== 'web' || localEditQuery.isSuccess)),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [titleError, setTitleError] = useState('');
  const [askingPriceError, setAskingPriceError] = useState('');
  const [areaError, setAreaError] = useState('');
  const [status, setStatus] = useState('Draft not saved');
  const publishComplete = isMockMode
    ? localEditQuery.data?.status.label === 'Available'
    : liveEditQuery.data?.property.status === 'active';
  const [sharePreview, setSharePreview] = useState(true);
  const [publicDisclosureOverrides, setPublicDisclosureOverrides] = useState<Partial<ApiShareDisclosures>>({});
  const [mockPhotos, setMockPhotos] = useState<ReviewPhoto[]>(mockReviewPhotos);
  const [pendingPhotoPreviews, setPendingPhotoPreviews] = useState<ReviewPhoto[]>([]);
  const [mockVoiceMemos, setMockVoiceMemos] = useState(mockReviewVoiceMemos);
  const [playingVoiceMemoId, setPlayingVoiceMemoId] = useState<string | null>(null);
  const [isRecordingVoiceMemo, setIsRecordingVoiceMemo] = useState(false);
  const [isUploadingVoiceMemo, setIsUploadingVoiceMemo] = useState(false);
  const [voiceMemoError, setVoiceMemoError] = useState('');
  const [mockRecordingElapsedSeconds, setMockRecordingElapsedSeconds] = useState(0);
  const [mockShareUrl, setMockShareUrl] = useState<string | null>(isMockMode ? mockPublicShareUrl : null);
  const [shareLink, setShareLink] = useState<ApiShareLink | null>(null);
  const [shareLinkStatus, setShareLinkStatus] = useState<'idle' | 'saving' | 'error'>('idle');
  const [shareLinkMessage, setShareLinkMessage] = useState('');
  const [loanActive, setLoanActive] = useState(isMockMode ? mockPropertyFinancials.loanActive : false);
  const [paymentMilestoneFlexible, setPaymentMilestoneFlexible] = useState(isMockMode ? mockPropertyFinancials.paymentMilestoneFlexible : false);
  const [priceBasis, setPriceBasis] = useState<PriceBasis | null>(mockPropertyFinancials.priceBasis);
  const [irrigationMethod, setIrrigationMethod] = useState<IrrigationMethod>(null);
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [detectLocationError, setDetectLocationError] = useState('');
  const addressLookupRequest = useRef(0);
  const addressGeocodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasLocationPermission = useRef(false);
  const [mockAuthorities, setMockAuthorities] = useState<SigningAuthority[]>(mockSigningAuthorities);
  const [mockDocuments, setMockDocuments] = useState<LegalDocument[]>(mockOwnershipDocuments);
  const [selectedLegalDocumentCategory, setSelectedLegalDocumentCategory] = useState<LegalDocumentCategory>('title_deed');
  const [isUploadingLegalDocument, setIsUploadingLegalDocument] = useState(false);
  const localEditData = localEditQuery.data;
  const liveEditData = !isMockMode ? liveEditQuery.data : undefined;
  if (requestedPropertyId && hydratedEditId !== requestedPropertyId && (localEditData || liveEditData)) {
    const savedWizardDraft = localEditData?.offlineDraft?.draft as PropertyWizardDraft | undefined;
    const initialDraft = savedWizardDraft ?? (liveEditData ? toWizardDraft(liveEditData.property, liveEditData.privateNotes) : localPropertyToWizardDraft(localEditData!));
    setDraft(initialDraft);
    setPropertyId(requestedPropertyId);
    setStatus(localEditData?.syncStatus === 'pending' || localEditData?.syncStatus === 'error' ? 'Saved locally · waiting to sync' : 'Editing saved property');
    if (localEditData?.offlineDraft) {
      const saved = localEditData.offlineDraft as unknown as { loanActive?: boolean; irrigationMethod?: IrrigationMethod };
      setLoanActive(saved.loanActive ?? false);
      setIrrigationMethod(saved.irrigationMethod ?? null);
    }
    if (liveEditData) {
      setLoanActive((liveEditData.property.financials?.outstanding_loan_inr ?? 0) > 0);
      const irrigationDetails = liveEditData.property.features?.utilities?.find((utility) => utility.utility_type === 'irrigation')?.details?.toLowerCase() ?? '';
      setIrrigationMethod(irrigationDetails.includes('drip') ? 'drip' : irrigationDetails.includes('sprinkler') ? 'sprinkler' : irrigationDetails.includes('flood') ? 'flood' : null);
    }
    setHydratedEditId(requestedPropertyId);
  }
  const editingLoaded = !requestedPropertyId || hydratedEditId === requestedPropertyId;
  const editLoading = Boolean(requestedPropertyId && !editingLoaded && !localEditData && (isMockMode ? localEditQuery.isPending : liveEditQuery.isPending));
  const editLoadError = requestedPropertyId && !editingLoaded && !editLoading
    ? !isMockMode && !auth?.accessToken ? 'Sign in to load this property for editing.'
      : isMockMode && localEditQuery.isError ? 'Property details could not be loaded.'
        : !isMockMode && liveEditQuery.isError ? getErrorMessage(liveEditQuery.error)
          : isMockMode && localEditQuery.isSuccess && !localEditQuery.data ? 'This property could not be found.'
            : null
    : null;
  const documentsQuery = useQuery({
    queryKey: ['property-documents', propertyId],
    queryFn: () => getPropertyDocuments(auth!.accessToken!, serverPropertyId!),
    enabled: !isMockMode && Boolean(auth?.accessToken && serverPropertyId),
  });
  const localAssetsQuery = useQuery({
    queryKey: ['local-property-assets', propertyId],
    queryFn: () => offlineStore.listAssets(propertyId!),
    enabled: Boolean(propertyId),
  });
  const signingAuthoritiesQuery = useQuery({
    queryKey: ['property-signing-authorities', propertyId],
    queryFn: () => getPropertySigningAuthorities(auth!.accessToken!, serverPropertyId!),
    enabled: !isMockMode && Boolean(auth?.accessToken && serverPropertyId),
  });
  const authorities: SigningAuthority[] = isMockMode
    ? mockAuthorities
    : (signingAuthoritiesQuery.data ?? []).map(toSigningAuthorityView);
  const propertyPhotosQuery = useQuery({
    queryKey: ['property-photos', propertyId],
    queryFn: async () => {
      const items = await getPropertyDocuments(auth!.accessToken!, serverPropertyId!);
      return Promise.all(items.filter((item) => item.category === 'photo').map(async (item, index) => ({
        id: item.id,
        uri: await getPropertyDocumentDownloadUrl(auth!.accessToken!, item.id),
        label: item.display_name || item.filename,
        isCover: index === 0,
      })));
    },
    enabled: !isMockMode && Boolean(auth?.accessToken && serverPropertyId),
  });
  const propertyVoiceMemosQuery = useQuery({
    queryKey: ['property-voice-memos', propertyId],
    queryFn: async () => (await getPropertyDocuments(auth!.accessToken!, serverPropertyId!))
      .filter((item) => item.category === 'voice_memo' && item.upload_status === 'uploaded')
      .sort((a, b) => a.created_at.localeCompare(b.created_at)),
    enabled: !isMockMode && Boolean(auth?.accessToken && serverPropertyId),
  });
  const shareLinksQuery = useQuery({
    queryKey: ['property-share-links', propertyId],
    queryFn: async () => (await getPropertyShareLinks(auth!.accessToken!, serverPropertyId!)).filter((link) => !link.revoked_at && (!link.expires_at || new Date(link.expires_at).getTime() > Date.now())),
    enabled: !isMockMode && Boolean(auth?.accessToken && serverPropertyId && publishComplete),
  });
  const documents: LegalDocument[] = isMockMode ? mockDocuments : [
    ...(documentsQuery.data ?? []).filter((document) => document.category !== 'photo' && document.category !== 'voice_memo').map((document) => ({
    id: document.id,
    name: document.display_name || document.filename,
    sizeLabel: document.size_bytes ? `${(document.size_bytes / 1024 / 1024).toFixed(1)} MB` : 'Size unavailable',
    detail: document.upload_status === 'uploaded'
      ? `${document.category.replaceAll('_', ' ')} · Ready for legal review`
      : `${document.category.replaceAll('_', ' ')} · ${new Date(document.created_at).toLocaleDateString()}`,
      state: document.upload_status === 'uploaded' ? 'verified' as const : 'pending' as const,
    })),
    ...(localAssetsQuery.data ?? []).filter((asset) => asset.category !== 'photo' && asset.category !== 'voice_memo' && !((documentsQuery.data ?? []).some((document) => document.id === asset.remote_document_id))).map((asset) => ({
      id: asset.id, name: asset.display_name || asset.filename,
      sizeLabel: 'Saved on this device', detail: `${asset.category.replaceAll('_', ' ')} · ${asset.status === 'uploaded' ? 'Synced' : 'Waiting to sync'}`,
      state: asset.status === 'uploaded' ? 'verified' as const : 'pending' as const,
    })),
  ];
  const reviewPhotos = isMockMode ? mockPhotos : (() => {
    const localById = new Map(pendingPhotoPreviews.map((photo) => [photo.id, photo]));
    const serverPhotos = propertyPhotosQuery.data ?? [];
    const serverIds = new Set(serverPhotos.map((photo) => photo.id));
    const localIds = new Set((localAssetsQuery.data ?? []).filter((asset) => asset.category === 'photo').map((asset) => asset.id));
    return [
      ...serverPhotos.map((photo) => localById.get(photo.id) ?? photo),
      ...(localAssetsQuery.data ?? []).filter((asset) => asset.category === 'photo' && !serverIds.has(asset.remote_document_id ?? '')).map((asset) => ({ id: asset.id, uri: asset.local_uri, label: asset.display_name || asset.filename, isCover: false })),
      ...pendingPhotoPreviews.filter((photo) => !serverIds.has(photo.id) && !localIds.has(photo.id)),
    ];
  })();
  const voiceMemos = isMockMode
    ? mockVoiceMemos.map((memo) => ({ ...memo, state: memo.id === playingVoiceMemoId ? 'playing' as const : 'ready' as const }))
    : [
      ...(propertyVoiceMemosQuery.data ?? []).map((document) => ({
      id: document.id,
      title: document.display_name || document.filename,
      state: document.id === playingVoiceMemoId && audioPlayerStatus.playing ? 'playing' as const : 'ready' as const,
      })),
      ...(localAssetsQuery.data ?? []).filter((asset) => asset.category === 'voice_memo' && !(propertyVoiceMemosQuery.data ?? []).some((document) => document.id === asset.remote_document_id)).map((asset) => ({ id: asset.id, title: asset.display_name || asset.filename, state: 'ready' as const })),
    ];
  useEffect(() => {
    if (!isMockMode || !isRecordingVoiceMemo) return;
    const timer = setInterval(() => setMockRecordingElapsedSeconds((elapsed) => elapsed + 1), 1000);
    return () => clearInterval(timer);
  }, [isRecordingVoiceMemo]);
  const activeShareLink = shareLink ?? shareLinksQuery.data?.[0] ?? null;
  const shareUrl = isMockMode ? (publishComplete ? mockShareUrl : null) : toPublicListingAppUrl(activeShareLink?.public_url);
  const publicDisclosures: ApiShareDisclosures = { show_name: true, show_description: true, show_location: true, show_price: true, show_specifications: true, show_exact_coordinates: false, show_photos: true, show_documents: false, show_reports: false, show_broker_contact: false, show_approach_roads: true, ...activeShareLink?.disclosures, ...publicDisclosureOverrides };
  const saveSigningAuthority = async (details: SigningAuthorityDetails, id?: string) => {
    if (isMockMode) {
      setMockAuthorities((current) => {
        if (id) return current.map((authority) => authority.id === id ? { ...details, id } : authority);
        if (current.length >= 6) return current;
        return [...current, { ...details, id: createUuid() }];
      });
      return;
    }
    try {
      if (!auth?.accessToken) throw new Error('Sign in again to manage signing authorities.');
      if (authorities.length >= 6 && !id) throw new Error('A property can have up to six signing authorities.');
      const idForProperty = serverPropertyId;
      if (!idForProperty) throw new Error('Signing authorities can be edited after this property finishes syncing.');
      const next = (signingAuthoritiesQuery.data ?? []).map((authority) => ({
        name: authority.name, phone: authority.phone, relationship: authority.relationship,
        record_label: authority.record_label, record_value: authority.record_value,
      }));
      const input = toSigningAuthorityInput(details);
      const existingIndex = id ? (signingAuthoritiesQuery.data ?? []).findIndex((authority) => authority.id === id) : -1;
      if (id && existingIndex < 0) throw new Error('This signing authority is no longer available. Reload the property and try again.');
      if (existingIndex >= 0) next[existingIndex] = input;
      else next.push(input);
      const saved = await replacePropertySigningAuthorities(auth.accessToken, idForProperty, next);
      setPropertyId(idForProperty);
      queryClient.setQueryData(['property-signing-authorities', idForProperty], saved);
      showToast('Signing authority saved.', 'success');
    } catch (caught) {
      const message = getErrorMessage(caught);
      showToast(message, 'error');
      throw new Error(message);
    }
  };
  const removeSigningAuthority = async (id: string) => {
    if (isMockMode) {
      setMockAuthorities((current) => current.length > 1 ? current.filter((authority) => authority.id !== id) : current);
      return;
    }
    try {
      if (!auth?.accessToken || !serverPropertyId) throw new Error('Signing authorities can be edited after this property finishes syncing.');
      if (authorities.length <= 1) throw new Error('Keep at least one signing authority on the property.');
      const current = signingAuthoritiesQuery.data ?? [];
      if (!current.some((authority) => authority.id === id)) throw new Error('This signing authority is no longer available. Reload the property and try again.');
      const saved = await replacePropertySigningAuthorities(auth.accessToken, serverPropertyId, current.filter((authority) => authority.id !== id).map((authority) => ({
        name: authority.name, phone: authority.phone, relationship: authority.relationship,
        record_label: authority.record_label, record_value: authority.record_value,
      })));
      queryClient.setQueryData(['property-signing-authorities', propertyId], saved);
      showToast('Signing authority removed.', 'success');
    } catch (caught) {
      const message = getErrorMessage(caught);
      showToast(message, 'error');
      throw new Error(message);
    }
  };

  const chooseLegalDocument = (category: LegalDocumentCategory) => runSave(async () => {
    const picked = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'], copyToCacheDirectory: true, multiple: false });
    if (picked.canceled) return;
    const asset = picked.assets[0];
    if (!asset) return;
    const file = Platform.OS === 'web' ? asset.file : asset.size == null ? new ExpoFile(asset.uri) : undefined;
    const fileSize = asset.size ?? file?.size ?? 0;
    const { contentType } = validateLegalDocumentAsset({ filename: asset.name, mimeType: asset.mimeType, sizeBytes: fileSize });
    if (isMockMode) {
      setMockDocuments((current) => [...current, { id: createUuid(), name: asset.name, sizeLabel: `${(fileSize / 1024 / 1024).toFixed(1)} MB`, detail: `${category.replaceAll('_', ' ')} · Mock file, not uploaded`, state: 'pending' }]);
      return;
    }
    setIsUploadingLegalDocument(true);
    try {
      const id = propertyId ?? await ensureDraft();
      await offlineStore.saveAsset({ id: createUuid(), property_id: id, local_uri: asset.uri, filename: asset.name, content_type: contentType, category, display_name: null, visibility: 'private' });
      setPropertyId(id);
      await queryClient.invalidateQueries({ queryKey: ['local-property-assets', id] });
      void offlineStore.syncNow();
      showToast('Document saved on this device. Upload will continue in the background.', 'success');
    } finally {
      setIsUploadingLegalDocument(false);
    }
  });

  const openLegalDocument = async (document: LegalDocument) => {
    if (isMockMode) return;
    const localAsset = localAssetsQuery.data?.find((asset) => asset.id === document.id);
    if (localAsset) {
      await runSave(async () => { if (Platform.OS === 'web') await Linking.openURL(localAsset.local_uri); else await new ExpoFile(localAsset.local_uri).preview(); });
      return;
    }
    const id = propertyId;
    if (!auth?.accessToken || !id) return;
    await runSave(async () => {
      const url = await getPropertyDocumentDownloadUrl(auth.accessToken!, document.id);
      await Linking.openURL(url);
    });
  };

  const removeLegalDocument = (document: LegalDocument) => {
    const remove = () => runSave(async () => {
      if (isMockMode) setMockDocuments((current) => current.filter((item) => item.id !== document.id));
      else {
        if (localAssetsQuery.data?.some((asset) => asset.id === document.id)) {
          const asset = localAssetsQuery.data.find((item) => item.id === document.id)!;
          if (asset.remote_document_id && auth?.accessToken) await deletePropertyDocument(auth.accessToken, asset.remote_document_id);
          await offlineStore.deleteAsset(document.id);
          await queryClient.invalidateQueries({ queryKey: ['local-property-assets', propertyId] });
          return;
        }
        if (!auth?.accessToken || !serverPropertyId) throw new Error('Connect and sign in to remove this synced document.');
        await deletePropertyDocument(auth.accessToken, document.id);
        await queryClient.invalidateQueries({ queryKey: ['property-documents', serverPropertyId] });
      }
    });
    if (Platform.OS === 'web') {
      if (globalThis.confirm?.(`Remove “${document.name}” from this property?`)) void remove();
    } else Alert.alert('Remove document?', `“${document.name}” will be removed from this property.`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: () => void remove() }]);
  };

  const addPropertyPhoto = (source: 'library' | 'camera') => runSave(async () => {
    const remainingPhotoSlots = Math.max(0, 5 - reviewPhotos.length);
    if (remainingPhotoSlots === 0) throw new Error('A property can have up to five photos.');
    if (source === 'camera' && Platform.OS !== 'web') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) throw new Error('Camera permission is required to capture a property photo.');
    }
    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.85, allowsEditing: false })
      : await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.85,
        allowsEditing: false,
        allowsMultipleSelection: true,
        selectionLimit: remainingPhotoSlots,
        orderedSelection: true,
      });
    if (result.canceled || !result.assets.length) return;
    // The web picker can return more than selectionLimit, so enforce the shared five-photo cap here too.
    const selectedAssets = result.assets.slice(0, remainingPhotoSlots);
    if (isMockMode) {
      setMockPhotos((current) => [
        ...current,
        ...selectedAssets.map((asset, index) => ({
          id: createUuid(),
          uri: asset.uri,
          label: asset.fileName || `property-photo-${index + 1}`,
          isCover: current.length === 0 && index === 0,
        })),
      ]);
      if (result.assets.length > remainingPhotoSlots) showToast(`Added ${remainingPhotoSlots} photos. A property can have up to five photos.`, 'info');
      return;
    }
    const preparedPhotos = [];
    for (let index = 0; index < selectedAssets.length; index += 1) {
      const asset = selectedAssets[index];
      const compressed = await compressPropertyPhoto(asset.uri, asset.width, asset.height);
      const filename = compressedPropertyPhotoFilename(asset.fileName, index);
      const file = Platform.OS === 'web'
        ? await fetch(compressed.uri).then((response) => {
          if (!response.ok) throw new Error('Could not prepare the selected photo. Please choose it again.');
          return response.blob();
        })
        : new ExpoFile(compressed.uri);
      if (!file.size || file.size > 10 * 1024 * 1024) throw new Error('A photo is still larger than 10 MB after compression. Choose a smaller image.');
      preparedPhotos.push({ asset: { ...asset, uri: compressed.uri }, contentType: 'image/jpeg' as const, filename, file });
    }
    const id = propertyId ?? await ensureDraft();
    setPropertyId(id);
    for (let index = 0; index < preparedPhotos.length; index += 1) {
      const { asset, contentType, filename } = preparedPhotos[index];
      const assetId = createUuid();
      await offlineStore.saveAsset({ id: assetId, property_id: id, local_uri: asset.uri, filename, content_type: contentType, category: 'photo', display_name: filename, visibility: 'shared' });
      setPendingPhotoPreviews((current) => [...current, { id: assetId, uri: asset.uri, label: filename, isCover: reviewPhotos.length === 0 && index === 0 }]);
    }
    await queryClient.invalidateQueries({ queryKey: ['local-property-assets', id] });
    void offlineStore.syncNow();
    showToast('Photos saved on this device. Upload will continue in the background.', 'success');
    if (result.assets.length > remainingPhotoSlots) showToast(`Added ${remainingPhotoSlots} photos. A property can have up to five photos.`, 'info');
  });

  const startVoiceMemoRecording = async () => {
    if (voiceMemos.length >= 5 || isRecordingVoiceMemo || isUploadingVoiceMemo) return;
    setVoiceMemoError('');
    if (isMockMode) {
      setMockRecordingElapsedSeconds(0);
      setIsRecordingVoiceMemo(true);
      return;
    }
    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) throw new Error('Microphone permission is required to record a field voice log.');
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      setIsRecordingVoiceMemo(true);
    } catch (caught) {
      const message = getErrorMessage(caught);
      setVoiceMemoError(message);
      showToast(message, 'warning');
    }
  };

  const stopVoiceMemoRecording = async () => {
    if (!isRecordingVoiceMemo) return;
    if (isMockMode) {
      const durationSeconds = Math.max(1, mockRecordingElapsedSeconds);
      setMockVoiceMemos((current) => [...current, { id: createUuid(), title: `Field voice log ${current.length + 1}`, durationSeconds, state: 'ready' }]);
      setIsRecordingVoiceMemo(false);
      showToast('Voice log saved in test mode.', 'success');
      return;
    }

    setIsRecordingVoiceMemo(false);
    setIsUploadingVoiceMemo(true);
    setVoiceMemoError('');
    try {
      await audioRecorder.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      const uri = audioRecorder.uri;
      if (!uri) throw new Error('The recording was empty. Record it again and try saving.');

      const isWebRecording = Platform.OS === 'web';
      const contentType = isWebRecording ? 'audio/webm' as const : 'audio/mp4' as const;
      const extension = isWebRecording ? 'webm' : 'm4a';
      const filename = `field-voice-log-${createUuid()}.${extension}`;
      const file: Blob = isWebRecording
        ? await fetch(uri).then(async (response) => {
          if (!response.ok) throw new Error('The browser could not read the voice recording. Record it again.');
          return response.blob();
        })
        : new ExpoFile(uri);
      if (!file.size) throw new Error('The recording is empty. Record it again and try saving.');
      if (file.size > 25 * 1024 * 1024) throw new Error('Voice logs must be smaller than 25 MB.');

      const id = propertyId ?? await ensureDraft();
      setPropertyId(id);
      await offlineStore.saveAsset({ id: createUuid(), property_id: id, local_uri: uri, filename, content_type: contentType, category: 'voice_memo', display_name: `Field voice log · ${new Date().toLocaleString()}`, visibility: 'private' });
      await queryClient.invalidateQueries({ queryKey: ['local-property-assets', id] });
      void offlineStore.syncNow();
      showToast('Field voice log saved on this device. Upload will continue in the background.', 'success');
    } catch (caught) {
      const message = getErrorMessage(caught);
      setVoiceMemoError(message);
      showToast(message, 'error');
    } finally {
      setIsUploadingVoiceMemo(false);
    }
  };

  const toggleVoiceMemoPlayback = async (id: string) => {
    if (isMockMode) {
      setPlayingVoiceMemoId((current) => current === id ? null : id);
      return;
    }
    if (playingVoiceMemoId === id) {
      audioPlayer.pause();
      setPlayingVoiceMemoId(null);
      return;
    }
    try {
      const localAsset = localAssetsQuery.data?.find((asset) => asset.id === id);
      if (localAsset) {
        await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
        audioPlayer.replace(localAsset.local_uri);
        audioPlayer.play();
        setPlayingVoiceMemoId(id);
        return;
      }
      if (!auth?.accessToken) throw new Error('Sign in again to play this voice log.');
      const url = await getPropertyDocumentDownloadUrl(auth.accessToken, id);
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      audioPlayer.replace(url);
      audioPlayer.play();
      setPlayingVoiceMemoId(id);
    } catch (caught) {
      const message = getErrorMessage(caught);
      setVoiceMemoError(message);
      showToast(message, 'error');
    }
  };

  const removeVoiceMemo = async (id: string) => {
    if (isMockMode) {
      setMockVoiceMemos((current) => current.filter((memo) => memo.id !== id));
      setPlayingVoiceMemoId((current) => current === id ? null : current);
      return;
    }
    try {
      if (localAssetsQuery.data?.some((asset) => asset.id === id)) {
        const asset = localAssetsQuery.data.find((item) => item.id === id)!;
        if (asset.remote_document_id && auth?.accessToken) await deletePropertyDocument(auth.accessToken, asset.remote_document_id);
        await offlineStore.deleteAsset(id);
        setPlayingVoiceMemoId((current) => current === id ? null : current);
        await queryClient.invalidateQueries({ queryKey: ['local-property-assets', propertyId] });
        return;
      }
      if (!auth?.accessToken) throw new Error('Sign in again to remove this voice log.');
      await deletePropertyDocument(auth.accessToken, id);
    if (playingVoiceMemoId === id && audioPlayerStatus.playing) {
        audioPlayer.pause();
      return;
      }
      await queryClient.invalidateQueries({ queryKey: ['property-voice-memos', propertyId] });
      showToast('Voice log deleted.', 'success');
    } catch (caught) {
      const message = getErrorMessage(caught);
      setVoiceMemoError(message);
      showToast(message, 'error');
    }
  };

  const removePropertyPhoto = (photo: ReviewPhoto) => {
    const remove = () => runSave(async () => {
      if (isMockMode) setMockPhotos((current) => current.filter((item) => item.id !== photo.id));
      else {
        if (localAssetsQuery.data?.some((asset) => asset.id === photo.id)) {
          const asset = localAssetsQuery.data.find((item) => item.id === photo.id)!;
          if (asset.remote_document_id && auth?.accessToken) await deletePropertyDocument(auth.accessToken, asset.remote_document_id);
          await offlineStore.deleteAsset(photo.id);
          await queryClient.invalidateQueries({ queryKey: ['local-property-assets', propertyId] });
          return;
        }
        if (!auth?.accessToken) throw new Error('Sign in again to remove this photo.');
        await deletePropertyDocument(auth.accessToken, photo.id);
        setPendingPhotoPreviews((current) => current.filter((item) => item.id !== photo.id));
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['property-documents', propertyId] }),
          queryClient.invalidateQueries({ queryKey: ['property-photos', propertyId] }),
        ]);
      }
    });
    if (isMockMode) void remove();
    else if (Platform.OS === 'web') {
      if (globalThis.confirm?.(`Remove “${photo.label ?? 'this photo'}” from the property?`)) void remove();
    } else Alert.alert('Remove photo?', 'This photo will be removed from the property.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: () => void remove() }]);
  };

  const changePublicPreview = (enabled: boolean) => {
    if (enabled || !activeShareLink || isMockMode) {
      setSharePreview(enabled);
      if (!enabled && isMockMode) setMockShareUrl(null);
      if (enabled) setShareLinkMessage('');
      return;
    }
    void runSave(async () => {
      if (!auth?.accessToken) throw new Error('Sign in again to revoke this share link.');
      await deletePropertyShareLink(auth.accessToken, activeShareLink.id);
      setSharePreview(false);
      setShareLink(null);
      queryClient.setQueryData(['property-share-links', propertyId], []);
      await queryClient.invalidateQueries({ queryKey: ['property-share-links', propertyId] });
      setShareLinkMessage('The public share link was revoked.');
    });
  };

  const savePublicShareLink = async () => {
    setShareLinkStatus('saving');
    setShareLinkMessage('');
    try {
      if (!sharePreview) throw new Error('Enable public preview before creating a share link.');
      if (!publishComplete) throw new Error('Publish this property before creating its public share link.');
      if (isMockMode) {
        setMockShareUrl(mockPublicShareUrl);
      } else {
        if (!auth?.accessToken || !serverPropertyId) throw new Error('This property must finish syncing before creating a public share link.');
        if (publicDisclosures.show_photos || publicDisclosures.show_documents || publicDisclosures.show_reports) {
          await preparePropertyAssetsForShare(auth.accessToken, serverPropertyId, publicDisclosures);
          await queryClient.invalidateQueries({ queryKey: ['property-documents', serverPropertyId] });
        }
        const input = { title: `${draft.title.trim() || 'Property'} public preview`.slice(0, 200), expires_at: activeShareLink?.expires_at ?? null, disclosures: publicDisclosures };
      const nextLink = activeShareLink
          ? await updatePropertyShareLink(auth.accessToken, activeShareLink.id, input)
          : await createPropertyShareLink(auth.accessToken, serverPropertyId, input);
        setShareLink(nextLink);
        await queryClient.invalidateQueries({ queryKey: ['property-share-links', serverPropertyId] });
      }
      setShareLinkStatus('idle');
      setShareLinkMessage(activeShareLink ? 'Share link settings updated.' : 'Share link created.');
    } catch (caught) {
      setShareLinkStatus('error');
      setShareLinkMessage(getErrorMessage(caught));
    }
  };

  const copyPublicShareLink = () => {
    if (!shareUrl) return;
    void Clipboard.setStringAsync(shareUrl).then(() => setShareLinkMessage('Share link copied.')).catch(() => setShareLinkMessage('Could not copy the link. Select and copy it manually.'));
  };

  const update = <K extends keyof PropertyWizardDraft>(key: K, value: PropertyWizardDraft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const scheduleAddressGeocode = (location: PropertyWizardDraft['location']) => {
    addressLookupRequest.current += 1;
    const requestId = addressLookupRequest.current;
    setDetectLocationError('');
    if (addressGeocodeTimer.current) clearTimeout(addressGeocodeTimer.current);
    const pincode = location.pincode.trim();
    const hasSpecificAddress = Boolean(location.village.trim() && (location.taluk.trim() || location.district.trim() || location.state.trim()));
    if (!/^\d{6}$/.test(pincode) && !hasSpecificAddress) return;
    const address = [location.village, location.taluk, location.district, location.state, pincode, 'India'].filter(Boolean).join(', ');
    setDraft((current) => ({ ...current, location: { ...current.location, latitude: '', longitude: '' } }));
    addressGeocodeTimer.current = setTimeout(() => {
      void (async () => {
        try {
          if (Platform.OS === 'web') throw new Error('web-geocoding-unavailable');
          if (Platform.OS === 'android' && !hasLocationPermission.current) {
            const permission = await Location.requestForegroundPermissionsAsync();
            if (permission.status !== 'granted') throw new Error('location-permission-denied');
            hasLocationPermission.current = true;
          }
          const result = (await Location.geocodeAsync(address))[0];
          if (requestId !== addressLookupRequest.current) return;
          if (!result) {
            setDetectLocationError('Could not find a pin for that address. Try adding the village, district, and pincode.');
            return;
          }
          setDraft((current) => ({ ...current, location: { ...current.location, latitude: result.latitude.toFixed(6), longitude: result.longitude.toFixed(6) } }));
          setLocationAccuracy(result.accuracy ?? null);
          setDetectLocationError('');
        } catch {
          if (requestId === addressLookupRequest.current) setDetectLocationError(Platform.OS === 'web'
            ? 'Automatic address-to-pin lookup is unavailable on web. Set the pin by double-tapping the map.'
            : 'Address-to-pin lookup failed. Set the pin by double-tapping the map.');
        }
      })();
    }, 900);
  };
  const updateLocation = (key: keyof PropertyWizardDraft['location'], value: string | boolean) => {
    const location = { ...draft.location, [key]: value };
    if (key === 'village' || key === 'pincode' || key === 'taluk' || key === 'district' || key === 'state') scheduleAddressGeocode(location);
    setDraft((current) => ({ ...current, location: { ...current.location, [key]: value } }));
  };

  const applyCoordinates = async (latitude: number, longitude: number, permissionAlreadyGranted = false) => {
    if (addressGeocodeTimer.current) clearTimeout(addressGeocodeTimer.current);
    const requestId = ++addressLookupRequest.current;
    setDetectLocationError('');
    setDraft((current) => ({ ...current, location: { ...current.location, latitude: latitude.toFixed(6), longitude: longitude.toFixed(6), village: '', pincode: '', taluk: '', district: '', state: '' } }));
    try {
      if (Platform.OS === 'web') {
        setDetectLocationError('Automatic address lookup is unavailable on web. Pin coordinates are saved; enter the address fields manually.');
        return;
      }
      if (Platform.OS === 'android' && !permissionAlreadyGranted) {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status !== 'granted') {
          if (requestId === addressLookupRequest.current) setDetectLocationError('Address lookup permission was not granted. Pin coordinates are saved; enter the address fields manually.');
          return;
        }
        hasLocationPermission.current = true;
      }
      const address = (await Location.reverseGeocodeAsync({ latitude, longitude }))[0] ?? null;
      if (requestId !== addressLookupRequest.current) return;
      setDraft((current) => ({
        ...current,
        location: {
          ...current.location,
          village: [address?.street, address?.name].filter(Boolean).join(', '),
          pincode: address?.postalCode ?? '',
          taluk: address?.district || address?.city || '',
          district: address?.subregion ?? '',
          state: address?.region ?? '',
        },
      }));
    } catch {
      if (requestId === addressLookupRequest.current) setDetectLocationError('Address lookup failed. Pin coordinates are saved; enter the address fields manually.');
    }
  };
  const localProperty = useMemo<LocalProperty | null>(() => {
    if (!propertyId) return null;
    const statusLabel = publishComplete ? 'Available' : 'Draft';
    const location = [draft.location.village, draft.location.district, draft.location.state].filter(Boolean).join(', ');
    const price = numberOrNull(draft.askingPrice);
    const area = numberOrNull(draft.area);
    return {
      ...(isMockMode && localEditQuery.data ? localEditQuery.data : {}),
      id: propertyId,
      title: draft.title.trim(),
      categoryLabel: CATEGORY_LABELS[draft.category],
      status: { label: statusLabel, tone: publishComplete ? 'success' : 'warning' },
      area: area && area > 0 ? { value: area, unit: draft.areaUnit } : null,
      location: location || null,
      priceInr: price,
      negotiable: draft.negotiable,
      description: draft.description.trim(),
      secondaryUses: draft.secondaryUses,
      transactionIntent: draft.intent,
      listingReadiness: draft.listingReadiness,
      legalTitle: draft.titleClassification.replaceAll('_', ' '),
      privateNotes: draft.privateNotes.trim(),
      facts: [
        ...(draft.soilType ? [{ icon: 'eco' as const, label: 'Soil type', value: SOIL_TYPES.find((item) => item.value === draft.soilType)?.label ?? draft.soilType }] : []),
        ...(draft.waterSources.length ? [{ icon: 'water_drop' as const, label: 'Water sources', value: draft.waterSources.join(' · ') }] : []),
      ],
      footerLabel: publishComplete ? 'Published' : 'Draft · Continue setup',
      footerIcon: publishComplete ? 'verified' : 'schedule',
    };
  }, [propertyId, draft, publishComplete, localEditQuery.data]);
  const reviewItems = createPropertyReviewItems({
    title: draft.title,
    location: [draft.location.village, draft.location.district].filter(Boolean).join(', '),
    survey: draft.location.surveyNumbers,
    area: draft.area,
    areaUnit: draft.areaUnit,
    soil: SOIL_TYPES.find((item) => item.value === draft.soilType)?.label ?? '',
    water: draft.waterSources.map((source) => source.replaceAll('_', ' ')),
    price: draft.askingPrice,
    loan: draft.outstandingLoan,
    legal: draft.titleClassification.replaceAll('_', ' '),
    documentCount: documents.length,
    authorityCount: authorities.length,
  });

  const persistLocal = async (published = publishComplete, id = localProperty?.id ?? propertyId) => {
    if (!id) return;
    const property = localProperty ?? {
      id,
      title: draft.title.trim(),
      categoryLabel: CATEGORY_LABELS[draft.category],
      status: { label: 'Draft', tone: 'warning' as const },
      area: null,
      location: null,
      priceInr: null,
    };
    await saveLocalProperty({ ...property, status: { label: published ? 'Available' : 'Draft', tone: published ? 'success' : 'warning' }, footerLabel: published ? 'Published' : `Draft · ${Math.round((step / 6) * 100)}% complete` });
    await queryClient.invalidateQueries({ queryKey: ['local-properties'] });
  };

  const persistOfflineDraft = async (id: string, savedStep: number, publishWhenSynced = false) => {
    const existing = await offlineStore.getProperty(id);
    const base = existing ?? localProperty ?? {
      id, title: draft.title.trim(), categoryLabel: CATEGORY_LABELS[draft.category],
      status: { label: 'Draft', tone: 'warning' as const }, area: null, location: null, priceInr: null,
    };
    await offlineStore.saveProperty({
      ...base,
      ownerSub: auth?.currentUser?.sub ?? null,
      remoteId: existing?.remoteId ?? localEditData?.remoteId ?? (requestedPropertyId === id ? requestedPropertyId : null),
      syncStatus: 'pending',
      offlineDraft: { draft, loanActive, irrigationMethod, publishWhenSynced },
      offlineStep: Math.max(savedStep, existing?.offlineStep ?? localEditData?.offlineStep ?? 0),
      syncError: undefined,
      footerLabel: 'Saved on this device · waiting to sync',
    });
    await queryClient.invalidateQueries({ queryKey: ['local-properties'] });
    await queryClient.invalidateQueries({ queryKey: ['local-properties', id] });
    setStatus('Saved on this device · sync queued');
  };

  const ensureDraft = async () => {
    if (!draft.title.trim()) throw new Error('Enter a property title to save this draft.');
    if (isMockMode) {
      const id = propertyId ?? createUuid();
      setPropertyId(id);
      const local = localProperty ?? {
        id, title: draft.title.trim(), categoryLabel: CATEGORY_LABELS[draft.category],
        status: { label: 'Draft', tone: 'warning' as const }, area: null, location: null, priceInr: null,
      };
      await saveLocalProperty({ ...local, title: draft.title.trim(), categoryLabel: CATEGORY_LABELS[draft.category], description: draft.description.trim(), secondaryUses: draft.secondaryUses, transactionIntent: draft.intent, listingReadiness: draft.listingReadiness });
      await queryClient.invalidateQueries({ queryKey: ['local-properties'] });
      return id;
    }
    const id = propertyId ?? createUuid();
    setPropertyId(id);
    await persistOfflineDraft(id, step);
    return id;
  };

  const detectLocation = async () => {
    setDetectingLocation(true);
    setDetectLocationError('');
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        setDetectLocationError('Location permission was not granted. You can still enter the address and coordinates manually.');
        return;
      }
      hasLocationPermission.current = true;
      const result = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      await applyCoordinates(result.coords.latitude, result.coords.longitude, true);
      setLocationAccuracy(result.coords.accuracy ?? null);
    } catch {
      setDetectLocationError('Could not detect your location. Check that location services are enabled and try again.');
    } finally {
      setDetectingLocation(false);
    }
  };

  const saveStep = async (targetStep = step, publishWhenSynced = false) => {
    let id: string;
    if (isMockMode) {
      id = await ensureDraft();
      await persistLocal(publishComplete, id);
    } else {
      id = propertyId ?? createUuid();
      setPropertyId(id);
      await persistOfflineDraft(id, targetStep, publishWhenSynced);
      const result = await offlineStore.syncNow();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['local-properties'] }),
        queryClient.invalidateQueries({ queryKey: ['local-properties', id] }),
      ]);
      if (result.errors.length) setStatus('Saved on this device · sync pending');
      else setStatus('Saved just now');
    }
    setError('');
    return id;
  };

  const runSave = async (action: () => Promise<void>) => {
    setSaving(true);
    setError('');
    try { await action(); }
    catch (caught) { const message = getErrorMessage(caught); setError(message); showToast(message, 'error'); }
    finally { setSaving(false); }
  };

  const validateRequiredFields = () => {
    if (draft.title.trim()) {
      setTitleError('');
      return true;
    }
    const message = 'Property title is required.';
    setTitleError(message);
    setError('');
    setStep(1);
    showToast(message, 'warning');
    return false;
  };

  const validateFinancialFields = () => {
    const parsedPrice = Number(draft.askingPrice.trim());
    const parsedArea = Number(draft.area.trim());
    const nextAskingPriceError = Number.isSafeInteger(parsedPrice) && parsedPrice > 0
      ? ''
      : 'Enter a total asking price greater than ₹0.';
    const nextAreaError = Number.isFinite(parsedArea) && parsedArea > 0
      ? ''
      : 'Enter a primary area greater than 0.';
    setAskingPriceError(nextAskingPriceError);
    setAreaError(nextAreaError);
    if (nextAskingPriceError || nextAreaError) {
      setError('');
      showToast(nextAskingPriceError || nextAreaError, 'warning');
      return false;
    }
    return true;
  };

  const onContinue = () => {
    if (!validateRequiredFields()) return;
    if (step === 4 && !validateFinancialFields()) return;
    return runSave(async () => {
      await saveStep(step);
      if (step < 6) setStep((current) => current + 1);
    });
  };

  const onSaveDraft = () => {
    if (!validateRequiredFields()) return;
    if (step === 4 && !validateFinancialFields()) return;
    return runSave(async () => { await saveStep(step); setStatus('Draft saved just now'); showToast('Draft saved.', 'success'); });
  };

  const onSaveAndExit = () => {
    if (!validateRequiredFields()) return;
    if (step >= 4 && !validateFinancialFields()) return;
    return runSave(async () => {
      const id = await saveStep(5, !publishComplete);
      if (isMockMode) {
        await persistLocal(true, id);
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['local-properties'] }),
        queryClient.invalidateQueries({ queryKey: ['property-editor', id] }),
      ]);
      const savedProperty = isMockMode ? null : await offlineStore.getProperty(id);
      const synced = savedProperty?.syncStatus === 'synced';
      setStatus(isMockMode ? (publishComplete ? 'Property saved' : 'Property published') : synced ? (publishComplete ? 'Property saved' : 'Property published') : 'Saved on this device · sync pending');
      showToast(isMockMode ? (publishComplete ? 'Property saved.' : 'Property published.') : synced ? (publishComplete ? 'Property saved.' : 'Property published.') : 'Property saved on this device. Sync is pending.', synced || isMockMode ? 'success' : 'warning');
      if (router.canGoBack()) router.back();
      else router.replace('/');
    });
  };

  const chips = (items: readonly { value: string; label: string }[], selected: string | string[], onSelect: (value: string) => void, testPrefix: string) => (
    <View style={styles.chipWrap}>{items.map((item) => {
      const active = Array.isArray(selected) ? selected.includes(item.value) : selected === item.value;
      return <Pressable key={item.value} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => onSelect(item.value)} style={[styles.chip, { backgroundColor: active ? colors.accentContainer : colors.surfaceLow }]} testID={`${testPrefix}-${item.value}`}><Text style={[styles.chipText, { color: active ? colors.onAccentContainer : colors.textSecondary }]}>{item.label}</Text></Pressable>;
    })}</View>
  );

  const renderStep = () => {
    switch (step) {
      case 1: return <PropertyBasicsStep
        title={draft.title}
        description={draft.description}
        category={draft.category}
        secondaryUses={draft.secondaryUses}
        intent={draft.intent}
        listingReadiness={draft.listingReadiness}
        isMockData={isMockMode}
        titleError={titleError}
        onTitleChange={(value) => {
          update('title', value);
          if (value.trim()) setTitleError('');
        }}
        onDescriptionChange={(value) => update('description', value)}
        onCategoryChange={(value) => update('category', value)}
        onSecondaryUsesChange={(value) => update('secondaryUses', value)}
        onIntentChange={(value) => update('intent', value)}
        onListingReadinessChange={(value) => update('listingReadiness', value)}
      />;
      case 2: return <LocationLandStep
        location={draft.location}
        titleClassification={draft.titleClassification}
        accuracyMeters={locationAccuracy}
        detectingLocation={detectingLocation}
        detectLocationError={detectLocationError}
        onLocationChange={(key, value) => updateLocation(key, value)}
        onCoordinateSelect={(latitude, longitude) => {
          void applyCoordinates(latitude, longitude);
        }}
        onMapInteractionChange={setMapInteractionActive}
        onTitleClassificationChange={(value) => update('titleClassification', value)}
        onDetectLocation={() => void detectLocation()}
      />;
      case 3: return <FeaturesUtilitiesStep
        soilType={draft.soilType}
        soilTypeOther={draft.soilTypeOther}
        waterTdsPpm={draft.waterTdsPpm}
        waterSources={draft.waterSources}
        utilities={draft.utilities}
        agronomistNotes={draft.agronomistNotes}
        irrigationMethod={irrigationMethod}
        onSoilTypeChange={(value) => update('soilType', value)}
        onSoilTypeOtherChange={(value) => update('soilTypeOther', value)}
        onWaterTdsChange={(value) => update('waterTdsPpm', value)}
        onWaterSourcesChange={(value) => update('waterSources', value)}
        onUtilitiesChange={(value) => update('utilities', value)}
        onAgronomistNotesChange={(value) => update('agronomistNotes', value)}
        onIrrigationMethodChange={(value) => { setIrrigationMethod(value); update('utilities', value ? Array.from(new Set([...draft.utilities, 'irrigation' as const])) : draft.utilities.filter((item) => item !== 'irrigation')); }}
      />;
      case 4: return <PropertyFinancialsStep
        askingPrice={draft.askingPrice}
        minimumPrice={draft.minimumPrice}
        area={draft.area}
        areaUnit={draft.areaUnit as MeasurementUnit}
        negotiable={draft.negotiable}
        advanceAmount={draft.advanceAmount}
        outstandingLoan={draft.outstandingLoan}
        lendingBank={draft.lendingBank}
        loanActive={loanActive}
        paymentMilestoneFlexible={paymentMilestoneFlexible}
        priceBasis={priceBasis}
        milestoneControlAvailable={isMockMode}
        secondaryAreaAvailable={false}
        askingPriceError={askingPriceError}
        areaError={areaError}
        onAskingPriceChange={(value) => { update('askingPrice', value); if (value.trim()) setAskingPriceError(''); }}
        onMinimumPriceChange={(value) => update('minimumPrice', value)}
        onAreaChange={(value) => { update('area', value); if (Number(value) > 0) setAreaError(''); }}
        onAreaUnitChange={(value) => update('areaUnit', value)}
        onNegotiableChange={(value) => update('negotiable', value)}
        onPriceBasisChange={setPriceBasis}
        onAdvanceAmountChange={(value) => update('advanceAmount', value)}
        onLoanActiveChange={setLoanActive}
        onOutstandingLoanChange={(value) => update('outstandingLoan', value)}
        onLendingBankChange={(value) => update('lendingBank', value)}
        onPaymentMilestoneFlexibleChange={setPaymentMilestoneFlexible}
      />;
      case 5: return <>
        <OwnershipDocumentsStep
          authorities={authorities}
          onAuthoritySave={saveSigningAuthority}
          onAuthorityRemove={removeSigningAuthority}
          authorityManagementAvailable={isMockMode || Boolean(auth?.accessToken && (!propertyId || signingAuthoritiesQuery.isSuccess))}
          isLoadingAuthorities={!isMockMode && Boolean(propertyId && signingAuthoritiesQuery.isLoading)}
          authoritiesError={!isMockMode && signingAuthoritiesQuery.isError ? getErrorMessage(signingAuthoritiesQuery.error) : undefined}
          onRetryAuthorities={() => void signingAuthoritiesQuery.refetch()}
          fieldAssociate={isMockMode ? mockFieldAssociate : null}
          privateNotes={isMockMode && !draft.privateNotes ? mockPrivateBrokerNotes : draft.privateNotes}
          onPrivateNotesChange={(value) => update('privateNotes', value)}
          documents={documents}
          isLoadingDocuments={documentsQuery.isLoading}
          isUploadingDocument={isUploadingLegalDocument}
          selectedDocumentCategory={selectedLegalDocumentCategory}
          onDocumentCategoryChange={setSelectedLegalDocumentCategory}
          documentsError={documentsQuery.error ? getErrorMessage(documentsQuery.error) : undefined}
          onRetryDocuments={() => void documentsQuery.refetch()}
          onChooseDocument={chooseLegalDocument}
          onScanDocument={() => Alert.alert('Scan document', 'Document scanning is not available on this device yet.')}
          onOpenDocument={(document) => void openLegalDocument(document)}
          onDocumentActions={removeLegalDocument}
          referenceLinks={isMockMode ? mockPropertyReferenceLinks : []}
          referenceLinksAvailable={false}
          onAddReferenceLink={() => undefined}
          onOpenReferenceLink={() => undefined}
        />
        <Text style={[styles.label, { color: colors.text }]}>Title classification</Text>
        {chips([{ value: 'ryotwari_patta', label: 'Ryotwari Patta' }, { value: 'natham', label: 'Natham Patta' }, { value: 'gramathu_natham', label: 'Gramathu Natham' }, { value: 'other', label: 'Other' }], draft.titleClassification, (value) => update('titleClassification', value as PropertyWizardDraft['titleClassification']), 'title-class')}
        <CoreTextField label="Legal summary" value={draft.legalSummary} onChangeText={(value) => update('legalSummary', value)} placeholder="Title status, deed details, and clearances..." multiline testID="property-legal-summary" />
      </>;
      default: return <PropertyReviewPublishStep
        locationPreview={{
          latitude: coordinateOrNull(draft.location.latitude, -90, 90),
          longitude: coordinateOrNull(draft.location.longitude, -180, 180),
          address: [draft.location.village, draft.location.pincode, draft.location.taluk, draft.location.district, draft.location.state].filter(Boolean).join(', '),
        }}
        photos={reviewPhotos}
        photosLoading={propertyPhotosQuery.isLoading}
        photosBusy={saving}
        photosError={propertyPhotosQuery.error ? getErrorMessage(propertyPhotosQuery.error) : undefined}
        onRetryPhotos={() => void propertyPhotosQuery.refetch()}
        onChoosePhoto={() => void addPropertyPhoto('library')}
        onCapturePhoto={() => void addPropertyPhoto('camera')}
        onRemovePhoto={removePropertyPhoto}
        voiceMemos={voiceMemos}
        voiceMemoRecording={isRecordingVoiceMemo}
        voiceMemoUploading={isUploadingVoiceMemo}
        voiceMemoElapsedSeconds={isMockMode
          ? mockRecordingElapsedSeconds
          : Math.floor(recorderState.durationMillis / 1000)}
        voiceMemoError={voiceMemoError || (!isMockMode && propertyVoiceMemosQuery.isError ? getErrorMessage(propertyVoiceMemosQuery.error) : undefined)}
        onRecordVoiceMemo={() => void startVoiceMemoRecording()}
        onStopVoiceMemo={() => void stopVoiceMemoRecording()}
        onPlayPauseVoiceMemo={(id) => void toggleVoiceMemoPlayback(id)}
        onDeleteVoiceMemo={(id) => void removeVoiceMemo(id)}
        reviewItems={reviewItems}
        onEditStep={setStep}
        publicPreviewEnabled={sharePreview}
        onPublicPreviewChange={changePublicPreview}
        disclosures={publicDisclosures}
        onDisclosureChange={(key, value) => setPublicDisclosureOverrides((current) => ({ ...current, [key]: value }))}
        shareUrl={sharePreview ? shareUrl : null}
        shareLinkStatus={shareLinkStatus === 'idle' && shareLinksQuery.error ? 'error' : shareLinkStatus}
        shareLinkMessage={shareLinkMessage || (shareLinksQuery.error ? getErrorMessage(shareLinksQuery.error) : '')}
        canCreateShareLink={publishComplete && sharePreview && !shareLinksQuery.isLoading && !shareLinksQuery.error}
        onCreateShareLink={() => void savePublicShareLink()}
        onCopyShareLink={copyPublicShareLink}
        onRetryShareLinks={() => void shareLinksQuery.refetch()}
      />;
    }
  };

  const wizardFooter = <View style={styles.footer}><View style={styles.dots}>{Array.from({ length: 6 }, (_, index) => <View key={index} style={[styles.dot, { backgroundColor: index + 1 === step ? colors.accent : colors.surfaceHigh }]} />)}</View><View style={styles.actions}>{step > 1 ? <CoreButton label="Previous" variant="tertiary" onPress={() => setStep((value) => value - 1)} /> : <View />}{step < 6 ? <CoreButton label="Continue" trailingIcon="arrow_forward" onPress={onContinue} loading={saving} style={styles.continue} testID="property-continue" /> : <CoreButton label="Save property" leadingIcon="task_alt" onPress={onSaveAndExit} loading={saving} style={styles.continue} testID="property-save-final" />}</View></View>;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={styles.topbar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => step > 1 ? setStep((value) => value - 1) : router.canGoBack() ? router.back() : router.replace('/')} style={styles.back}>
          <AppIcon name="chevron_left" size={21} color={colors.text} />
        </Pressable>
        <View style={styles.topTitle}>
          <Text numberOfLines={1} style={[styles.title, { color: colors.text }]}>{requestedPropertyId ? 'Edit Property' : step === 1 ? 'Property Type' : step === 2 ? 'Location Details' : step === 3 ? 'Specifications' : step === 4 ? 'Financials & Pricing' : step === 5 ? 'Ownership & Documents' : 'Review And Save'}</Text>
          <Text numberOfLines={1} style={[styles.status, { color: colors.accent }]}>{status}</Text>
        </View>
        <View style={styles.topbarActions}>
          <CoreButton label={width < 380 ? 'Save' : 'Save draft'} variant="secondary" size="small" onPress={onSaveDraft} loading={saving} testID="property-save-draft-header" />
          <ThemeToggle />
        </View>
      </View>
      <ScrollView testID="property-editor-scroll" style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" scrollEnabled={!mapInteractionActive}>
        <View style={styles.form}>
          {editLoading ? <View style={styles.editState}><Text style={[styles.status, { color: colors.textSecondary }]}>Loading saved property…</Text></View> : null}
          {editLoadError ? <View style={styles.editState}><Text accessibilityRole="alert" style={[styles.error, { color: colors.dangerText }]}>{editLoadError}</Text>{isMockMode ? <CoreButton label="Retry" onPress={() => void localEditQuery.refetch()} /> : <CoreButton label="Retry" onPress={() => void liveEditQuery.refetch()} />}</View> : null}
          {!requestedPropertyId || editingLoaded ? <>
            {step !== 2 && step !== 3 && step !== 4 && step !== 5 && step !== 6 ? <WizardProgressHeader step={step} totalSteps={6} title={STEP_TITLES[step - 1]} statusLabel={`${Math.round((step / 6) * 100)}% completed`} /> : null}
            {step !== 2 && step !== 3 && step !== 4 && step !== 5 && step !== 6 ? <View style={styles.stepNavigation}>{['Basic details', 'Location', 'Features', 'Valuation & legal'].map((label, index) => <Text key={label} style={[styles.stepNavLabel, { color: Math.min(5, step - 1) >= index * 2 ? colors.accent : colors.textSecondary }]}>{label}</Text>)}</View> : null}
            <View style={styles.fields} testID={`property-step-${step}`}>{renderStep()}</View>
            {error ? <Text accessibilityRole="alert" style={[styles.error, { color: colors.dangerText }]}>{error}</Text> : null}
            {wizardFooter}
          </> : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 }, scroll: { flex: 1 }, content: { paddingHorizontal: Spacing.three, paddingTop: Spacing.three, paddingBottom: Spacing.five, alignItems: 'center' }, editState: { minHeight: 240, width: '100%', alignItems: 'center', justifyContent: 'center', gap: Spacing.three },
  topbar: { minHeight: 60, width: '100%', maxWidth: MaxContentWidth, paddingHorizontal: Spacing.three, flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  back: { width: 40, height: 40, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' }, topTitle: { flex: 1, minWidth: 0, gap: Spacing.half }, topbarActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  title: { ...Typography.title }, status: { ...Typography.bodySmall }, form: { width: '100%', maxWidth: 680, gap: Spacing.three },
  stepNavigation: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }, stepNavLabel: { ...Typography.labelSmall }, fields: { gap: Spacing.three },
  sectionHeading: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two, marginTop: Spacing.two }, sectionText: { flex: 1, gap: Spacing.half }, sectionTitle: { ...Typography.title }, helper: { ...Typography.bodySmall }, label: { ...Typography.labelSmall },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }, chip: { borderRadius: Radius.pill, paddingVertical: Spacing.two, paddingHorizontal: Spacing.three }, chipText: { ...Typography.bodySmall, fontWeight: '600' },
  categoryOption: { minHeight: 68, borderRadius: Radius.medium, padding: Spacing.three, flexDirection: 'row', alignItems: 'center', gap: Spacing.two }, categoryCopy: { flex: 1, gap: Spacing.half }, categoryTitle: { ...Typography.label },
  twoColumns: { flexDirection: 'row', gap: Spacing.two }, flexField: { flex: 1, minWidth: 0 }, choice: { alignSelf: 'flex-start', borderRadius: Radius.medium, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two }, choiceText: { ...Typography.body },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, minHeight: 40 }, checkbox: { width: 22, height: 22, borderWidth: 1.5, borderRadius: Radius.small, alignItems: 'center', justifyContent: 'center' },
  notice: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.medium }, reviewRow: { minHeight: 64, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', gap: Spacing.two }, reviewCopy: { flex: 1, gap: Spacing.half }, reviewValue: { ...Typography.body, fontWeight: '600' },
  error: { ...Typography.body }, footer: { gap: Spacing.two, paddingTop: Spacing.two }, reviewFooter: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.two }, dots: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.one }, dot: { width: 8, height: 8, borderRadius: 4 }, actions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two }, continue: { flex: 1, alignSelf: 'stretch' },
});
