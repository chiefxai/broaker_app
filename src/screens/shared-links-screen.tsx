import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Alert, FlatList, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Switch, View, useWindowDimensions } from 'react-native';
import { LocalizedText as Text } from '@/i18n/LocalizedText';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/core/navigation/AppHeader';
import { AppIcon } from '@/components/core/icons';
import { CoreButton } from '@/components/core/CoreButton';
import { CoreTextField } from '@/components/core/forms/CoreTextField';
import { CoreDatePickerField } from '@/components/core/forms/CoreDatePickerField';
import { FilterBottomSheet, FilterChoice, FilterOptionGroup } from '@/components/core/forms/FilterBottomSheet';
import { FloatingActionButton } from '@/components/core/FloatingActionButton';
import { OverflowMenu } from '@/components/core/navigation/OverflowMenu';
import { PlatformBottomSheet } from '@/components/core/navigation/PlatformBottomSheet';
import { SearchFilterRow } from '@/components/core/forms/SearchFilterRow';
import { StatusChip } from '@/components/core/StatusChip';
import { LoadingSkeleton, SkeletonBlock } from '@/components/core/LoadingSkeleton';
import type { OverflowMenuItem } from '@/components/core/navigation/OverflowMenu.types';
import { isMockMode } from '@/data/app-mode';
import { mockSharedLinks, type MockSharedLink, type SharedLinkStatus } from '@/data/mock/shared-links';
import { useBackendSharedLinks } from '@/api/backend-hooks';
import { Radius, Spacing, Typography, WideContentMaxWidth, WideLayoutBreakpoint } from '@/theme/tokens';
import { useTheme } from '@/theme/theme-provider';
import { useFooterContentPadding } from '@/theme/use-footer-inset';
import { shareOrCopyUrl } from '@/utils/share-link';
import { getDefaultExpirationDateInput } from '@/utils/share-expiration';
import { useToast } from '@/components/core/toast/ToastProvider';
import { useLocalProperties } from '@/data/database';
import { mockProperties, type LocalProperty } from '@/data/mock/properties';
import { createPropertyShareLink, createProfileShareLink, deletePropertyShareLink, getPreferences, revokeProfileShareLink, preparePropertyAssetsForShare, toPublicListingAppUrl, toPublicProfileShareAppUrl, updateProfileShareLink, updatePropertyShareLink, type ApiPropertySummary, type ApiShareDisclosures, type ShareVisibility } from '@/api/backend-api';
import { getApiErrorMessage, isUuid } from '@/api/errors';
import { isActivePropertyStatus } from '@/utils/share-properties';
import { useOptionalAuth } from '@/auth/auth-provider';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { recommendedShareDisclosures } from '@/data/mock/settings';

type LinkFilter = 'all' | SharedLinkStatus;
type AccessLabel = 'Private' | 'Protected' | 'Unlisted' | 'Public';
type LinkFilters = { status: LinkFilter; access: 'All access' | AccessLabel; sort: 'Recently created' | 'Most viewed' };
const defaultLinkFilters: LinkFilters = { status: 'active', access: 'All access', sort: 'Recently created' };
interface ProfilePropertyOption { id: string; title: string; status: string; category: string; location: string; area: string }
type ProfileDisclosureKey = keyof ApiShareDisclosures;
const profileDisclosureFields: { key: ProfileDisclosureKey; label: string }[] = [
  { key: 'show_name', label: 'Property name' },
  { key: 'show_description', label: 'Description' },
  { key: 'show_location', label: 'Approximate location' },
  { key: 'show_specifications', label: 'Specifications' },
  { key: 'show_price', label: 'Price' },
  { key: 'show_exact_coordinates', label: 'Exact map location' },
  { key: 'show_photos', label: 'Photos' },
  { key: 'show_documents', label: 'Documents' },
  { key: 'show_reports', label: 'Reports' },
  { key: 'show_broker_contact', label: 'Broker contact details' },
  { key: 'show_approach_roads', label: 'Approach road details' },
];
const defaultProfilePropertyDisclosures: ApiShareDisclosures = {
  show_name: true,
  show_description: true,
  show_location: true,
  show_specifications: true,
  show_broker_contact: false,
  show_documents: false,
  ...recommendedShareDisclosures,
};

