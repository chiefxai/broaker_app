import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LocalizedText as Text } from '@/i18n/LocalizedText';

import { AppIcon } from '../icons';
import { Radius, Spacing, Typography } from '@/theme/tokens';
import { useTheme } from '@/theme/theme-provider';

export interface BusinessProfileCardProps {
  businessName: string;
  representativeName?: string;
  location?: string;
  phone?: string;
  email?: string;
  onPressPhone?: () => void;
  onPressEmail?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function BusinessProfileCard({
  businessName,
  representativeName,
  location,
  phone,
  email,
  onPressPhone,
  onPressEmail,
  style,
  testID,
}: BusinessProfileCardProps) {
  const colors = useTheme();
  const initials = businessName.trim().split(/\s+/).slice(0, 2).map((word) => word[0]?.toUpperCase()).join('') || '?';

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, style]} testID={testID}>
      <View style={[styles.avatar, { backgroundColor: colors.accentContainer }]}>
        <Text style={[styles.initials, { color: colors.onAccentContainer }]}>{initials}</Text>
      </View>
      <View style={styles.body}>
        <Text style={[styles.name, { color: colors.text }]}>{businessName}</Text>
        {representativeName ? <Text style={[styles.secondary, { color: colors.textSecondary }]}>{representativeName}</Text> : null}
        {location && (
          <View style={styles.detailRow}>
            <AppIcon name="location_on" size={15} color={colors.iconMuted} />
            <Text style={[styles.secondary, styles.flexText, { color: colors.textSecondary }]}>{location}</Text>
          </View>
        )}
        {phone && (
          <Pressable
            accessibilityRole={onPressPhone ? 'button' : 'text'}
            accessibilityLabel={`Phone: ${phone}`}
            disabled={!onPressPhone}
            onPress={onPressPhone}
            style={styles.detailRow}>
            <AppIcon name="phone" size={15} color={colors.accent} />
            <Text style={[styles.contact, styles.flexText, { color: colors.accent }]}>{phone}</Text>
          </Pressable>
        )}
        {email && (
          <Pressable
            accessibilityRole={onPressEmail ? 'button' : 'text'}
            accessibilityLabel={`Email: ${email}`}
            disabled={!onPressEmail}
            onPress={onPressEmail}
            style={styles.detailRow}>
            <AppIcon name="mail" size={15} color={colors.accent} />
            <Text style={[styles.contact, styles.flexText, { color: colors.accent }]}>{email}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three, borderRadius: Radius.medium, padding: Spacing.three },
  avatar: { width: 48, height: 48, borderRadius: Radius.medium, alignItems: 'center', justifyContent: 'center' },
  initials: { ...Typography.label },
  body: { flex: 1, gap: Spacing.one },
  name: { ...Typography.title },
  secondary: { ...Typography.bodySmall },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one, minHeight: 24 },
  contact: { ...Typography.bodySmall, fontWeight: '600' },
  flexText: { flex: 1 },
});
