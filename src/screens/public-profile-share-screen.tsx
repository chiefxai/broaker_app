import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getPublicProfileShare, type ApiPublicProfileShare } from '@/api/backend-api';
import { AppHeader } from '@/components/core/navigation/AppHeader';
import { PlatformBottomSheet } from '@/components/core/navigation/PlatformBottomSheet';
import { AppIcon } from '@/components/core/icons';
import { CoreButton } from '@/components/core/CoreButton';
import { CoreTextField } from '@/components/core/forms/CoreTextField';
import { LocalizedText as Text } from '@/i18n/LocalizedText';
import { Radius, Spacing, Typography } from '@/theme/tokens';
import { useTheme } from '@/theme/theme-provider';
import { isMockMode } from '@/data/app-mode';

export default function PublicProfileShareScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const colors = useTheme();
  const [passcode, setPasscode] = useState('');
  const [submittedPasscode, setSubmittedPasscode] = useState<string | undefined>();
  const [contactSheetVisible, setContactSheetVisible] = useState(false);
  const profileQuery = useQuery<ApiPublicProfileShare>({
    queryKey: ['public-profile-share', token, submittedPasscode],
    queryFn: async () => isMockMode ? { profile: { business_name: 'EstateFlow Realty', professional_title: 'Property Consultant', public_phone: '+91 98765 43210', public_email: 'hello@estateflow.example', city: 'Tirunelveli', district: 'Tirunelveli', state: 'Tamil Nadu' }, properties: [{ public_listing_token: 'mock-profile~green-valley', title: 'Green Valley Farm', description: 'Agricultural land with established water access.', category: 'agriculture', asking_price_inr: 2400000, area: 92, area_unit: 'acre', approximate_location: 'Tirunelveli, Tamil Nadu' }, { public_listing_token: 'mock-profile~highland-orchard', title: 'Highland Orchard', category: 'agriculture', area: 150, area_unit: 'cent', approximate_location: 'Tenkasi, Tamil Nadu' }] } : getPublicProfileShare(token ?? '', submittedPasscode),
    enabled: Boolean(token), retry: false,
  });
  const status = (profileQuery.error as { response?: { status?: number } } | null)?.response?.status;
  const error = profileQuery.error ? status === 401 ? 'Enter the passcode provided by the broker.' : status === 404 ? 'This profile link is expired or unavailable.' : 'Could not load this profile. Check your connection and try again.' : null;
  const data = profileQuery.data;
  const loading = profileQuery.isPending;
  const profileName = data?.profile?.business_name || data?.profile?.professional_title || 'Property professional';
  const initials = profileName.trim().split(/\s+/).slice(0, 2).map((word) => word[0]?.toUpperCase()).join('') || 'P';
  const location = [data?.profile?.city, data?.profile?.district, data?.profile?.state].filter(Boolean).join(', ');
  const publicPhone = data?.profile?.public_phone?.trim() || null;
  const publicEmail = data?.profile?.public_email?.trim() || null;
  const openContactUrl = async (url: string) => {
    setContactSheetVisible(false);
    try { await Linking.openURL(url); }
    catch { Alert.alert('Unable to open contact option', 'Try again or use the contact details shown on the profile.'); }
  };

  return <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
    <AppHeader pageTitle="Broker profile" brandIcon="apartment" />
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {loading ? <View style={styles.center}><ActivityIndicator color={colors.accent} /><Text style={[styles.body, { color: colors.textSecondary }]}>Loading shared profile…</Text></View> : error ? <View style={[styles.panel, { backgroundColor: colors.surface }]}>
        <Text style={[styles.heading, { color: colors.text }]}>{error}</Text>
        {error.startsWith('Enter') ? <><CoreTextField label="Share passcode" accessibilityLabel="Share passcode" value={passcode} onChangeText={(value) => setPasscode(value.replace(/\D/g, '').slice(0, 12))} keyboardType="number-pad" secureTextEntry /><CoreButton label="View profile" onPress={() => setSubmittedPasscode(passcode)} /></> : <CoreButton label="Retry" onPress={() => void profileQuery.refetch()} />}
      </View> : data ? <>
        {data.profile ? <View style={[styles.profileHero, { backgroundColor: colors.surface }]}>
          <View style={[styles.avatar, { backgroundColor: colors.accentContainer }]}><Text style={[styles.initials, { color: colors.onAccentContainer }]}>{initials}</Text></View>
          <View style={styles.profileInfo}>
            <Text style={[styles.eyebrow, { color: colors.accent }]}>BROKER PROFILE</Text>
            <Text style={[styles.profileName, { color: colors.text }]}>{profileName}</Text>
            {data.profile.business_name && data.profile.professional_title ? <Text style={[styles.professionalTitle, { color: colors.textSecondary }]}>{data.profile.professional_title}</Text> : null}
          </View>
          <View style={styles.contactList}>
            {publicEmail ? <ContactRow icon="mail" value={publicEmail} /> : null}
            {publicPhone ? <ContactRow icon="phone" value={publicPhone} /> : null}
            {location ? <ContactRow icon="location_on" value={location} muted /> : null}
          </View>
        </View> : null}
        {data.properties ? <View style={styles.properties}>
          <View style={styles.sectionHeading}><View><Text style={[styles.heading, { color: colors.text }]}>Available properties</Text><Text style={[styles.sectionHint, { color: colors.textSecondary }]}>Listings shared by this broker</Text></View><View style={[styles.countBadge, { backgroundColor: colors.accentContainer }]}><Text style={[styles.countText, { color: colors.onAccentContainer }]}>{data.properties.length}</Text></View></View>
          {data.properties.length ? data.properties.map((property) => <Pressable key={property.public_listing_token} accessibilityRole="button" accessibilityLabel={`View ${property.title} details`} accessibilityHint="Opens the full shared property listing" onPress={() => router.push({ pathname: '/share/[token]', params: { token: property.public_listing_token } })} style={[styles.panel, { backgroundColor: colors.surface }]}>
            <Text style={[styles.propertyTitle, { color: colors.text }]}>{property.title}</Text>
            <Text style={[styles.body, { color: colors.textSecondary }]}>{[property.category.replaceAll('_', ' '), property.area != null && property.area_unit ? `${property.area} ${property.area_unit}` : null, property.approximate_location].filter(Boolean).join(' · ')}</Text>
            {property.description ? <Text numberOfLines={3} style={[styles.body, { color: colors.text }]}>{property.description}</Text> : null}
            {property.asking_price_inr != null ? <Text style={[styles.price, { color: colors.accent }]}>₹{property.asking_price_inr.toLocaleString('en-IN')}</Text> : null}
          </Pressable>) : <Text style={[styles.body, { color: colors.textSecondary }]}>No active properties are available.</Text>}
        </View> : null}
      </> : null}
    </ScrollView>
    {!loading && !error && (publicPhone || publicEmail) ? <View style={[styles.stickyFooter, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
      <CoreButton label="Contact broker" leadingIcon="chat" fullWidth onPress={() => setContactSheetVisible(true)} />
    </View> : null}
    <PlatformBottomSheet visible={contactSheetVisible} onClose={() => setContactSheetVisible(false)} snapPoints={['half']} testID="broker-contact-sheet">
      <View style={styles.contactSheetContent}>
        <Text style={[styles.heading, { color: colors.text }]}>Contact broker</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>{profileName}</Text>
        {publicPhone ? <>
          <CoreButton label="WhatsApp" leadingIcon="chat" variant="secondary" fullWidth onPress={() => void openContactUrl(`https://wa.me/${publicPhone.replace(/\D/g, '')}`)} />
          <CoreButton label={`Call ${publicPhone}`} leadingIcon="phone" fullWidth onPress={() => void openContactUrl(`tel:${publicPhone.replace(/[^+\d]/g, '')}`)} />
        </> : null}
        {publicEmail ? <CoreButton label={`Email ${publicEmail}`} leadingIcon="mail" variant="tertiary" fullWidth onPress={() => void openContactUrl(`mailto:${publicEmail}`)} /> : null}
      </View>
    </PlatformBottomSheet>
  </SafeAreaView>;
}

function ContactRow({ icon, value, muted = false }: { icon: 'mail' | 'phone' | 'location_on'; value: string; muted?: boolean }) {
  const colors = useTheme();
  return <View style={styles.contactRow}><View style={[styles.contactIcon, { backgroundColor: colors.accentContainer }]}><AppIcon name={icon} size={17} color={colors.accent} /></View><Text style={[styles.contactText, { color: muted ? colors.textSecondary : colors.text }]}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1 }, scroll: { flex: 1 }, content: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: Spacing.three, paddingBottom: Spacing.four, gap: Spacing.four },
  center: { minHeight: 240, alignItems: 'center', justifyContent: 'center', gap: Spacing.two },
  panel: { borderRadius: Radius.card, padding: Spacing.three, gap: Spacing.two },
  profileHero: { alignItems: 'center', borderRadius: Radius.card, padding: Spacing.four, gap: Spacing.three },
  avatar: { width: 104, height: 104, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  initials: { ...Typography.heading, fontSize: 32 }, profileInfo: { alignItems: 'center', gap: Spacing.one }, profileName: { ...Typography.heading, textAlign: 'center' }, professionalTitle: { ...Typography.body, textAlign: 'center' },
  contactList: { width: '100%', maxWidth: 420, gap: Spacing.two }, contactRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: Spacing.two, justifyContent: 'center' },
  contactIcon: { width: 34, height: 34, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  contactText: { ...Typography.body, flex: 1 }, properties: { gap: Spacing.two },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  sectionHint: { ...Typography.bodySmall, marginTop: Spacing.one }, countBadge: { minWidth: 32, height: 32, paddingHorizontal: Spacing.two, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' }, countText: { ...Typography.label },
  eyebrow: { ...Typography.labelSmall, letterSpacing: 1.2 }, heading: { ...Typography.title }, propertyTitle: { ...Typography.title },
  body: { ...Typography.body }, price: { ...Typography.title }, stickyFooter: { paddingHorizontal: Spacing.three, paddingTop: Spacing.two, paddingBottom: Spacing.two, borderTopWidth: StyleSheet.hairlineWidth }, contactSheetContent: { padding: Spacing.four, gap: Spacing.three },
});
