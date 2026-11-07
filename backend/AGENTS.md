# Repository guidance

- Keep the application asynchronous end to end: async FastAPI handlers, SQLAlchemy `AsyncSession`, and async database/network I/O.
- Put SQLAlchemy entities in `app/models/` and Pydantic v2 request/response validation in `app/schemas/`.
- Put HTTP endpoints in `app/routes/`, reusable business logic in `app/services/`, and framework-independent shared helpers in `app/utils/`. Keep provider-neutral bearer dependencies and provider implementations under `app/auth/`.
- V1 is a single-broker product: each authenticated identity-provider user owns their records through `owner_user_id`. Do not add organizations, brokerage memberships, shared logins, or teammate access without an explicit product decision.
- Use Pydantic Settings for configuration. Never commit real credentials, tokens, or populated `.env` files; update `.env.example` when adding settings.
- Validate access tokens through the provider abstraction in `app/auth/providers/`; verify issuer, signature, audience/client, and provider-specific claims. Never trust decoded JWT claims without signature verification. Cognito is the production provider; Keycloak is for local/testing only.
- On first private API use, create the local user from verified `sub` and resolve Cognito email from the access token when it is not in token claims; configure Cognito's `aws.cognito.signin.user.admin` scope for `GetUser`.
- Protect private endpoints with the shared `CurrentUser` FastAPI dependency. Derive ownership from the verified identity-provider `sub`; never accept owner identity from request payloads. Keep response security headers enabled.
- Keep PostgreSQL, Redis, and S3-compatible storage settings in environment-backed configuration. Local Compose uses MinIO and initializes the document bucket before API startup. `S3_ENDPOINT_URL` is the API-to-storage address; `S3_PUBLIC_ENDPOINT_URL` is the address embedded in presigned URLs for browsers. Presigned object keys must be generated server-side and scoped to the authenticated user.
- Keep direct-to-storage uploads behind authenticated presign endpoints; never proxy full document bodies through FastAPI unless a feature explicitly requires it.
- Keep route handlers thin and put reusable business logic in services.
- Add pytest coverage for behavior and regressions. Run `pytest` and `ruff check .` before considering a change complete.
- Use Alembic for schema migrations; do not use `create_all()` in production startup. Add indexes and database constraints for supported query filters, uniqueness, ownership, and data invariants.
- Docker Compose provides local PostgreSQL and Redis. Lifespan `create_all()` is opt-in and restricted to local/development through `AUTO_CREATE_TABLES`; keep production schema changes in Alembic migrations.
- Keep the API and database contracts synchronized. For endpoint/request/response changes, update `docs/api/frontend-api-contract.md` and `docs/api/openapi.yaml`. For model, column, relationship, constraint, or index changes, update `docs/database/schema-proposal.md` and `docs/database/overview.md`.
- Follow the project workflow in [`SKILL.md`](SKILL.md) when making backend, API, or database changes.
