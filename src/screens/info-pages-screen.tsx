import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import { router, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Platform, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { LocalizedText as Text } from '@/i18n/LocalizedText';
import { LocalizedTextInput as TextInput } from '@/i18n/LocalizedTextInput';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader, AppIcon, CoreButton, ExpandableInfoCard, InfoBullet, InfoParagraph } from '@/components/core';
import { useToast } from '@/components/core/toast/ToastProvider';
import { MaxContentWidth, Radius, Spacing, Typography } from '@/theme/tokens';
import { useTheme } from '@/theme/theme-provider';
import { useFooterContentPadding } from '@/theme/use-footer-inset';

const VERSION = '2.4.0';
const TERMS_KEY = '@broaker/legal-terms-accepted/v2.4.0';
const HELP_TOPICS = [
  { id: 'patta', title: 'Land & Patta', detail: 'SF numbers, FMB drawings & survey records', icon: 'map' as const },
  { id: 'decks', title: 'Buyer Decks', detail: 'Watermarked links & shared catalogs', icon: 'link' as const },
  { id: 'pricing', title: 'Units & Pricing', detail: 'Acres, Cents, Gunthas & values', icon: 'calculate' as const },
  { id: 'security', title: 'Security & PIN', detail: 'Biometric locks & deed privacy', icon: 'lock' as const },
];
const FAQS = [
  { id: 'vault', topic: 'security', question: 'How does Broker Vault protect owner contact details?', answer: 'Broker Vault keeps owner contact details in the private workspace. Public share links are designed to show only the listing information selected for sharing. Review each share link before distributing it.' },
  { id: 'units', topic: 'pricing', question: 'Can I customize land area units for different states?', answer: 'Broaker supports regional land measurements such as Cents, Gunthas, Bighas, Grounds and Acres. Update the workspace baseline in Settings → Property setup.' },
  { id: 'links', topic: 'decks', question: 'How do I revoke a shared listing link?', answer: 'Open Shared Links, select the link’s more menu, then choose Delete. Removing a link from your workspace may not invalidate copies already saved elsewhere; check the link status after the action.' },
  { id: 'files', topic: 'patta', question: 'What file formats are accepted for cadastral survey maps?', answer: 'Property documents currently support PDF, JPG and PNG files up to 10 MB each.' },
];
const TICKET_CATEGORIES = ['Patta / FMB Cadastral Sync', 'Listing Publication or Link Error', 'Account, Biometrics or PIN Access', 'Broker Workspace Feature Request', 'Billing & Subscription Invoice'];

