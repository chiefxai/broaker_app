# Broaker API

Async FastAPI backend with provider-selectable OIDC auth (Cognito for production, Keycloak for local testing), SQLAlchemy 2 async sessions, PostgreSQL, Redis, and S3-compatible object storage.

This service is in the `backend/` directory of the Broaker monorepo. Commands below assume the current directory is `backend/`, unless noted otherwise.

## Architecture

```text
Web / Expo client
       │ JSON API + Bearer access token
       ▼
FastAPI app (`app/main.py`)
  ├── routes/       HTTP endpoints and request orchestration
  ├── schemas/      Pydantic request and response models
  ├── auth/         Bearer handling and password, Cognito, Keycloak providers
  ├── services/     Account, property, upload, and share-token operations
  ├── models/       SQLAlchemy persistence models
  ├── config/       Settings, database sessions, Redis, object storage
  └── utils/        Shared security and HTTP utilities
       ├──────────── PostgreSQL (SQLAlchemy async, Alembic migrations)
       ├──────────── Redis (rate limiting and shared ephemeral state)
       └──────────── S3 API (MinIO locally; direct client uploads)
```

`app/main.py` assembles the routers and middleware. `/health` is at the origin root; application routes use the configurable `/api/v1` prefix. The implemented API contract is in [`docs/api/frontend-api-contract.md`](docs/api/frontend-api-contract.md), with its OpenAPI schema in [`docs/api/openapi.yaml`](docs/api/openapi.yaml). Database design and migrations are documented under [`docs/database/`](docs/database/).

Uploads use a two-step flow: the authenticated API creates a short-lived presigned URL and server-generated `object_key`; the client PUTs bytes directly to object storage using the returned `Content-Type`. The API verifies the stored object when it is registered. The public storage endpoint must be reachable from the browser or device using the URL.

## Environment configuration

Copy `.env.example` to `.env`. Settings are loaded by `pydantic-settings` from environment variables and `.env` in the backend working directory. Compose overrides container connection URLs with internal service names; those names are only resolvable inside the Compose network.

| Variable | Purpose |
| --- | --- |
| `ENVIRONMENT`, `DEBUG`, `APP_NAME` | Runtime identity and local diagnostics. Password auth is restricted to local/development/test. |
| `API_V1_PREFIX`, `CORS_ALLOWED_ORIGINS` | API prefix and comma-separated browser origins. |
| `DATABASE_URL` | PostgreSQL SQLAlchemy async URL; use `postgresql+asyncpg://...`. |
| `REDIS_URL` | Redis connection URL, including its password when enabled. |
| `AUTH_PROVIDER` | `password` for local development, or `cognito` / `keycloak` for configured identity providers. |
| `PASSWORD_AUTH_SECRET` | Local password-token signing key. Use a random secret of at least 32 bytes; do not use the local Compose fallback in a shared deployment. |
| `SHARE_LINK_ENCRYPTION_KEY` | Secret used to encrypt recoverable share-link tokens. |
| `COGNITO_REGION`, `COGNITO_USER_POOL_ID`, `COGNITO_APP_CLIENT_ID` | Cognito token-verification configuration. |
| `KEYCLOAK_ISSUER`, `KEYCLOAK_JWKS_URL`, `KEYCLOAK_CLIENT_ID` | Keycloak issuer and verification configuration. Registration/admin client credentials are backend-only and only needed for managed registration. |
| `S3_ENDPOINT_URL` | Endpoint the API uses to access S3/MinIO. In Compose this is `http://minio:9000`. |
| `S3_PUBLIC_ENDPOINT_URL` | Endpoint embedded in presigned URLs and opened by the client. Use `http://localhost:9000` on the same host or a device-reachable LAN/production URL. |
| `S3_BUCKET_NAME`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | S3 bucket and credentials; local values must match MinIO. |
| `S3_PRESIGNED_URL_EXPIRES_SECONDS`, `S3_MAX_UPLOAD_BYTES` | Upload URL lifetime and size limit. |
| `PUBLIC_API_BASE_URL` | Public API origin used to build share links; do not include `/api/v1`. |
| `AUTO_CREATE_TABLES` | Local-only database convenience. Normal setup uses Alembic migrations. |

See [`.env.example`](.env.example) for all current variables and local defaults. Never commit `.env` or production secrets. On physical devices, replace host `localhost` values in public URLs with an address reachable from the device. The `postgres`, `redis`, and `minio` Compose hostnames are for backend containers only.

## Local setup

### Docker Compose

1. From the monorepo root, copy `backend/.env.example` to `backend/.env`. Then change to this directory with `cd backend`. The example selects local password auth; set Cognito explicitly in deployed environments.
2. Start the API and local dependencies, including Keycloak: `docker compose --profile testing up --build -d`.
3. Visit `http://localhost:8000/docs` or check `http://localhost:8000/health`.

Compose starts PostgreSQL 16, Redis 7, and MinIO with persistent volumes. It creates the configured document bucket and configures MinIO's API CORS origins for local browsers before starting the API. The API waits for PostgreSQL, Redis, and bucket initialization, then its local-only lifespan initialization creates the tables and seeds property categories. Ports are bound to `127.0.0.1`. Local Compose defaults are for development only; change the database, Redis, and MinIO passwords before sharing the stack.

