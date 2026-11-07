import httpx
import pytest
from fastapi import HTTPException

from app.core.config import Settings
from app.schemas.auth import RegistrationRequest
from app.services.identity_registration import register_keycloak_user


def settings() -> Settings:
    return Settings(
        auth_provider="keycloak",
        keycloak_issuer="http://localhost:8081/realms/broaker-test",
        keycloak_admin_base_url="http://keycloak:8080",
        keycloak_registration_client_id="registration-service",
        keycloak_registration_client_secret="service-secret",
    )


def request() -> RegistrationRequest:
    return RegistrationRequest(
        full_name="Asha Nair",
        email="asha@example.com",
        phone_number="+919876543210",
        password="a-long-password",
    )


@pytest.mark.asyncio
async def test_registration_uses_backend_service_account_and_creates_user() -> None:
    calls: list[httpx.Request] = []

    def respond(req: httpx.Request) -> httpx.Response:
        calls.append(req)
        if req.url.path.endswith("/protocol/openid-connect/token"):
            return httpx.Response(200, json={"access_token": "admin-api-token"})
        return httpx.Response(201)

    await register_keycloak_user(request(), settings(), httpx.MockTransport(respond))

    assert [call.url.path for call in calls] == [
        "/realms/broaker-test/protocol/openid-connect/token",
        "/admin/realms/broaker-test/users",
    ]
    assert "client_secret=service-secret" in calls[0].read().decode()
    assert calls[1].headers["authorization"] == "Bearer admin-api-token"
    body = calls[1].read().decode()
    assert '"emailVerified":false' in body
    assert '"temporary":false' in body


@pytest.mark.asyncio
async def test_registration_returns_conflict_for_duplicate_email() -> None:
    def respond(req: httpx.Request) -> httpx.Response:
        if req.url.path.endswith("/protocol/openid-connect/token"):
            return httpx.Response(200, json={"access_token": "admin-api-token"})
        return httpx.Response(409)

    with pytest.raises(HTTPException) as error:
        await register_keycloak_user(request(), settings(), httpx.MockTransport(respond))

    assert error.value.status_code == 409
    assert error.value.detail == "An account with this email already exists."


@pytest.mark.asyncio
async def test_registration_fails_closed_without_service_account_configuration() -> None:
    unconfigured = Settings(auth_provider="keycloak", keycloak_issuer="http://localhost:8081/realms/broaker-test")
    with pytest.raises(HTTPException) as error:
        await register_keycloak_user(request(), unconfigured)
    assert error.value.status_code == 503
