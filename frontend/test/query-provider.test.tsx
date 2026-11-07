import { useQuery } from '@tanstack/react-query';
import { focusManager } from '@tanstack/react-query';
import { render } from '@testing-library/react-native';
import { act } from '@testing-library/react-native';
import { AppState, Text, type AppStateStatus } from 'react-native';
import { afterEach, describe, expect, it, jest } from '@jest/globals';

import { QueryProvider } from '@/providers/query-provider';
import { queryResponseFixture } from './fixtures/api';
import { createTestQueryClient, renderWithProviders } from './utils/render';

function HealthQueryProbe() {
  const query = useQuery({
    queryKey: ['test', 'health'],
    queryFn: async () => queryResponseFixture,
  });

  if (query.isPending) return <Text>Loading health</Text>;
  if (query.isError) return <Text>Could not load health</Text>;

  return <Text accessibilityRole="text">{query.data.message}</Text>;
}

describe('renderWithProviders', () => {
  afterEach(() => focusManager.setFocused(undefined));

  it('provides an isolated TanStack Query client to test components', async () => {
    const { findByText, queryClient } = await renderWithProviders(<HealthQueryProbe />);

    expect(await findByText('Mock query data')).toBeTruthy();
    expect(queryClient.getQueryData(['test', 'health'])).toEqual(queryResponseFixture);
  });

  it('mounts the production query provider and renders its loaded state', async () => {
    const client = createTestQueryClient();
    const { findByText, unmount } = await render(
      <QueryProvider client={client}>
        <HealthQueryProbe />
      </QueryProvider>,
    );

    expect(await findByText('Mock query data')).toBeTruthy();
    await unmount();
    client.clear();
  });

  it('updates query focus from native app state and removes the listener on unmount', async () => {
    let onAppStateChange: ((state: AppStateStatus) => void) | undefined;
    const removeListener = jest.fn();
    const addListener = jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, listener) => {
      onAppStateChange = listener;
      return { remove: removeListener };
    });
    const client = createTestQueryClient();
    const { unmount } = await render(
      <QueryProvider client={client}>
        <Text>Query provider</Text>
      </QueryProvider>,
    );

    await act(async () => onAppStateChange?.('background'));
    expect(focusManager.isFocused()).toBe(false);

    await act(async () => onAppStateChange?.('active'));
    expect(focusManager.isFocused()).toBe(true);

    await unmount();
    expect(removeListener).toHaveBeenCalledTimes(1);
    addListener.mockRestore();
    client.clear();
  });
});
