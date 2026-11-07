# Pydantic schema catalog

Pydantic v2 request and response definitions live in `app/schemas/`. `APIModel` forbids unknown fields and supports serialization from ORM objects. This catalog maps schema classes to the API contract; this catalog maps the implemented routes to their schemas.

## Implemented request/response schemas

| Schema | API operation | Validation |
|---|---|---|
| `CurrentUserRead` | `GET /api/v1/auth/me` | Restricts response to authenticated OIDC subject, username, and scope |
| `PresignUploadRequest` | `POST /api/v1/uploads/presign` | Filename 1–255 chars; content type allowlist; extension must match MIME type |
| `PresignUploadResponse` | Same upload route | URL, object key, `PUT`, expiry 1–604800 seconds, and signed content type |

The upload endpoint supports PDF, JPEG, PNG, WebP, and M4A, AAC, MP3, WAV, and WebM audio. The extension/MIME check is enforced in the request model and repeated by the storage service.

## Property schemas (implemented routes)

| Schema | API operation | Validation |
|---|---|---|
| `PropertyCreate` | `POST /properties` | Required title (1–200 chars) and valid category code |
| `PropertyPatch` | `PATCH /properties/{property_id}` | At least one field; title/category cannot be null |
| `PropertySummary`, `PropertyDetail`, `PropertyPage`, `DashboardRead` | Property list/detail and dashboard responses | UUIDs, statuses, completion percentage 0–100, and bounded pagination |
| `PropertyCategoryRead`, `UserPropertyCategoriesUpdate` | `GET /property-categories`, `PUT /profile/preferences/property-categories` | Category code format, unique category entries, list bounds, and non-negative order |
| `PropertyLocationUpdate` | `PUT /properties/{property_id}/location` | Latitude/longitude must be supplied together and within geographic bounds; non-negative dimensions |
| `PropertyFeaturesUpdate` | `PUT /properties/{property_id}/features` | Soil enum/custom soil pairing, non-negative TDS, bounded water-source and utility lists |
| `PropertyFinancialsUpdate` | `PUT /properties/{property_id}/financials` | INR whole rupees, non-negative amounts, minimum cannot exceed asking price, area and unit paired |
| `PropertyLegalDetailsUpdate` | `PUT /properties/{property_id}/legal` | Title classification allowlist and bounded summary |
| `PropertyNoteUpdate` | `PUT /properties/{property_id}/notes` | Private notes up to 20,000 chars |

## Profile, document, and sharing schemas (implemented routes)

- Profiles: `BrokerProfileInput`, `BrokerProfilePatch`, `BrokerProfileRead`, `BusinessProfileInput`, `BusinessProfilePatch`, `BusinessProfileRead`, `UserPreferencesPatch`, `OnboardingProgressPatch`, and `OnboardingProgressRead`.
- Documents: `DocumentCreate`, `DocumentPatch`, `DocumentRead`, and `DocumentDownloadUrlRead`. The caller must not be allowed to register an object key that is not owned by the property/account.
- Sharing: `ShareDisclosures`, `ShareLinkCreate`, `ShareLinkPatch`, `ShareLinkRead`, and `PublicListingRead`. Public listing responses should be constructed from an allowlist and must not expose internal notes, private documents, owner IDs, or exact coordinates unless explicitly disclosed.

All monetary inputs use integer INR rupees in v1. Land area uses a decimal value paired with a unit code. The supported area-unit set and publish-required fields remain product decisions; change the Pydantic schemas, OpenAPI file, and database docs together when those decisions are finalized.

## Maintenance rule

When changing a request or response model, update the route's `response_model` / parameter type, the OpenAPI schema, and [frontend contract](frontend-api-contract.md). Add or update pytest validation cases for invalid boundaries and accepted payloads.
