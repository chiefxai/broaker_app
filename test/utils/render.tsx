import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { ReactElement } from 'react';

import { AppThemeProvider } from '@/theme/theme-provider';
import { ToastProvider } from '@/components/core/toast/ToastProvider';
import { LanguageProvider } from '@/i18n/language-provider';

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

export async function renderWithProviders(
  ui: ReactElement,
  queryClient = createTestQueryClient(),
) {
  const result = await render(
    <AppThemeProvider>
      <LanguageProvider>
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 320, height: 640 },
          insets: { top: 0, right: 0, bottom: 0, left: 0 },
        }}>
        <ToastProvider><QueryClientProvider client={queryClient}>{ui}</QueryClientProvider></ToastProvider>
      </SafeAreaProvider>
      </LanguageProvider>
    </AppThemeProvider>,
  );

  return { ...result, queryClient };
}
