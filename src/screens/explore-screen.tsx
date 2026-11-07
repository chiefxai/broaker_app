import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Platform, Alert, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { LocalizedText as Text } from '@/i18n/LocalizedText';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/core/navigation/AppHeader';
import { FilterBottomSheet, FilterChoice, FilterOptionGroup } from '@/components/core/forms/FilterBottomSheet';
import { FloatingActionButton } from '@/components/core/FloatingActionButton';
import { PropertyCard } from '@/components/core/PropertyCard';
import { SearchFilterRow } from '@/components/core/forms/SearchFilterRow';
import { PlatformBottomSheet } from '@/components/core/navigation/PlatformBottomSheet';
import type { OverflowMenuItem } from '@/components/core/navigation/OverflowMenu.types';
import { isMockMode } from '@/data/app-mode';
import { useDeleteProperty, useLocalProperties } from '@/data/database';
import type { LocalProperty } from '@/data/mock/properties';
import { Spacing, Typography, WideContentMaxWidth } from '@/theme/tokens';
import { useTheme } from '@/theme/theme-provider';
import { useFooterContentPadding } from '@/theme/use-footer-inset';
import { useToast } from '@/components/core/toast/ToastProvider';

type PropertyFilters = { status: string; category: string; price: string; size: string; sort: string };
const defaultFilters: PropertyFilters = { status: 'All', category: 'All Types', price: 'Any price', size: 'All sizes', sort: 'Recently Added' };
const priceOptions = ['Any price', 'Under ₹15L', '₹15L – ₹30L', '₹30L – ₹50L', '₹50L+'];
const sizeOptions = ['All sizes', '< 50 cents', '50 – 150 cents', '1.5 – 5 acres', '5+ acres'];
const sortOptions = ['Recently Added', 'Price: Low to High', 'Price: High to Low', 'Extent (Largest)'];
const minimumGridCardWidth = 280;

function getPropertyGridLayout(availableWidth: number) {
  const contentWidth = Math.max(0, Math.min(availableWidth, WideContentMaxWidth) - Spacing.three * 2);
  const columns = Math.max(1, Math.floor((contentWidth + Spacing.three) / (minimumGridCardWidth + Spacing.three)));
  const cardWidth = columns === 1 ? contentWidth : (contentWidth - Spacing.three * (columns - 1)) / columns;
  return { columns, cardWidth };
}

function matchesFilters(property: LocalProperty, filters: PropertyFilters) {
  if (filters.status !== 'All' && property.status.label.toLocaleLowerCase() !== filters.status.toLocaleLowerCase()) return false;
  if (filters.category !== 'All Types' && property.categoryLabel !== filters.category) return false;
  if (filters.price !== 'Any price') {
    const price = property.priceInr;
    if (price == null) return false;
    if (filters.price === 'Under ₹15L' && price >= 1_500_000) return false;
    if (filters.price === '₹15L – ₹30L' && (price < 1_500_000 || price > 3_000_000)) return false;
    if (filters.price === '₹30L – ₹50L' && (price < 3_000_000 || price > 5_000_000)) return false;
    if (filters.price === '₹50L+' && price < 5_000_000) return false;
  }
  if (filters.size !== 'All sizes') {
    if (!property.area) return false;
    const area = property.area.value * (property.area.unit.toLocaleLowerCase().startsWith('acre') ? 100 : 1);
    if (filters.size === '< 50 cents' && area >= 50) return false;
    if (filters.size === '50 – 150 cents' && (area < 50 || area > 150)) return false;
    if (filters.size === '1.5 – 5 acres' && (area < 150 || area > 500)) return false;
    if (filters.size === '5+ acres' && area < 500) return false;
  }
  return true;
}

