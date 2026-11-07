# Broaker API contract

**Audience:** frontend and backend teams  
**Version:** v1  
**Status:** MVP endpoints described here are implemented in the backend. Team routes remain deferred.

The machine-readable companion is [`openapi.yaml`](openapi.yaml). The routes described below are implemented; product policies that could change validation or disclosure behavior are listed at the end.

## 1. Contract conventions

- Base path: `https://{api-host}/api/v1` (except `/health`).
- Request and response bodies use JSON with UTF-8 encoding.
- Dates and times use ISO 8601 UTC strings. Resource identifiers are UUID strings.
- All private API routes require `Authorization: Bearer <access token>` from the configured auth provider. Send the access token, not an ID token.
- API responses include browser security headers: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, and a restrictive `Permissions-Policy`.
- Local testing uses the backend-owned password provider. It is enabled only for local, development, or test environments, stores Argon2id password hashes, and issues short-lived signed access tokens. Do not expose this mode in production. Production authentication should use a managed identity provider such as Cognito.
- The API uses FastAPI's standard error shape: `{ "detail": "..." }`. Validation errors may return an array of field errors under `detail`.
- List routes use `limit` and `offset`; default `limit` is 20 and maximum is 100. Filter and sort parameters are described below.
- Currency amounts are integer Indian rupees (INR). Land extent is a decimal number paired with an explicit unit. Do not infer a unit from the number.

### Authentication and authorization

Send a valid access token from the configured auth provider on private routes. Local password tokens are signed by the API; managed identity-provider tokens are verified through their provider. Missing or invalid credentials return `401`. A valid user without access to a resource currently receives `404` to avoid disclosing resource existence. The backend derives the caller identity from the validated token; clients must not submit an owner ID as proof of ownership.

Local password registration creates the account row before issuing a token. Managed OIDC providers may create the local account row from a verified provider `sub` on first private API use. If Cognito omits email from its access token, the API reads it with Cognito `GetUser`; grant the app client `aws.cognito.signin.user.admin` for this lookup.

### Common errors

| Status | Meaning |
|---|---|
| `400` | Request cannot be processed in its current state |
| `401` | Missing, invalid, or expired provider access token |
| `403` | Authenticated user is not allowed to perform the action |
| `404` | Resource does not exist or is not visible to the caller |
| `409` | State conflict, such as publishing an incomplete draft |
| `422` | Invalid request fields or unsupported content type |
| `503` | Required service configuration or dependency is unavailable |

## 2. Implemented endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | No | Process liveness response: `{ "status": "ok" }` |
| `GET` | `/api/v1/auth/me` | Bearer access token | Returns `sub`, optional `username`, and optional `scope` |
| `POST` | `/api/v1/auth/register` | No (local password mode only) | Creates a password account and signs it in |
| `POST` | `/api/v1/auth/login` | No (local password mode only) | Authenticates an email/password pair |
| `POST` | `/api/v1/uploads/presign` | Provider | Creates a short-lived direct object-storage upload URL |

### Local password authentication contract (implemented)

Set `AUTH_PROVIDER=password` and a random `PASSWORD_AUTH_SECRET` of at least 32 bytes in the backend environment. Password authentication is rejected outside `local`, `development`, `dev`, or `test` environments. The frontend talks only to the API; password hashes and signing secrets never leave the backend. Passwords are stored as Argon2id hashes. Registration also signs the new account in and returns an access token. Access tokens expire after `PASSWORD_ACCESS_TOKEN_TTL_SECONDS` (default 8 hours); expired sessions require signing in again. Do not use this local provider for public production deployments; use a managed identity provider with account verification, password recovery, and abuse controls.

`POST /auth/login` accepts an email and password and returns the same bearer-token shape as registration. Invalid email/password pairs return the same generic `401` response to avoid revealing whether an account exists.

Request (password is at least 12 characters):

```json
{
  "full_name": "Asha Nair",
  "email": "asha@example.com",
  "phone_number": "+919876543210",
  "password": "a-long-password"
}
```

Share links support `visibility`: `private`, `protected`, or `unlisted` (default `unlisted` for compatibility). A broker can share saved draft or active properties; archived properties cannot be shared. Unlisted links are viewable by anyone holding the URL without signing in. Protected links require only the broker-set 4–12 digit `passcode`, stored as a salted scrypt hash and never returned by the API; no app account is required. Private links require a Bearer access token and are visible only to the account that owns the property. Public listing and document requests for protected links must include `X-Share-Passcode`; private listing and document requests must include `Authorization: Bearer <access token>`. Public discovery is not supported in this release.