export function PrivacyPolicyScreen() {
  const colors = useTheme();
  const { showToast } = useToast();
  const onBack = () => router.canGoBack() ? router.back() : router.replace('/settings');
  const contact = () => void openExternal('mailto:privacy@estateflow.io?subject=Broaker%20Privacy%20Request', showToast);
  return <InfoPage title="Privacy Policy" onBack={onBack}>
    <View style={[styles.hero, { backgroundColor: colors.surface }]}>
      <View style={styles.heroBadge}><AppIcon name="verified_user" size={16} color={colors.accent} /><Text style={[styles.badgeText, { color: colors.accent }]}>Last updated: May 2024 · GDPR & DPDP</Text></View>
      <Text style={[styles.heroTitle, { color: colors.text }]}>Zero-Knowledge Guard</Text>
      <Text style={[styles.subheading, { color: colors.accent }]}>Broker Vault Guarantee</Text>
      <Text style={[styles.body, { color: colors.textSecondary }]}>Your title deed numbers, encumbrance certificates, survey details and seller records remain private. Information selected for client-facing share links is separated from your private workspace.</Text>
      <View style={styles.flow}>
        <FlowStep title="Private Assets" detail="Owner IDs · EC records" />
        <AppIcon name="arrow_forward" size={16} color={colors.iconMuted} />
        <FlowStep title="Vault Sanitizer" detail="Privacy controls" />
        <AppIcon name="arrow_forward" size={16} color={colors.iconMuted} />
        <FlowStep title="Buyer Portal" detail="Shared listing details" />
      </View>
    </View>
    <View style={styles.pills}>{['Collection', 'Utilization', 'Isolation', 'Security', 'Your rights'].map((label, i) => <Text key={label} style={[styles.pill, { color: colors.accent, backgroundColor: colors.surfaceContainer }]}>{String(i + 1).padStart(2, '0')} · {label}</Text>)}</View>
    <ExpandableInfoCard title="Information We Collect" eyebrow="Section 01 · Collection" icon="folder_managed" defaultExpanded>
      <InfoParagraph>To provide property valuation and multi-agent syndication, Broaker processes the following categories of information:</InfoParagraph>
      <InfoBullet><Text style={styles.strong}>Profile & authentication:</Text> Contact details, broker license identifiers and team permissions.</InfoBullet>
      <InfoBullet><Text style={styles.strong}>Property and title records:</Text> Deed scans, survey numbers, tax filings and encumbrance certificates.</InfoBullet>
      <InfoBullet><Text style={styles.strong}>Field audio and location:</Text> GPS coordinates, inspection voice memos and timestamped walkthroughs when device permissions are granted.</InfoBullet>
    </ExpandableInfoCard>
    <ExpandableInfoCard title="How We Use Your Data" eyebrow="Section 02 · Utilization" icon="dashboard">
      <InfoParagraph>Information supports property workflows, buyer portals and brokerage operations.</InfoParagraph>
      <InfoBullet>Prepare shareable property summaries from the details you choose.</InfoBullet><InfoBullet>Deliver listing information to recipients you select.</InfoBullet><InfoBullet>Show link engagement and buyer interactions in your workspace.</InfoBullet>
    </ExpandableInfoCard>
    <ExpandableInfoCard title="Vault Isolation Architecture" eyebrow="Section 03 · Isolation" icon="shield">
      <InfoParagraph>Private brokerage information should stay within the authenticated workspace. Check the visibility settings on each public share before distributing it.</InfoParagraph>
      <InfoBullet icon="visibility_off">Owner contact details, payout terms and internal commission splits: private.</InfoBullet><InfoBullet icon="visibility_off">Survey and title documents: private unless explicitly shared.</InfoBullet><InfoBullet>Property media and floorplans: available to share when selected.</InfoBullet>
    </ExpandableInfoCard>
    <ExpandableInfoCard title="Data Sharing & Registries" eyebrow="Section 04" icon="account_balance">
      <InfoParagraph>Broaker does not sell user listing or tenant records. Third-party processing is limited to services required to operate the app and integrations you explicitly initiate. Review vendor and region details in your signed service agreement.</InfoParagraph>
    </ExpandableInfoCard>
    <ExpandableInfoCard title="Security & Safeguards" eyebrow="Section 05 · Security" icon="lock">
      <InfoBullet>Session locking can use your configured device PIN or biometric option.</InfoBullet><InfoBullet>Private records and access credentials are protected using application security controls.</InfoBullet><InfoBullet>Shared links can be managed from the Shared Links section.</InfoBullet>
    </ExpandableInfoCard>
    <ExpandableInfoCard title="Retention & Your Rights" eyebrow="Section 06 · Your rights" icon="person">
      <InfoParagraph>You can request access, correction, portability or deletion of your information, subject to applicable legal retention requirements.</InfoParagraph>
      <InfoBullet>Portability: request a copy of your account information.</InfoBullet><InfoBullet>Erasure: request account and data deletion, subject to required retention.</InfoBullet><InfoBullet>Rectification: contact our privacy team to correct account records.</InfoBullet>
      <CoreButton label="Export data archive" leadingIcon="download" variant="secondary" onPress={() => showToast('Data export is not available yet. Contact the privacy team for a data request.', 'info')} />
      <CoreButton label="Manage privacy preferences" leadingIcon="tune" variant="tertiary" onPress={() => router.push('/settings/sharing-defaults')} />
    </ExpandableInfoCard>
    <ExpandableInfoCard title="Tokens & Session Storage" eyebrow="Section 07" icon="smartphone">
      <InfoParagraph>Broaker uses authentication tokens to provide signed-in functionality and local storage for app preferences and offline drafts. We do not use client-side data to create advertising profiles.</InfoParagraph>
    </ExpandableInfoCard>
    <View style={[styles.contactCard, { backgroundColor: colors.surface }]}>
      <AppIcon name="mail" size={20} color={colors.accent} /><Text style={[styles.sectionTitle, { color: colors.text }]}>Data Protection Officer</Text>
      <Text style={[styles.body, { color: colors.textSecondary }]}>For privacy inquiries or formal data requests, email privacy@estateflow.io. The privacy team aims to acknowledge requests within 48 business hours.</Text>
      <CoreButton label="Email privacy team" leadingIcon="open_in_new" variant="secondary" onPress={contact} />
    </View>
    <LegalFooter />
  </InfoPage>;
}

