import { Pressable, StyleSheet, View } from 'react-native';

import { AppIcon } from '../icons';
import { Radius, Spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/theme-provider';
import { useLanguage } from '@/i18n/language-provider';
import { SearchField, type SearchFieldProps } from './SearchField';

export interface SearchFilterRowProps extends SearchFieldProps {
  filterActive?: boolean;
  onPressFilter: () => void;
  filterButtonLabel?: string;
}

export function SearchFilterRow({
  filterActive = false,
  onPressFilter,
  filterButtonLabel = 'Filter options',
  ...searchProps
}: SearchFilterRowProps) {
  const colors = useTheme();
  const { translate } = useLanguage();
  return (
    <View testID="search-filter-parent" style={styles.row}>
      <SearchField {...searchProps} style={styles.search} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={translate(filterButtonLabel)}
        accessibilityState={{ selected: filterActive }}
        onPress={onPressFilter}
        style={[
          styles.button,
          { backgroundColor: filterActive ? colors.surfaceHigh : colors.surfaceContainer },
        ]}>
        <AppIcon name="tune" size={20} color={filterActive ? colors.accent : colors.textSecondary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  search: { flexGrow: 1, flexShrink: 1, flexBasis: 0, width: 0, minWidth: 0 },
  button: {
    width: 48,
    height: 48,
    flexShrink: 0,
    borderRadius: Radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
