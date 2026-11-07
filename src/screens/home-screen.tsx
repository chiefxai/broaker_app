import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { LocalizedText as Text } from '@/i18n/LocalizedText';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useBackendDashboard } from '@/api/backend-hooks';
import { ActionCalloutCard } from '@/components/core/ActionCalloutCard';
import { AppHeader } from '@/components/core/navigation/AppHeader';
import { PlatformBottomSheet } from '@/components/core/navigation/PlatformBottomSheet';
import { CoreButton } from '@/components/core/CoreButton';
import { PortfolioKpiCard } from '@/components/core/PortfolioKpiCard';
import { PropertyCard } from '@/components/core/PropertyCard';
import { SyncStatusCard } from '@/components/core/SyncStatusCard';
import type { OverflowMenuItem } from '@/components/core/navigation/OverflowMenu.types';
import { useDeleteProperty, useLocalProperties } from '@/data/database';
import { isMockMode } from '@/data/app-mode';
import { MaxContentWidth, Radius, Spacing, Typography, WideContentMaxWidth, WideLayoutBreakpoint } from '@/theme/tokens';
import { useTheme } from '@/theme/theme-provider';
import { useFooterContentPadding } from '@/theme/use-footer-inset';
import { useToast } from '@/components/core/toast/ToastProvider';

