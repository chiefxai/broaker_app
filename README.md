# Broaker Monorepo

Cross-platform Expo frontend and FastAPI backend. The app lives in `frontend/`; the API, migrations, contracts, and local service Compose file live in `backend/`.

## Requirements

- Node.js (LTS)
- npm
- Expo Go for quick device previews, or Android Studio / Xcode for simulators and development builds

## Mock demo mode and local storage

Run the app with seeded sample properties using:

```sh
cd frontend
npm run start:mock       # iOS / Android / web
npm run web:mock         # open the web demo directly
```

Mock mode seeds the local SQLite database once and keeps property records on the device/browser. Regular `npm start` uses live mode and connects supported property, profile, and sharing workflows to the API. Resetting the app's local database restores the demo fixtures.

The shared links screen uses mock fixtures in mock mode and the implemented property share-link endpoints in live mode.

Native iOS and Android databases use SQLCipher with the key held in SecureStore. SQLCipher is not available in Expo Go, so native runs need a development build after installing dependencies (for example `npx expo run:ios` or `npx expo run:android`). The web build uses SQLite's WebAssembly backend and must be hosted with the COEP/COOP headers configured in `frontend/app.json`; browser storage is not encrypted with SQLCipher.

## Start developing

```sh
cd frontend
npm install
npm start
```

Use the Expo terminal shortcuts to open an iOS simulator (`i`) or Android emulator (`a`), or scan the QR code with Expo Go.

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

## Connect to the local API

Copy `frontend/.env.example` to `frontend/.env.local` from the repository root, then run `npm run web:local` from `frontend/`. The local web command listens on port 5173 to match the API CORS allowlist. Sign in using the app's login form and the local test account; the app obtains provider tokens directly and sends the access token to private API routes. No client secret or test password is stored in the app.

Android emulators use `10.0.2.2` to reach host localhost services. A physical device needs host-reachable API, Keycloak and object-storage URLs, with matching server issuer and network configuration. The backend's default Docker ports bind to localhost and are not reachable from another device. Expo Go can run live mode with in-memory SQLite; persistent native SQLite with SQLCipher requires a development build.

The backend source, API documentation, and local Compose stack live in `backend/`. Use the full-stack launcher below to run them with the frontend.

- `frontend/src/data/` contains the explicit mock/live mode switch, demo property fixtures, the SQLite schema/repository, and TanStack Query hooks for local property reads.
- `frontend/src/utils/` contains shared pure helpers such as currency and area formatters.
- `frontend/src/providers/query-provider.tsx` provides the shared TanStack Query client and native app-focus handling.
- `frontend/test/fixtures/` stores typed mock responses and component examples, while `frontend/test/utils/` provides isolated provider rendering and strict API mocks. Component tests are in `frontend/test/components/`.

In the frontend, import reusable components from `@/components/core` and theme APIs from `@/theme`. The root navigation shell owns the persistent footer; each screen places the shared header above its scrollable content. Feature screens pass display-ready data and callbacks into components; data fetching and navigation remain owned by their screens/features.

## Run the Expo app and API in Docker

The launcher builds and starts the Expo Go frontend, FastAPI backend, PostgreSQL, Redis, and MinIO. The app uses the local password auth provider by default. Start Docker Desktop first, and connect your phone and development machine to the same trusted network.

Set up the local environment files once from the repository root:

```sh
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

In Windows PowerShell, use:

```powershell
Copy-Item backend\.env.example backend\.env
Copy-Item frontend\.env.example frontend\.env.local
```

Then launch with one command from the repository root:

```sh
./scripts/run-fullstack.sh
```

On Windows, after the one-time environment setup, double-click `scripts\run-fullstack.cmd` from File Explorer, or run `scripts\run-fullstack.cmd` in Command Prompt. Both launchers detect the host LAN IPv4 address automatically. If detection fails, set `HOST_LAN_IP` to the host's LAN address and run the script again.

When startup completes, open the `exp://` URL printed by the script in Expo Go. For web preview in a browser on the development machine, use `http://localhost:8082` so browser security headers are honored on a trustworthy localhost origin. Opening the LAN IP over plain HTTP can show a Cross-Origin-Opener-Policy warning; use HTTPS for browser access from another device. The API is on port 8001 and MinIO on port 9000. These development services bind to all host interfaces, so run them only on a trusted network.

## App libraries

- NativeWind 4 with Tailwind CSS 3 for utility styling on React Native components.
- TanStack Query for server state and caching.
- Axios for HTTP requests.
- React Hook Form for native form state and validation wiring.
