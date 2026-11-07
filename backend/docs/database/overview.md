# Database overview

**Product scope:** v1 for one broker per Cognito account  
**Schema status:** solo-broker v1 models and initial migration implemented  
**Detailed schema:** [Database schema proposal](schema-proposal.md)

## Planned table count

- **21 tables implemented for v1** in the current schema.

21 v1 tables are implemented in SQLAlchemy and managed by Alembic.

## Proposed v1 tables

| # | Table | What it stores |
|---:|---|---|
| 1 | `users` | App user mapped to Cognito `sub`; no passwords or tokens |
| 2 | `password_credentials` | Local-development password hashes; never sent to clients |
| 3 | `broker_profiles` | Broker's professional identity, language, and license details |
| 4 | `business_profiles` | Broker's public business name and inquiry contact details |
| 5 | `user_preferences` | Theme, language, default share disclosures, and default link expiry |
| 6 | `onboarding_progress` | Saved onboarding step and completion state |
| 7 | `properties` | Property owner, title, category, status, and timestamps |
| 8 | `property_categories` | Shared catalog of listing categories; initial rows are seeded by the migration |
| 9 | `user_property_categories` | Categories enabled and ordered for a broker account |
| 10 | `property_secondary_categories` | Additional suitability categories per property |
| 11 | `property_locations` | Address, survey, GPS, dimensions, and access details |
| 12 | `property_features` | Soil and agronomy summary details |
| 13 | `property_water_sources` | One or more water sources per property |
| 14 | `property_utilities` | Electricity, irrigation, fencing, access, and other utilities |
| 15 | `property_financials` | Asking price, land extent, advance, and loan details |
| 16 | `property_legal_details` | Title classification and non-confidential legal summary |
| 17 | `property_documents` | S3 object metadata, status, category, and visibility; voice memos use a private-only category |
| 18 | `property_signing_authorities` | External signers recorded for a property; verification and signature states are pending |
| 19 | `property_notes` | One editable private notes record per property |
| 20 | `share_links` | Token hash and encrypted recovery value, private/protected/unlisted visibility, optional salted passcode hash, expiry, and disclosure settings |
| 21 | `profile_share_links` | Hashed token and encrypted recovery value for a broker profile/portfolio share, chosen sections, protected/unlisted visibility, expiry, and revocation |

## Main relationships

- A `users` row maps to one Cognito identity and owns that account's properties.
- Each property can have one location, feature summary, financial record, and legal detail record.
- Water sources, utilities, documents, notes, and share links can have multiple rows per property.
- Property categories come from a shared catalog; each user's enabled categories are stored separately.
- S3 stores uploaded file bytes. `property_documents` stores their metadata and references.
- Share links refer to properties, store a hash for public lookup, and store the token encrypted for authenticated owner URL recovery. The raw token is never stored in plaintext. Protected links store a salted scrypt passcode hash; existing links migrate as unlisted.
- Profile share links belong to one broker and use the same hashed-token, encrypted-recovery, salted-passcode, expiry, and revocation pattern. They expose only allowlisted public business fields and active property summaries.
- Signing authorities are external property records; they do not receive application access. Their verification and signature statuses remain pending until real workflows are implemented.

## V1 ownership boundary

Each broker signs in with their own Cognito account. Properties use `owner_user_id` and are private to that account. V1 has no brokerage, organization, membership, invitations, or teammate access tables. Adding teams later will require a planned ownership and authorization migration; brokers should not share login credentials.

## Notes

- `onboarding_progress` is included in v1 and can be removed later if server-side onboarding progress is no longer needed.
- The exact table set and fields are documented in the [detailed schema proposal](schema-proposal.md).
- Apply the initial migration with `alembic upgrade head` after configuring `DATABASE_URL` and starting PostgreSQL.
- For local development, `docker compose up --build` starts PostgreSQL and Redis. Compose enables local-only lifespan table creation and idempotent property-category seeding; production must use Alembic.