Registration response (`201`) and login response (`200`):

```json
{ "access_token": "<short-lived bearer token>", "token_type": "bearer", "expires_in": 28800 }
```

Duplicate email returns `409`; invalid input returns `422`; incorrect login credentials return `401`; missing/disabled local-password configuration returns `503`.

### Presigned upload contract (implemented)

Request:

```json
{
  "filename": "title-deed.pdf",
  "content_type": "application/pdf"
}
```

Response (`200`):

```json
{
  "upload_url": "https://storage.example/...signed...",
  "object_key": "users/{identity-sub}/documents/{generated-id}.pdf",
  "method": "PUT",
  "expires_in": 600,
  "content_type": "application/pdf"
}
```

Supported pairs are `.pdf` / `application/pdf`, `.jpg` or `.jpeg` / `image/jpeg`, `.png` / `image/png`, `.webp` / `image/webp`, `.m4a` / `audio/mp4`, `.aac` / `audio/aac`, `.mp3` / `audio/mpeg`, `.wav` / `audio/wav`, and `.webm` / `audio/webm`. Audio uploads use the same direct S3 flow and 25 MiB default limit. The frontend then sends the raw file bytes directly to `upload_url` using `PUT` and the exact `Content-Type` returned. Do not send the file through the API. The URL expires; request a new one if upload fails after expiry. The object key is generated by the server and scoped to the authenticated provider subject. Property document download and public listing media URLs are temporary too.

The storage bucket must allow browser CORS requests from the deployed frontend origin, including `PUT` and the `Content-Type` header. The configured storage endpoint must be reachable from the user's browser. The general upload route only creates an object URL; the property-scoped flow also registers uploaded document metadata.

## 3. Implemented MVP endpoints

These endpoints support the property workflow in the HTML prototype. The documented filters,
request validation, ownership checks, and response shapes are implemented by the API.

### Profile and onboarding

| Method | Path | Description |
|---|---|---|
| `GET` | `/profile/broker` | Get the authenticated broker's professional profile |
| `PUT` | `/profile/broker` | Create or replace the professional profile |
| `PATCH` | `/profile/broker` | Update selected professional profile fields |
| `GET` | `/profile/business` | Get the broker's business identity and public contact details |
| `PUT` | `/profile/business` | Create or replace the business profile |
| `PATCH` | `/profile/business` | Update selected business profile fields |
| `GET` | `/profile/preferences` | Read language, theme, sharing defaults, and default link expiry |
| `PATCH` | `/profile/preferences` | Update one or more preferences, including default link expiry |
| `GET` | `/onboarding` | Read onboarding progress |
| `PATCH` | `/onboarding` | Save onboarding progress (`current_step: "complete"` marks onboarding complete) |

Broker profile fields include legal name, private mobile, language, professional title, and applicable license details. Business profile fields include business name, public inquiry email and phone, and operating territory. Keep login credentials and identity-provider-managed attributes out of this API.

### Dashboard and properties

| Method | Path | Description |
|---|---|---|
| `GET` | `/dashboard` | Summary metrics, recently added properties, and quick actions |
| `GET` | `/properties` | Search and list properties |
| `POST` | `/properties` | Create a draft property |
| `GET` | `/properties/{property_id}` | Read a property and its saved sections |
| `PATCH` | `/properties/{property_id}` | Update core property fields or save draft changes |
| `DELETE` | `/properties/{property_id}` | Delete an unpublished draft; active properties should be archived |
| `POST` | `/properties/{property_id}/publish` | Validate and publish a draft |
| `POST` | `/properties/{property_id}/archive` | Archive an active property |

Supported list query parameters: `q`, `category`, `status`, `district`, `price_min`, `price_max`, `area_min`, `area_max`, `area_unit`, `sort`, `limit`, and `offset`. `q` searches title, description, and district. Supported sort values are `updated_desc`, `updated_asc`, `price_asc`, and `price_desc`; prices are INR and area values must use the selected `area_unit`.

Suggested initial categories from the HTML are `agriculture`, `plots`, `house_villa`, `commercial`, and `apartment`. Suggested statuses are `draft`, `active`, and `archived`.

### Property wizard sections