export function TermsOfServiceScreen() {
  const colors = useTheme();
  const { showToast } = useToast();
  const [accepted, setAccepted] = useState(false);
  const onBack = () => router.canGoBack() ? router.back() : router.replace('/settings');
  const clauses = [
    ['Acceptance of Terms & Eligibility', 'Broaker is designed for real estate professionals, property owners, portfolio administrators and licensed syndicators. By maintaining an account, you confirm that you have the authority and licenses required to manage the properties in your workspace. Keep credentials such as RERA IDs and broker licenses current and accurate.'],
    ['Account Security & Vault Verification', 'You are responsible for protecting your sign-in credentials, transaction tokens and session PIN. Keep your device secure and contact support if you notice unexpected account activity.'],
    ['Listings & Cadastral Survey Accuracy', 'You are responsible for the accuracy and lawful use of listing details, title records, survey numbers, zoning details and approvals you submit. Do not submit forged or knowingly inaccurate records.'],
    ['Public Web Links vs. Broker Vault Privacy', 'Share links can expose the property details and media you choose to publish. Review the public preview before sharing. Keep owner contact details, legal records and negotiation information private unless you have a lawful reason to disclose them.'],
    ['Fees, Subscriptions & Syndications', 'Subscription fees and usage limits are governed by the plan shown to you at purchase. Billing cadence, renewals, credits and cancellation terms will be presented in the applicable plan terms.'],
    ['Intellectual Property & CAD Overlays', 'You retain rights to the content you upload and grant Broaker the limited permissions needed to host and display it as you direct. Platform software and service materials remain the property of their respective owners.'],
    ['Disclaimers & Limitation of Liability', 'Broaker is a property workspace and is not an escrow agent, title insurer, legal adviser or transaction counterparty. Independently verify land records and seek professional advice before making transaction decisions.'],
    ['Termination & Asset Data Purge', 'You may request account closure through support or available account settings. Some records may be retained when required by law or for legitimate security and audit purposes.'],
  ];
  const agree = async () => { try { await AsyncStorage.setItem(TERMS_KEY, new Date().toISOString()); setAccepted(true); showToast('Agreement acknowledgment saved on this device.', 'success'); } catch { showToast('Could not save your acknowledgment. Try again.', 'error'); } };
  return <InfoPage title="Terms of Service" onBack={onBack}>
    <View style={[styles.hero, { backgroundColor: colors.surface }]}>
      <View style={styles.heroBadge}><AppIcon name="verified" size={16} color={colors.accent} /><Text style={[styles.badgeText, { color: colors.accent }]}>Version {VERSION} · May 2024 · Legally binding</Text></View>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Institutional Notice</Text>
      <Text style={[styles.body, { color: colors.textSecondary }]}>By accessing Broaker’s property workspace, broker tools, cadastral maps or listing features, you agree to these operating terms.</Text>
      <View style={styles.pills}><Text style={[styles.pill, { color: colors.accent, backgroundColor: colors.surfaceContainer }]}>RERA & cadastral workflows</Text><Text style={[styles.pill, { color: colors.accent, backgroundColor: colors.surfaceContainer }]}>Private workspace controls</Text><Text style={[styles.pill, { color: colors.accent, backgroundColor: colors.surfaceContainer }]}>Broker & owner accounts</Text></View>
    </View>
    <View style={styles.rowBetween}><Text style={[styles.sectionTitle, { color: colors.text }]}>Core Provisions</Text><Text style={[styles.bodySmall, { color: colors.textSecondary }]}>8 sections</Text></View>
    {clauses.map(([title, copy], index) => <ExpandableInfoCard key={title} title={title} eyebrow={`Clause ${String(index + 1).padStart(2, '0')}`} icon={['badge', 'fingerprint', 'map', 'folder_managed', 'account_balance_wallet', 'document', 'verified_user', 'delete'][index] as 'badge'}>
      <InfoParagraph>{copy}</InfoParagraph>
    </ExpandableInfoCard>)}
    <View style={[styles.contactCard, { backgroundColor: colors.surface }]}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Legal Desk & Compliance Team</Text><Text style={[styles.body, { color: colors.textSecondary }]}>For questions about platform terms, email legal@estateflow.io.</Text>
      <CoreButton label="Email legal desk" leadingIcon="mail" variant="secondary" onPress={() => void openExternal('mailto:legal@estateflow.io?subject=Broaker%20Terms%20Question', showToast)} />
      <CoreButton label={accepted ? 'Agreement acknowledged' : 'I understand & agree'} leadingIcon={accepted ? 'checkmark' : 'verified'} onPress={() => void agree()} />
      <CoreButton label="Download PDF version" leadingIcon="download" variant="tertiary" onPress={() => showToast('A PDF download is not available yet. Contact legal@estateflow.io for a copy.', 'info')} />
    </View>
    <LegalFooter />
  </InfoPage>;
}

