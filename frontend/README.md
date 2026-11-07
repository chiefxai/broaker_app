# Frontend

The frontend is an Expo SDK 58 / React Native application targeting iOS, Android, and the web. Expo Router provides file-based navigation, and shared React Native screens/components adapt to browser and native platforms.

## Architecture

```text
Expo Router (`src/app/`) ── screen composition and URL routes
        │
        ├── src/auth/          session, provider integration, route gating
        ├── src/api/           FastAPI client, hooks, upload flows
        ├── src/data/          repositories, offline sync, mock fixtures
        │      ├── database/  native SQLite and web-specific storage adapters
        │      └── mock/      typed local demo data
        ├── src/providers/     app-wide React Query and lock providers
        ├── src/components/   reusable UI and feature building blocks
        ├── src/screens/      screen logic shared by routes
        ├── src/theme/        theme provider and centralized design tokens
        └── src/i18n/         language and translation support
```

At the root, `src/app/_layout.tsx` composes theme, language, toast, query, authentication, and navigation providers. Native platforms initialize SQLite and run offline sync; web uses the web database, asset storage, and offline-sync adapters instead. API requests use the shared Axios client and the versioned FastAPI base URL. Document/media bytes upload directly to object storage through short-lived presigned URLs from the API.

## Environment configuration

Copy `.env.example` to `.env.local` before starting the app. Expo inlines variables prefixed with `EXPO_PUBLIC_` into the client bundle, so these values are public. Never put passwords, signing keys, cloud secrets, or other private credentials in this file.

| Variable | Purpose |
| --- | --- |
| `EXPO_PUBLIC_API_URL` | API origin plus `/api/v1`, for example `http://localhost:8000/api/v1`. The browser uses its own host address; Android emulator defaults translate localhost to `10.0.2.2`. A physical device needs the development machine's LAN IP. |
| `EXPO_PUBLIC_PUBLIC_APP_URL` | Client origin used to create/open share links, for example `http://localhost:8082` for the Docker web app or `http://localhost:5173` for manual web startup. Use a client-reachable address on devices. |
| `EXPO_PUBLIC_AUTH_PROVIDER` | Client auth provider selection; keep aligned with backend `AUTH_PROVIDER`. |
| `EXPO_PUBLIC_APP_MODE` | Optional mode selector. Omit or use `live` for the backend; set `mock` only for the explicit mock/demo app. |
| `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_WEB` | Browser Maps JavaScript API key, restricted by website referrer. |
| `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_IOS`, `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_ANDROID` | Native Maps SDK keys, restricted by app identity. |

See [`.env.example`](.env.example) for the current variable list. In the Docker full-stack setup, the launcher uses `frontend/.env.local` as the source of public settings and advertises a host-reachable API, web, storage, and share-link origin. Do not set the API URL to a Compose-only hostname such as `api` or `fullstack`: browser and phone clients cannot resolve those names.

## Run and validate

From `frontend/`, install dependencies with `npm install`. Run the live web client with `npm run web:local`, the normal Expo development server with `npm start`, or the mock/demo web client with `npm run web:mock`. Mock mode is separate from the live API and should only be used when intentionally requested. Docker one-command and manual full-stack instructions are in the root [`README.md`](../README.md).

Useful checks from `frontend/`:

```sh
npx expo lint
npx tsc --noEmit
npm test -- --runInBand
```

Routes belong in `src/app/`; keep reusable components, hooks, API logic, and utilities outside that directory. Before changing a governed component or theme folder, read its local `skills.md` guidance.
