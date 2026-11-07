import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, waitFor } from '@testing-library/react-native';
import type MockAdapter from 'axios-mock-adapter';
import * as ImagePicker from 'expo-image-picker';

import { OnboardingScreen } from '@/auth/onboarding-screen';
import { renderWithProviders } from '../utils/render';
import { createApiMock } from '../utils/mock-api';

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
}));

describe('OnboardingScreen', () => {
  let apiMock: MockAdapter;

  beforeAll(() => { apiMock = createApiMock(); });
  beforeEach(() => { apiMock.reset(); });
  afterAll(() => { apiMock.restore(); });

  it('validates the profile, saves it, and only completes after preferences and onboarding progress save', async () => {
    const onComplete = jest.fn();
    const { getByRole, getByTestId, getByLabelText, getAllByText, findByText } = await renderWithProviders(<OnboardingScreen accessToken="access-fixture" onComplete={onComplete} />);

    await fireEvent.press(getByTestId('start-onboarding-profile'));
    await fireEvent.press(getByTestId('continue-onboarding-channels'));
    await waitFor(() => expect(getAllByText('Enter your full name to continue.')).toHaveLength(2));
    expect(getByLabelText('Full legal name').parent?.props.style).toBeDefined();
    expect(getByTestId('toast')).toBeTruthy();
    expect(apiMock.history.put).toHaveLength(0);

    await fireEvent.changeText(getByLabelText('Full legal name'), 'Asha Nair');
    await fireEvent.changeText(getByLabelText('Business name'), 'Nair Properties');
    await fireEvent.changeText(getByLabelText('Public phone / WhatsApp'), '+919876543210');
    apiMock.onPut('/profile/broker').reply(200, {});
    apiMock.onPut('/profile/business').reply(200, {});
    apiMock.onPatch('/profile/onboarding').replyOnce(200, { completed: false, current_step: 'channels', completed_steps: ['profile'] });
    apiMock.onPatch('/profile/preferences').reply(200, {});
    apiMock.onPatch('/profile/onboarding').replyOnce(200, { completed: true, current_step: 'complete', completed_steps: ['profile', 'channels', 'complete'] });

    await fireEvent.press(getByTestId('continue-onboarding-channels'));
    expect(await findByText('Connect Client Channels')).toBeTruthy();
    expect(JSON.parse(apiMock.history.put[0].data as string)).toMatchObject({ legal_name: 'Asha Nair', operating_language: 'en' });
    expect(JSON.parse(apiMock.history.put[0].data as string)).not.toHaveProperty('business_name');
    expect(JSON.parse(apiMock.history.put[1].data as string)).toMatchObject({ business_name: 'Nair Properties', public_phone: '+919876543210' });

    const priceSwitch = getByRole('switch', { name: 'Show price by default' });
    await fireEvent(priceSwitch, 'valueChange', true);
    expect(getByTestId('disclosure-switch-show_price').props.value).toBe(true);
    await fireEvent.press(getByTestId('finish-onboarding'));
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    expect(JSON.parse(apiMock.history.patch[0].data as string)).toEqual({ current_step: 'channels', completed_steps: ['profile'] });
    expect(JSON.parse(apiMock.history.patch[1].data as string)).toMatchObject({ default_disclosures: { show_price: true } });
    expect(JSON.parse(apiMock.history.patch[2].data as string)).toEqual({ current_step: 'complete', completed_steps: ['profile', 'channels', 'complete'] });
  });

  it('prefills the signup name and uses the signup phone for WhatsApp by default', async () => {
    const { getByLabelText, getByTestId, queryByLabelText } = await renderWithProviders(
      <OnboardingScreen accessToken="access-fixture" accountFullName="Asha Nair" accountPhone="+919876543210" onComplete={jest.fn()} />,
    );
    await fireEvent.press(getByTestId('start-onboarding-profile'));

    expect(getByLabelText('Full legal name').props.value).toBe('Asha Nair');
    expect(getByLabelText('Use a different WhatsApp number').props.accessibilityState.checked).toBe(false);
    expect(queryByLabelText('Public phone / WhatsApp')).toBeNull();

    apiMock.onPut('/profile/broker').reply(200, {});
    apiMock.onPut('/profile/business').reply(200, {});
    apiMock.onPatch('/profile/onboarding').reply(200, { completed: false, current_step: 'channels', completed_steps: ['profile'] });
    await fireEvent.press(getByTestId('continue-onboarding-channels'));
    await waitFor(() => expect(apiMock.history.put).toHaveLength(2));
    expect(JSON.parse(apiMock.history.put[1].data as string).public_phone).toBe('+919876543210');
  });

  it('asks for a separate WhatsApp number only after the user chooses a different number', async () => {
    const { getByLabelText, getByTestId } = await renderWithProviders(
      <OnboardingScreen accessToken="access-fixture" accountFullName="Asha Nair" accountPhone="+919876543210" onComplete={jest.fn()} />,
    );
    await fireEvent.press(getByTestId('start-onboarding-profile'));
    await fireEvent.press(getByLabelText('Use a different WhatsApp number'));
    expect(getByLabelText('Different WhatsApp number')).toBeTruthy();
    await fireEvent.changeText(getByLabelText('Different WhatsApp number'), '+919999999999');

    apiMock.onPut('/profile/broker').reply(200, {});
    apiMock.onPut('/profile/business').reply(200, {});
    apiMock.onPatch('/profile/onboarding').reply(200, { completed: false, current_step: 'channels', completed_steps: ['profile'] });
    await fireEvent.press(getByTestId('continue-onboarding-channels'));
    await waitFor(() => expect(apiMock.history.put).toHaveLength(2));
    expect(JSON.parse(apiMock.history.put[1].data as string).public_phone).toBe('+919999999999');
  });

  it('offers profile photo selection with preview and removal, and keeps only Continue in the profile footer', async () => {
    const { getByLabelText, getByTestId, queryByLabelText, queryByRole } = await renderWithProviders(
      <OnboardingScreen accessToken="access-fixture" onComplete={jest.fn()} />,
    );
    expect(getByTestId('onboarding-fixed-header')).toBeTruthy();
    await fireEvent.press(getByTestId('start-onboarding-profile'));

    expect(getByLabelText('Go back')).toBeTruthy();
    expect(queryByRole('button', { name: 'Back' })).toBeNull();
    const picker = jest.mocked(ImagePicker.launchImageLibraryAsync);
    picker.mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file:///profile-photo.jpg' }],
    } as ImagePicker.ImagePickerResult);
    await fireEvent.press(getByTestId('upload-profile-photo'));
    expect(await getByLabelText('Selected profile photo')).toBeTruthy();

    await fireEvent.press(getByTestId('remove-profile-photo'));
    expect(queryByLabelText('Selected profile photo')).toBeNull();
  });

  it('shows the backend validation reason when a profile request is rejected', async () => {
    const { getByLabelText, getByTestId, findByText } = await renderWithProviders(
      <OnboardingScreen accessToken="access-fixture" onComplete={jest.fn()} />,
    );
    await fireEvent.press(getByTestId('start-onboarding-profile'));
    await fireEvent.changeText(getByLabelText('Full legal name'), 'Asha Nair');
    await fireEvent.changeText(getByLabelText('Public phone / WhatsApp'), '+919876543210');
    apiMock.onPut('/profile/broker').reply(422, { detail: [{ loc: ['body', 'unexpected'], msg: 'Extra inputs are not permitted' }] });

    await fireEvent.press(getByTestId('continue-onboarding-channels'));

    expect(await findByText('body.unexpected: Extra inputs are not permitted')).toBeTruthy();
  });

  it('shows the backend error when saving client preferences fails', async () => {
    const { getByTestId, findByText } = await renderWithProviders(
      <OnboardingScreen accessToken="access-fixture" initialStep="channels" onComplete={jest.fn()} />,
    );
    apiMock.onPatch('/profile/preferences').reply(500, { detail: 'Could not persist preferences' });

    await fireEvent.press(getByTestId('finish-onboarding'));

    expect(await findByText('Could not persist preferences')).toBeTruthy();
  });

  it('shows a readable error when the photo picker fails', async () => {
    const { findByText, getByTestId } = await renderWithProviders(
      <OnboardingScreen accessToken="access-fixture" onComplete={jest.fn()} />,
    );
    await fireEvent.press(getByTestId('start-onboarding-profile'));
    jest.mocked(ImagePicker.launchImageLibraryAsync).mockRejectedValueOnce(new Error('picker unavailable'));
    await fireEvent.press(getByTestId('upload-profile-photo'));
    expect(await findByText('We could not open your photo library. Check your device settings and try again.')).toBeTruthy();
  });
});