function parseFutureExpiry(value: string): string | null {
  if (!value.trim()) return null;
  const date = new Date(`${value.trim()}T23:59:59.000Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value.trim()) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value.trim() || date.getTime() <= Date.now()) {
    throw new Error('Enter a future expiration date in YYYY-MM-DD format.');
  }
  return date.toISOString();
}

export default function SharedLinksScreen() {
  const footerPadding = useFooterContentPadding(true, true);
  const colors = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const [listWidth, setListWidth] = useState(0);
  const columns = (listWidth || windowWidth) >= WideLayoutBreakpoint ? 2 : 1;
  const router = useRouter();
  const { generatePropertyId, shareAfterCreate: shareAfterCreateParam } = useLocalSearchParams<{ generatePropertyId?: string; shareAfterCreate?: string }>();
  const { showToast } = useToast();
  const auth = useOptionalAuth();
  const queryClient = useQueryClient();
  const propertiesQuery = useLocalProperties();
  const backendLinks = useBackendSharedLinks();
  const sharingPreferences = useQuery({ queryKey: ['backend', 'preferences'], queryFn: () => auth?.accessToken ? getPreferences(auth.accessToken) : Promise.reject(new Error('Sign in to load sharing defaults.')), enabled: !isMockMode && Boolean(auth?.accessToken) });
  const [refreshing, setRefreshing] = useState(false);
  const profilePropertyDisclosureDefaults: ApiShareDisclosures = { ...defaultProfilePropertyDisclosures, ...sharingPreferences.data?.default_disclosures };
  const [demoLinks, setDemoLinks] = useState(mockSharedLinks);
  const mockLinkSequence = useRef(0);
  const links = useMemo(() => isMockMode ? demoLinks : backendLinks.data ?? [], [backendLinks.data, demoLinks]);
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  const [linkFilters, setLinkFilters] = useState<LinkFilters>(defaultLinkFilters);
  const [draftFilters, setDraftFilters] = useState<LinkFilters>(defaultLinkFilters);
  const [search, setSearch] = useState('');
  const [createSheetVisible, setCreateSheetVisible] = useState(false);
  const [shareAfterCreate, setShareAfterCreate] = useState(false);
  const [createKind, setCreateKind] = useState<'specific' | 'everything'>('specific');
  const [createTitle, setCreateTitle] = useState('');
  const [createSelectedPropertyIds, setCreateSelectedPropertyIds] = useState<string[]>([]);
  const [createCommonDisclosureOverrides, setCreateCommonDisclosureOverrides] = useState<Partial<ApiShareDisclosures>>({});
  const [createPropertyDisclosureOverrides, setCreatePropertyDisclosureOverrides] = useState<Record<string, Partial<ApiShareDisclosures>>>({});
  const createCommonDisclosures: ApiShareDisclosures = { ...profilePropertyDisclosureDefaults, ...createCommonDisclosureOverrides };
  const [createDisclosurePropertyExpanded, setCreateDisclosurePropertyExpanded] = useState<string | null>(null);
  const [creatingForProperty, setCreatingForProperty] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createExpiry, setCreateExpiry] = useState('');
  const [createVisibility, setCreateVisibility] = useState<ShareVisibility>('unlisted');
  const [createPasscode, setCreatePasscode] = useState('');
  const [editingLink, setEditingLink] = useState<MockSharedLink | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editExpiry, setEditExpiry] = useState('');
  const [editVisibility, setEditVisibility] = useState<ShareVisibility>('unlisted');
  const [editPasscode, setEditPasscode] = useState('');
  const [editIncludeProfile, setEditIncludeProfile] = useState(true);
  const [editIncludeProperties, setEditIncludeProperties] = useState(true);
  const [editSelectedPropertyIds, setEditSelectedPropertyIds] = useState<string[]>([]);
  const [editPropertyDisclosureOverrides, setEditPropertyDisclosureOverrides] = useState<Record<string, ApiShareDisclosures>>({});
  const [editDisclosurePropertyExpanded, setEditDisclosurePropertyExpanded] = useState<string | null>(null);
  const [editDisclosures, setEditDisclosures] = useState({ show_name: true, show_description: true, show_location: true, show_price: true, show_specifications: true, show_exact_coordinates: false, show_photos: true, show_documents: false, show_reports: false, show_broker_contact: false, show_approach_roads: true });
  const [editError, setEditError] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const activeCount = links.filter((link) => link.status === 'active').length;
  const expiredCount = links.filter((link) => link.status === 'expired').length;
  const revokedCount = links.filter((link) => link.status === 'revoked').length;
  const filteredLinks = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    const results = links.filter((link) => {
      const matchesStatus = linkFilters.status === 'all' || link.status === linkFilters.status;
      const matchesAccess = linkFilters.access === 'All access' || link.access === linkFilters.access;
      const matchesSearch = !query || `${link.title} ${link.propertyName} ${link.location}`.toLocaleLowerCase().includes(query);
      return matchesStatus && matchesAccess && matchesSearch;
    });
    return linkFilters.sort === 'Most viewed' ? results.sort((a, b) => (b.views ?? 0) - (a.views ?? 0)) : results;
  }, [linkFilters, links, search]);
  const activeFilterCount = Number(linkFilters.status !== 'all') + Number(linkFilters.access !== 'All access') + Number(linkFilters.sort !== 'Recently created');
  const previewCount = links.filter((link) => (draftFilters.status === 'all' || link.status === draftFilters.status)
    && (draftFilters.access === 'All access' || link.access === draftFilters.access)
    && (!search.trim() || `${link.title} ${link.propertyName} ${link.location}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))).length;

  const refreshSharedLinks = async () => {
    setRefreshing(true);
    try {
      await Promise.all([backendLinks.refetch(), propertiesQuery.refetch(), ...(!isMockMode ? [sharingPreferences.refetch()] : [])]);
    } finally {
      setRefreshing(false);
    }
  };

  const openCreateSheet = async () => {
    let defaultExpiryDays = sharingPreferences.data?.default_expiration_days;
    if (!isMockMode && !sharingPreferences.data && auth?.accessToken) {
      defaultExpiryDays = (await sharingPreferences.refetch()).data?.default_expiration_days;
    }
    setCreateError(null);
    setCreateKind('specific');
    setCreateTitle('');
    setCreateSelectedPropertyIds([]);
    setCreateCommonDisclosureOverrides({});
    setCreatePropertyDisclosureOverrides({});
    setCreateDisclosurePropertyExpanded(null);
    setCreateExpiry(getDefaultExpirationDateInput(defaultExpiryDays));
    setCreateVisibility('unlisted');
    setCreatePasscode('');
    setShareAfterCreate(false);
    setCreateSheetVisible(true);
  };

  const propertyOptions = useMemo(() => {
    const rows = isMockMode ? propertiesQuery.data ?? mockProperties : propertiesQuery.data ?? [];
    return (rows as (LocalProperty | ApiPropertySummary)[])
      .filter((property) => {
        const status = typeof property.status === 'string' ? property.status : property.status.label;
        return isActivePropertyStatus(status);
      })
      .map((property) => {
        const local = property as LocalProperty;
        const api = property as ApiPropertySummary;
        const status = typeof property.status === 'string' ? property.status : property.status.label;
        const category = local.categoryLabel ?? api.category?.replaceAll('_', ' ') ?? 'Property';
        const location = typeof local.location === 'string' ? local.location : 'Property location';
        const area = local.area ? `${local.area.value} ${local.area.unit}` : '';
        return { id: property.id, title: property.title, status, category, location, area };
      });
  }, [propertiesQuery.data]);

  const appliedPropertyGeneration = useRef<string | null>(null);
  useEffect(() => {
    if (!generatePropertyId || appliedPropertyGeneration.current === generatePropertyId || propertiesQuery.isPending || (!isMockMode && auth?.accessToken && sharingPreferences.isPending)) return;
    const property = propertyOptions.find((item) => item.id === generatePropertyId);
    const timeout = setTimeout(() => {
      appliedPropertyGeneration.current = generatePropertyId;
      if (!property) {
        showToast('This property is not available for sharing.', 'warning');
        return;
      }
      setCreateKind('specific');
      setCreateTitle('');
      setCreateSelectedPropertyIds([property.id]);
      setCreateCommonDisclosureOverrides({});
      setCreatePropertyDisclosureOverrides({});
      setCreateDisclosurePropertyExpanded(null);
      setCreateExpiry(getDefaultExpirationDateInput(sharingPreferences.data?.default_expiration_days));
      setCreateVisibility('unlisted');
      setCreatePasscode('');
      setShareAfterCreate(shareAfterCreateParam === 'true');
      setCreateError(null);
      setCreateSheetVisible(true);
    }, 0);
    return () => clearTimeout(timeout);
  }, [auth?.accessToken, generatePropertyId, propertiesQuery.isPending, propertyOptions, shareAfterCreateParam, sharingPreferences.data?.default_expiration_days, sharingPreferences.isPending, showToast]);

  const updateCreatePropertyDisclosure = (propertyId: string, key: ProfileDisclosureKey, value: boolean) => {
    setCreatePropertyDisclosureOverrides((current) => ({
      ...current,
      [propertyId]: { ...current[propertyId], [key]: value },
    }));
  };

  const updateEditPropertyDisclosure = (propertyId: string, key: ProfileDisclosureKey, value: boolean) => {
    setEditPropertyDisclosureOverrides((current) => ({
      ...current,
      [propertyId]: { ...profilePropertyDisclosureDefaults, ...current[propertyId], [key]: value },
    }));
  };

  const createUnifiedShareLink = async () => {
    setCreatingForProperty('unified');
    setCreateError(null);
    let generatedUrl: string | null = null;
    try {
      const selectedProperties = propertyOptions.filter((property) => createSelectedPropertyIds.includes(property.id));
      if (createKind === 'specific' && selectedProperties.length === 0) throw new Error('Select at least one active property.');
      if (createTitle.trim().length > 200) throw new Error('Link name must be 200 characters or fewer.');
      const isSingleProperty = createKind === 'specific' && selectedProperties.length === 1;
      if (shareAfterCreate && createVisibility === 'private') throw new Error('Choose Protected or Unlisted access to share this link.');
      const disclosureProperties = createKind === 'everything' ? propertyOptions : selectedProperties;
      const createPropertyDisclosures = Object.fromEntries(disclosureProperties.map((property) => [
        property.id,
        { ...createCommonDisclosures, ...createPropertyDisclosureOverrides[property.id] },
      ])) as Record<string, ApiShareDisclosures>;
      if (!isSingleProperty && createVisibility === 'private') throw new Error('A unified portfolio link must be protected or unlisted.');
      if (createVisibility === 'protected' && !/^\d{6,12}$/.test(createPasscode)) throw new Error('Passcode must contain 6 to 12 digits.');
      const expiresAt = parseFutureExpiry(createExpiry);
      const linkTitle = createTitle.trim() || (isSingleProperty ? `${selectedProperties[0].title} public preview` : createKind === 'everything' ? 'All active properties' : 'Selected properties');
      if (isMockMode) {
        mockLinkSequence.current += 1;
        const now = new Date();
        if (isSingleProperty) {
          const property = selectedProperties[0];
          const disclosures = createPropertyDisclosures[property.id];
          const slug = property.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || property.id;
          generatedUrl = asAbsoluteUrl(`estateflow.in/s/${slug}-${now.getTime().toString(36)}`);
          setDemoLinks((current) => [{ id: `mock-link-${property.id}-${now.getTime()}-${mockLinkSequence.current}`, propertyId: property.id, title: linkTitle, propertyName: property.title, location: property.location, status: 'active', access: createVisibility[0].toUpperCase() + createVisibility.slice(1) as AccessLabel, shortUrl: generatedUrl!.replace(/^https?:\/\//, ''), areaLabel: property.area || 'Property details', priceLabel: disclosures.show_price ? 'Visible' : 'Hidden', mapLabel: disclosures.show_exact_coordinates ? 'Exact pin' : 'Approximate', ownerLabel: 'Protected', documentLabel: disclosures.show_documents ? 'Documents shared' : disclosures.show_photos ? 'Photos shared' : 'No media shared', views: 0, createdAt: now.toISOString(), createdLabel: `Created ${now.toLocaleDateString()}`, expiryLabel: expiresAt ? `Expires ${new Date(expiresAt).toLocaleDateString()}` : 'No expiration', expiresAt, disclosures }, ...current]);
        } else {
          const everyProperty = createKind === 'everything';
          generatedUrl = asAbsoluteUrl(`estateflow.in/broker/portfolio-${now.getTime().toString(36)}`);
          setDemoLinks((current) => [{ id: `mock-profile-${now.getTime()}-${mockLinkSequence.current}`, resourceType: 'profile', includeProfile: true, includeProperties: true, propertyIds: everyProperty ? undefined : createSelectedPropertyIds, propertyDisclosures: createPropertyDisclosures, title: linkTitle, propertyName: 'Property portfolio', location: 'Property portfolio', status: 'active', access: createVisibility === 'protected' ? 'Protected' : 'Unlisted', shortUrl: generatedUrl!.replace(/^https?:\/\//, ''), areaLabel: everyProperty ? 'All active properties' : `${selectedProperties.length} selected properties`, priceLabel: 'Public details', mapLabel: 'Approximate', ownerLabel: 'Broker', documentLabel: 'Portfolio share', views: 0, createdAt: now.toISOString(), createdLabel: `Created ${now.toLocaleDateString()}`, expiryLabel: expiresAt ? `Expires ${new Date(expiresAt).toLocaleDateString()}` : 'No expiration', expiresAt }, ...current]);
        }
      } else {
        if (!auth?.accessToken) throw new Error('Sign in before creating a shared link.');
        if (disclosureProperties.some((property) => !isUuid(property.id))) throw new Error('A selected property has an invalid server ID. Refresh the properties list and try again.');
        if (isSingleProperty) {
          const property = selectedProperties[0];
          const disclosures = createPropertyDisclosures[property.id];
          await preparePropertyAssetsForShare(auth.accessToken, property.id, disclosures);
          const createdLink = await createPropertyShareLink(auth.accessToken, property.id, { title: linkTitle, expires_at: expiresAt, disclosures, visibility: createVisibility, ...(createVisibility === 'protected' ? { passcode: createPasscode } : {}) });
          generatedUrl = toPublicListingAppUrl(createdLink.public_url);
        } else {
          if (createVisibility === 'private') throw new Error('A unified portfolio link must be protected or unlisted.');
          const createdLink = await createProfileShareLink(auth.accessToken, {
            title: linkTitle,
            include_profile: true,
            include_properties: true,
            ...(createKind === 'specific' ? { property_ids: createSelectedPropertyIds } : {}),
            property_disclosures: createPropertyDisclosures,
            visibility: createVisibility,
            ...(createVisibility === 'protected' ? { passcode: createPasscode } : {}),
            expires_at: expiresAt,
          });
          generatedUrl = toPublicProfileShareAppUrl(createdLink.public_url);
        }
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['backend', 'shared-links'] }),
          queryClient.invalidateQueries({ queryKey: ['local-properties'] }),
        ]);
      }
      setCreateSheetVisible(false);
      setShareAfterCreate(false);
      showToast('Share link created successfully.', 'success');
      if (shareAfterCreate) {
        if (generatedUrl) {
          const result = await shareOrCopyUrl(generatedUrl);
          if (result === 'copied') showToast('Share link copied to clipboard.', 'success');
          if (result === 'unavailable') showToast('Could not open sharing or copy the link.', 'warning');
        } else {
          showToast('Link created. Open Shared Links to share it.', 'info');
        }
      }
    } catch (error) {
      setCreateError(getApiErrorMessage(error, 'Could not create the share link.'));
    } finally {
      setCreatingForProperty(null);
    }
  };

  const openFilterSheet = () => {
    setDraftFilters(linkFilters);
    setFilterSheetVisible(true);
  };

  const copyLink = async (shortUrl: string | null) => {
    if (!shortUrl) {
      showToast('This link was created before URL recovery was available. Generate a replacement link to share it.', 'info');
      return;
    }
    try {
      await Clipboard.setStringAsync(asAbsoluteUrl(shortUrl));
      showToast('Link copied to clipboard.', 'success');
    } catch {
      showToast('Could not copy this link.', 'error');
    }
  };

  const shareLink = async (shortUrl: string | null) => {
    if (!shortUrl) {
      showToast('This link was created before URL recovery was available. Generate a replacement link to share it.', 'info');
      return;
    }
    const result = await shareOrCopyUrl(asAbsoluteUrl(shortUrl));
    if (result === 'copied') showToast('Sharing is unavailable here; link copied to clipboard.', 'info');
    if (result === 'unavailable') showToast('Sharing and copying are unavailable in this browser.', 'warning');
  };

  const deleteLink = async (link: MockSharedLink) => {
    try {
      if (isMockMode) setDemoLinks((current) => current.filter((item) => item.id !== link.id));
      else {
        if (!auth?.accessToken) throw new Error('Sign in before deleting a shared link.');
        if (link.resourceType === 'profile') await revokeProfileShareLink(auth.accessToken, link.id);
        else await deletePropertyShareLink(auth.accessToken, link.id);
        queryClient.setQueryData<MockSharedLink[]>(['backend', 'shared-links'], (current) => current?.filter((item) => item.id !== link.id));
        await queryClient.invalidateQueries({ queryKey: ['backend', 'shared-links'] });
      }
      showToast('Shared link deleted.', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not delete this shared link.', 'error');
    }
  };

  const openEditLink = (link: MockSharedLink) => {
    setEditingLink(link);
    setEditTitle(link.title);
    setEditExpiry(link.expiresAt ? link.expiresAt.slice(0, 10) : '');
    setEditVisibility(link.access === 'Private' ? 'private' : link.access === 'Protected' || link.access === 'PIN protected' ? 'protected' : 'unlisted');
    setEditPasscode('');
    setEditIncludeProfile(link.includeProfile ?? true);
    setEditIncludeProperties(link.includeProperties ?? true);
    setEditSelectedPropertyIds(link.propertyIds ?? propertyOptions.map((property) => property.id));
    setEditPropertyDisclosureOverrides(link.propertyDisclosures ?? {});
    setEditDisclosurePropertyExpanded(null);
    setEditDisclosures({ show_name: true, show_description: true, show_location: true, show_price: link.priceLabel !== 'Hidden', show_specifications: true, show_exact_coordinates: link.mapLabel === 'Exact pin', show_photos: link.documentLabel.includes('Photos') || link.documentLabel.includes('brochure'), show_documents: link.disclosures?.show_documents ?? link.documentLabel.includes('Documents'), show_reports: link.disclosures?.show_reports ?? link.documentLabel.includes('Reports'), show_broker_contact: false, show_approach_roads: true, ...link.disclosures });
    setEditError(null);
  };

  const saveLinkEdit = async () => {
    const title = editTitle.trim();
    if (!title || title.length > 200) {
      setEditError('Enter a title with 1 to 200 characters.');
      return;
    }
    let expiresAt: string | null = null;
    if (editExpiry.trim()) {
      const date = new Date(`${editExpiry.trim()}T23:59:59.000Z`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(editExpiry.trim()) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== editExpiry.trim()) {
        setEditError('Enter an expiration date in YYYY-MM-DD format.');
        return;
      }
      expiresAt = date.toISOString();
      if (date.getTime() <= Date.now()) {
        setEditError('Expiration date must be in the future.');
        return;
      }
    }
    if (!editingLink) return;
    if (editingLink.resourceType === 'profile' && !editIncludeProfile && !editIncludeProperties) {
      setEditError('Select profile details, a property group, or both.');
      return;
    }
    if (editingLink.resourceType === 'profile' && editIncludeProperties && editSelectedPropertyIds.length < 2 && editingLink.propertyIds != null) {
      setEditError('Select at least two active properties for this grouped link.');
      return;
    }
    if (editVisibility === 'protected' && editPasscode && !/^\d{6,12}$/.test(editPasscode)) {
      setEditError('Passcode must contain 6 to 12 digits.');
      return;
    }
    if (editVisibility === 'protected' && !editPasscode && editingLink.access !== 'Protected' && editingLink.access !== 'PIN protected') {
      setEditError('Enter a passcode for this protected link.');
      return;
    }
    setSavingEdit(true);
    setEditError(null);
    try {
      if (isMockMode) {
        setDemoLinks((current) => current.map((item) => item.id === editingLink.id ? {
          ...item, title, expiresAt, disclosures: editDisclosures,
          ...(item.resourceType === 'profile' ? { includeProfile: editIncludeProfile, includeProperties: editIncludeProperties, propertyIds: editIncludeProperties ? editSelectedPropertyIds : undefined, propertyDisclosures: editPropertyDisclosureOverrides, areaLabel: [editIncludeProfile ? 'Profile details' : '', editIncludeProperties ? `${editSelectedPropertyIds.length} selected properties` : ''].filter(Boolean).join(' · ') } : {}),
          access: editVisibility[0].toUpperCase() + editVisibility.slice(1) as AccessLabel,
          expiryLabel: expiresAt ? `Expires ${new Date(expiresAt).toLocaleDateString()}` : 'No expiration',
          status: 'active',
        } : item));
      } else {
        if (!auth?.accessToken) throw new Error('Sign in before editing a shared link.');
        if (editingLink.resourceType === 'profile') {
          const propertySelectionChanged = editingLink.propertyIds != null || editSelectedPropertyIds.length !== propertyOptions.length;
          await updateProfileShareLink(auth.accessToken, editingLink.id, { title, expires_at: expiresAt, include_profile: editIncludeProfile, include_properties: editIncludeProperties, ...(editIncludeProperties && propertySelectionChanged ? { property_ids: editSelectedPropertyIds } : {}), property_disclosures: editPropertyDisclosureOverrides, visibility: editVisibility as 'protected' | 'unlisted', ...(editPasscode ? { passcode: editPasscode } : {}) });
        } else {
          if (!editingLink.propertyId) throw new Error('Property details are unavailable for this share link.');
          await preparePropertyAssetsForShare(auth.accessToken, editingLink.propertyId, editDisclosures);
          await updatePropertyShareLink(auth.accessToken, editingLink.id, { title, expires_at: expiresAt, disclosures: editDisclosures, visibility: editVisibility, ...(editPasscode ? { passcode: editPasscode } : {}) });
        }
        await queryClient.invalidateQueries({ queryKey: ['backend', 'shared-links'] });
      }
      setEditingLink(null);
      showToast('Shared link updated.', 'success');
    } catch (error) {
      setEditError(getApiErrorMessage(error, 'Could not update this shared link.'));
    } finally {
      setSavingEdit(false);
    }
  };

  const confirmDeleteLink = (link: MockSharedLink) => {
    const message = `“${link.title}” will stop working for anyone you shared it with.`;
    if (Platform.OS === 'web') {
      if (globalThis.confirm?.(`Delete shared link? ${message}`)) void deleteLink(link);
      return;
    }
    Alert.alert('Delete shared link?', message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
        void deleteLink(link);
      } },
    ]);
  };

  const menuItems = (link: MockSharedLink): OverflowMenuItem[] => link.resourceType === 'profile' ? [
    { id: 'share', label: 'Share profile link', icon: 'share', onPress: () => void shareLink(link.shortUrl) },
    { id: 'copy', label: 'Copy link', icon: 'content_copy', onPress: () => void copyLink(link.shortUrl) },
    { id: 'edit-profile', label: 'Edit profile link', icon: 'edit', onPress: () => openEditLink(link) },
    { id: 'delete-divider', kind: 'separator' },
    { id: 'delete', label: 'Revoke profile link', icon: 'delete', tone: 'danger', onPress: () => confirmDeleteLink(link) },
  ] : isMockMode ? [
    { id: 'share', label: 'Share link', icon: 'share', onPress: () => void shareLink(link.shortUrl) },
    { id: 'copy', label: 'Copy link', icon: 'content_copy', onPress: () => void copyLink(link.shortUrl) },
    { id: 'link-actions-divider', kind: 'separator' },
    {
      id: 'edit',
      label: 'Edit',
      icon: 'edit',
      onPress: () => openEditLink(link),
    },
    { id: 'poster', label: 'Generate poster', icon: 'photo_camera', onPress: () => showToast('Poster generation is not available yet.', 'info') },
    { id: 'actions-divider', kind: 'separator' },
    {
      id: 'toggle-status',
      label: link.status === 'active' ? 'Put on hold' : 'Reactivate link',
      icon: link.status === 'active' ? 'pause_circle' : 'play',
      tone: link.status === 'active' ? 'danger' : 'default',
      onPress: () => {
        setDemoLinks((current) => current.map((item) => item.id === link.id
          ? { ...item, status: item.status === 'active' ? 'expired' : 'active' }
          : item));
        showToast(link.status === 'active' ? 'Link put on hold.' : 'Link reactivated.', 'success');
      },
    },
    { id: 'delete-divider', kind: 'separator' },
    { id: 'delete', label: 'Delete link', icon: 'delete', tone: 'danger', onPress: () => confirmDeleteLink(link) },
  ] : [
    { id: 'share', label: 'Share link', icon: 'share', onPress: () => void shareLink(link.shortUrl) },
    { id: 'copy', label: 'Copy link', icon: 'content_copy', onPress: () => void copyLink(link.shortUrl) },
    { id: 'link-actions-divider', kind: 'separator' },
    { id: 'edit', label: 'Edit link', icon: 'edit', onPress: () => openEditLink(link) },
    { id: 'edit-property', label: 'Open property', icon: 'apartment', onPress: () => link.propertyId ? router.push({ pathname: '/properties/[id]', params: { id: link.propertyId } }) : showToast('Property details are unavailable.', 'info') },
    { id: 'poster', label: 'Generate poster', icon: 'photo_camera', onPress: () => showToast('Poster generation is not available yet.', 'info') },
    { id: 'delete-divider', kind: 'separator' },
    { id: 'delete', label: 'Delete link', icon: 'delete', tone: 'danger', onPress: () => confirmDeleteLink(link) },
  ];

  const filters: { id: LinkFilter; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: links.length },
    { id: 'active', label: 'Active', count: activeCount },
    { id: 'expired', label: 'Expired', count: expiredCount },
    { id: 'revoked', label: 'Revoked', count: revokedCount },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: Platform.OS === 'ios' ? colors.surface : colors.background }]} edges={['top']}>
      <AppHeader pageTitle="Shared Links" brandIcon="apartment" />
      <FlatList
        testID="shared-link-list"
        onLayout={(event) => setListWidth(event.nativeEvent.layout.width)}
        key={`shared-link-list-${columns}`}
        numColumns={columns}
        columnWrapperStyle={columns > 1 ? styles.gridRow : undefined}
        style={[styles.scroll, { backgroundColor: colors.background }]}
        contentContainerStyle={[styles.content, { paddingBottom: footerPadding }]}
        refreshControl={<RefreshControl
          refreshing={refreshing}
          onRefresh={() => void refreshSharedLinks()}
          tintColor={colors.accent}
          colors={[colors.accent]}
          accessibilityLabel="Refresh shared links"
        />}
        keyboardShouldPersistTaps="handled"
        data={!isMockMode && (backendLinks.isPending || backendLinks.isError) ? [] : filteredLinks}
        keyExtractor={(link) => link.id}
        initialNumToRender={4}
        maxToRenderPerBatch={4}
        windowSize={5}
        ListHeaderComponentStyle={styles.listWidth}
        ListHeaderComponent={<View style={styles.container}>
          <SearchFilterRow
            value={search}
            onChangeText={setSearch}
            placeholder="Search link title or property…"
            accessibilityLabel="Search shared links"
            filterActive={activeFilterCount > 0}
            filterButtonLabel="Filter options"
            onPressFilter={openFilterSheet}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
              {filters.map((item) => {
                const selected = linkFilters.status === item.id;
                return (
                  <Pressable
                    key={item.id}
                    accessibilityRole="button"
                    accessibilityLabel={`${item.label}, ${item.count}`}
                    accessibilityState={{ selected }}
                    onPress={() => setLinkFilters((current) => ({ ...current, status: item.id }))}
                    style={[styles.filter, { backgroundColor: selected ? colors.primary : colors.surface, borderColor: selected ? colors.primary : colors.border }]}>
                    <Text style={[styles.filterText, { color: selected ? colors.onPrimary : colors.textSecondary }]}>{item.label} ({item.count})</Text>
                  </Pressable>
                );
              })}
          </ScrollView>

          <Text accessibilityLiveRegion="polite" style={[styles.resultCount, { color: colors.textSecondary }]}>{!isMockMode && backendLinks.isPending ? 'Loading shared links…' : `${filteredLinks.length} ${filteredLinks.length === 1 ? 'link' : 'links'}`}</Text>
          {!isMockMode && backendLinks.isPending ? <LoadingSkeleton label="Loading shared link cards" style={styles.loadingLinks}>
            {[0, 1].map((item) => <View key={item} style={[styles.loadingLinkCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.loadingLinkTop}><SkeletonBlock style={styles.loadingThumbnail} /><View style={styles.loadingLinkIdentity}><SkeletonBlock style={styles.loadingTitleLine} /><SkeletonBlock style={styles.loadingMetaLine} /><SkeletonBlock style={styles.loadingMetaShort} /></View></View>
              <SkeletonBlock style={styles.loadingUrl} />
              <View style={styles.loadingDisclosures}><SkeletonBlock style={styles.loadingDisclosure} /><SkeletonBlock style={styles.loadingDisclosure} /><SkeletonBlock style={styles.loadingDisclosure} /><SkeletonBlock style={styles.loadingDisclosure} /></View>
            </View>)}
          </LoadingSkeleton> : null}
          {!isMockMode && backendLinks.isError ? <View style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.meta, { color: colors.textSecondary }]}>Shared links could not be loaded from the API.</Text><CoreButton label="Retry" onPress={() => void backendLinks.refetch()} /></View> : null}
          {!(!isMockMode && backendLinks.isError) && !(!isMockMode && backendLinks.isPending) && filteredLinks.length === 0 ? (
            <View style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>No links found</Text>
              <Text style={[styles.meta, { color: colors.textSecondary }]}>Try another search or filter.</Text>
            </View>
          ) : null}
        </View>}
        renderItem={({ item: link }) => (
          <View style={columns > 1 ? styles.gridItem : styles.listItem} testID="shared-link-card-list-item">
            <SharedLinkCard
              link={link}
              menuItems={menuItems(link)}
              onCopy={() => void copyLink(link.shortUrl)}
              onShare={() => void shareLink(link.shortUrl)}
              compact={windowWidth < 600}
          onOpenProperty={() => {
            if (link.resourceType === 'profile' && link.shortUrl) {
              const token = link.shortUrl.split('/').filter(Boolean).pop();
              if (token) router.push({ pathname: '/broker/[token]', params: { token } });
              return;
            }
                if (link.propertyId) {
                  router.push({ pathname: '/properties/[id]', params: { id: link.propertyId } });
                } else {
                  showToast(`${link.propertyName} details are not available in this demo.`, 'info');
                }
              }}
            />
          </View>
        )}
      />
      <FloatingActionButton
        accessibilityLabel="Create shared link"
        nativeTabs
        onPress={() => { void openCreateSheet(); }}
        testID="shared-links-create-fab"
      />
      <PlatformBottomSheet visible={createSheetVisible} onClose={() => setCreateSheetVisible(false)} snapPoints={['full']} testID="create-share-sheet">
        <View style={[styles.sheetHeader, Platform.OS === 'ios' && styles.sheetHeaderIos]}>
          <View style={styles.sheetHeaderCopy}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Generate Share Link</Text>
            <Text style={[styles.meta, { color: colors.textSecondary }]}>Share selected or all active properties.</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Close property selection" onPress={() => setCreateSheetVisible(false)} style={[styles.sheetClose, { backgroundColor: colors.surfaceContainer }]}><AppIcon name="close" size={18} color={colors.textSecondary} /></Pressable>
        </View>
        <ScrollView style={styles.propertyOptions} contentContainerStyle={styles.propertyOptionsContent} nestedScrollEnabled keyboardShouldPersistTaps="handled">
          <View style={styles.kindPicker}>
            {([{ id: 'specific', label: 'Specific properties' }, { id: 'everything', label: 'Everything' }] as const).map((option) => <Pressable key={option.id} accessibilityRole="button" accessibilityState={{ selected: createKind === option.id }} onPress={() => { setCreateKind(option.id); if (option.id === 'everything' && createVisibility === 'private') setCreateVisibility('unlisted'); setCreateError(null); }} style={[styles.kindOption, { backgroundColor: createKind === option.id ? colors.primary : colors.surface, borderColor: createKind === option.id ? colors.primary : colors.border }]}><Text style={[styles.meta, { color: createKind === option.id ? colors.onPrimary : colors.text }]}>{option.label}</Text></Pressable>)}
          </View>
          <CoreTextField label="Link name (optional)" accessibilityLabel="Link name (optional)" value={createTitle} onChangeText={setCreateTitle} maxLength={200} placeholder="e.g. South district listings" />
          <Text style={[styles.sectionLabel, { color: colors.text }]}>Access</Text>
          <AccessModePicker value={createVisibility} allowPrivate={createKind === 'specific' && createSelectedPropertyIds.length === 1} onChange={setCreateVisibility} />
          {createVisibility === 'protected' ? <CoreTextField label="Passcode" accessibilityLabel="Share link passcode" value={createPasscode} onChangeText={(value) => setCreatePasscode(value.replace(/\D/g, '').slice(0, 12))} keyboardType="number-pad" secureTextEntry maxLength={12} required helperText="Share this passcode separately." /> : null}
          <View style={[styles.profileShareOptions, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.profileOptionsHeading}><Text style={[styles.sectionLabel, { color: colors.text }]}>Link includes</Text>
              <Text style={[styles.meta, { color: colors.textSecondary }]}>{createKind === 'everything' ? `Broker profile + all ${propertyOptions.length} active ${propertyOptions.length === 1 ? 'property' : 'properties'}.` : createSelectedPropertyIds.length > 1 ? 'Broker profile + selected properties.' : 'Selected property only.'}</Text>
            </View>
            <Text style={[styles.sectionLabel, { color: colors.text }]}>What buyers can see</Text>
            <Text style={[styles.meta, { color: colors.textSecondary }]}>Applies to {createKind === 'everything' ? 'all active properties' : 'every selected property'}; adjust individual properties below.</Text>
            {profileDisclosureFields.map(({ key, label }) => <View key={key} style={[styles.disclosureSetting, { borderBottomColor: colors.divider }]}>
              <Text style={[styles.meta, styles.settingLabel, { color: colors.text }]}>{label}</Text>
              <Switch accessibilityLabel={`Common sharing: ${label}`} value={Boolean(createCommonDisclosures[key])} onValueChange={(value) => setCreateCommonDisclosureOverrides((current) => ({ ...current, [key]: value }))} trackColor={{ false: colors.toggleTrack, true: colors.accent }} thumbColor={createCommonDisclosures[key] ? colors.onPrimary : colors.surface} />
            </View>)}
          </View>
          {createKind === 'specific' ? <View style={styles.groupPicker}>
            <View style={styles.groupSelectionActions}>
              <Text style={[styles.meta, styles.selectionCount, { color: colors.textSecondary }]}>{createSelectedPropertyIds.length} selected</Text>
              <CoreButton label="Select all" variant="ghost" size="small" disabled={propertyOptions.length === 0 || createSelectedPropertyIds.length === propertyOptions.length} onPress={() => { setCreateSelectedPropertyIds(propertyOptions.map((property) => property.id)); if (propertyOptions.length !== 1 && createVisibility === 'private') setCreateVisibility('unlisted'); }} testID="select-all-active-properties" />
              <CoreButton label="Clear" variant="ghost" size="small" disabled={createSelectedPropertyIds.length === 0} onPress={() => setCreateSelectedPropertyIds([])} testID="clear-property-selection" />
            </View>
            {propertyOptions.map((property) => {
              const selected = createSelectedPropertyIds.includes(property.id);
              const expanded = createDisclosurePropertyExpanded === property.id;
              return <View key={property.id} style={styles.specificPropertyOption}>
                <View style={[styles.specificPropertyRow, { backgroundColor: selected ? colors.accentContainer : colors.surface, borderColor: selected ? colors.accent : colors.border }]}>
                <Pressable accessibilityRole="checkbox" accessibilityLabel={`Include ${property.title}`} accessibilityState={{ checked: selected }} onPress={() => {
                  const next = selected ? createSelectedPropertyIds.filter((id) => id !== property.id) : [...createSelectedPropertyIds, property.id];
                  setCreateSelectedPropertyIds(next);
                  if (next.length !== 1 && createVisibility === 'private') setCreateVisibility('unlisted');
                }} style={styles.specificPropertyCheckbox}>
                  <AppIcon name={selected ? 'check_box' : 'check_box_outline_blank'} size={20} color={selected ? colors.accent : colors.iconMuted} />
                  <View style={styles.profileFeatureCopy}><Text style={[styles.featureTitle, { color: colors.text }]}>{property.title}</Text><Text style={[styles.meta, { color: colors.textSecondary }]}>{[property.area, property.category, property.location].filter(Boolean).join(' · ')}</Text></View>
                </Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel={`Sharing options for ${property.title}`} accessibilityState={{ expanded }} disabled={!selected} onPress={() => setCreateDisclosurePropertyExpanded((current) => current === property.id ? null : property.id)} style={styles.specificPropertyExpand}>
                    <AppIcon name="expand_more" size={21} color={selected ? colors.textSecondary : colors.iconMuted} style={expanded ? styles.expandedDisclosureIcon : undefined} />
                  </Pressable>
                </View>
                {selected && expanded ? <PropertyDisclosureOptions inline properties={[property]} defaults={createCommonDisclosures} overrides={createPropertyDisclosureOverrides} expandedPropertyId={property.id} onToggle={() => undefined} onChange={updateCreatePropertyDisclosure} /> : null}
              </View>;
            })}
            {!isMockMode && propertiesQuery.isPending ? <Text style={[styles.meta, { color: colors.textSecondary }]}>Loading available properties…</Text> : null}
            {!isMockMode && propertiesQuery.isError ? <CoreButton label="Retry properties" variant="secondary" onPress={() => void propertiesQuery.refetch()} /> : null}
            {!propertiesQuery.isPending && !propertiesQuery.isError && propertyOptions.length === 0 ? <View style={styles.noProperties}><Text style={[styles.cardTitle, { color: colors.text }]}>No available properties</Text><Text style={[styles.meta, { color: colors.textSecondary }]}>Publish an active property before creating a share link.</Text><CoreButton label="Add property" leadingIcon="add" onPress={() => { setCreateSheetVisible(false); router.push('/properties/create'); }} /></View> : null}
          </View> : null}
          <CoreDatePickerField label="Expiration (optional)" accessibilityLabel="New link expiration date" value={createExpiry} onChange={setCreateExpiry} clearable helperText="Expires at the end of the selected UTC day." testID="new-link-expiry" />
          {createError ? <Text accessibilityRole="alert" style={[styles.meta, { color: colors.danger }]}>{createError}</Text> : null}
        </ScrollView>
        <View style={[styles.profileShareFooter, { backgroundColor: colors.surface, borderTopColor: colors.divider }]}>
          <CoreButton label={creatingForProperty === 'unified' ? 'Creating share link…' : 'Create share link'} leadingIcon="share" disabled={creatingForProperty !== null || (createKind === 'specific' && createSelectedPropertyIds.length === 0) || (createKind === 'everything' && propertyOptions.length === 0)} loading={creatingForProperty === 'unified'} onPress={() => void createUnifiedShareLink()} testID="create-unified-share-link" />
        </View>
      </PlatformBottomSheet>
      <PlatformBottomSheet visible={editingLink !== null} onClose={() => setEditingLink(null)} testID="edit-share-sheet">
        <View style={styles.editSheet}>
          <View style={[styles.sheetHeader, Platform.OS === 'ios' && styles.sheetHeaderIos]}>
            <View style={styles.sheetHeaderCopy}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>{editingLink?.resourceType === 'profile' ? 'Edit profile link' : 'Edit shared link'}</Text>
              <Text style={[styles.meta, { color: colors.textSecondary }]}>{editingLink?.propertyName}</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Close edit shared link" onPress={() => setEditingLink(null)} style={[styles.sheetClose, { backgroundColor: colors.surfaceContainer }]}><AppIcon name="close" size={18} color={colors.textSecondary} /></Pressable>
          </View>
          <ScrollView style={styles.editScroll} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.editFields}>
            <CoreTextField label="Link title" accessibilityLabel="Shared link title" value={editTitle} onChangeText={setEditTitle} maxLength={200} />
            <CoreDatePickerField label="Expiration date" accessibilityLabel="Expiration date" value={editExpiry} onChange={setEditExpiry} clearable helperText="The link expires at the end of that day." testID="edit-link-expiry" />
          <Text style={[styles.sectionLabel, { color: colors.text }]}>Access</Text>
            {editingLink?.resourceType === 'profile' ? <View style={styles.kindPicker}>{(['unlisted', 'protected'] as const).map((visibility) => <Pressable key={visibility} accessibilityRole="button" accessibilityState={{ selected: editVisibility === visibility }} onPress={() => setEditVisibility(visibility)} style={[styles.kindOption, { backgroundColor: editVisibility === visibility ? colors.primary : colors.surface, borderColor: editVisibility === visibility ? colors.primary : colors.border }]}><Text style={[styles.meta, { color: editVisibility === visibility ? colors.onPrimary : colors.text }]}>{visibility === 'unlisted' ? 'Anyone with link' : 'Passcode protected'}</Text></Pressable>)}</View> : <AccessModePicker value={editVisibility} onChange={setEditVisibility} />}
            {editVisibility === 'protected' ? <CoreTextField label={editingLink?.access === 'Protected' || editingLink?.access === 'PIN protected' ? 'New passcode (optional)' : 'Passcode'} accessibilityLabel="Edit share link passcode" value={editPasscode} onChangeText={(value) => setEditPasscode(value.replace(/\D/g, '').slice(0, 12))} keyboardType="number-pad" secureTextEntry maxLength={12} helperText="Set a new 6 to 12 digit passcode, or leave blank to keep the current one." /> : null}
            {editingLink?.resourceType === 'profile' ? <>
              <Text style={[styles.sectionLabel, { color: colors.text }]}>What this link includes</Text>
              <View style={[styles.disclosureSetting, { borderBottomColor: colors.divider }]}><Text style={[styles.meta, styles.settingLabel, { color: colors.text }]}>Profile details</Text><Switch accessibilityLabel="Include profile details" value={editIncludeProfile} onValueChange={setEditIncludeProfile} trackColor={{ false: colors.toggleTrack, true: colors.accent }} thumbColor={editIncludeProfile ? colors.onPrimary : colors.surface} /></View>
              <View style={[styles.disclosureSetting, { borderBottomColor: colors.divider }]}><Text style={[styles.meta, styles.settingLabel, { color: colors.text }]}>Active property portfolio</Text><Switch accessibilityLabel="Include active property portfolio" value={editIncludeProperties} onValueChange={setEditIncludeProperties} trackColor={{ false: colors.toggleTrack, true: colors.accent }} thumbColor={editIncludeProperties ? colors.onPrimary : colors.surface} /></View>
              {editIncludeProperties ? <View style={styles.groupPicker}><Text style={[styles.meta, { color: colors.textSecondary }]}>Select at least two active properties ({editSelectedPropertyIds.length} selected).</Text>{propertyOptions.map((property) => { const selected = editSelectedPropertyIds.includes(property.id); return <Pressable key={property.id} accessibilityRole="checkbox" accessibilityLabel={`Include ${property.title} in group`} accessibilityState={{ checked: selected }} onPress={() => setEditSelectedPropertyIds((current) => selected ? current.filter((id) => id !== property.id) : [...current, property.id])} style={[styles.groupProperty, { borderColor: selected ? colors.accent : colors.border, backgroundColor: selected ? colors.accentContainer : colors.surface }]}><AppIcon name={selected ? 'check_box' : 'check_box_outline_blank'} size={20} color={selected ? colors.accent : colors.iconMuted} /><View style={styles.profileFeatureCopy}><Text style={[styles.featureTitle, { color: colors.text }]}>{property.title}</Text><Text style={[styles.meta, { color: colors.textSecondary }]}>{[property.area, property.category, property.location].filter(Boolean).join(' · ')}</Text></View></Pressable>; })}</View> : null}
              {editIncludeProperties && editSelectedPropertyIds.length ? <PropertyDisclosureOptions properties={propertyOptions.filter((property) => editSelectedPropertyIds.includes(property.id))} defaults={profilePropertyDisclosureDefaults} overrides={editPropertyDisclosureOverrides} expandedPropertyId={editDisclosurePropertyExpanded} onToggle={(id) => setEditDisclosurePropertyExpanded((current) => current === id ? null : id)} onChange={updateEditPropertyDisclosure} /> : null}
            </> : <>
              <Text style={[styles.sectionLabel, { color: colors.text }]}>What buyers can see</Text>
              {([
              ['show_name', 'Property name'], ['show_description', 'Description'], ['show_location', 'Approximate location'],
              ['show_specifications', 'Specifications'], ['show_price', 'Price'], ['show_exact_coordinates', 'Exact map location'],
              ['show_photos', 'Photos'], ['show_documents', 'Documents'], ['show_reports', 'Reports'], ['show_broker_contact', 'Broker contact details'], ['show_approach_roads', 'Approach road details'],
            ] as const).map(([key, label]) => <View key={key} style={[styles.disclosureSetting, { borderBottomColor: colors.divider }]}>
              <Text style={[styles.meta, styles.settingLabel, { color: colors.text }]}>{label}</Text>
              <Switch accessibilityLabel={label} value={editDisclosures[key]} onValueChange={(value) => setEditDisclosures((current) => ({ ...current, [key]: value }))} trackColor={{ false: colors.toggleTrack, true: colors.accent }} thumbColor={editDisclosures[key] ? colors.onPrimary : colors.surface} />
            </View>)}
            </>}
            {editError ? <Text accessibilityRole="alert" style={[styles.meta, { color: colors.danger }]}>{editError}</Text> : null}
          </ScrollView>
          <View style={[styles.editActions, { backgroundColor: colors.surface, borderTopColor: colors.divider }]}>
            <CoreButton label="Cancel" variant="secondary" disabled={savingEdit} onPress={() => setEditingLink(null)} style={styles.editAction} />
            <CoreButton label="Save changes" loading={savingEdit} onPress={() => void saveLinkEdit()} style={styles.editAction} testID="save-shared-link" />
          </View>
        </View>
      </PlatformBottomSheet>
      <FilterBottomSheet
        visible={filterSheetVisible}
        title="Filter Shared Links"
        activeCount={activeFilterCount}
        resultsCount={previewCount}
        onClose={() => setFilterSheetVisible(false)}
        onReset={() => setDraftFilters(defaultLinkFilters)}
        onApply={() => { setLinkFilters(draftFilters); setFilterSheetVisible(false); }}>
        <FilterOptionGroup title="Link Status">
          {filters.map((item) => <FilterChoice key={item.id} label={`${item.label} (${item.count})`} selected={draftFilters.status === item.id} onPress={() => setDraftFilters((current) => ({ ...current, status: item.id }))} />)}
        </FilterOptionGroup>
        <FilterOptionGroup title="Access Type">
          {(['All access', 'Private', 'Protected', 'Unlisted'] as const).map((access) => <FilterChoice key={access} label={access} selected={draftFilters.access === access} onPress={() => setDraftFilters((current) => ({ ...current, access }))} />)}
        </FilterOptionGroup>
        <FilterOptionGroup title="Sort Order">
          {(isMockMode ? ['Recently created', 'Most viewed'] as const : ['Recently created'] as const).map((sort) => <FilterChoice key={sort} label={sort} selected={draftFilters.sort === sort} onPress={() => setDraftFilters((current) => ({ ...current, sort }))} />)}
        </FilterOptionGroup>
      </FilterBottomSheet>
    </SafeAreaView>
  );
}