export function HelpSupportScreen() {
  const colors = useTheme();
  const { showToast } = useToast();
  const [query, setQuery] = useState('');
  const [topic, setTopic] = useState('all');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [attachment, setAttachment] = useState('');
  const routerHook = useRouter();
  const filteredFaqs = useMemo(() => FAQS.filter(faq => (topic === 'all' || faq.topic === topic) && `${faq.question} ${faq.answer}`.toLowerCase().includes(query.trim().toLowerCase())), [query, topic]);
  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/jpeg', 'image/png'], copyToCacheDirectory: true, multiple: false });
      if (result.canceled) return;
      const file = result.assets[0];
      if ((file.size ?? 0) > 10 * 1024 * 1024) { showToast('Choose a file under 10 MB.', 'error'); return; }
      setAttachment(file.name);
    } catch { showToast('Could not open the file picker. Try again.', 'error'); }
  };
  const submitTicket = async () => {
    if (!category) { showToast('Choose a ticket category.', 'warning'); return; }
    if (description.trim().length < 10) { showToast('Add at least 10 characters describing the issue.', 'warning'); return; }
    const subject = encodeURIComponent(`[${category}] Broaker support request`);
    const body = encodeURIComponent(`${description.trim()}${attachment ? `\n\nSelected file: ${attachment}\nPlease attach this file before sending.` : ''}`);
    try { await Linking.openURL(`mailto:support@estateflow.io?subject=${subject}&body=${body}`); showToast('Your email draft is ready. Review it and send to contact support.', 'info'); }
    catch { showToast('Could not open an email app. Email support@estateflow.io directly.', 'error'); }
  };
  return <InfoPage title="Help & Support" onBack={() => routerHook.canGoBack() ? routerHook.back() : routerHook.replace('/settings')}>
    <View style={[styles.hero, { backgroundColor: colors.surface }]}>
      <Text style={[styles.eyebrow, { color: colors.accent }]}>BROKER DESK CONCIERGE</Text><Text style={[styles.heroTitle, { color: colors.text }]}>How can we help you?</Text>
      <Text style={[styles.body, { color: colors.textSecondary }]}>Search broker guides or connect with Broaker support.</Text>
      <View style={[styles.searchShell, { backgroundColor: colors.surfaceLow }]}><AppIcon name="search" size={18} color={colors.iconMuted} /><TextInput accessibilityLabel="Search help guides" value={query} onChangeText={setQuery} placeholder="Search guides, cadastral sync, listings..." placeholderTextColor={colors.iconMuted} style={[styles.searchInput, { color: colors.text }]} returnKeyType="search" />{query ? <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setQuery('')}><AppIcon name="close" size={18} color={colors.iconMuted} /></Pressable> : null}</View>
    </View>
    <View style={styles.section}>
      <View style={styles.rowBetween}><Text style={[styles.sectionTitle, { color: colors.text }]}>Direct Assistance</Text><Text style={[styles.bodySmall, { color: colors.success }]}>Avg. wait under 5m</Text></View>
      <ContactAction icon="chat" title="WhatsApp Concierge" detail="Online now · active deal questions" action="Connect" onPress={() => void openExternal('https://wa.me/18005829901?text=Broaker%20Broker%20Inquiry', showToast)} />
      <ContactAction icon="call" title="Call Broker Desk" detail="+1 (800) 582-9901 · Mon–Sat, 9AM–8PM" action="Call now" onPress={() => void openExternal('tel:+18005829901', showToast)} />
      <ContactAction icon="mail" title="Email Support" detail="support@estateflow.io · replies during support hours" action="Compose" onPress={() => void openExternal('mailto:support@estateflow.io?subject=Broaker%20Support', showToast)} />
    </View>
    <View style={styles.section}><View style={styles.rowBetween}><Text style={[styles.sectionTitle, { color: colors.text }]}>Browse by Topic</Text><Pressable accessibilityRole="button" onPress={() => setTopic('all')}><Text style={[styles.link, { color: colors.accent }]}>View all</Text></Pressable></View>
      <View style={styles.topicGrid}>{HELP_TOPICS.map(item => <Pressable key={item.id} accessibilityRole="button" accessibilityState={{ selected: topic === item.id }} onPress={() => setTopic(topic === item.id ? 'all' : item.id)} style={[styles.topicCard, { backgroundColor: topic === item.id ? colors.surfaceContainer : colors.surface }]}><AppIcon name={item.icon} size={20} color={colors.accent} /><Text style={[styles.topicTitle, { color: colors.text }]}>{item.title}</Text><Text style={[styles.bodySmall, { color: colors.textSecondary }]}>{item.detail}</Text></Pressable>)}</View>
    </View>
    <View style={styles.section}><View style={styles.rowBetween}><Text style={[styles.sectionTitle, { color: colors.text }]}>Frequently Answered</Text><Text style={[styles.bodySmall, { color: colors.textSecondary }]}>{filteredFaqs.length} guides</Text></View>
      {filteredFaqs.length ? filteredFaqs.map(faq => <ExpandableInfoCard key={faq.id} title={faq.question} icon={faq.topic === 'security' ? 'lock' : faq.topic === 'pricing' ? 'calculate' : faq.topic === 'decks' ? 'link' : 'map'}><InfoParagraph>{faq.answer}</InfoParagraph>{faq.id === 'units' ? <CoreButton label="Open property setup" variant="tertiary" onPress={() => router.push('/settings/property-setup')} /> : null}{faq.id === 'links' ? <CoreButton label="Open shared links" variant="tertiary" onPress={() => router.push('/shared-links')} /> : null}</ExpandableInfoCard>) : <Text style={[styles.body, { color: colors.textSecondary }]}>No guides match your search. Email support and we’ll help you find an answer.</Text>}
    </View>
    <View style={[styles.contactCard, { backgroundColor: colors.surface }]}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Submit a Support Request</Text><Text style={[styles.body, { color: colors.textSecondary }]}>This opens an email draft to support. Review it and send when you’re ready.</Text>
      <Text style={[styles.fieldLabel, { color: colors.text }]}>Category</Text>
      <View style={styles.categoryList}>{TICKET_CATEGORIES.map(value => <Pressable key={value} accessibilityRole="radio" accessibilityState={{ checked: category === value }} onPress={() => setCategory(value)} style={[styles.category, { backgroundColor: category === value ? colors.surfaceContainer : colors.surfaceLow }]}><Text style={[styles.bodySmall, { color: category === value ? colors.accent : colors.text }]}>{value}</Text></Pressable>)}</View>
      <Text style={[styles.fieldLabel, { color: colors.text }]}>Description</Text><TextInput accessibilityLabel="Support request description" value={description} onChangeText={setDescription} placeholder="Tell us what happened and what you expected..." placeholderTextColor={colors.iconMuted} multiline maxLength={4000} textAlignVertical="top" style={[styles.textarea, { backgroundColor: colors.surfaceLow, color: colors.text }]} />
      <Pressable accessibilityRole="button" accessibilityLabel={attachment ? `Selected file ${attachment}` : 'Attach screenshot or document'} onPress={() => void pickFile()} style={[styles.attachment, { backgroundColor: colors.surfaceLow }]}><AppIcon name="upload_file" size={18} color={colors.accent} /><Text style={[styles.bodySmall, { color: colors.textSecondary }]}>{attachment || 'Attach screenshot or PDF (optional, max 10 MB)'}</Text>{attachment ? <Pressable accessibilityRole="button" accessibilityLabel="Remove attachment" onPress={() => setAttachment('')}><AppIcon name="close" size={16} color={colors.iconMuted} /></Pressable> : null}</Pressable>
      {attachment ? <Text style={[styles.bodySmall, { color: colors.warningText }]}>The email app cannot attach this automatically. Add the selected file to the draft before sending.</Text> : null}
      <CoreButton label="Prepare email request" trailingIcon="arrow_forward" fullWidth onPress={() => void submitTicket()} />
    </View>
    <View style={[styles.contactCard, { backgroundColor: colors.surfaceContainer }]}><Text style={[styles.sectionTitle, { color: colors.text }]}>Broaker Help Center · v{VERSION}</Text><Text style={[styles.body, { color: colors.textSecondary }]}>Support is available through the contact channels above. Live platform status is not connected here.</Text></View>
    <LegalFooter showSecurity />
  </InfoPage>;
}

