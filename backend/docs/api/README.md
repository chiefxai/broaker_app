# API contract

- [Frontend contract](frontend-api-contract.md): route inventory, workflows, auth, current implementation status, and open product decisions.
- [OpenAPI 3.1](openapi.yaml): machine-readable route and payload reference for frontend client generation.
- [Pydantic schema catalog](schema-validation.md): implemented request/response validators and their corresponding model classes.

The documented MVP routes are implemented. Private routes require a configured OIDC access
token in `Authorization: Bearer`; public listing and health routes do not require
authentication. Responses include the browser security headers documented in the
contract.