function asAbsoluteUrl(value: string) {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function formatRelativeCreatedAt(createdAt?: string, fallbackLabel?: string) {
  const timestamp = createdAt ? Date.parse(createdAt) : Number.NaN;
  if (!Number.isFinite(timestamp)) {
    const match = fallbackLabel?.match(/Created\s+(\d+)\s*([mhd])\s+ago/i);
    if (match) {
      const unit = match[2].toLowerCase() === 'm' ? 'min' : match[2].toLowerCase() === 'h' ? 'hr' : 'day';
      return `${match[1]} ${unit}${unit === 'day' && match[1] !== '1' ? 's' : ''} ago`;
    }
    return fallbackLabel?.replace(/^Created\s+/i, '') ?? '—';
  }

  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000));
  if (elapsedMinutes < 1) return 'Just now';
  if (elapsedMinutes < 60) return `${elapsedMinutes} min ago`;
  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `${elapsedHours} hr ago`;
  const elapsedDays = Math.floor(elapsedHours / 24);
  return `${elapsedDays} day${elapsedDays === 1 ? '' : 's'} ago`;
}

function AccessModePicker({ value, onChange, allowPrivate = true }: { value: ShareVisibility; onChange: (value: ShareVisibility) => void; allowPrivate?: boolean }) {
  const colors = useTheme();
  const modes: { value: ShareVisibility; title: string; detail: string }[] = [
    ...(allowPrivate ? [{ value: 'private' as const, title: 'Private', detail: 'Only you can open it' }] : []),
    { value: 'protected', title: 'Protected', detail: 'Requires your passcode' },
    { value: 'unlisted', title: 'Unlisted', detail: 'Anyone with the link can view' },
  ];
  return <View style={styles.accessModeGrid}>
    {modes.map((mode) => {
      const selected = value === mode.value;
      return <Pressable key={mode.value} accessibilityRole="button" accessibilityLabel={`${mode.title}: ${mode.detail}`} accessibilityState={{ selected }} onPress={() => onChange(mode.value)} style={[styles.accessMode, { backgroundColor: selected ? colors.accentContainer : colors.surfaceLow, borderColor: selected ? colors.accent : colors.border }]}>
        <Text style={[styles.accessModeTitle, { color: selected ? colors.onAccentContainer : colors.text }]}>{mode.title}</Text>
      </Pressable>;
    })}
  </View>;
}