MinIO's S3 API is at `http://localhost:9000` and its console is at `http://localhost:9001`. Local defaults are `broaker-minio` / `local-minio-password`, with bucket `broaker-documents`. Set `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD`, and optionally `S3_BUCKET_NAME` in `.env` to change them. The API container uses `S3_ENDPOINT_URL=http://minio:9000` for server-to-server object operations and `S3_PUBLIC_ENDPOINT_URL=http://localhost:9000` in URLs returned to the browser. Update the public value when the browser reaches MinIO through a different host or proxy.

Compose uses the local image named by `MINIO_IMAGE` without pulling it automatically. If it is not already present on your Docker host, load a MinIO image or point `MINIO_IMAGE` at an available image mirror.

### Test authentication with Keycloak

The optional `testing` profile starts a local Keycloak realm with a test-only user. It is not intended for production.

```sh
AUTH_PROVIDER=keycloak docker compose --profile testing up --build -d
```

The imported realm is available at `http://localhost:8081`. Test credentials are `test-broker` / `test-broker-password`. Request a token:

```sh
curl -X POST http://localhost:8081/realms/broaker-test/protocol/openid-connect/token \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'client_id=broaker-api&grant_type=password&username=test-broker&password=test-broker-password&scope=openid'
```

To enable the custom sign-up form, create a confidential Keycloak client with service accounts enabled, grant its service account only the realm-management `manage-users` role, then set `KEYCLOAK_REGISTRATION_CLIENT_ID` and `KEYCLOAK_REGISTRATION_CLIENT_SECRET` in the backend `.env`. The registration route is disabled unless the API is using Keycloak. See the [frontend API contract](docs/api/frontend-api-contract.md#keycloak-development-registration-contract) for request fields and provider boundaries. Do not expose this development registration setup in production; Cognito owns production sign-up and email confirmation.

Use the returned `access_token` as `Authorization: Bearer <access_token>`. The local Compose `.env.example` selects Keycloak; deployed environments must set `AUTH_PROVIDER=cognito` and configure Cognito.

Stop the services with `docker compose down`. `docker compose down -v` also deletes the local database and Redis volumes.

### Run the API outside Docker

1. Create and activate a virtual environment with Python 3.11 or newer.
2. Install dependencies: `pip install -e '.[dev]'`.
3. Copy `.env.example` to `.env` and configure local Keycloak, PostgreSQL, Redis, and your S3-compatible provider. Set Cognito explicitly in deployed environments.
4. Start PostgreSQL and Redis, then apply the schema with `alembic upgrade head`.
5. Start the API: `uvicorn app.main:app --reload`.

`AUTO_CREATE_TABLES` defaults to `false`. Enable it only for local or development use. Production deployments should apply versioned Alembic migrations before starting the API.

The protected `GET /api/v1/auth/me` route accepts a configured OIDC **access token** in `Authorization: Bearer <token>`. It verifies the RS256 signature, issuer, and provider-specific client/access-token claims against the configured provider JWKS. The API does not implement sign-in; clients authenticate with the configured provider and send its resulting access token.

## Direct document uploads

1. The frontend calls `POST /api/v1/uploads/presign` with the configured provider access token and JSON such as `{"filename":"title-deed.pdf","content_type":"application/pdf"}`.
2. The API returns a short-lived `upload_url`, a generated user-scoped `object_key`, `method` (`PUT`), and the required `content_type`.
3. The frontend sends the file bytes directly to `upload_url` with `PUT` and the exact `Content-Type` returned by the API. The signed URL expires after `S3_PRESIGNED_URL_EXPIRES_SECONDS`.

Supported uploads are PDF, JPEG, PNG, WebP, and audio in M4A, AAC, MP3, WAV, or WebM formats. Set `S3_ENDPOINT_URL` for another S3-compatible service; leave it empty for AWS S3. The endpoint in a presigned URL must be reachable by the browser. Local Compose applies `CORS_ALLOWED_ORIGINS` to MinIO's S3 API; add the frontend origin there if it uses a different host or port. Property-scoped routes can register uploaded objects and issue authorized download URLs.

`app/config/connections.py` provides the async PostgreSQL and Redis connection accessors, connectivity probes, and shutdown cleanup. Redis clients connect lazily. Database and Redis URLs should come from environment variables or a managed secret store outside local development.

SQLAlchemy models are in `app/models/`, API validation schemas are in `app/schemas/`, and Alembic migrations are in `migrations/`. The initial migration creates 18 solo-broker v1 tables and seeds the property category catalog. Team and organization access are deferred.

API and database contracts are maintained separately in [`docs/api/`](docs/api/README.md) and [`docs/database/`](docs/database/overview.md). Read [`AGENTS.md`](AGENTS.md) and [`SKILL.md`](SKILL.md) before changing either contract.

Run local checks with `pytest` and `ruff check .`. CI runs both on pushes and pull requests.
