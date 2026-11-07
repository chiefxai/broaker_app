---
name: broaker-backend
description: Project workflow for changing the Broaker FastAPI API, SQLAlchemy models, Pydantic schemas, and database contract.
---

# Broaker backend workflow

- Keep all database and network operations async. Use SQLAlchemy 2 async sessions and Pydantic v2 schemas.
- Put endpoint handlers in `app/routes/`, business logic in `app/services/`, shared helpers in `app/utils/`, and Cognito authentication/token verification/dependencies in `app/auth/`.
- Protect private endpoints with the shared `CurrentUser` dependency and derive the owner from the verified OIDC `sub`.
- Keep identity-specific token rules inside `app/auth/providers/`; Cognito is the production provider and Keycloak is for local testing.
- Scope private records to the authenticated user's Cognito `sub` mapped to `users.id`; never trust a client-supplied owner ID.
- For an API change, update route code, Pydantic schemas, tests, `docs/api/frontend-api-contract.md`, and `docs/api/openapi.yaml` together.
- For a database change, update SQLAlchemy models and indexes/constraints, add an Alembic migration, and update `docs/database/schema-proposal.md` and `docs/database/overview.md`.
- Keep v1 single-broker. Organization, brokerage, and teammate access require an explicit future product decision and migration plan.
- Presigned upload URLs must use backend-generated keys, authenticated access, short expiries, and the configured S3-compatible endpoint. For local Compose, distinguish `S3_ENDPOINT_URL` (API container access to MinIO) from `S3_PUBLIC_ENDPOINT_URL` (browser-reachable address embedded in presigned URLs).
- Local Docker Compose runs PostgreSQL, Redis, and MinIO, and initializes the document bucket before API startup. `AUTO_CREATE_TABLES` may be enabled only in local/development; use Alembic migrations in production.
- Run pytest and Ruff for code changes. Never create production tables with `Base.metadata.create_all()` at application startup.
