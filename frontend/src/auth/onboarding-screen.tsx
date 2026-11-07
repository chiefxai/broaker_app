import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';

import { saveBrokerProfile, saveBusinessProfile, saveOnboardingProgress, savePreferences, type ApiBrokerProfile, type ApiBusinessProfile, type ApiShareDisclosures } from '@/api/backend-api';
import { CoreButton, CoreTextField, ThemeToggle } from '@/components/core';
import { AppIcon } from '@/components/core/icons';
import { LocalizedText as Text } from '@/i18n/LocalizedText';
import { useLanguage, type AppLanguage } from '@/i18n/language-provider';
import { Radius, Spacing, Typography } from '@/theme/tokens';
import { useTheme } from '@/theme/theme-provider';
import { getApiErrorMessage } from '@/api/errors';
import { useToast } from '@/components/core/toast/ToastProvider';

interface OnboardingScreenProps {
  accessToken: string;
  initialStep?: string | null;
  accountEmail?: string | null;
  accountFullName?: string | null;
  accountPhone?: string | null;
  onComplete: () => void;
}

type OnboardingStep = 'welcome' | 'profile' | 'channels';
type ProfileForm = {
  legalName: string;
  businessName: string;
  phone: string;
  email: string;
  city: string;
  district: string;
  state: string;
  designation: string;
  licenseNumber: string;
  licenseJurisdiction: string;
};

const languages: { code: AppLanguage; native: string; english: string }[] = [
  { code: 'en', native: 'English', english: 'English' },
  { code: 'ta', native: 'தமிழ்', english: 'Tamil' },
  { code: 'te', native: 'తెలుగు', english: 'Telugu' },
  { code: 'ml', native: 'മലയാളം', english: 'Malayalam' },
];

const defaultDisclosures: ApiShareDisclosures = {
  show_price: false,
  show_exact_coordinates: false,
  show_photos: true,
  show_reports: false,
  show_approach_roads: false,
};

const disclosureOptions: { key: keyof ApiShareDisclosures; title: string; detail: string }[] = [
  { key: 'show_price', title: 'Show price by default', detail: 'Include the asking price on new share links.' },
  { key: 'show_exact_coordinates', title: 'Share exact location by default', detail: 'Allow precise coordinates on new links.' },
  { key: 'show_photos', title: 'Include photos by default', detail: 'Show available property photos to clients.' },
  { key: 'show_reports', title: 'Include reports by default', detail: 'Show reports attached to a property.' },
  { key: 'show_approach_roads', title: 'Share approach roads by default', detail: 'Include road access details on new links.' },
];

