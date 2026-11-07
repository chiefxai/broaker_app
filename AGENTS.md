This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npm start                   # start the normal live frontend (default)
npm run start:mock          # start the mock frontend only when explicitly requested
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

### Running the app and backend

- When asked to run the app/server without specifying mock mode, start the regular Expo app with `npm start` (or `npm start -- --host lan` for Expo Go on a physical device). Do not use `start:mock` by default.
- The regular app uses live mode and reads `EXPO_PUBLIC_API_URL` from `.env.local`. It must point to the running backend's `/api/v1` base URL. For a physical device, use the development machine's LAN IP, not `localhost`.
- Backend source and Compose files live in `backend/`. Use `scripts/run-fullstack.sh` (or `scripts/run-fullstack.cmd`) to launch the Expo frontend, API, and supporting services together. The backend-only Compose file can be run from `backend/`. For physical-device access, use a device-reachable LAN address for advertised API, storage, and Keycloak URLs. These development services bind to all host interfaces in the full-stack overlay, so keep them on a trusted network.
- Select mock mode only when the user explicitly asks for a mock/demo server or mock data; use `npm run start:mock` (and `npm run web:mock` for the web demo). Do not silently substitute mock mode when the backend is unavailable; report the backend startup problem instead.
- Expo Go can run the normal app in live mode using its in-memory SQLite database. Persistent native SQLite with SQLCipher requires a development build, as described in `README.md`.
- On a physical iPhone, current Expo Go requires Expo Go and Expo CLI to be signed in to the same Expo account before it opens a development server. If Expo Go shows a sign-in message, run `npx expo login` in the frontend repository and sign into that same account in Expo Go. This account check does not apply to Android or simulators.

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

## Reliability and tests

- For each feature or reusable UI component you add or change, include behavior-focused test cases and representative typed mock data in the same change.
- Cover success and the relevant empty, loading, error, validation, and boundary states. Assert observable behavior and accessibility labels rather than implementation details or snapshots alone.
- Keep fixtures and test helpers under `test/`, outside the production bundle. Mock all HTTP calls; configure unmatched requests to fail so tests cannot silently reach a real service.
- Use isolated QueryClients and reset mock state between tests. Run lint, typecheck, and the relevant tests after changes.
- Before adding a runtime dependency, check its official Expo/React Native compatibility and explain why it is needed; use Expo's installer for SDK-managed packages.

## Backend API contract

Before implementing or changing an API call, read both source-of-truth files:

- `backend/docs/api/frontend-api-contract.md`
- `backend/docs/api/openapi.yaml`

Follow these contract rules:

- Only call operations explicitly marked **Implemented**. Treat all proposed endpoints and schemas as plans until the backend contract is updated.
- Configure `EXPO_PUBLIC_API_URL` with the versioned base path `/api/v1`. `/health` is served at the origin root, outside that base path.
- Private routes require a Cognito **access token** in `Authorization: Bearer ...`; never send an ID token or use a client-supplied owner ID to establish ownership.
- Match request/response fields, enum values, limits, and error bodies to OpenAPI. The standard API error body is `{ "detail": ... }`.
- Dates are UTC ISO 8601, IDs are UUIDs, currency values are integer INR, and land area must always carry its explicit unit.
- For presigned uploads, request the URL from the API, PUT raw bytes to the returned URL with its exact `Content-Type`, and use the returned `object_key` as the identifier. Do not send file bytes through the API or persist the temporary URL.
- Keep fixtures contract-shaped. Test implemented routes with mocked success and error responses; never rely on a live backend in unit tests.
- If the prose contract conflicts with an OpenAPI schema, flag the discrepancy before freezing a client type or making UI behavior depend on it.

## UI collaboration workflow

- Treat the current request as the scope boundary: implement only the requested UI building blocks and leave screen composition, routes, and navigation flows to the user unless explicitly requested.
- Prefer React Native primitives and platform-adaptive behavior. Add platform-specific code only when a native/web behavior materially differs, and keep shared behavior consistent.
- Keep reusable UI, theme tokens, icons, data/API logic, and screen composition in their existing responsibility areas; do not couple presentational components to feature fetching or navigation.
- Read the local `skills.md` before changing a governed folder. Keep its guidance in sync with established project conventions.
- Source colors, spacing, typography, radii, and semantic states from centralized theme tokens. Components must respond to theme changes and avoid embedding app-wide style values locally.
- Give reusable components typed inputs, clear accessibility semantics, predictable states, and sensible empty/error/loading behavior when applicable. Keep data and actions caller-owned.
- Reuse the approved icon catalog. Add missing icons there with platform mappings before consuming them; do not scatter icon glyphs or platform symbol names through components.
- For each behavior change, add representative typed fixtures and focused tests. Cover key states and user-visible outcomes without relying only on snapshots.
- Validate changes with lint, typecheck, relevant tests, and an appropriate platform bundle when feasible; report checks that could not run and why.