| Method | Path | Description |
|---|---|---|
| `PUT` | `/properties/{property_id}/location` | Save address, GPS, survey, dimensions, frontage, and road access |
| `PUT` | `/properties/{property_id}/features` | Save soil, water sources, irrigation, utilities, and agronomy notes |
| `PUT` | `/properties/{property_id}/financials` | Save asking/floor price, extent, advance, negotiation, and loan details |
| `PUT` | `/properties/{property_id}/legal` | Save title classification and legal details |
| `GET` | `/properties/{property_id}/signing-authorities` | List signing-authority records for an owned property |
| `PUT` | `/properties/{property_id}/signing-authorities` | Replace the complete signing-authority list |
| `GET` | `/properties/{property_id}/notes` | Read private broker notes |
| `PUT` | `/properties/{property_id}/notes` | Replace private broker notes |

Each section write is a full replacement of that section (`PUT`), returns the saved section, and must not clear other sections. The property core `PATCH` is a partial update. This allows the six-step editor to save drafts without submitting a full property object each time.

Signing authorities are property-scoped records for up to six external signers. The `PUT` body is `{ "items": [{ "name": "...", "phone": null, "relationship": "...", "record_label": null, "record_value": null }] }`; an empty array clears the section. Name is 1–200 characters, phone up to 40, relationship 1–120, record label up to 120, and record value up to 255. The response for both `GET` and `PUT` is `{ "items": [...] }`; each returned item includes server-generated UUID `id`, UTC timestamps, and `verification_status` / `signature_status`, both fixed to `pending`. The client cannot set verification or signature states. This feature records broker-entered information; it does not verify legal authority, identity, or signatures. Routes are private and only accessible through the owning broker's bearer token.

Publishing is allowed for drafts only and requires a saved location section and a saved financials section. Draft deletion is allowed only while status is `draft`; active properties are archived. Archiving a draft returns `409`.

Suggested property fields include:

```json
{
  "title": "Riverside Farm with Coconut Grove",
  "description": "Farm property with river frontage and borewell access.",
  "category": "agriculture",
  "status": "draft",
  "location": {
    "address_line": "Riverbank Road, Vagaikulam",
    "pincode": "627001",
    "taluk": "Ambasamudram",
    "district": "Tirunelveli",
    "state": "Tamil Nadu",
    "survey_numbers": ["248/1A", "248/2"],
    "latitude": null,
    "longitude": null
  },
  "financials": {
    "asking_price_inr": 3600000,
    "minimum_price_inr": 3450000,
    "area": 150,
    "area_unit": "cent",
    "negotiable": true
  }
}
```

The sample values are illustrative only. Supported reference values are returned by the `/reference/*` endpoints. Public listings return district/state as approximate location; exact coordinates and approach-road details are included only when the share link explicitly enables those disclosures.

### Documents and property media

| Method | Path | Description |
|---|---|---|
| `POST` | `/properties/{property_id}/uploads/presign` | Request an upload URL scoped to an accessible property |
| `POST` | `/properties/{property_id}/documents` | Register an object after the frontend upload succeeds |
| `GET` | `/properties/{property_id}/documents` | List photos and documents attached to a property |
| `GET` | `/documents/{document_id}/download-url` | Create a temporary download URL for an authorized user |
| `PATCH` | `/documents/{document_id}` | Update display name, document category, or visibility |
| `DELETE` | `/documents/{document_id}` | Remove document metadata and delete the object |

The registration request should include the returned `object_key`, original filename, content type, document category, and optional display name. The backend verifies that the key belongs to the caller/property, the object exists, its size is positive and no greater than `S3_MAX_UPLOAD_BYTES` (default 25 MiB), its stored `Content-Type` exactly matches, and its first bytes match the declared PDF/JPEG/PNG/WebP/audio signature before saving the row with `upload_status: "uploaded"`. Register voice recordings with category `voice_memo`; they remain private and cannot be changed to shared or public visibility. They are excluded from public listing media and documents. On success, the object is storage-verified; legal documents are ready for legal review, and voice memos are ready for private playback. Registration returns `422` with a `{ "detail": "..." }` message for a missing, oversized, empty, or mismatched object, and `503` when storage cannot be checked. The frontend must treat storage URLs as temporary and must not persist them as document identifiers.

For local, development, and test environments, unset S3 settings default to MinIO at `http://localhost:9000`, bucket `broaker-documents`, and the local credentials shown in `.env.example`. Production does not receive these defaults and must configure its own S3-compatible endpoint, bucket, and credentials. Set `S3_PUBLIC_ENDPOINT_URL` to a host reachable by the client's device; for a physical phone, `localhost` refers to the phone itself.