function PropertyDisclosureOptions({ properties, defaults, overrides, expandedPropertyId, onToggle, onChange, inline = false }: {
  properties: ProfilePropertyOption[];
  defaults: ApiShareDisclosures;
  overrides: Record<string, Partial<ApiShareDisclosures>>;
  expandedPropertyId: string | null;
  onToggle: (propertyId: string) => void;
  onChange: (propertyId: string, key: ProfileDisclosureKey, value: boolean) => void;
  inline?: boolean;
}) {
  const colors = useTheme();
  return <View style={styles.profilePropertyDisclosures}>
    {!inline ? <Text style={[styles.sectionLabel, { color: colors.text }]}>Property sharing options</Text> : null}
    {properties.map((property) => {
      const expanded = expandedPropertyId === property.id;
      const custom = Boolean(overrides[property.id]);
      const effective = { ...defaults, ...overrides[property.id] };
      const fields = <View style={styles.profileDisclosureFields}>{profileDisclosureFields.map(({ key, label }) => <View key={key} style={[styles.disclosureSetting, { borderBottomColor: colors.divider }]}>
          <Text style={[styles.meta, styles.settingLabel, { color: colors.text }]}>{label}</Text>
          <Switch accessibilityLabel={`${property.title}: ${label}`} value={Boolean(effective[key])} onValueChange={(value) => onChange(property.id, key, value)} trackColor={{ false: colors.toggleTrack, true: colors.accent }} thumbColor={effective[key] ? colors.onPrimary : colors.surface} />
        </View>)}</View>;
      if (inline) return <View key={property.id} style={[styles.inlineDisclosureFields, { backgroundColor: colors.surfaceLow, borderColor: colors.border }]}>{fields}</View>;
      return <View key={property.id} style={[styles.profilePropertyDisclosure, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Choose what buyers can see for ${property.title}`} accessibilityState={{ expanded }} onPress={() => onToggle(property.id)} style={styles.profilePropertyDisclosureHeading}>
          <View style={styles.profileFeatureCopy}>
            <Text numberOfLines={2} style={[styles.featureTitle, { color: colors.text }]}>{property.title}</Text>
            <Text style={[styles.meta, { color: colors.textSecondary }]}>{custom ? 'Custom visibility settings' : 'Using sharing defaults'} · {expanded ? 'Hide options' : 'Choose options'}</Text>
          </View>
          <AppIcon name="expand_more" size={21} color={colors.textSecondary} style={expanded ? styles.expandedDisclosureIcon : undefined} />
        </Pressable>
        {expanded ? fields : null}
      </View>;
    })}
  </View>;
}

interface SharedLinkCardProps {
  link: MockSharedLink;
  menuItems: OverflowMenuItem[];
  onCopy: () => void;
  onShare: () => void;
  onOpenProperty: () => void;
  compact: boolean;
}

function SharedLinkCard({ link, menuItems, onCopy, onShare, onOpenProperty, compact }: SharedLinkCardProps) {
  const colors = useTheme();
  const active = link.status === 'active';
  const accessType = link.access === 'Private' ? 'Private' : link.access === 'Protected' || link.access === 'PIN protected' ? 'Protected' : 'Unlisted';
  const [failedImageUri, setFailedImageUri] = useState<string | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const openProperty = () => onOpenProperty();
  const showActions = () => {
    setMenuVisible(true);
  };

  return (
    <View testID="shared-link-card" style={[styles.card, compact && styles.compactCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.cardTop, compact && styles.compactCardTop]}>
        {link.imageUri && failedImageUri !== link.imageUri ? (
          <Image testID="shared-link-thumbnail" source={{ uri: link.imageUri }} accessibilityLabel={`${link.propertyName} property`} onError={() => setFailedImageUri(link.imageUri ?? null)} style={[styles.thumbnail, compact && styles.compactThumbnail]} />
        ) : (
          <View testID="shared-link-thumbnail" style={[styles.thumbnail, compact && styles.compactThumbnail, styles.thumbnailFallback, { backgroundColor: colors.surfaceContainer }]}>
            <Text numberOfLines={2} ellipsizeMode="tail" style={[styles.fallbackText, { color: colors.textSecondary }]}>{link.location}</Text>
          </View>
        )}
        <View style={styles.identity}>
          <View style={styles.cardStatusRow}>
            <View style={styles.cardBadges}>
              <StatusChip label={active ? 'Active' : link.status === 'revoked' ? 'Revoked' : 'Expired'} tone={active ? 'success' : 'neutral'} />
              <StatusChip label={accessType} accessibilityLabel={`Access type: ${accessType}`} tone="info" icon="lock" />
            </View>
            <View style={styles.cardHeaderActions}>
              <Pressable accessibilityRole="button" accessibilityLabel={`Share ${link.title}`} onPress={onShare} style={[styles.shareAction, { backgroundColor: colors.surfaceLow }]}>
                <AppIcon name="share" size={18} color={colors.accent} />
              </Pressable>
              <OverflowMenu items={menuItems} visible={menuVisible} onVisibleChange={setMenuVisible} accessibilityLabel={`Actions for ${link.title}`} />
            </View>
          </View>
          <Pressable testID="shared-link-title-action" accessibilityRole="button" accessibilityLabel={`Open ${link.propertyName}`} accessibilityHint="Long press for shared link actions" delayLongPress={450} onLongPress={showActions} onPress={openProperty}>
            <Text numberOfLines={2} ellipsizeMode="tail" style={[styles.cardTitle, { color: colors.text }]}>{link.title}</Text>
            <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.meta, { color: colors.textSecondary }]}>{link.propertyName} · {link.location}</Text>
          </Pressable>
          <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.area, { color: colors.textSecondary }]}>{link.areaLabel}</Text>
        </View>
      </View>

      {!compact ? <View style={[styles.urlStrip, { backgroundColor: colors.surfaceLow }]}>
        <View style={styles.urlTextGroup}>
        <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.urlText, { color: link.shortUrl ? colors.text : colors.textSecondary }]}>{link.shortUrl ?? 'URL unavailable · generate a replacement link'}</Text>
        </View>
        <CoreButton label="Copy" accessibilityLabel={`Copy ${link.title} URL`} leadingIcon="content_copy" variant="secondary" size="small" onPress={onCopy} />
      </View> : null}

      <View style={styles.analytics}>
        <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.analyticsText, styles.meta, { color: colors.textSecondary }]}>{[link.views != null ? `${link.views} views` : null, link.expiryLabel].filter(Boolean).join(' · ')}</Text>
        <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.analyticsText, styles.createdTime, { color: colors.textSecondary }]}>{formatRelativeCreatedAt(link.createdAt, link.createdLabel)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: Spacing.three, paddingTop: Spacing.three, alignItems: 'stretch' },
  container: { width: '100%', maxWidth: WideContentMaxWidth, gap: Spacing.three },
  listWidth: { width: '100%', maxWidth: WideContentMaxWidth, minWidth: 0, alignSelf: 'flex-start' },
  listItem: { width: '100%', maxWidth: WideContentMaxWidth, minWidth: 0, alignSelf: 'flex-start', marginTop: Spacing.three },
  gridRow: { width: '100%', maxWidth: WideContentMaxWidth, alignSelf: 'flex-start', gap: Spacing.three },
  gridItem: { flex: 1, minWidth: 0, marginTop: Spacing.three },
  filters: { gap: Spacing.two, paddingVertical: Spacing.one },
  filter: { minHeight: 32, paddingHorizontal: Spacing.three, borderRadius: Radius.pill, justifyContent: 'center' },
  filterText: { ...Typography.labelSmall },
  resultCount: { ...Typography.bodySmall },
  loadingLinks: { gap: Spacing.three },
  loadingLinkCard: { width: '100%', padding: Spacing.three, borderRadius: Radius.card, borderWidth: StyleSheet.hairlineWidth, gap: Spacing.three },
  loadingLinkTop: { flexDirection: 'row', gap: Spacing.two },
  loadingThumbnail: { width: 76, height: 76, borderRadius: Radius.medium },
  loadingLinkIdentity: { flex: 1, justifyContent: 'center', gap: Spacing.one },
  loadingTitleLine: { width: '78%', height: 18 },
  loadingMetaLine: { width: '55%', height: 12 },
  loadingMetaShort: { width: '38%', height: 12 },
  loadingUrl: { width: '100%', height: 46, borderRadius: Radius.medium },
  loadingDisclosures: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  loadingDisclosure: { flexGrow: 1, flexBasis: '45%', height: 45, borderRadius: Radius.small },
  notice: { ...Typography.bodySmall },
  card: { width: '100%', minWidth: 0, padding: Spacing.three, borderRadius: Radius.card, gap: Spacing.two },
  compactCard: { padding: Spacing.two, gap: Spacing.one },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  compactCardTop: { alignItems: 'stretch' },
  thumbnail: { width: 76, height: 76, borderRadius: Radius.medium, flexShrink: 0 },
  compactThumbnail: { width: 60, height: undefined, alignSelf: 'stretch' },
  thumbnailFallback: { alignItems: 'center', justifyContent: 'center', padding: Spacing.two },
  fallbackText: { ...Typography.labelSmall, textAlign: 'center' },
  identity: { flex: 1, minWidth: 0, gap: Spacing.one },
  cardStatusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.one },
  cardBadges: { flex: 1, minWidth: 0, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.one },
  cardHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  shareAction: { width: 40, height: 40, borderRadius: Radius.small, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { ...Typography.title },
  meta: { ...Typography.bodySmall },
  area: { ...Typography.labelSmall },
  urlStrip: { minHeight: 48, paddingHorizontal: Spacing.two, paddingVertical: Spacing.one, borderRadius: Radius.medium, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  urlTextGroup: { flex: 1, minWidth: 0 },
  urlText: { ...Typography.bodySmall },
  analytics: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.one },
  analyticsText: { flexShrink: 1, minWidth: 0 },
  createdTime: { ...Typography.bodySmall, fontWeight: '600' },
  empty: { width: '100%', padding: Spacing.four, borderRadius: Radius.card, gap: Spacing.one },
  sheetHeader: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  sheetHeaderIos: { paddingTop: Spacing.four, paddingBottom: Spacing.three },
  sheetHeaderCopy: { flex: 1, minWidth: 0, gap: Spacing.one },
  sheetClose: { width: 36, height: 36, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  propertyOptions: { flex: 1 },
  propertyOptionsContent: { padding: Spacing.three, paddingTop: Spacing.one, paddingBottom: Spacing.four, gap: Spacing.two },
  kindPicker: { flexDirection: 'row', gap: Spacing.two },
  kindOption: { flex: 1, minHeight: 44, paddingHorizontal: Spacing.two, borderRadius: Radius.medium, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  profileShareOptions: { borderRadius: Radius.card, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.three, gap: Spacing.two },
  profileOptionsHeading: { gap: Spacing.one },
  profileFeature: { minHeight: 88, flexDirection: 'row', alignItems: 'center', gap: Spacing.two, padding: Spacing.two, borderRadius: Radius.medium },
  profileFeatureIcon: { width: 36, height: 36, borderRadius: Radius.small, alignItems: 'center', justifyContent: 'center' },
  profileFeatureCopy: { flex: 1, minWidth: 0, gap: Spacing.half },
  profilePropertyDisclosures: { gap: Spacing.one },
  groupPicker: { gap: Spacing.one },
  groupSelectionActions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
  selectionCount: { flex: 1, alignSelf: 'center' },
  specificPropertyOption: { gap: Spacing.one },
  specificPropertyRow: { minHeight: 66, borderRadius: Radius.medium, borderWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
  specificPropertyCheckbox: { flex: 1, minWidth: 0, minHeight: 64, paddingHorizontal: Spacing.two, paddingVertical: Spacing.one, flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  specificPropertyExpand: { width: 44, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' },
  groupProperty: { minHeight: 64, borderWidth: StyleSheet.hairlineWidth, borderRadius: Radius.medium, paddingHorizontal: Spacing.two, paddingVertical: Spacing.one, flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  profilePropertyDisclosure: { borderWidth: StyleSheet.hairlineWidth, borderRadius: Radius.medium, overflow: 'hidden' },
  profilePropertyDisclosureHeading: { minHeight: 64, paddingHorizontal: Spacing.two, paddingVertical: Spacing.one, flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  profileDisclosureFields: { paddingHorizontal: Spacing.two },
  inlineDisclosureFields: { borderWidth: StyleSheet.hairlineWidth, borderRadius: Radius.medium, paddingHorizontal: Spacing.two },
  expandedDisclosureIcon: { transform: [{ rotate: '180deg' }] },
  featureTitle: { ...Typography.label },
  profilePrivacyNote: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.one, padding: Spacing.two, borderRadius: Radius.medium },
  profilePrivacyCopy: { flex: 1 },
  profileShareFooter: { paddingHorizontal: Spacing.three, paddingTop: Spacing.two, paddingBottom: Spacing.three, borderTopWidth: StyleSheet.hairlineWidth, gap: Spacing.two },
  editSheet: { flex: 1, width: '100%', minHeight: 0 },
  editScroll: { flex: 1, minHeight: 0 },
  editFields: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.four, gap: Spacing.three },
  sectionLabel: { ...Typography.title },
  accessModeGrid: { flexDirection: 'row', gap: Spacing.one },
  accessMode: { flex: 1, minWidth: 0, minHeight: 42, borderWidth: StyleSheet.hairlineWidth, borderRadius: Radius.medium, paddingHorizontal: Spacing.one, alignItems: 'center', justifyContent: 'center' },
  accessModeTitle: { ...Typography.label, textAlign: 'center' },
  disclosureSetting: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, gap: Spacing.two },
  settingLabel: { flex: 1 },
  editActions: { flexDirection: 'row', gap: Spacing.two, paddingHorizontal: Spacing.three, paddingTop: Spacing.two, paddingBottom: Spacing.three, borderTopWidth: StyleSheet.hairlineWidth },
  editAction: { flex: 1 },
  propertyOption: { padding: Spacing.three, borderRadius: Radius.card, borderWidth: StyleSheet.hairlineWidth, gap: Spacing.two },
  propertyOptionTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: Spacing.two },
  propertyOptionIdentity: { flex: 1, minWidth: 0, gap: Spacing.half },
  propertyOptionFooter: { paddingTop: Spacing.two, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: Spacing.two },
  protectionLabel: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  noProperties: { paddingVertical: Spacing.four, alignItems: 'flex-start', gap: Spacing.two },
});
