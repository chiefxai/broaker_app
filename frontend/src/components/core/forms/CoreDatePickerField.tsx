import { useState } from 'react';
import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { Pressable, StyleSheet, View, Platform } from 'react-native';
import { LocalizedText as Text } from '@/i18n/LocalizedText';
import { AppIcon } from '../icons';
import { Radius, Spacing, Typography } from '@/theme/tokens';
import { useTheme } from '@/theme/theme-provider';
import { CoreTextField } from './CoreTextField';

export interface CoreDatePickerFieldProps {
  label?: string;
  accessibilityLabel?: string;
  value: string;
  onChange: (value: string) => void;
  minimumDate?: Date;
  helperText?: string;
  clearable?: boolean;
  testID?: string;
}

function parseDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return new Date();
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12);
}

function formatDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** A themed date field backed by the native Expo picker on iOS and Android. */
export function CoreDatePickerField({ label, accessibilityLabel, value, onChange, minimumDate, helperText, clearable = false, testID }: CoreDatePickerFieldProps) {
  const colors = useTheme();
  const [androidPickerVisible, setAndroidPickerVisible] = useState(false);
  const selectedDate = parseDate(value);

  if (Platform.OS === 'web') {
    return <CoreTextField label={label} accessibilityLabel={accessibilityLabel} value={value} onChangeText={onChange} placeholder="YYYY-MM-DD" helperText={helperText} leadingIcon="calendar_month" testID={testID} />;
  }

  const picker = <DateTimePicker
    mode="date"
    value={selectedDate}
    minimumDate={minimumDate}
    display={Platform.OS === 'ios' ? 'compact' : 'default'}
    presentation={Platform.OS === 'android' ? 'dialog' : undefined}
    onValueChange={(_event, date) => {
      if (date) onChange(formatDate(date));
      if (Platform.OS === 'android') setAndroidPickerVisible(false);
    }}
    onDismiss={() => setAndroidPickerVisible(false)}
    testID={testID ? `${testID}-native` : undefined}
  />;

  return <View style={styles.container}>
    {label ? <Text style={[styles.label, { color: colors.text }]}>{label}</Text> : null}
    <View style={[styles.field, { backgroundColor: colors.surfaceLow, borderColor: colors.border }]}>
      <AppIcon name="calendar_month" size={18} color={colors.iconMuted} />
      {Platform.OS === 'ios' ? <View style={styles.androidTrigger}>{picker}</View> : <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label ?? 'Choose date'}
        accessibilityHint="Opens the date picker"
        onPress={() => setAndroidPickerVisible(true)}
        style={styles.androidTrigger}
        testID={testID}>
        <Text style={[styles.dateText, { color: value ? colors.text : colors.textSecondary }]}>{value || 'Select date'}</Text>
      </Pressable>}
      {clearable && value ? <Pressable accessibilityRole="button" accessibilityLabel="Clear date" onPress={() => onChange('')} hitSlop={8} style={styles.clearAction}><AppIcon name="close" size={17} color={colors.iconMuted} /></Pressable> : null}
    </View>
    {Platform.OS === 'android' && androidPickerVisible ? picker : null}
    {helperText ? <Text style={[styles.helper, { color: colors.textSecondary }]}>{helperText}</Text> : null}
  </View>;
}

const styles = StyleSheet.create({
  container: { gap: Spacing.one },
  label: { ...Typography.labelSmall },
  field: { minHeight: 48, borderWidth: 1, borderRadius: Radius.medium, paddingHorizontal: Spacing.three, flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  androidTrigger: { minHeight: 46, flex: 1, justifyContent: 'center' },
  clearAction: { minWidth: 32, minHeight: 32, alignItems: 'center', justifyContent: 'center' },
  dateText: { ...Typography.body },
  helper: { ...Typography.bodySmall },
});