function InfoPage({ title, onBack, children }: React.PropsWithChildren<{ title: string; onBack: () => void }>) {
  const footerPadding = useFooterContentPadding();
  const colors = useTheme();
  return <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: Platform.OS === 'ios' ? colors.surface : colors.background }]}><AppHeader pageTitle={title} onBack={onBack} /><ScrollView style={[styles.scroll, { backgroundColor: colors.background }]} contentContainerStyle={[styles.content, { paddingBottom: footerPadding }]} keyboardShouldPersistTaps="handled"><View style={styles.bodyContent}>{children}</View></ScrollView></SafeAreaView>;
}
function FlowStep({ title, detail }: { title: string; detail: string }) { const colors = useTheme(); return <View style={styles.flowStep}><Text style={[styles.flowTitle, { color: colors.text }]}>{title}</Text><Text style={[styles.bodySmall, { color: colors.textSecondary }]}>{detail}</Text></View>; }
function ContactAction({ icon, title, detail, action, onPress }: { icon: 'chat' | 'call' | 'mail'; title: string; detail: string; action: string; onPress: () => void }) { const colors = useTheme(); return <View style={[styles.contactAction, { backgroundColor: colors.surface }]}><View style={[styles.contactIcon, { backgroundColor: colors.surfaceContainer }]}><AppIcon name={icon === 'chat' ? 'handshake' : icon} size={18} color={colors.accent} /></View><View style={styles.contactCopy}><Text style={[styles.topicTitle, { color: colors.text }]}>{title}</Text><Text style={[styles.bodySmall, { color: colors.textSecondary }]}>{detail}</Text><Pressable accessibilityRole="button" onPress={onPress}><Text style={[styles.link, { color: colors.accent }]}>{action}</Text></Pressable></View></View>; }
function LegalFooter({ showSecurity = false }: { showSecurity?: boolean }) { const colors = useTheme(); const { showToast } = useToast(); return <View style={styles.legalFooter}><Pressable accessibilityRole="link" onPress={() => router.push('/terms')}><Text style={[styles.link, { color: colors.accent }]}>Terms of Service</Text></Pressable><Text style={{ color: colors.textSecondary }}>·</Text><Pressable accessibilityRole="link" onPress={() => router.push('/privacy')}><Text style={[styles.link, { color: colors.accent }]}>Privacy Policy</Text></Pressable>{showSecurity ? <><Text style={{ color: colors.textSecondary }}>·</Text><Pressable accessibilityRole="button" onPress={() => showToast('The security whitepaper is not available yet.', 'info')}><Text style={[styles.link, { color: colors.accent }]}>Security whitepaper</Text></Pressable></> : null}<Text style={[styles.bodySmall, { color: colors.textSecondary }]}>© 2025 Broaker. All rights reserved.</Text></View>; }
async function openExternal(url: string, showToast: (message: string, tone?: 'success' | 'error' | 'warning' | 'info') => void) { try { await Linking.openURL(url); } catch { showToast('Could not open that app. Please try again or contact support by email.', 'error'); } }

