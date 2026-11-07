import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent } from '@testing-library/react-native';
import { Linking } from 'react-native';

import { HelpSupportScreen, PrivacyPolicyScreen, TermsOfServiceScreen } from '@/screens/info-pages-screen';
import { renderWithProviders } from '../utils/render';
import { supportGuideSearchFixture } from '../fixtures/info-pages';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: { canGoBack: () => true, back: jest.fn(), push: (...args: unknown[]) => mockPush(...args), replace: jest.fn() },
  useRouter: () => ({ canGoBack: () => true, back: jest.fn(), push: (...args: unknown[]) => mockPush(...args), replace: jest.fn() }),
}));

describe('legal and support pages', () => {
  beforeEach(() => mockPush.mockClear());

  it('renders privacy sections, lets users open sections and routes privacy preferences', async () => {
    const { findByText, getByRole } = await renderWithProviders(<PrivacyPolicyScreen />);
    expect(await findByText('Zero-Knowledge Guard')).toBeTruthy();
    fireEvent.press(getByRole('button', { name: 'How We Use Your Data' }));
    expect(await findByText(/buyer portals and brokerage operations/)).toBeTruthy();
    await fireEvent.press(getByRole('button', { name: 'Retention & Your Rights' }));
    expect(getByRole('button', { name: 'Retention & Your Rights' }).props.accessibilityState.expanded).toBe(true);
    fireEvent.press(getByRole('button', { name: 'Manage privacy preferences' }));
    expect(mockPush).toHaveBeenCalledWith('/settings/sharing-defaults');
  });

  it('shows terms clauses and stores acknowledgment locally', async () => {
    const { findByText, getByRole } = await renderWithProviders(<TermsOfServiceScreen />);
    expect(await findByText('Core Provisions')).toBeTruthy();
    await fireEvent.press(getByRole('button', { name: 'Acceptance of Terms & Eligibility' }));
    expect(getByRole('button', { name: 'Acceptance of Terms & Eligibility' }).props.accessibilityState.expanded).toBe(true);
    fireEvent.press(getByRole('button', { name: 'I understand & agree' }));
    expect(await findByText('Agreement acknowledged')).toBeTruthy();
  });

  it('filters support guides and validates a ticket before opening an email draft', async () => {
    const { findByText, getByRole, getByLabelText, queryByText } = await renderWithProviders(<HelpSupportScreen />);
    await fireEvent.changeText(getByLabelText('Search help guides'), supportGuideSearchFixture.query);
    expect(await findByText(supportGuideSearchFixture.expectedQuestion)).toBeTruthy();
    expect(queryByText('How does Broker Vault protect owner contact details?')).toBeNull();
    await fireEvent.press(getByRole('button', { name: 'Prepare email request' }));
    expect(await findByText('Choose a ticket category.')).toBeTruthy();
    await fireEvent.press(getByRole('radio', { name: 'Patta / FMB Cadastral Sync' }));
    expect(getByRole('radio', { name: 'Patta / FMB Cadastral Sync' }).props.accessibilityState.checked).toBe(true);
    await fireEvent.changeText(getByLabelText('Support request description'), 'The survey map does not finish syncing to my property listing.');
    expect(getByLabelText('Support request description').props.value).toBe('The survey map does not finish syncing to my property listing.');
    const openUrl = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    await fireEvent.press(getByRole('button', { name: 'Prepare email request' }));
    expect(openUrl).toHaveBeenCalledWith(expect.stringContaining('mailto:support@estateflow.io'));
  });
});