export function OnboardingScreen({ accessToken, initialStep, accountEmail, accountFullName, accountPhone, onComplete }: OnboardingScreenProps) {
  const colors = useTheme();
  const { showToast } = useToast();
  const { language, setLanguage } = useLanguage();
  const [step, setStep] = useState<OnboardingStep>(initialStep === 'channels' ? 'channels' : 'welcome');
  const [form, setForm] = useState<ProfileForm>({ legalName: accountFullName?.trim() ?? '', businessName: '', phone: accountPhone?.trim() ?? '', email: '', city: '', district: '', state: '', designation: '', licenseNumber: '', licenseJurisdiction: '' });
  const [disclosures, setDisclosures] = useState(defaultDisclosures);
  const [profilePhotoUri, setProfilePhotoUri] = useState<string | null>(null);
  const [syncAccountEmail, setSyncAccountEmail] = useState(Boolean(accountEmail));
  const [useDifferentWhatsApp, setUseDifferentWhatsApp] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ legalName?: string; phone?: string; email?: string }>({});
  const update = (key: keyof ProfileForm, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    if (key === 'legalName' || key === 'phone' || key === 'email') setFieldErrors((current) => current[key] ? { ...current, [key]: undefined } : current);
  };
  const publicEmail = syncAccountEmail && accountEmail ? accountEmail : form.email;
  const accountPhoneAvailable = Boolean(accountPhone?.trim());
  const publicPhone = accountPhoneAvailable && !useDifferentWhatsApp ? accountPhone!.trim() : form.phone;

  const finishSetup = async () => {
    setSaving(true);
    setError(null);
    try {
      await savePreferences(accessToken, { language, default_disclosures: disclosures });
      await saveOnboardingProgress(accessToken, { current_step: 'complete', completed_steps: ['profile', 'channels', 'complete'] });
      onComplete();
    } catch (reason) {
      setError(getApiErrorMessage(reason, 'We could not save your setup. Check your connection and try again.'));
    } finally {
      setSaving(false);
    }
  };

  const continueToChannels = async () => {
    const nextFieldErrors = {
      ...(!form.legalName.trim() ? { legalName: 'Enter your full name to continue.' } : {}),
      ...(!publicPhone.trim() ? { phone: 'Enter a public phone number so clients can contact you.' } : {}),
      ...(publicEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(publicEmail.trim()) ? { email: 'Enter a valid public email address.' } : {}),
    };
    setFieldErrors(nextFieldErrors);
    const firstFieldError = nextFieldErrors.legalName ?? nextFieldErrors.phone ?? nextFieldErrors.email;
    if (firstFieldError) {
      setError(null);
      showToast(firstFieldError, 'warning');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const broker: ApiBrokerProfile = {
        legal_name: form.legalName.trim(),
        operating_language: language,
        designation: form.designation.trim() || null,
        license_number: form.licenseNumber.trim() || null,
        license_jurisdiction: form.licenseJurisdiction.trim() || null,
      };
      const business: ApiBusinessProfile = {
        business_name: form.businessName.trim() || null,
        public_phone: publicPhone.trim() || null,
        public_email: publicEmail.trim() || null,
        city: form.city.trim() || null,
        district: form.district.trim() || null,
        state: form.state.trim() || null,
      };
      await saveBrokerProfile(accessToken, broker);
      await saveBusinessProfile(accessToken, business);
      await saveOnboardingProgress(accessToken, { current_step: 'channels', completed_steps: ['profile'] });
      setStep('channels');
    } catch (reason) {
      setError(getApiErrorMessage(reason, 'We could not save your profile. Check your connection and try again.'));
    } finally {
      setSaving(false);
    }
  };

  const back = () => {
    setError(null);
    setStep(step === 'channels' ? 'profile' : 'welcome');
  };

  const chooseProfilePhoto = async () => {
    setError(null);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });
      if (!result.canceled && result.assets[0]) setProfilePhotoUri(result.assets[0].uri);
    } catch {
      setError('We could not open your photo library. Check your device settings and try again.');
    }
  };

  const progress = step === 'welcome' ? 0 : step === 'profile' ? 50 : 100;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={styles.screen}>
        <View testID="onboarding-fixed-header" style={[styles.fixedHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <View style={[styles.content, styles.headerContent]}>
          <View style={styles.topBar}>
            {step === 'welcome' ? <View style={styles.brand}>
              <View style={[styles.brandMark, { backgroundColor: colors.accent }]}><AppIcon name="domain" size={20} color={colors.onAccentContainer} /></View>
              <View><Text style={[styles.brandName, { color: colors.text }]}>Broaker</Text><Text style={[styles.brandTagline, { color: colors.textSecondary }]}>BROKER WORKSPACE</Text></View>
            </View> : <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={back} style={styles.backButton}><AppIcon name="chevron_left" size={22} color={colors.text} /></Pressable>}
            {step !== 'welcome' ? <View style={styles.stepHeading}><Text style={[styles.stepLabel, { color: colors.accent }]}>STEP {step === 'profile' ? '1' : '2'} OF 2</Text><Text style={[styles.stepTitle, { color: colors.text }]}>{step === 'profile' ? 'Broker Profile Setup' : 'Solo Broker Onboarding'}</Text></View> : <View style={styles.headerSpacer} />}
            <ThemeToggle accessibilityLabel="Toggle dark theme" />
          </View>
          </View>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.content}>
          {step !== 'welcome' ? <View style={styles.progressWrap}>
            <View style={styles.progressMeta}><Text style={[styles.stepLabel, { color: colors.accent }]}>STEP {step === 'profile' ? '1' : '2'} OF 2 · {step === 'profile' ? 'BROKER PROFILE' : 'CLIENT PREFERENCES'}</Text><Text style={[styles.stepLabel, { color: colors.accent }]}>{progress}%</Text></View>
            <View style={[styles.progressTrack, { backgroundColor: colors.surfaceHigh }]}><View style={[styles.progressValue, { backgroundColor: colors.accent, width: `${progress}%` }]} /></View>
          </View> : null}

          {step === 'welcome' ? <>
            <View style={[styles.identityStrip, { backgroundColor: colors.surfaceContainer, borderColor: colors.border }]}>
              <View style={styles.buildingShape}><View style={[styles.building, styles.buildingShort, { backgroundColor: colors.accentContainer }]} /><View style={[styles.building, styles.buildingTall, { backgroundColor: colors.accent }]} /><View style={[styles.building, styles.buildingMedium, { backgroundColor: colors.onAccentContainer }]} /></View>
              <View style={[styles.identityLabel, { backgroundColor: colors.imageScrim }]}><AppIcon name="verified" size={18} color={colors.onScrim} /><Text style={[styles.identityText, { color: colors.onScrim }]}>Your independent broker workspace</Text></View>
            </View>
            <View style={styles.intro}>
              <Text style={[styles.title, { color: colors.text }]}>Make Broaker yours</Text>
              <Text style={[styles.description, { color: colors.textSecondary }]}>Set up your broker profile, choose how property details are shared, and make it easy for clients to reach you.</Text>
            </View>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.cardHeading}><AppIcon name="translate" size={19} color={colors.accent} /><Text style={[styles.cardTitle, { color: colors.text }]}>Preferred language</Text><Text style={[styles.cardAside, { color: colors.textSecondary }]}>For your workspace</Text></View>
              <View style={styles.languageOptions} accessibilityRole="radiogroup" accessibilityLabel="Preferred language">
                {languages.map((item) => {
                  const selected = language === item.code;
                  return <Pressable key={item.code} accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={() => setLanguage(item.code)} style={[styles.languageOption, { backgroundColor: selected ? colors.accentContainer : colors.surfaceLow, borderColor: selected ? colors.accent : colors.border }]}>
                    {selected ? <AppIcon name="task_alt" size={16} color={colors.accent} /> : null}<Text style={[styles.languageNative, { color: selected ? colors.onAccentContainer : colors.text }]}>{item.native}</Text>{item.code !== 'en' ? <Text style={[styles.languageEnglish, { color: colors.textSecondary }]}>({item.english})</Text> : null}
                  </Pressable>;
                })}
              </View>
            </View>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.recommended, { backgroundColor: colors.accentContainer }]}><AppIcon name="verified" size={14} color={colors.accent} /><Text style={[styles.recommendedText, { color: colors.onAccentContainer }]}>RECOMMENDED · ABOUT 2 MIN</Text></View>
              <View style={styles.choiceHeader}><View style={[styles.choiceIcon, { backgroundColor: colors.surfaceLow }]}><AppIcon name="badge" size={21} color={colors.accent} /></View></View>
              <Text style={[styles.choiceTitle, { color: colors.text }]}>Set up my profile</Text>
              <Text style={[styles.description, { color: colors.textSecondary }]}>Add your business identity, contact details, and optional professional license. These details can appear on the property links you share.</Text>
              <View style={[styles.featureList, { backgroundColor: colors.surfaceLow, borderColor: colors.border }]}>
                <FeatureRow label="Public contact details for client inquiries" />
                <FeatureRow label="Professional title and license information" />
                <FeatureRow label="Default property sharing preferences" />
              </View>
              <CoreButton label="Set Up My Profile" trailingIcon="arrow_forward" fullWidth size="large" onPress={() => { setError(null); setStep('profile'); }} testID="start-onboarding-profile" />
            </View>
          </> : null}

          {step === 'profile' ? <>
            <View style={styles.intro}>
              <Text style={[styles.title, { color: colors.text }]}>Solo Broker Profile</Text>
              <Text style={[styles.description, { color: colors.textSecondary }]}>Set up your individual agent profile. You can start creating and sharing property listings immediately.</Text>
            </View>
            <View style={[styles.card, styles.photoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.photoAvatar, { backgroundColor: colors.accentContainer, borderColor: colors.border }]}>
                {profilePhotoUri
                  ? <Image source={{ uri: profilePhotoUri }} contentFit="cover" style={StyleSheet.absoluteFill} accessibilityLabel="Selected profile photo" />
                  : <AppIcon name="person" size={38} color={colors.accent} />}
                <View style={[styles.cameraBadge, { backgroundColor: colors.accent }]}><AppIcon name="photo_camera" size={15} color={colors.onPrimary} /></View>
              </View>
              <View style={styles.photoCopy}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Profile photo</Text>
                <Text style={[styles.preferenceDetail, { color: colors.textSecondary }]}>Add a photo so clients can recognize you. This is optional.</Text>
                <View style={styles.photoActions}>
                  <Pressable accessibilityRole="button" accessibilityLabel={profilePhotoUri ? 'Change profile photo' : 'Upload profile photo'} onPress={() => void chooseProfilePhoto()} style={[styles.photoButton, { backgroundColor: colors.surfaceLow, borderColor: colors.border }]} testID="upload-profile-photo">
                    <AppIcon name="upload_file" size={17} color={colors.accent} />
                    <Text style={[styles.photoButtonText, { color: colors.accent }]}>{profilePhotoUri ? 'Change photo' : 'Upload photo'}</Text>
                  </Pressable>
                  {profilePhotoUri ? <Pressable accessibilityRole="button" accessibilityLabel="Remove profile photo" onPress={() => setProfilePhotoUri(null)} style={styles.removePhotoButton} testID="remove-profile-photo"><Text style={[styles.photoButtonText, { color: colors.textSecondary }]}>Remove</Text></Pressable> : null}
                </View>
              </View>
            </View>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.sectionHeading}><View style={[styles.sectionIcon, { backgroundColor: colors.accentContainer }]}><AppIcon name="person" size={18} color={colors.accent} /></View><Text style={[styles.cardTitle, { color: colors.text }]}>Core identity</Text></View>
              <CoreTextField label="Full legal name" value={form.legalName} onChangeText={(value) => update('legalName', value)} placeholder="Your full name" errorMessage={fieldErrors.legalName} autoCapitalize="words" autoComplete="name" textContentType="name" required maxLength={200} returnKeyType="next" />
              {accountEmail ? <CoreTextField label="Account email address" value={accountEmail} onChangeText={() => undefined} editable={false} helperText="Managed by your sign-in provider" keyboardType="email-address" autoCapitalize="none" /> : null}
              <CoreTextField label="Business name" value={form.businessName} onChangeText={(value) => update('businessName', value)} placeholder="Your agency or business" autoCapitalize="words" maxLength={200} returnKeyType="next" />
              {accountPhoneAvailable ? <>
                <Pressable accessibilityRole="checkbox" accessibilityLabel="Use a different WhatsApp number" accessibilityState={{ checked: useDifferentWhatsApp }} onPress={() => setUseDifferentWhatsApp((value) => { const next = !value; update('phone', next ? '' : accountPhone!.trim()); return next; })} style={styles.emailSyncRow} testID="different-whatsapp-toggle">
                  <View style={[styles.checkbox, { borderColor: !useDifferentWhatsApp ? colors.accent : colors.border, backgroundColor: !useDifferentWhatsApp ? colors.accent : colors.surface }]}>{!useDifferentWhatsApp ? <AppIcon name="checkmark" size={14} color={colors.onPrimary} /> : null}</View>
                  <View style={styles.preferenceText}><Text style={[styles.preferenceTitle, { color: colors.text }]}>Use my account phone for WhatsApp</Text><Text style={[styles.preferenceDetail, { color: colors.textSecondary }]}>{accountPhone?.trim()}</Text></View>
                </Pressable>
                {useDifferentWhatsApp ? <CoreTextField label="Different WhatsApp number" value={form.phone} onChangeText={(value) => update('phone', value)} placeholder="+91 98765 43210" errorMessage={fieldErrors.phone} keyboardType="phone-pad" required maxLength={40} returnKeyType="next" /> : null}
              </> : <CoreTextField label="Public phone / WhatsApp" value={form.phone} onChangeText={(value) => update('phone', value)} placeholder="+91 98765 43210" errorMessage={fieldErrors.phone} keyboardType="phone-pad" required maxLength={40} returnKeyType="next" />}
            </View>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.sectionHeading}><View style={[styles.sectionIcon, { backgroundColor: colors.accentContainer }]}><AppIcon name="translate" size={18} color={colors.accent} /></View><Text style={[styles.cardTitle, { color: colors.text }]}>Operating language</Text><Text style={[styles.cardAside, { color: colors.textSecondary }]}>Required</Text></View>
              <Text style={[styles.preferenceDetail, { color: colors.textSecondary }]}>Choose the primary language for your workspace and client communications.</Text>
              <View style={styles.profileLanguageOptions} accessibilityRole="radiogroup" accessibilityLabel="Operating language">
                {languages.map((item) => {
                  const selected = language === item.code;
                  return <Pressable key={item.code} accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={() => setLanguage(item.code)} style={[styles.profileLanguageOption, { backgroundColor: selected ? colors.accentContainer : colors.surfaceLow, borderColor: selected ? colors.accent : colors.border }]}>
                    <View><Text style={[styles.languageNative, { color: selected ? colors.onAccentContainer : colors.text }]}>{item.english}</Text><Text style={[styles.languageEnglish, { color: colors.textSecondary }]}>{item.native}</Text></View>{selected ? <AppIcon name="task_alt" size={18} color={colors.accent} /> : null}
                  </Pressable>;
                })}
              </View>
            </View>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.sectionHeading}><View style={[styles.sectionIcon, { backgroundColor: colors.accentContainer }]}><AppIcon name="mail" size={18} color={colors.accent} /></View><Text style={[styles.cardTitle, { color: colors.text }]}>Contact customization</Text><Text style={[styles.cardAside, { color: colors.textSecondary }]}>Optional</Text></View>
              {accountEmail ? <Pressable accessibilityRole="checkbox" accessibilityLabel="Same as primary account email" accessibilityState={{ checked: syncAccountEmail }} onPress={() => setSyncAccountEmail((value) => !value)} style={styles.emailSyncRow}><View style={[styles.checkbox, { borderColor: syncAccountEmail ? colors.accent : colors.border, backgroundColor: syncAccountEmail ? colors.accent : colors.surface }]}>{syncAccountEmail ? <AppIcon name="checkmark" size={14} color={colors.onPrimary} /> : null}</View><Text style={[styles.preferenceDetail, { color: colors.text }]}>Same as primary account email</Text></Pressable> : null}
              <CoreTextField label="Public inquiry email" value={publicEmail} onChangeText={(value) => { setSyncAccountEmail(false); update('email', value); }} placeholder="hello@example.com" errorMessage={fieldErrors.email} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} editable={!syncAccountEmail} helperText={fieldErrors.email ? undefined : 'Displayed to prospective buyers on shared property links.'} maxLength={254} returnKeyType="next" />
            </View>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.sectionHeading}><View style={[styles.sectionIcon, { backgroundColor: colors.accentContainer }]}><AppIcon name="location_on" size={18} color={colors.accent} /></View><Text style={[styles.cardTitle, { color: colors.text }]}>Operating territory</Text><Text style={[styles.cardAside, { color: colors.textSecondary }]}>Optional</Text></View>
              <View style={styles.fieldRow}><CoreTextField label="City" value={form.city} onChangeText={(value) => update('city', value)} placeholder="City" autoCapitalize="words" maxLength={100} style={styles.fieldHalf} /><CoreTextField label="District" value={form.district} onChangeText={(value) => update('district', value)} placeholder="District" autoCapitalize="words" maxLength={100} style={styles.fieldHalf} /></View>
              <CoreTextField label="State" value={form.state} onChangeText={(value) => update('state', value)} placeholder="State" autoCapitalize="words" maxLength={100} />
            </View>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.sectionHeading}><View style={[styles.sectionIcon, { backgroundColor: colors.accentContainer }]}><AppIcon name="verified_user" size={18} color={colors.accent} /></View><Text style={[styles.cardTitle, { color: colors.text }]}>Licensing & regulatory</Text><Text style={[styles.cardAside, { color: colors.textSecondary }]}>Optional</Text></View>
              <CoreTextField label="Professional title / designation" value={form.designation} onChangeText={(value) => update('designation', value)} placeholder="e.g. Property Consultant" maxLength={200} />
              <CoreTextField label="Real estate license / RERA number" value={form.licenseNumber} onChangeText={(value) => update('licenseNumber', value)} placeholder="License or registration number" maxLength={100} />
              <CoreTextField label="License jurisdiction" value={form.licenseJurisdiction} onChangeText={(value) => update('licenseJurisdiction', value)} placeholder="State or issuing jurisdiction" maxLength={100} />
              <View style={[styles.infoBanner, { backgroundColor: colors.surfaceLow }]}><AppIcon name="verified" size={16} color={colors.accent} /><Text style={[styles.infoText, { color: colors.textSecondary }]}>License details are saved to your profile. They are not shown as verified credentials.</Text></View>
            </View>
          </> : null}

          {step === 'channels' ? <>
            <View style={styles.intro}>
              <Text style={[styles.title, { color: colors.text }]}>Connect Client Channels</Text>
              <Text style={[styles.description, { color: colors.textSecondary }]}>Configure what buyers see when they open your shared property links. You can change these defaults for every link.</Text>
            </View>
            <View style={[styles.optionalNotice, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.noticeHeading}><AppIcon name="verified" size={18} color={colors.accent} /><Text style={[styles.preferenceTitle, { color: colors.text }]}>Optional Final Step</Text><Text style={[styles.cardAside, { color: colors.accent }]}>ZERO PRESSURE</Text></View>
              <Text style={[styles.preferenceDetail, { color: colors.textSecondary }]}>Your public contact details are saved from your broker profile. You can adjust these sharing options whenever you create a property link.</Text>
            </View>
            <View style={[styles.infoBanner, { backgroundColor: colors.accentContainer }]}><AppIcon name="lock" size={17} color={colors.accent} /><Text style={[styles.infoText, { color: colors.onAccentContainer }]}>Owner details, private deeds, and internal notes stay private.</Text></View>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.sectionHeading}><View style={[styles.sectionIcon, { backgroundColor: colors.accentContainer }]}><AppIcon name="tune" size={18} color={colors.accent} /></View><Text style={[styles.cardTitle, { color: colors.text }]}>Client link preferences</Text></View>
              {disclosureOptions.map(({ key, title, detail }) => <View key={key} style={[styles.preferenceRow, { backgroundColor: colors.surfaceLow }]}>
                <View style={styles.preferenceText}><Text style={[styles.preferenceTitle, { color: colors.text }]}>{title}</Text><Text style={[styles.preferenceDetail, { color: colors.textSecondary }]}>{detail}</Text></View>
                <Switch accessibilityLabel={title} accessibilityHint={detail} value={disclosures[key]} onValueChange={(value) => setDisclosures((current) => ({ ...current, [key]: value }))} trackColor={{ false: colors.toggleTrack, true: colors.accent }} thumbColor={disclosures[key] ? colors.onPrimary : colors.surface} ios_backgroundColor={colors.toggleTrack} testID={`disclosure-switch-${key}`} />
              </View>)}
            </View>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.summaryHeader}><Text style={[styles.summaryTitle, { color: colors.text }]}>SETUP SNAPSHOT</Text><Text style={[styles.summaryStatus, { color: colors.accent }]}>2 OF 2 READY</Text></View>
              <SummaryRow label="Broker profile" status="Completed" />
              <SummaryRow label="Sharing preferences" status="Ready" />
            </View>
          </> : null}

          {error ? <Text accessibilityRole="alert" style={[styles.error, { color: colors.dangerText, backgroundColor: colors.dangerContainer }]}>{error}</Text> : null}

          {step === 'profile' ? <View style={styles.footerActions}>
            <CoreButton label={saving ? 'Saving…' : 'Continue to Step 2: Preferences'} trailingIcon="arrow_forward" fullWidth size="large" loading={saving} disabled={saving} onPress={() => void continueToChannels()} testID="continue-onboarding-channels" />
          </View> : null}
          {step === 'channels' ? <View style={styles.footerActions}>
            <CoreButton label={saving ? 'Saving…' : 'Complete Setup & Launch Workspace'} trailingIcon="task_alt" fullWidth size="large" loading={saving} disabled={saving} onPress={() => void finishSetup()} testID="finish-onboarding" />
            <CoreButton label="Back to Broker Profile" variant="ghost" disabled={saving} onPress={back} />
          </View> : null}
        </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function FeatureRow({ label }: { label: string }) {
  const colors = useTheme();
  return <View style={styles.featureRow}><AppIcon name="task_alt" size={17} color={colors.accent} /><Text style={[styles.featureText, { color: colors.text }]}>{label}</Text></View>;
}

