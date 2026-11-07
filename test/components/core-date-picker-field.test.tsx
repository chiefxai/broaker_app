import { fireEvent } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';
import { CoreDatePickerField } from '@/components/core/forms/CoreDatePickerField';
import { renderWithProviders } from '../utils/render';

jest.mock('@expo/ui/community/datetime-picker', () => {
  const { Pressable, Text } = require('react-native');
  return { DateTimePicker: ({ onValueChange, testID }: { onValueChange: (_event: unknown, value: Date) => void; testID?: string }) => (
    <Pressable testID={testID ?? 'mock-date-picker'} accessibilityRole="button" accessibilityLabel="Mock choose date" onPress={() => onValueChange({}, new Date(2027, 3, 5))}><Text>Choose date</Text></Pressable>
  ) };
});

describe('CoreDatePickerField', () => {
  it('reports the selected calendar date in the API date format', async () => {
    const onChange = jest.fn();
    const { getByRole } = await renderWithProviders(<CoreDatePickerField label="Expiry" value="2027-01-02" onChange={onChange} />);
    fireEvent.press(getByRole('button', { name: 'Mock choose date' }));
    expect(onChange).toHaveBeenCalledWith('2027-04-05');
  });
});
