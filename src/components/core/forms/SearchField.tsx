import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { CoreTextField } from './CoreTextField';

export interface SearchFieldProps {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  accessibilityLabel?: string;
  onSubmitEditing?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function SearchField({
  value,
  onChangeText,
  placeholder = 'Search',
  accessibilityLabel = 'Search',
  onSubmitEditing,
  style,
  testID,
}: SearchFieldProps) {
  return (
      <CoreTextField
        accessibilityLabel={accessibilityLabel}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        leadingIcon="search"
        clearable
        onSubmitEditing={onSubmitEditing ? () => onSubmitEditing() : undefined}
        returnKeyType="search"
        testID={testID}
        style={[styles.field, style]}
      />
  );
}

const styles = StyleSheet.create({
  field: { gap: 0 },
});
