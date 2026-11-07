import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { mockSharedLinks } from '@/data/mock/shared-links';
import { useLocalProperties } from '@/data/database';
import SharedLinksScreen from '@/screens/shared-links-screen';
import { renderWithProviders } from '../utils/render';

jest.mock('@expo/ui/swift-ui', () => jest.requireActual('../utils/mock-swift-menu'));
jest.mock('@expo/ui/community/bottom-sheet', () => {
  const { View, Pressable, Text } = require('react-native');
  return { __esModule: true, default: ({ index, onClose, children }: { index: number; onClose: () => void; children: React.ReactNode }) => index >= 0
    ? <View><Pressable accessibilityRole="button" accessibilityLabel="Dismiss native sheet" onPress={onClose}><Text>Dismiss</Text></Pressable>{children}</View>
    : null };
});
jest.mock('@/data/database', () => ({ useLocalProperties: jest.fn() }));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn(async () => undefined) }));
jest.mock('@expo/ui', () => {
  const { View } = require('react-native');
  return {
    RNHostView: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
  };
});

describe('shared link editing', () => {
  it('opens the edit form and saves title changes', async () => {
    jest.mocked(useLocalProperties).mockReturnValue({ data: [], isPending: false, isError: false, refetch: jest.fn() } as never);
    const { getByRole, getByLabelText, getByTestId, findByText } = await renderWithProviders(<SharedLinksScreen />);
    fireEvent.press(await waitFor(() => getByRole('button', { name: `Actions for ${mockSharedLinks[0].title}` })));
    fireEvent.press(await waitFor(() => getByRole('button', { name: 'Edit' })));
    expect(await findByText('Edit shared link')).toBeTruthy();
    fireEvent.changeText(getByLabelText('Shared link title'), 'Updated farm brochure');
    fireEvent.press(getByTestId('save-shared-link'));
    expect(await findByText('Shared link updated.')).toBeTruthy();
  });

});
