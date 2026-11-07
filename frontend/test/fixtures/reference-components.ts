import type { DeviceSessionCardProps, PropertyPhoto } from '@/components/core';

export const propertyPhotoFixtures: PropertyPhoto[] = [
  { uri: 'https://images.example.test/estate-1.jpg', accessibilityLabel: 'Farm frontage' },
  { uri: 'https://images.example.test/estate-2.jpg', accessibilityLabel: 'Farm well' },
];

export const businessProfileFixture = {
  businessName: 'Vance Real Estate',
  representativeName: 'Marcus Vance',
  location: 'Tirunelveli, Tamil Nadu',
  phone: '+91 98401 23456',
  email: 'marcus@example.test',
} as const;

export const currentDeviceFixture: DeviceSessionCardProps = {
  deviceName: 'iPhone 15 Pro',
  platformLabel: 'Broaker iOS',
  locationLabel: 'Chennai, India',
  lastActiveLabel: 'Active now',
  isCurrent: true,
};

export const otherDeviceFixture: DeviceSessionCardProps = {
  deviceName: 'MacBook Pro',
  platformLabel: 'Chrome Desktop',
  locationLabel: 'Bangalore, India',
  lastActiveLabel: 'Active 2h ago',
  icon: 'laptop',
};