const styles = StyleSheet.create({
  safe: { flex: 1 }, scroll: { flex: 1 }, content: { alignItems: 'center', padding: Spacing.three, paddingBottom: Spacing.six }, bodyContent: { width: '100%', maxWidth: MaxContentWidth, gap: Spacing.three },
  hero: { borderRadius: Radius.large, padding: Spacing.three, gap: Spacing.two }, heroBadge: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one }, badgeText: { ...Typography.labelSmall, fontWeight: '700' }, heroTitle: { ...Typography.heading, fontWeight: '700' }, subheading: { ...Typography.title, fontWeight: '700' }, body: { ...Typography.body, lineHeight: 22 }, bodySmall: Typography.bodySmall, eyebrow: { ...Typography.labelSmall, letterSpacing: 1.1, fontWeight: '700' },
  flow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.one, paddingTop: Spacing.two }, flowStep: { flex: 1, gap: Spacing.one }, flowTitle: { ...Typography.labelSmall, fontWeight: '700' }, pills: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one }, pill: { overflow: 'hidden', borderRadius: Radius.pill, paddingVertical: Spacing.one, paddingHorizontal: Spacing.two, ...Typography.labelSmall }, section: { gap: Spacing.two }, sectionTitle: { ...Typography.title, fontWeight: '700' }, strong: { fontWeight: '700' }, rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two }, contactCard: { borderRadius: Radius.large, padding: Spacing.three, gap: Spacing.two },
  searchShell: { minHeight: 48, borderRadius: Radius.medium, paddingHorizontal: Spacing.two, flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginTop: Spacing.one }, searchInput: { flex: 1, minWidth: 0, paddingVertical: Spacing.two, ...Typography.body }, contactAction: { borderRadius: Radius.medium, padding: Spacing.two, flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two }, contactIcon: { width: 40, height: 40, borderRadius: Radius.medium, alignItems: 'center', justifyContent: 'center' }, contactCopy: { flex: 1, gap: Spacing.one }, topicGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }, topicCard: { width: '48%', flexGrow: 1, minWidth: 140, borderRadius: Radius.medium, padding: Spacing.two, gap: Spacing.one }, topicTitle: { ...Typography.label, fontWeight: '700' }, link: { ...Typography.labelSmall, fontWeight: '700', textDecorationLine: 'underline' }, fieldLabel: { ...Typography.label, fontWeight: '700' }, categoryList: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one }, category: { paddingHorizontal: Spacing.two, paddingVertical: Spacing.two, borderRadius: Radius.medium }, textarea: { minHeight: 110, borderRadius: Radius.medium, padding: Spacing.two, ...Typography.body }, attachment: { minHeight: 44, borderRadius: Radius.medium, padding: Spacing.two, flexDirection: 'row', alignItems: 'center', gap: Spacing.two }, legalFooter: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: Spacing.two, paddingVertical: Spacing.three },
});
