"""Supported OIDC authentication providers."""

from app.auth.providers.base import AuthProvider
from app.auth.providers.cognito import CognitoAuthProvider
from app.auth.providers.keycloak import KeycloakAuthProvider

__all__ = ["AuthProvider", "CognitoAuthProvider", "KeycloakAuthProvider"]