function SummaryRow({ label, status }: { label: string; status: string }) {
  const colors = useTheme();
  return <View style={[styles.summaryRow, { backgroundColor: colors.surfaceLow }]}><View style={styles.summaryLabel}><AppIcon name="task_alt" size={17} color={colors.accent} /><Text style={[styles.featureText, { color: colors.text }]}>{label}</Text></View><Text style={[styles.summaryStatus, { color: colors.accent }]}>{status}</Text></View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  screen: { flex: 1 },
  fixedHeader: { width: '100%', paddingHorizontal: Spacing.three, paddingVertical: Spacing.one, borderBottomWidth: StyleSheet.hairlineWidth },
  scrollView: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: Spacing.three, paddingVertical: Spacing.three },
  content: { width: '100%', maxWidth: 560, alignSelf: 'center', gap: Spacing.three, paddingBottom: Spacing.four },
  headerContent: { paddingBottom: 0, gap: 0 },
  topBar: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  brand: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  brandMark: { width: 40, height: 40, borderRadius: Radius.medium, alignItems: 'center', justifyContent: 'center' },
  brandName: { ...Typography.title, lineHeight: 21, fontWeight: '700' },
  brandTagline: { ...Typography.labelSmall, letterSpacing: 0.8, marginTop: 2 },
  headerSpacer: { flex: 1 },
  backButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  stepHeading: { flex: 1, alignItems: 'center', gap: 1, paddingHorizontal: Spacing.one },
  stepLabel: { ...Typography.labelSmall, letterSpacing: 0.7, textTransform: 'uppercase' },
  stepTitle: { ...Typography.label },
  progressWrap: { gap: Spacing.one },
  progressMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  progressTrack: { height: 6, overflow: 'hidden', borderRadius: Radius.pill },
  progressValue: { height: '100%', borderRadius: Radius.pill },
  identityStrip: { height: 128, borderRadius: Radius.large, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden', justifyContent: 'flex-end', padding: Spacing.three },
  buildingShape: { position: 'absolute', right: 20, top: 0, bottom: 0, width: 220, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 8, opacity: 0.8 },
  building: { width: 54, borderTopLeftRadius: 6, borderTopRightRadius: 6 },
  buildingShort: { height: 76, opacity: 0.55 },
  buildingTall: { height: 110, opacity: 0.7 },
  buildingMedium: { height: 88, opacity: 0.48 },
  identityLabel: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: Spacing.two, paddingHorizontal: Spacing.two, paddingVertical: Spacing.one, borderRadius: Radius.medium },
  identityText: { ...Typography.bodySmall, fontWeight: '600' },
  intro: { gap: Spacing.two },
  title: { fontSize: 28, lineHeight: 36, fontWeight: '700', letterSpacing: -0.5 },
  description: { ...Typography.body },
  card: { padding: Spacing.three, borderRadius: Radius.large, borderWidth: StyleSheet.hairlineWidth, gap: Spacing.three },
  photoCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  photoAvatar: { width: 84, height: 84, borderRadius: Radius.pill, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  cameraBadge: { position: 'absolute', right: 0, bottom: 0, width: 28, height: 28, borderRadius: Radius.pill, borderWidth: 2, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  photoCopy: { flex: 1, minWidth: 0, gap: Spacing.one },
  photoActions: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: Spacing.two, marginTop: Spacing.one },
  photoButton: { minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: Spacing.one, paddingHorizontal: Spacing.two, borderRadius: Radius.medium, borderWidth: StyleSheet.hairlineWidth },
  photoButtonText: { ...Typography.labelSmall, fontWeight: '600' },
  removePhotoButton: { minHeight: 38, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.one },
  cardHeading: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, flexWrap: 'wrap' },
  cardTitle: { ...Typography.title, flexShrink: 1 },
  cardAside: { ...Typography.bodySmall, marginLeft: 'auto' },
  languageOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  languageOption: { minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: Spacing.two, paddingVertical: Spacing.one, borderRadius: Radius.pill, borderWidth: 1 },
  languageNative: { ...Typography.bodySmall, fontWeight: '600' },
  languageEnglish: { ...Typography.labelSmall },
  profileLanguageOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  profileLanguageOption: { minHeight: 52, flexGrow: 1, flexBasis: 170, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.two, borderRadius: Radius.medium, borderWidth: 1 },
  emailSyncRow: { minHeight: 32, flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  recommended: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 5, paddingHorizontal: Spacing.two, paddingVertical: Spacing.one, borderRadius: Radius.pill },
  recommendedText: { ...Typography.labelSmall, letterSpacing: 0.4 },
  choiceHeader: { position: 'absolute', right: Spacing.three, top: Spacing.three },
  choiceIcon: { width: 36, height: 36, borderRadius: Radius.medium, alignItems: 'center', justifyContent: 'center' },
  choiceTitle: { ...Typography.heading, fontSize: 20, lineHeight: 28, fontWeight: '600' },
  featureList: { padding: Spacing.two, borderRadius: Radius.medium, borderWidth: StyleSheet.hairlineWidth, gap: Spacing.two },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  featureText: { ...Typography.bodySmall, flex: 1 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  sectionIcon: { width: 32, height: 32, borderRadius: Radius.small, alignItems: 'center', justifyContent: 'center' },
  fieldRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  fieldHalf: { flexGrow: 1, flexBasis: 180 },
  infoBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two, padding: Spacing.two, borderRadius: Radius.medium },
  infoText: { ...Typography.bodySmall, flex: 1 },
  optionalNotice: { padding: Spacing.three, borderRadius: Radius.large, borderWidth: StyleSheet.hairlineWidth, gap: Spacing.two },
  noticeHeading: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  preferenceRow: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: Spacing.two, padding: Spacing.two, borderRadius: Radius.medium },
  preferenceText: { flex: 1, gap: 2 },
  preferenceTitle: { ...Typography.label },
  preferenceDetail: { ...Typography.bodySmall },
  summaryTitle: { ...Typography.labelSmall, letterSpacing: 1 },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  summaryRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two, paddingHorizontal: Spacing.two, borderRadius: Radius.small },
  summaryLabel: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  summaryStatus: { ...Typography.labelSmall },
  error: { ...Typography.bodySmall, padding: Spacing.two, borderRadius: Radius.small },
  footerActions: { gap: Spacing.two, alignItems: 'stretch' },
});
