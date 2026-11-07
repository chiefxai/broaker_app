# Property review component rules

- Keep media, listing review, and public-share sections presentational. Feature state, uploads, navigation, and API work belong to the owning screen.
- Use typed props and callbacks, accessible labels, the central theme tokens, and registered icons.
- Do not expose confidential owner, signatory, or legal document fields through public-share controls.
- Only show a share URL returned by the backend or an explicitly labeled mock fixture. Create or update links through the implemented API contract.
- Property photos use the property document upload flow. Do not imply that audio is uploaded or persisted until the backend supports it.
- Cover empty media, photo limits, disabled share settings, saving/error states, and editing callbacks in focused tests.
- Register new subcomponents and types in this folder's `registry.ts` and export the step through the wizard registry.