export default function ExploreScreen() {
  const footerPadding = useFooterContentPadding(true, true);
  const colors = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const [listWidth, setListWidth] = useState(0);
  // The desktop sidebar takes space away from the list, so choose columns from
  // the list's measured width rather than the overall browser window.
  const { columns, cardWidth } = getPropertyGridLayout(listWidth || windowWidth);
  const deleteProperty = useDeleteProperty();
  const { showToast } = useToast();
  const { data = [], isPending, isError, refetch } = useLocalProperties();
  const [refreshing, setRefreshing] = useState(false);
  const [shareOptionsPropertyId, setShareOptionsPropertyId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [filters, setFilters] = useState<PropertyFilters>(defaultFilters);
  const [draftFilters, setDraftFilters] = useState<PropertyFilters>(defaultFilters);
  const statusFilters = isMockMode ? ['All', 'Available', 'Hold', 'Dealing', 'Sold'] : ['All', 'Draft', 'Active', 'Archived'];
  const categories = ['All Types', ...new Set(data.map((property) => property.categoryLabel))];
  const statusCounts = data.reduce<Record<string, number>>((counts, property) => {
    counts[property.status.label] = (counts[property.status.label] ?? 0) + 1;
    return counts;
  }, {});
  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return data.filter((property) => {
      const matchesQuery = !query || `${property.title} ${property.location ?? ''} ${property.categoryLabel} ${property.referenceCode ?? ''}`.toLocaleLowerCase().includes(query);
      return matchesQuery && matchesFilters(property, filters);
    });
  }, [data, search, filters]);
  const sorted = useMemo(() => {
    const items = [...filtered];
    if (filters.sort === 'Price: Low to High') items.sort((a, b) => (a.priceInr ?? Infinity) - (b.priceInr ?? Infinity));
    if (filters.sort === 'Price: High to Low') items.sort((a, b) => (b.priceInr ?? -1) - (a.priceInr ?? -1));
    if (filters.sort === 'Extent (Largest)') items.sort((a, b) => (b.area?.value ?? 0) - (a.area?.value ?? 0));
    return items;
  }, [filtered, filters.sort]);
  const activeFilterCount = Object.keys(defaultFilters).filter((key) => filters[key as keyof PropertyFilters] !== defaultFilters[key as keyof PropertyFilters]).length;
  const previewCount = data.filter((property) => matchesFilters(property, draftFilters)
    && (!search.trim() || `${property.title} ${property.location ?? ''} ${property.categoryLabel} ${property.referenceCode ?? ''}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))).length;

  const openFilters = () => {
    setDraftFilters(filters);
    setFiltersVisible(true);
  };

  const refreshProperties = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: Platform.OS === 'ios' ? colors.surface : colors.background }]} edges={['top']}>
      <AppHeader pageTitle="Properties" brandIcon="apartment" />
      <FlatList
        testID="property-list"
        onLayout={(event) => setListWidth(event.nativeEvent.layout.width)}
        key={`property-list-${columns}`}
        numColumns={columns}
        columnWrapperStyle={columns > 1 ? styles.gridRow : undefined}
        style={[styles.scroll, { backgroundColor: colors.background }]}
        contentContainerStyle={[styles.content, { paddingBottom: footerPadding }]}
        refreshControl={<RefreshControl
          refreshing={refreshing}
          onRefresh={() => void refreshProperties()}
          tintColor={colors.accent}
          colors={[colors.accent]}
          accessibilityLabel="Refresh properties"
        />}
        keyboardShouldPersistTaps="handled"
        data={isPending || isError ? [] : sorted}
        keyExtractor={(property) => property.id}
        initialNumToRender={4}
        maxToRenderPerBatch={4}
        windowSize={5}
        ListHeaderComponentStyle={styles.listWidth}
        ListHeaderComponent={<View style={styles.container}>
          <SearchFilterRow
            value={search}
            onChangeText={setSearch}
            placeholder="Search title, district, or reference..."
            accessibilityLabel="Search properties"
            testID="property-search"
            filterActive={activeFilterCount > 0}
            filterButtonLabel="Filter options"
            onPressFilter={openFilters}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters} accessibilityLabel="Property status and category filters">
              {statusFilters.map((filter) => {
                const selected = filters.status === filter;
                const count = filter === 'All' ? data.length : statusCounts[filter];
                return (
                  <Pressable
                    key={filter}
                    accessibilityRole="button"
                    accessibilityLabel={`${filter} properties${count === undefined ? '' : `, ${count}`}`}
                    accessibilityState={{ selected }}
                    onPress={() => setFilters((current) => ({ ...current, status: filter }))}
                    style={[styles.filterChip, { backgroundColor: selected ? colors.primary : colors.surfaceContainer, borderColor: selected ? colors.primary : colors.border }]}>
                    <Text style={[styles.filterText, { color: selected ? colors.onPrimary : colors.textSecondary }]}>{filter}{count === undefined ? '' : ` (${count})`}</Text>
                  </Pressable>
                );
              })}
              <View style={[styles.separator, { backgroundColor: colors.divider }]} />
              {categories.slice(1).map((category) => {
                const selected = filters.category === category;
                return <Pressable key={category} accessibilityRole="button" accessibilityLabel={`${category} category`} accessibilityState={{ selected }} onPress={() => setFilters((current) => ({ ...current, category: selected ? 'All Types' : category }))} style={[styles.filterChip, { backgroundColor: selected ? colors.accentContainer : colors.surface, borderColor: selected ? colors.accent : colors.border }]}><Text style={[styles.filterText, { color: selected ? colors.onAccentContainer : colors.textSecondary }]}>{category}</Text></Pressable>;
              })}
          </ScrollView>
          {isPending ? <PropertyCard state="loading" /> : null}
          {isError ? <PropertyCard state="error" errorMessage={isMockMode ? 'Properties could not be loaded from this device.' : 'Properties could not be loaded from the API.'} onRetry={() => void refetch()} /> : null}
          {!isPending && !isError && sorted.length === 0 ? (
            <View style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>{search.trim() || activeFilterCount > 0 ? 'No matching properties' : 'No properties saved'}</Text>
              <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>{search.trim() || activeFilterCount > 0 ? 'Try another search term or filter.' : 'Saved properties will appear here.'}</Text>
            </View>
          ) : null}
        </View>}
        renderItem={({ item: property }) => (
            <View testID="property-list-item" style={[styles.listItem, columns > 1 && styles.gridItem, columns > 1 && { width: cardWidth }]}>
              <PropertyCard
                property={property}
                compact={windowWidth < 600}
                onOpenProperty={() => router.push({ pathname: '/properties/[id]', params: { id: property.id } })}
                onShare={() => setShareOptionsPropertyId(property.id)}
                menuItems={[
                  { id: 'share-property', label: 'Share property', icon: 'share', onPress: () => setShareOptionsPropertyId(property.id) },
                  { id: 'open', label: 'Open property', icon: 'open_in_new', onPress: () => router.push({ pathname: '/properties/[id]', params: { id: property.id } }) },
                  { id: 'edit', label: 'Edit property', icon: 'edit', onPress: () => router.push({ pathname: '/properties/create', params: { propertyId: property.id } }) },
                  ...(property.referenceCode ? [{ id: 'copy-reference', label: 'Copy reference code', icon: 'content_copy' as const, onPress: () => {
                    void Clipboard.setStringAsync(property.referenceCode ?? '')
                      .then(() => showToast('Reference code copied.', 'success'))
                      .catch(() => showToast('Could not copy the reference code.', 'error'));
                  } }] : []),
                  { id: 'property-actions-divider', kind: 'separator' },
                  { id: 'delete', label: property.status.label.toLowerCase() === 'draft' ? 'Delete draft' : 'Archive property', icon: property.status.label.toLowerCase() === 'draft' ? 'delete' : 'pause_circle', tone: property.status.label.toLowerCase() === 'draft' ? 'danger' : 'default', onPress: () => Alert.alert(property.status.label.toLowerCase() === 'draft' ? 'Delete draft?' : 'Archive property?', `“${property.title}” will be ${property.status.label.toLowerCase() === 'draft' ? 'permanently deleted' : 'archived'}.`, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: property.status.label.toLowerCase() === 'draft' ? 'Delete' : 'Archive', style: 'destructive', onPress: () => void deleteProperty(property.id, property.status.label).then(() => showToast(property.status.label.toLowerCase() === 'draft' ? 'Draft deleted.' : 'Property archived.', 'success')).catch((error: unknown) => showToast(error instanceof Error ? error.message : 'Could not update property.', 'error')) },
                  ]) },
                ] as OverflowMenuItem[]}
              />
            </View>
          )}
      />
      <FloatingActionButton
        accessibilityLabel="Add property"
        nativeTabs
        onPress={() => router.push('/properties/create')}
        testID="properties-add-fab"
      />
      <PlatformBottomSheet visible={shareOptionsPropertyId !== null} onClose={() => setShareOptionsPropertyId(null)} snapPoints={['half']} testID="property-share-options">
        <View style={[styles.shareOptions, { backgroundColor: colors.surface }]}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Share property</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Share" onPress={() => { setShareOptionsPropertyId(null); router.push('/shared-links'); }} style={[styles.shareOption, { backgroundColor: colors.surfaceContainer }]}>
            <Text style={[styles.filterText, { color: colors.text }]}>Share</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Generate and share" onPress={() => {
            if (!shareOptionsPropertyId) return;
            router.push({ pathname: '/shared-links', params: { generatePropertyId: shareOptionsPropertyId, shareAfterCreate: 'true' } });
            setShareOptionsPropertyId(null);
          }} style={[styles.shareOption, { backgroundColor: colors.primary }]}>
            <Text style={[styles.filterText, { color: colors.onPrimary }]}>Generate and share</Text>
          </Pressable>
        </View>
      </PlatformBottomSheet>
      <FilterBottomSheet
        visible={filtersVisible}
        title="Filter Properties"
        activeCount={activeFilterCount}
        resultsCount={previewCount}
        onClose={() => setFiltersVisible(false)}
        onReset={() => setDraftFilters(defaultFilters)}
        onApply={() => { setFilters(draftFilters); setFiltersVisible(false); }}>
        <FilterOptionGroup title="Property Category">
          {categories.map((category) => <FilterChoice key={category} label={category} selected={draftFilters.category === category} onPress={() => setDraftFilters((current) => ({ ...current, category }))} />)}
        </FilterOptionGroup>
        <FilterOptionGroup title="Price Range">
          {priceOptions.map((price) => <FilterChoice key={price} label={price} selected={draftFilters.price === price} onPress={() => setDraftFilters((current) => ({ ...current, price }))} />)}
        </FilterOptionGroup>
        <FilterOptionGroup title="Extent / Size">
          {sizeOptions.map((size) => <FilterChoice key={size} label={size} selected={draftFilters.size === size} onPress={() => setDraftFilters((current) => ({ ...current, size }))} />)}
        </FilterOptionGroup>
        <FilterOptionGroup title="Listing Status">
          {statusFilters.map((status) => <FilterChoice key={status} label={status} selected={draftFilters.status === status} onPress={() => setDraftFilters((current) => ({ ...current, status }))} />)}
        </FilterOptionGroup>
        <FilterOptionGroup title="Sort Order">
          {sortOptions.map((sort) => <FilterChoice key={sort} label={sort} selected={draftFilters.sort === sort} onPress={() => setDraftFilters((current) => ({ ...current, sort }))} />)}
        </FilterOptionGroup>
      </FilterBottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: Spacing.three, paddingTop: Spacing.three, alignItems: 'stretch' },
  container: { width: '100%', maxWidth: WideContentMaxWidth, gap: Spacing.three },
  count: { ...Typography.bodySmall },
  filters: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.one },
  filterChip: { minHeight: 36, borderRadius: 999, paddingHorizontal: Spacing.three, alignItems: 'center', justifyContent: 'center' },
  filterText: { ...Typography.labelSmall },
  separator: { width: StyleSheet.hairlineWidth, height: 22, marginHorizontal: Spacing.one },
  listWidth: { width: '100%', maxWidth: WideContentMaxWidth, alignSelf: 'flex-start' },
  shareOptions: { width: '100%', maxWidth: WideContentMaxWidth, alignSelf: 'center', padding: Spacing.four, gap: Spacing.two },
  shareOption: { minHeight: 48, borderRadius: 14, paddingHorizontal: Spacing.three, justifyContent: 'center' },
  listItem: { width: '100%', minWidth: 0, marginTop: Spacing.three },
  gridRow: { width: '100%', maxWidth: WideContentMaxWidth, alignSelf: 'flex-start', gap: Spacing.three },
  gridItem: { flexGrow: 0, flexShrink: 1, minWidth: 0 },
  empty: { borderRadius: 16, padding: Spacing.four, gap: Spacing.one },
  emptyTitle: { ...Typography.title },
  emptyBody: { ...Typography.bodySmall },
});
