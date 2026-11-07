import { fireEvent, waitFor } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';
import { StyleSheet } from 'react-native';

import {
  BusinessProfileCard,
  CheckboxField,
  CoreTextField,
  DeviceSessionCard,
  PasswordStrengthMeter,
  PinCodeInput,
  PropertyFactRow,
  PropertyPhotoGallery,
  SearchField,
  SettingsRow,
  measurePasswordStrength,
} from '@/components/core';
import { businessProfileFixture, currentDeviceFixture, otherDeviceFixture, propertyPhotoFixtures } from '../fixtures/reference-components';
import { renderWithProviders } from '../utils/render';

describe('new reusable components from screen references', () => {
  it('shows accessible input errors and toggles password visibility', async () => {
    const onChangeText = jest.fn();
    const { getByLabelText, getByRole, getByTestId } = await renderWithProviders(
      <CoreTextField label="Password" value="secret" onChangeText={onChangeText} secureTextEntry errorMessage="Password is required" testID="password-input" />,
    );

    expect(getByRole('alert').props.children).toBe('Password is required');
    expect(getByTestId('password-input').props.secureTextEntry).toBe(true);
    await fireEvent.press(getByRole('button', { name: 'Show password' }));
    expect(getByTestId('password-input').props.secureTextEntry).toBe(false);
    expect(getByLabelText('Password')).toBeTruthy();
  });

  it('clears a search query through the supplied callback', async () => {
    const onChangeText = jest.fn();
    const { getByRole } = await renderWithProviders(
      <SearchField value="Tirunelveli" onChangeText={onChangeText} placeholder="Search properties" />,
    );

    await fireEvent.press(getByRole('button', { name: 'Clear search' }));
    expect(onChangeText).toHaveBeenCalledWith('');
  });

  it('reserves the input focus outline space to avoid moving the field', async () => {
    const { getByTestId } = await renderWithProviders(
      <CoreTextField value="" onChangeText={() => undefined} testID="stable-focus-field" />,
    );
    const input = getByTestId('stable-focus-field');
    const idleStyle = StyleSheet.flatten(input.parent?.props.style);

    await fireEvent(input, 'focus');
    const focusedStyle = StyleSheet.flatten(getByTestId('stable-focus-field').parent?.props.style);

    expect(idleStyle.borderWidth).toBe(focusedStyle.borderWidth);
    expect(idleStyle.borderColor).toBe('transparent');
    expect(focusedStyle.borderColor).not.toBe('transparent');
  });

  it('toggles an agreement checkbox and shows its validation message', async () => {
    const onValueChange = jest.fn();
    const { getByRole } = await renderWithProviders(
      <CheckboxField label="I agree to the terms" value={false} onValueChange={onValueChange} errorMessage="Agreement is required" />,
    );

    expect(getByRole('alert').props.children).toBe('Agreement is required');
    await fireEvent.press(getByRole('checkbox', { name: 'I agree to the terms' }));
    expect(onValueChange).toHaveBeenCalledWith(true);
  });

  it('measures password strength consistently and renders the label', async () => {
    expect(measurePasswordStrength('short')).toBe('weak');
    expect(measurePasswordStrength('GoodPass12')).toBe('good');
    expect(measurePasswordStrength('VeryStrongPass12!')).toBe('strong');
    const { getByLabelText } = await renderWithProviders(<PasswordStrengthMeter password="VeryStrongPass12!" />);
    expect(getByLabelText('Password strength: strong')).toBeTruthy();
  });

  it('sanitizes PIN entry and exposes progress accessibly', async () => {
    const onChangeText = jest.fn();
    const { getByTestId, getByLabelText } = await renderWithProviders(
      <PinCodeInput value="12" onChangeText={onChangeText} testID="pin-entry" />,
    );

    expect(getByLabelText('Security PIN, 2 of 4 digits entered')).toBeTruthy();
    await fireEvent.changeText(getByTestId('pin-entry'), '3a456');
    expect(onChangeText).toHaveBeenCalledWith('3456');
  });

  it('shows property facts and changes the selected gallery photo', async () => {
    const onIndexChange = jest.fn();
    const { getByText, getByRole } = await renderWithProviders(
      <>
        <PropertyFactRow icon="domain" label="Frontage" value="180 Feet" detail="North-facing" />
        <PropertyPhotoGallery photos={propertyPhotoFixtures} currentIndex={0} onIndexChange={onIndexChange} />
      </>,
    );

    expect(getByText('180 Feet')).toBeTruthy();
    expect(getByText('1 / 2')).toBeTruthy();
    await fireEvent.press(getByRole('button', { name: 'Next photo' }));
    expect(onIndexChange).toHaveBeenCalledWith(1);
  });

  it('renders the empty photo state and clamps gallery navigation at boundaries', async () => {
    const onIndexChange = jest.fn();
    const { getByText, queryByRole } = await renderWithProviders(
      <PropertyPhotoGallery photos={[]} currentIndex={3} onIndexChange={onIndexChange} />,
    );
    expect(getByText('No property photos available')).toBeTruthy();
    expect(queryByRole('button', { name: 'Next photo' })).toBeNull();
    await waitFor(() => expect(onIndexChange).not.toHaveBeenCalled());
  });

  it('falls back when the active property image fails to load', async () => {
    const { getAllByLabelText, getByLabelText } = await renderWithProviders(
      <PropertyPhotoGallery photos={propertyPhotoFixtures} currentIndex={0} />,
    );
    await fireEvent(getAllByLabelText('Farm frontage')[0], 'error');
    expect(getByLabelText('Property photo unavailable')).toBeTruthy();
  });

  it('forwards settings row press and switch changes', async () => {
    const onPress = jest.fn();
    const onSwitchChange = jest.fn();
    const { getByRole } = await renderWithProviders(
      <>
        <SettingsRow title="Business profile" description="Contact details" icon="person" onPress={onPress} />
        <SettingsRow title="Biometric unlock" icon="fingerprint" switchValue={false} onSwitchChange={onSwitchChange} />
      </>,
    );

    await fireEvent.press(getByRole('button', { name: 'Business profile' }));
    expect(onPress).toHaveBeenCalledTimes(1);
    await fireEvent(getByRole('switch', { name: 'Biometric unlock' }), 'valueChange', true);
    expect(onSwitchChange).toHaveBeenCalledWith(true);
  });

  it('keeps current sessions non-signout-able and allows ending another session', async () => {
    const onSignOut = jest.fn();
    const { getByText, getByRole, queryByRole } = await renderWithProviders(
      <>
        <DeviceSessionCard {...currentDeviceFixture} onSignOut={onSignOut} />
        <DeviceSessionCard {...otherDeviceFixture} onSignOut={onSignOut} />
      </>,
    );

    expect(getByText('Current')).toBeTruthy();
    expect(queryByRole('button', { name: 'Sign out iPhone 15 Pro' })).toBeNull();
    await fireEvent.press(getByRole('button', { name: 'Sign out MacBook Pro' }));
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });

  it('shows public business contact details and forwards contact actions', async () => {
    const onPressPhone = jest.fn();
    const onPressEmail = jest.fn();
    const { getByRole, getByText } = await renderWithProviders(
      <BusinessProfileCard {...businessProfileFixture} onPressPhone={onPressPhone} onPressEmail={onPressEmail} />,
    );

    expect(getByText('Vance Real Estate')).toBeTruthy();
    expect(getByText('Tirunelveli, Tamil Nadu')).toBeTruthy();
    await fireEvent.press(getByRole('button', { name: 'Phone: +91 98401 23456' }));
    await fireEvent.press(getByRole('button', { name: 'Email: marcus@example.test' }));
    expect(onPressPhone).toHaveBeenCalledTimes(1);
    expect(onPressEmail).toHaveBeenCalledTimes(1);
  });
});
