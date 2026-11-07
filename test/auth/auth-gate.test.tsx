import { fireEvent, waitFor } from '@testing-library/react-native';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Text } from 'react-native';

import { AuthGate } from '@/auth/auth-gate';
import { useAuth } from '@/auth/auth-provider';
import { renderWithProviders } from '../utils/render';

jest.mock('@/auth/auth-provider', () => ({ useAuth: jest.fn() }));
const mockedUseAuth = jest.mocked(useAuth);

function authFixture(overrides: Record<string, unknown> = {}) {
  return {
    accessToken: null, currentUser: null, isLoading: false, isAuthenticated: false, isReady: true,
    error: null, signIn: jest.fn(async (_email: string, _password: string) => undefined),
    signUp: jest.fn(async (_input: { fullName: string; email: string; phoneNumber: string; password: string }) => undefined),
    clearError: jest.fn(), signOut: jest.fn(async () => undefined), ...overrides,
  };
}

describe('AuthGate password flow', () => {
  beforeEach(() => { mockedUseAuth.mockReset(); });

  it('opens the workspace immediately after authentication without an onboarding gate', async () => {
    const auth = authFixture({ accessToken: 'access-fixture', isAuthenticated: true });
    mockedUseAuth.mockReturnValue(auth as ReturnType<typeof useAuth>);
    const { getByText, queryByText } = await renderWithProviders(
      <AuthGate><Text>Workspace home</Text></AuthGate>,
    );

    expect(getByText('Workspace home')).toBeTruthy();
    expect(queryByText('Make Broaker yours')).toBeNull();
  });

  it('submits email and password through the auth abstraction', async () => {
    const auth = authFixture();
    mockedUseAuth.mockReturnValue(auth as ReturnType<typeof useAuth>);
    const { getByLabelText, getByRole } = await renderWithProviders(<AuthGate><></></AuthGate>);
    await fireEvent.changeText(getByLabelText('Email'), 'broker@example.test');
    await fireEvent.changeText(getByLabelText('Password'), 'secret');
    await fireEvent.press(getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(auth.signIn).toHaveBeenCalledWith('broker@example.test', 'secret'));
  });

  it('blocks username-only sign-in before it can trigger the API email validation error', async () => {
    const auth = authFixture();
    mockedUseAuth.mockReturnValue(auth as ReturnType<typeof useAuth>);
    const { getByLabelText, getByRole, getByTestId } = await renderWithProviders(<AuthGate><></></AuthGate>);
    await fireEvent.changeText(getByLabelText('Email'), 'test-broker');
    await fireEvent.changeText(getByLabelText('Password'), 'test-broker-password');
    expect(getByTestId('email-validation-error').props.children).toContain('Use your email, not a username.');
    expect(getByRole('button', { name: 'Sign in' }).props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(getByRole('button', { name: 'Sign in' }));
    expect(auth.signIn).not.toHaveBeenCalled();
  });

  it('shows signup fields and sends the new account details', async () => {
    const auth = authFixture();
    mockedUseAuth.mockReturnValue(auth as ReturnType<typeof useAuth>);
    const { getByLabelText, getByRole } = await renderWithProviders(<AuthGate><></></AuthGate>);
    await fireEvent.press(getByRole('button', { name: 'Create an account' }));
    await fireEvent.changeText(getByLabelText('Full name'), 'Asha Nair');
    await fireEvent.changeText(getByLabelText('Phone number'), '+919876543210');
    await fireEvent.changeText(getByLabelText('Email'), 'asha@example.test');
    await fireEvent.changeText(getByLabelText('Password'), 'a-long-password');
    await fireEvent.press(getByRole('button', { name: 'Create account' }));
    await waitFor(() => expect(auth.signUp).toHaveBeenCalledWith({
      fullName: 'Asha Nair', phoneNumber: '+919876543210', email: 'asha@example.test', password: 'a-long-password',
    }));
  });

  it('blocks invalid signup email, phone, and full name before calling the API', async () => {
    const auth = authFixture();
    mockedUseAuth.mockReturnValue(auth as ReturnType<typeof useAuth>);
    const { getByLabelText, getByRole } = await renderWithProviders(<AuthGate><></></AuthGate>);
    await fireEvent.press(getByRole('button', { name: 'Create an account' }));
    await fireEvent.changeText(getByLabelText('Full name'), 'A');
    await fireEvent.changeText(getByLabelText('Phone number'), '123');
    await fireEvent.changeText(getByLabelText('Email'), 'not-an-email');
    await fireEvent.changeText(getByLabelText('Password'), 'a-long-password');
    expect(getByRole('button', { name: 'Create account' }).props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(getByRole('button', { name: 'Create account' }));
    expect(auth.signUp).not.toHaveBeenCalled();
  });

  it('shows API errors with alert semantics', async () => {
    mockedUseAuth.mockReturnValue(authFixture({ error: 'Email or password is incorrect.' }) as ReturnType<typeof useAuth>);
    const { getByRole } = await renderWithProviders(<AuthGate><></></AuthGate>);
    expect(getByRole('alert').props.children).toBe('Email or password is incorrect.');
  });
});