### Share links and public listing view

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/properties/{property_id}/share-links` | Provider | List share links for an accessible property, paginated |
| `POST` | `/properties/{property_id}/share-links` | Provider | Create a link with disclosure settings |
| `GET` | `/share-links/{share_link_id}` | Provider | Read link settings |
| `PATCH` | `/share-links/{share_link_id}` | Provider | Change disclosure settings or expiry |
| `DELETE` | `/share-links/{share_link_id}` | Provider | Revoke a link |
| `GET` | `/public/listings/{token}` | Visibility-based | Unlisted links are anonymous; Protected links need only their passcode; Private links require the owner's Bearer access token |
| `GET` | `/profile/share-links` | Provider | List the broker's profile/portfolio links, paginated |
| `POST` | `/profile/share-links` | Provider | Create an unlisted or passcode-protected link that independently includes basic business profile details and/or active properties |
| `PATCH` | `/profile/share-links/{share_link_id}` | Provider | Edit title, included sections, visibility/passcode, or expiry for an active profile/portfolio link |
| `DELETE` | `/profile/share-links/{share_link_id}` | Provider | Revoke a profile/portfolio link |
| `GET` | `/public/profiles/{token}` | Visibility-based | Return selected public business details and/or all active properties, including a profile-bound public listing token for each property |

Profile/portfolio links must include at least one section. The profile section exposes only business name, professional title, public inquiry phone/email, and business territory. It never returns legal name, private mobile, license information, account email, or credentials. The portfolio section contains active properties only and returns title, description, category, price, area with its explicit unit, and district/state approximate location, plus a `public_listing_token` for opening the full property share view. Create and update operations may pass `property_ids` with at least two unique active property UUIDs to bundle a selected group under one link. IDs must belong to the authenticated broker; the public portfolio contains only those selected properties. Omitting `property_ids` retains the existing behavior of including all active properties. Read responses return the selection (`null` for all active properties). Create and update operations also accept `property_disclosures`, a map keyed by active property UUID with a complete `ShareDisclosures` value for each property. Keys must belong to the authenticated broker and refer to active properties. The map is returned on link reads; properties without an entry use the owner's default property disclosure settings. The nested token is bound to the profile share token and property ID and rechecks the profile link's visibility, expiry, revocation, property ownership, and active status on every request. Protected links use the same `X-Share-Passcode` policy and rate limit as property links. Revoked or expired public links return `404`.

`PATCH /profile/share-links/{share_link_id}` updates only supplied fields. At least one included section must remain enabled. Switching an unlisted link to protected requires a numeric 6 to 12 digit passcode; switching to unlisted clears the passcode. Setting `expires_at` to `null` removes the expiry. Revoked links cannot be edited.

Preferences may include `default_expiration_days` (`null`, `1`, `7`, `30`, `90`, or `365`); `null` means links have no default expiry. The Settings profile-share action uses this value when creating an unlisted profile-and-all-active-properties link. Profile links omit per-property overrides so each active property uses the broker’s saved disclosure defaults.

Disclosure settings include `show_price`, `show_exact_coordinates`, `show_photos`, `show_documents`, `show_reports`, `show_approach_roads`, and `show_broker_contact`. Broker contact defaults to hidden and, when enabled, exposes only the broker's public business name, public phone, public email, and business location. It never exposes the private mobile number or legal name. Public responses must be built from an allowlist of fields; do not serialize the private property record and remove selected fields afterward. The public token should be unguessable and revocable.

The share-link list accepts `limit` (default `20`, range `1`–`100`) and `offset` (default `0`, minimum `0`). It returns `{ "items": [...], "limit": 20, "offset": 0, "total": 45 }`, ordered by newest creation time first. `total` is the number of links for the property before pagination. Newly created links return a reusable `public_url` on create and subsequent authenticated reads; the public token is stored encrypted for owner-only recovery. Links created before encrypted recovery was added have `public_url: null` and must be replaced before they can be copied again.

### Reference data

| Method | Path | Description |
|---|---|---|
| `GET` | `/property-categories` | Return categories with the authenticated broker's enabled state and display order |
| `PUT` | `/profile/preferences/property-categories` | Replace category enablement/order for the broker account |
| `GET` | `/reference/soil-types` | Return supported soil type options |
| `GET` | `/reference/measurement-units` | Return supported land extent units |
| `GET` | `/reference/title-classifications` | Return title classification options |
| `GET` | `/reference/access-types` | Return road and access options |

### Team features (later phase)

The prototype contains assigned associates and signing authorities. Team routes remain deferred: v1 is one broker per identity-provider account with no teammate access. Signing authorities are external property records, not team users. Likely future team routes are `GET/POST /team/members`, `POST /team/invitations`, and `DELETE /team/members/{member_id}`.

## 4. Draft request/response shapes

### Create property

`POST /properties` accepts the smallest required draft core:

```json
{
  "title": "Riverside Farm with Coconut Grove",
  "category": "agriculture"
}
```

Expected response (`201`):

```json
{
  "id": "4a83e9c8-7643-4cbe-9e32-a7fa042aa5c0",
  "title": "Riverside Farm with Coconut Grove",
  "category": "agriculture",
  "status": "draft",
  "completion_percent": 0,
  "created_at": "2026-11-02T12:00:00Z",
  "updated_at": "2026-11-02T12:00:00Z"
}
```

### Create share link

`POST /properties/{property_id}/share-links` accepts:

```json
{
  "title": "VIP Investor Deck",
  "expires_at": null,
  "disclosures": {
    "show_price": true,
    "show_exact_coordinates": false,
    "show_photos": true,
    "show_reports": false,
    "show_approach_roads": true
  }
}
```

Share links support `visibility`: `private`, `protected`, or `unlisted` (default `unlisted` for compatibility). Unlisted links are viewable by anyone holding the URL without signing in. Protected links require only the broker-set 6–12 digit `passcode`, stored as a salted scrypt hash and never returned by the API; no app account is required. Private links require a Bearer access token and are visible only to the account that owns the property. Public listing and document requests for protected links must include `X-Share-Passcode`; private listing and document requests must include `Authorization: Bearer <access token>`. After five incorrect passcode attempts from one client, requests are limited for 15 minutes. Public discovery is not supported in this release.

The response includes `id`, the frontend-facing public URL (null for private links), `visibility`, `expires_at`, `created_at`, `revoked_at`, and saved disclosure settings. It never returns the passcode or its hash. The API owns token generation; clients should not choose or construct the token. Multiple independent links may be created for the same property. Disclosure settings are stored on each share link in JSONB.

Disclosure flags include `show_name`, `show_description`, `show_location`, `show_price`, `show_specifications`, `show_exact_coordinates`, `show_photos`, `show_documents`, `show_reports` (legacy), and `show_approach_roads`. The anonymous listing response omits fields disabled for that link. Photos, reports, and shared documents must be uploaded and marked `shared` or `public`. A public URL is returned as a token-scoped API proxy path; the API rechecks token status, property and document association, visibility, and category permission on every asset request. Title deeds are never exposed by public sharing.

`GET /public/listings/{token}/documents/{document_id}` streams only an asset permitted by that token; unlisted links are anonymous, protected links require only `X-Share-Passcode`, and private links require the owning account's Bearer access token. Expired, revoked, and non-owner private tokens return 404 for both the listing and its assets. `DELETE /share-links/{share_link_id}` revokes the link; the owner list may still show it with its revoked status.

## 5. Frontend workflow recommendations

1. Authenticate with the configured provider and attach its access token to private API requests.
2. Load or create a draft property.
3. Save each wizard step using its section `PUT` route; save title/category changes with property `PATCH`.
4. For each document, request a presigned URL, `PUT` the bytes to object storage, then register the returned object key with the API.
5. Call publish only after required sections and documents pass validation. Display backend validation errors at the relevant form fields.
6. Create a share link only after the property is published. Render public content from the public listing endpoint, not from private property APIs.

## 6. Decisions required before freezing v1

1. **Draft behavior:** Which fields are required before publishing, and should incomplete drafts be auto-saved per section?
2. **Property categories and units:** Confirm the category codes, land units, and allowed precision.
3. **Documents:** Confirm categories, maximum file size, and retention behavior.
4. **Public sharing:** Confirm whether links expire by default, whether a password/PIN is required, and which disclosures are supported.
5. **Privacy:** Confirm whether exact coordinates are private by default and how API authorization distinguishes `403` from `404`.
6. **Later-phase features:** Decide when to add teams, signing authorities, alert channels, and social integrations.

These are policy decisions for a later contract freeze; the current implementation and OpenAPI file document the behavior in effect today.
