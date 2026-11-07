# Broaker Monorepo

Cross-platform Expo frontend and FastAPI backend. The app lives in `frontend/`; the API, migrations, contracts, and local service Compose file live in `backend/`.

## Run the full app with Docker

This is the quickest way to run the web app, Expo Go server, FastAPI, PostgreSQL, Redis, and MinIO together. Install and start Docker Desktop first. On a physical phone, connect it to the same trusted network as your development computer.

### macOS and Linux

From the repository root, run this once to create the local environment files and start the full stack:

```sh
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
./scripts/run-fullstack.sh
```

### Windows

From the repository root, run this once in PowerShell to create the local environment files and start the full stack:

```powershell
Copy-Item backend\.env.example backend\.env
Copy-Item frontend\.env.example frontend\.env.local
scripts\run-fullstack.cmd
```

The launcher detects the computer's LAN IPv4 address and prints the Expo Go and API URLs. If address detection fails, set `HOST_LAN_IP` to the computer's LAN address and run the launcher again. Open `http://localhost:8082` for the web app, `http://localhost:8001/api/v1` for the API, and `http://localhost:9000` for MinIO. The Compose stack keeps database and object-storage data in named volumes; `docker compose down -v` deletes that data.

The local password authentication provider is enabled by default. Keycloak is optional and is only needed when testing the Keycloak authentication flow. Development services bind to host interfaces for phone access; run them on a trusted network.

## Run manually without Docker

Install Node.js 22.13 or newer, Python 3.11 or newer, PostgreSQL 16, Redis 7, and MinIO.

Copy the environment examples from the repository root before starting the services:

```sh
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

For Windows PowerShell:

```powershell
Copy-Item backend\.env.example backend\.env
Copy-Item frontend\.env.example frontend\.env.local
```

Start PostgreSQL and Redis as local services. Create a PostgreSQL role and database matching `backend/.env` (defaults: user `broaker`, database `broaker`, password `broaker-dev-password`).

Start MinIO in a separate terminal. Its credentials must match `MINIO_ROOT_USER` and `MINIO_ROOT_PASSWORD` in `backend/.env`:

```sh
MINIO_ROOT_USER=broaker-minio MINIO_ROOT_PASSWORD=local-minio-password \
  minio server ./minio-data --address :9000 --console-address :9001
```

In Windows PowerShell, use:

```powershell
$env:MINIO_ROOT_USER = "broaker-minio"
$env:MINIO_ROOT_PASSWORD = "local-minio-password"
minio server .\minio-data --address :9000 --console-address :9001
```

In `backend/.env`, set a random `PASSWORD_AUTH_SECRET` of at least 32 characters, `S3_ENDPOINT_URL=http://localhost:9000`, and `S3_PUBLIC_ENDPOINT_URL=http://localhost:9000`. Keep the MinIO credentials in the `.env` aligned with the credentials used to start MinIO. In `frontend/.env.local`, set `EXPO_PUBLIC_API_URL=http://localhost:8000/api/v1` and `EXPO_PUBLIC_PUBLIC_APP_URL=http://localhost:5173` for local web preview.

Prepare the backend from the repository root. On macOS and Linux, use:

```sh
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e '.[dev]'
python -m alembic upgrade head
python -m app.scripts.init_minio_bucket
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

On Windows PowerShell, use:

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -e ".[dev]"
python -m alembic upgrade head
python -m app.scripts.init_minio_bucket
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Start the frontend in another terminal:

```sh
cd frontend
npm install
npm run web:local
```

Open `http://localhost:5173`. To run the native Expo app instead, use `npm start` and open the project in Expo Go or a simulator. For a physical phone, replace `localhost` in the frontend API URL and backend `S3_PUBLIC_ENDPOINT_URL` with the computer's LAN IP address; allow the frontend origin in `CORS_ALLOWED_ORIGINS`.

Mock mode is available without the backend:

```sh
cd frontend
npm run start:mock  # iOS, Android, or web
npm run web:mock    # open the web demo directly
```

Mock mode uses seeded sample properties and local browser/device storage. Native iOS and Android databases use SQLCipher, which requires a development build; Expo Go uses an in-memory SQLite database. The web build uses SQLite's WebAssembly backend and requires the COEP/COOP headers configured in `frontend/app.json`.

## Quality checks

```sh
cd frontend
npm run lint
npm run typecheck
npm test
npm run test:ci
npm run test:coverage
```

Component and unit tests use Jest, `jest-expo`, and React Native Testing Library. Repository behavior is covered by `frontend/test/property-repository.test.ts`; end-to-end coverage and release workflows will be added alongside the app's product flows.

## Project layout

- `frontend/src/app/` contains thin Expo Router route files and navigation layouts.
- `frontend/src/screens/` contains page-level screen implementations rendered by those routes.
- `frontend/src/components/` contains reusable native UI components.
- `frontend/src/components/core/` contains reusable design-system components, including the shared `navigation/` header, footer, and overflow menu, with focused `forms/`, `property/`, `profile/`, `settings/`, `media/`, and `wizard/` subfolders for other primitives.
- `frontend/src/components/core/icons/` contains the typed cross-platform `AppIcon` catalog backed by Expo Symbols (SF Symbols on iOS and Material Symbols on Android/web).
- `frontend/src/components/registry.ts` is the shared UI export registry, with category registries under `core/` and `frontend/src/registry.ts` exposing `Components`, `Icons`, and `Theme` namespaces for app-wide imports. For example, use `import { Components, Theme } from '@/registry'` or import named UI exports from `@/components`.
- `frontend/src/theme/` owns the centralized light/dark color palettes, shared spacing/radius/typography tokens, status colors, and the persisted app-wide theme provider.
- `frontend/src/api/` contains the shared Axios client and feature API modules. Follow the [frontend contract](backend/docs/api/frontend-api-contract.md) and [OpenAPI schema](backend/docs/api/openapi.yaml). Configure `EXPO_PUBLIC_API_URL` with the `/api/v1` prefix; `/health` is at the host root.
- `backend/` contains the FastAPI service, Alembic migrations, API/database contracts, and local dependency stack.

- `frontend/src/data/` contains the explicit mock/live mode switch, demo property fixtures, the SQLite schema/repository, and TanStack Query hooks for local property reads.
- `frontend/src/utils/` contains shared pure helpers such as currency and area formatters.
- `frontend/src/providers/query-provider.tsx` provides the shared TanStack Query client and native app-focus handling.
- `frontend/test/fixtures/` stores typed mock responses and component examples, while `frontend/test/utils/` provides isolated provider rendering and strict API mocks. Component tests are in `frontend/test/components/`.

In the frontend, import reusable components from `@/components/core` and theme APIs from `@/theme`. The root navigation shell owns the persistent footer; each screen places the shared header above its scrollable content. Feature screens pass display-ready data and callbacks into components; data fetching and navigation remain owned by their screens/features.

## App libraries

- NativeWind 4 with Tailwind CSS 3 for utility styling on React Native components.
- TanStack Query for server state and caching.
- Axios for HTTP requests.
- React Hook Form for native form state and validation wiring.
