# Map component rules

- Keep map rendering behind `PropertyMap` and select providers through the shared `MapProviderId` configuration; feature screens should not import vendor map SDKs. Google Maps is the default provider; OSM remains a switchable fallback.
- The `openstreetmap.org/export/embed.html` page may refuse framing. Use the in-app OSM map document instead of embedding the OSM website. Keep attribution visible and validate coordinates before rendering a marker.
- OSM standard tiles are community funded and best-effort. Request only tiles needed for the visible viewport, honor HTTP caching, send an identifiable app User-Agent in native WebViews, retain the browser Referer on web, and never prefetch/offline-download tiles. For production traffic that needs an SLA, configure an OSM-derived tile provider or self-hosted tiles behind this same abstraction.
- Pass location values and map interactions through props; do not fetch location, geocode, or navigate inside map components.
- Enable manual Point selection only when the caller supplies `onCoordinateSelect`; validate bridged web/native messages and return coordinates through that callback.
- Google Maps keys are public identifiers, never secrets. Use separate web/iOS/Android keys from the `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_*` variables; restrict web by referrer and native keys by app identity and required Maps APIs.
- Keep native and web rendering adapters behaviorally aligned and theme the empty state from central tokens.
- Do not embed secrets or API keys in the client. Add provider-specific setup through Expo config and public environment variables only when needed.
- OSM's public tile service has no production SLA; replace its tile URL through the provider abstraction if scale or reliability requirements grow.
- Google Maps requires platform API key/configuration before enabling the Google provider in production.
- Add provider URL, attribution, coordinate-boundary, and empty-state tests with typed fixtures.
