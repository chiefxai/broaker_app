export const serviceUnavailableFixture = {
  detail: 'Required service configuration is unavailable',
} as const;

export const unauthorizedResponseFixture = {
  detail: 'Missing or invalid Cognito access token',
} as const;

export const currentUserResponseFixture = {
  sub: 'cognito-user-fixture',
  username: 'broker@example.test',
  scope: 'openid profile',
} as const;

export const presignUploadRequestFixture = {
  filename: 'title-deed.pdf',
  content_type: 'application/pdf',
} as const;

export const presignUploadResponseFixture = {
  upload_url: 'https://storage.example.com/signed-upload/test',
  object_key: 'users/cognito-user-fixture/documents/generated-id.pdf',
  method: 'PUT',
  expires_in: 600,
  content_type: 'application/pdf',
} as const;

export const signingAuthorityResponseFixture = {
  id: '406180e1-f4a6-42a8-a95d-bae90de20b12',
  name: 'Asha Nair',
  phone: '+919876543210',
  relationship: 'Co-owner',
  record_label: 'Patta',
  record_value: '219/3',
  verification_status: 'pending',
  signature_status: 'pending',
  created_at: '2026-11-05T09:00:00Z',
  updated_at: '2026-11-05T09:00:00Z',
} as const;

export const signingAuthorityInputFixture = {
  name: 'Asha Nair',
  phone: '+919876543210',
  relationship: 'Co-owner',
  record_label: 'Patta',
  record_value: '219/3',
} as const;

export const queryResponseFixture = {
  id: 'query-fixture',
  message: 'Mock query data',
} as const;

export const accessTokenFixture = 'test-cognito-access-token';