export default function HomeScreen() {
  const footerPadding = useFooterContentPadding(false, true);
  const colors = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const wide = width >= WideLayoutBreakpoint;
  const deleteProperty = useDeleteProperty();
  const { showToast } = useToast();
  const { data = [], isPending, isError, refetch } = useLocalProperties();
  const dashboard = useBackendDashboard();
  const [refreshing, setRefreshing] = useState(false);
  const [shareOptionsPropertyId, setShareOptionsPropertyId] = useState<string | null>(null);
  const refreshHome = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetch(), ...(!isMockMode ? [dashboard.refetch()] : [])]);
    } finally {
      setRefreshing(false);
    }
  };
  const summaryPending = isPending || (!isMockMode && dashboard.isPending);
  const countByStatus = (matches: string[]) => data.filter((property) =>
    matches.includes(property.status.label.trim().toLowerCase())).length;
  const metrics = isMockMode
    ? [
        { label: 'All properties', value: data.length, icon: 'real_estate_agent' as const, tone: 'neutral' as const },
        { label: 'Available', value: countByStatus(['available', 'active']), icon: 'verified' as const, tone: 'success' as const },
        { label: 'In dealing', value: countByStatus(['in dealing', 'dealing', 'under offer', 'reserved', 'pending']), icon: 'pending_actions' as const, tone: 'neutral' as const },
        { label: 'On hold', value: countByStatus(['hold', 'on hold']), icon: 'pause_circle' as const, tone: 'warning' as const },
        { label: 'Sold', value: countByStatus(['sold']), icon: 'task_alt' as const, tone: 'neutral' as const },
      ]
    : [
        { label: 'All properties', value: data.length, icon: 'real_estate_agent' as const, tone: 'neutral' as const },
        { label: 'Active', value: dashboard.data?.property_counts?.active ?? 0, icon: 'verified' as const, tone: 'success' as const },
        { label: 'Drafts', value: dashboard.data?.property_counts?.draft ?? 0, icon: 'pending_actions' as const, tone: 'warning' as const },
        { label: 'Archived', value: dashboard.data?.property_counts?.archived ?? 0, icon: 'pause_circle' as const, tone: 'neutral' as const },
      ];
  const syncState = isPending || (!isMockMode && dashboard.isPending)
    ? 'syncing'
    : isError || (!isMockMode && dashboard.isError)
      ? 'error'
      : isMockMode ? 'offline' : 'synced';
  const metricCards = metrics.map((metric) => (
    <PortfolioKpiCard
      key={metric.label}
      style={wide ? styles.kpiCardWide : styles.kpiCard}
      label={metric.label}
      value={summaryPending ? undefined : metric.value}
      icon={metric.icon}
      tone={metric.tone}
      state={summaryPending ? 'loading' : 'ready'}
    />
  ));

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: Platform.OS === 'ios' ? colors.surface : colors.background }]} edges={['top']}>
      <AppHeader pageTitle="Home" brandIcon="apartment" workspaceLabel="" />
      <ScrollView
        testID="home-scroll"
        style={[styles.scroll, { backgroundColor: colors.background }]}
        contentContainerStyle={[styles.content, wide && styles.contentWide, { paddingBottom: footerPadding }]}
        refreshControl={<RefreshControl
          refreshing={refreshing}
          onRefresh={() => void refreshHome()}
          tintColor={colors.accent}
          colors={[colors.accent]}
          accessibilityLabel="Refresh home data"
        />}
      >
        <View style={[styles.container, wide && styles.containerWide]}>
          <View style={[styles.hero, wide && styles.heroWide]}>
            <View style={[styles.workspaceTag, { backgroundColor: colors.accentContainer }]}>
              <View style={[styles.liveDot, { backgroundColor: colors.accent }]} />
              <Text style={[styles.workspaceText, { color: colors.onAccentContainer }]}>YOUR PROPERTY WORKSPACE</Text>
            </View>
            <View style={[styles.headingCopy, wide && styles.headingCopyWide]}>
              <Text style={[styles.title, { color: colors.text }]}>Welcome back.</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Keep your portfolio organised and your next listing ready to share.</Text>
            </View>
            <View style={[styles.quickActions, wide && styles.quickActionsWide, width < 360 && styles.quickActionsCompact]}>
              <CoreButton
                label="Add property"
                leadingIcon="add"
                size="large"
                fullWidth
                style={[styles.quickButton, { backgroundColor: colors.primary }]}
                onPress={() => router.push('/properties/create')}
              />
              <CoreButton
                label="Browse"
                leadingIcon="domain"
                variant="secondary"
                size="large"
                fullWidth
                style={styles.quickButton}
                onPress={() => router.push('/explore')}
              />
            </View>
          </View>

          <View style={styles.metricsSection}>
            <View style={styles.sectionEyebrowRow}>
              <Text style={[styles.sectionEyebrow, { color: colors.textSecondary }]}>PORTFOLIO STATUS</Text>
              <Text style={[styles.snapshotLabel, { color: colors.accent }]}>Live Snapshot</Text>
            </View>
            {wide ? (
              <View accessibilityLabel="Portfolio metrics" testID="home-metrics-wide" style={styles.kpisWide}>{metricCards}</View>
            ) : (
              <ScrollView
                horizontal
                style={styles.kpiScroller}
                contentContainerStyle={styles.kpis}
                showsHorizontalScrollIndicator={false}
                accessibilityLabel="Portfolio metrics">
                {metricCards}
              </ScrollView>
            )}
          </View>

          <View style={[styles.workspaceGrid, wide && styles.workspaceGridWide]} testID={wide ? 'home-desktop-layout' : undefined}>
          <View style={[styles.recentSection, wide && styles.recentSectionWide]}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionCopy}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Recently added</Text>
                <Text style={[styles.subtitleSmall, { color: colors.textSecondary }]}>Your latest listings at a glance.</Text>
              </View>
              <Link href="/explore" asChild>
                <Pressable accessibilityRole="button" style={styles.viewAll}>
                  <Text style={[styles.viewAllText, { color: colors.accent }]}>View all</Text>
                  <Text style={{ color: colors.accent }}>›</Text>
                </Pressable>
              </Link>
            </View>

            {isPending ? <PropertyCard state="loading" /> : null}
            {isError ? (
              <PropertyCard
                state="error"
                errorMessage={isMockMode ? 'Your local properties could not be loaded.' : 'Properties could not be loaded from the API.'}
                onRetry={() => void refetch()}
              />
            ) : null}
            {!isPending && !isError && data.length === 0 ? (
              <View style={[styles.empty, { backgroundColor: colors.surface }]}>
                <Text style={[styles.subtitleSmall, { color: colors.textSecondary }]}>Your latest properties will appear here.</Text>
              </View>
            ) : null}
            {!isPending && !isError && <View style={[styles.propertyList, wide && styles.propertyListWide]}>{data.slice(0, 2).map((property) => {
              const openProperty = () => router.push({ pathname: '/properties/[id]', params: { id: property.id } });
              const menuItems: OverflowMenuItem[] = [
                { id: 'share', label: 'Share property', icon: 'share', onPress: () => setShareOptionsPropertyId(property.id) },
                { id: 'open', label: 'Open property', icon: 'open_in_new', onPress: openProperty },
                { id: 'edit', label: 'Edit property', icon: 'edit', onPress: () => router.push({ pathname: '/properties/create', params: { propertyId: property.id } }) },
                { id: 'property-actions-divider', kind: 'separator' },
                { id: 'delete', label: property.status.label.toLowerCase() === 'draft' ? 'Delete draft' : 'Archive property', icon: property.status.label.toLowerCase() === 'draft' ? 'delete' : 'pause_circle', tone: property.status.label.toLowerCase() === 'draft' ? 'danger' : 'default', onPress: () => Alert.alert(property.status.label.toLowerCase() === 'draft' ? 'Delete draft?' : 'Archive property?', `“${property.title}” will be ${property.status.label.toLowerCase() === 'draft' ? 'permanently deleted' : 'archived'}.`, [
                  { text: 'Cancel', style: 'cancel' },
                  { text: property.status.label.toLowerCase() === 'draft' ? 'Delete' : 'Archive', style: 'destructive', onPress: () => void deleteProperty(property.id, property.status.label).then(() => showToast(property.status.label.toLowerCase() === 'draft' ? 'Draft deleted.' : 'Property archived.', 'success')).catch((error: unknown) => showToast(error instanceof Error ? error.message : 'Could not update property.', 'error')) },
                ]) },
              ];
              return <PropertyCard key={property.id} style={wide ? styles.propertyCardWide : undefined} property={property} onOpenProperty={openProperty} onShare={() => setShareOptionsPropertyId(property.id)} menuItems={menuItems} />;
            })}</View>}
          </View>

          <View style={[styles.supportColumn, wide && styles.supportColumnWide]}>
            <ActionCalloutCard
              title="Share with confidence"
              description="Create a property link and choose the details buyers can see."
              icon="verified_user"
              actionLabel="Manage share links"
              onAction={() => router.push('/shared-links')}
              note={{ icon: 'lock', text: 'Owner details and private notes stay in your workspace.' }}
            />

            <SyncStatusCard
              title={isMockMode ? 'Workspace ready' : syncState === 'synced' ? 'Workspace synced' : 'Workspace status'}
              detail={isMockMode ? 'Demo portfolio saved on this device.' : syncState === 'error' ? 'Some portfolio data could not be refreshed.' : syncState === 'syncing' ? 'Refreshing portfolio data…' : 'Your portfolio data is up to date.'}
              state={syncState}
              stateLabel={syncState === 'offline' ? 'Local demo' : undefined}
            />
          </View>
          </View>
        </View>
      </ScrollView>
      <PlatformBottomSheet visible={shareOptionsPropertyId !== null} onClose={() => setShareOptionsPropertyId(null)} snapPoints={['half']} testID="property-share-options">
        <View style={styles.shareOptions}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Share property</Text>
          <CoreButton label="Share" leadingIcon="share" onPress={() => { setShareOptionsPropertyId(null); router.push('/shared-links'); }} />
          <CoreButton label="Generate and share" leadingIcon="add" variant="secondary" onPress={() => {
            if (!shareOptionsPropertyId) return;
            router.push({ pathname: '/shared-links', params: { generatePropertyId: shareOptionsPropertyId, shareAfterCreate: 'true' } });
            setShareOptionsPropertyId(null);
          }} />
        </View>
      </PlatformBottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: Spacing.three, paddingTop: Spacing.three, alignItems: 'center' },
  contentWide: { paddingHorizontal: Spacing.five, paddingTop: Spacing.four },
  shareOptions: { padding: Spacing.four, gap: Spacing.two },
  container: { width: '100%', maxWidth: MaxContentWidth, gap: Spacing.four },
  containerWide: { maxWidth: WideContentMaxWidth, gap: Spacing.five },
  hero: { gap: Spacing.three },
  heroWide: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.five },
  headingCopyWide: { flex: 1, minWidth: 0 },
  workspaceTag: { alignSelf: 'flex-start', minHeight: 28, paddingHorizontal: Spacing.two, borderRadius: Radius.pill, flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  liveDot: { width: 6, height: 6, borderRadius: Radius.pill },
  workspaceText: { ...Typography.labelSmall, letterSpacing: 0.6 },
  headingCopy: { gap: Spacing.one },
  title: { fontSize: 28, lineHeight: 36, fontWeight: '700' },
  subtitle: { ...Typography.body },
  quickActions: { width: '100%', flexDirection: 'row', gap: Spacing.two, paddingTop: Spacing.one },
  quickActionsCompact: { flexDirection: 'column' },
  quickActionsWide: { width: 440, maxWidth: '44%', paddingTop: 0 },
  quickButton: { flex: 1, flexBasis: 0, minWidth: 0, alignSelf: 'stretch' },
  metricsSection: { gap: Spacing.two },
  sectionEyebrowRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionEyebrow: { ...Typography.labelSmall, letterSpacing: 0.7 },
  snapshotLabel: { ...Typography.bodySmall, fontWeight: '600' },
  kpiScroller: { flexGrow: 0, overflow: 'visible', marginHorizontal: -Spacing.three },
  kpis: { flexDirection: 'row', gap: Spacing.two, paddingHorizontal: Spacing.three, paddingBottom: Spacing.one },
  kpisWide: { flexDirection: 'row', gap: Spacing.two },
  kpiCard: { width: 142, minWidth: 142, minHeight: 132, flex: 0 },
  kpiCardWide: { width: 'auto', minWidth: 120, minHeight: 132, flex: 1 },
  workspaceGrid: { gap: Spacing.four },
  workspaceGridWide: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.four },
  recentSection: { gap: Spacing.three },
  recentSectionWide: { flex: 1, minWidth: 0 },
  propertyList: { gap: Spacing.three },
  propertyListWide: { width: '100%', minWidth: 0, flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  propertyCardWide: { flexGrow: 1, flexShrink: 1, flexBasis: 300, minWidth: 0, maxWidth: '100%' },
  supportColumn: { gap: Spacing.three },
  supportColumnWide: { width: 320 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  sectionTitle: { ...Typography.title },
  sectionCopy: { flex: 1, minWidth: 0 },
  subtitleSmall: { ...Typography.bodySmall, marginTop: Spacing.one },
  viewAll: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  viewAllText: { ...Typography.label },
  empty: { padding: Spacing.four, borderRadius: Radius.card },
});
