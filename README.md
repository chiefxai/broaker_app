# Mobile App

Cross-platform React Native app built with the latest Expo SDK and Expo Router. It uses React Native's native UI primitives and a shared responsive navigation shell for iOS, Android, and web.

## Requirements

- Node.js (LTS)
- npm
- Expo Go for quick device previews, or Android Studio / Xcode for simulators and development builds

## Mock demo mode and local storage

Run the app with seeded sample properties using:

```sh
npm run start:mock       # iOS / Android / web
npm run web:mock         # open the web demo directly
```

Mock mode seeds the local SQLite database once and keeps property records on the device/browser. Regular `npm start` uses live mode and connects supported property, profile, and sharing workflows to the API. Resetting the app's local database restores the demo fixtures.

The shared links screen uses mock fixtures in mock mode and the implemented property share-link endpoints in live mode.

Native iOS and Android databases use SQLCipher with the key held in SecureStore. SQLCipher is not available in Expo Go, so native runs need a development build after installing dependencies (for example `npx expo run:ios` or `npx expo run:android`). The web build uses SQLite's WebAssembly backend and must be hosted with the COEP/COOP headers configured in `app.json`; browser storage is not encrypted with SQLCipher.

## Start developing

```sh
npm install
npm start
```

Use the Expo terminal shortcuts to open an iOS simulator (`i`) or Android emulator (`a`), or scan the QR code with Expo Go.

## Quality checks

```sh
npm run lint
npm run typecheck
npm test
npm run test:ci
npm run test:coverage
```

Component and unit tests use Jest, `jest-expo`, and React Native Testing Library. Repository behavior is covered by `test/property-repository.test.ts`; end-to-end coverage and release workflows will be added alongside the app's product flows.

## Project layout

- `src/app/` contains thin Expo Router route files and navigation layouts.
- `src/screens/` contains page-level screen implementations rendered by those routes.
- `src/components/` contains reusable native UI components.
- `src/components/core/` contains reusable design-system components, including the shared `navigation/` header, footer, and overflow menu, with focused `forms/`, `property/`, `profile/`, `settings/`, `media/`, and `wizard/` subfolders for other primitives.
- `src/components/core/icons/` contains the typed cross-platform `AppIcon` catalog backed by Expo Symbols (SF Symbols on iOS and Material Symbols on Android/web).
- `src/components/registry.ts` is the shared UI export registry, with category registries under `core/` and `src/registry.ts` exposing `Components`, `Icons`, and `Theme` namespaces for app-wide imports. For example, use `import { Components, Theme } from '@/registry'` or import named UI exports from `@/components`.
- `src/theme/` owns the centralized light/dark color palettes, shared spacing/radius/typography tokens, status colors, and the persisted app-wide theme provider.
- `src/api/` contains the shared Axios client and feature API modules. Follow the [frontend contract](</Users/sanjay/Documents/ChatGPT/broaker app backend/docs/api/frontend-api-contract.md>) and [OpenAPI schema](</Users/sanjay/Documents/ChatGPT/broaker app backend/docs/api/openapi.yaml>). Configure `EXPO_PUBLIC_API_URL` with the `/api/v1` prefix; `/health` is at the host root.

## Connect to the local API

Copy `.env.example` to `.env.local` and run `npm run web:local`. The local web command listens on port 5173 to match the API CORS allowlist. Sign in using the app's login form and the local Keycloak test account; the app obtains provider tokens directly and sends the access token to private API routes. No client secret or test password is stored in the app.

Android emulators use `10.0.2.2` to reach host localhost services. A physical device needs host-reachable API, Keycloak and object-storage URLs, with matching server issuer and network configuration. The backend's default Docker ports bind to localhost and are not reachable from another device. Expo Go can run live mode with in-memory SQLite; persistent native SQLite with SQLCipher requires a development build.

The local API and Keycloak must be running. Start them from the backend repository using its documented Docker Compose commands.

- `src/data/` contains the explicit mock/live mode switch, demo property fixtures, the SQLite schema/repository, and TanStack Query hooks for local property reads.
- `src/utils/` contains shared pure helpers such as currency and area formatters.
- `src/providers/query-provider.tsx` provides the shared TanStack Query client and native app-focus handling.
- `test/fixtures/` stores typed mock responses and component examples, while `test/utils/` provides isolated provider rendering and strict API mocks. Component tests are in `test/components/`.

Import the reusable components from `@/components/core` and theme APIs from `@/theme`. The root navigation shell owns the persistent footer; each screen places the shared header above its scrollable content. Feature screens pass display-ready data and callbacks into components; data fetching and navigation remain owned by their screens/features.

## Run the Expo app and API in Docker

The full-stack Compose overlay builds one image containing the Expo Go development server and FastAPI. PostgreSQL, Redis, MinIO, and Keycloak run as supporting Compose services. Run the launcher for your operating system from this repository; each script detects the host LAN IPv4 address and starts the stack:

```sh
./scripts/run-fullstack.sh
```

On Windows, double-click `scripts\\run-fullstack.cmd` or run it from Command Prompt. Both scripts expect the backend repository beside this app, with its `.env`, and this app's `.env.local`. If LAN address detection fails, set `HOST_LAN_IP` to the machine's LAN IPv4 address and run the script again.

Open the `exp://` URL printed by the script in Expo Go. The API is available on port 8001; Keycloak and MinIO use ports 8081 and 9000. The stack publishes these development services on all host interfaces, so use it on a trusted network.

## App libraries

- NativeWind 4 with Tailwind CSS 3 for utility styling on React Native components.
- TanStack Query for server state and caching.
- Axios for HTTP requests.
- React Hook Form for native form state and validation wiring.
