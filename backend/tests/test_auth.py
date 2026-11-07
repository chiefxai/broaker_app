from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.main import app


def _test_settings(**changes):
    from app.core.config import Settings

    return Settings(
        auth_provider=changes.get("auth_provider", "password"),
        environment=changes.get("environment", "test"),
        password_auth_secret=changes.get(
            "password_auth_secret", "test-only-signing-secret-that-is-long-enough"
        ),
    )


async def _no_db_required():
    yield object()


def _install_test_dependencies(settings=None):
    from app.config.database import get_db_session
    from app.core.config import get_settings

    app.dependency_overrides[get_db_session] = _no_db_required
    app.dependency_overrides[get_settings] = lambda: settings or _test_settings()


def _clear_test_dependencies() -> None:
    app.dependency_overrides.clear()


def test_me_requires_bearer_token() -> None:
    with TestClient(app) as client:
        response = client.get("/api/v1/auth/me")

    assert response.status_code == 401
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["x-frame-options"] == "DENY"
    assert response.headers["referrer-policy"] == "strict-origin-when-cross-origin"


def test_upload_presign_requires_bearer_token() -> None:
    with TestClient(app) as client:
        response = client.post(
            "/api/v1/uploads/presign",
            json={"filename": "title-deed.pdf", "content_type": "application/pdf"},
        )

    assert response.status_code == 401


def test_all_private_page_routes_declare_authentication() -> None:
    paths = app.openapi()["paths"]
    required = {
        "/api/v1/profile/broker",
        "/api/v1/profile/business",
        "/api/v1/profile/preferences",
        "/api/v1/profile/onboarding",
        "/api/v1/dashboard",
        "/api/v1/properties",
        "/api/v1/property-categories",
        "/api/v1/reference/{kind}",
        "/api/v1/public/listings/{token}",
    }
    assert required <= paths.keys()
    assert paths["/api/v1/public/listings/{token}"]["get"].get("security", []) == []


def test_password_routes_are_documented_as_public_local_auth_apis() -> None:
    paths = app.openapi()["paths"]
    register = paths["/api/v1/auth/register"]["post"]
    login = paths["/api/v1/auth/login"]["post"]

    assert "security" not in register
    assert "201" in register["responses"]
    assert "422" in register["responses"]
    assert "security" not in login
    assert "200" in login["responses"]
    assert "401" in login["responses"]


def test_password_registration_returns_access_token(monkeypatch) -> None:
    import app.routes.auth as auth_routes

    async def register_account(session, payload, provider):
        assert payload.email == "asha@example.com"
        assert provider.issue_access_token("password:fixture", payload.email)
        return object(), "access-fixture"

    monkeypatch.setattr(auth_routes, "register_password_account", register_account)
    _install_test_dependencies()
    try:
        with TestClient(app) as client:
            response = client.post("/api/v1/auth/register", json={
                "full_name": "Asha Nair",
                "email": "ASHA@example.com",
                "phone_number": "+919876543210",
                "password": "a-long-password",
            })
    finally:
        _clear_test_dependencies()

    assert response.status_code == 201
    assert response.json() == {
        "access_token": "access-fixture",
        "token_type": "bearer",
        "expires_in": 28800,
    }


def test_password_login_returns_access_token(monkeypatch) -> None:
    import app.routes.auth as auth_routes

    async def authenticate(session, payload, provider):
        assert payload.email == "asha@example.com"
        return object(), "login-fixture"

    monkeypatch.setattr(auth_routes, "authenticate_password", authenticate)
    _install_test_dependencies()
    try:
        with TestClient(app) as client:
            response = client.post("/api/v1/auth/login", json={
                "email": "ASHA@example.com",
                "password": "a-long-password",
            })
    finally:
        _clear_test_dependencies()

    assert response.status_code == 200
    assert response.json() == {
        "access_token": "login-fixture",
        "token_type": "bearer",
        "expires_in": 28800,
    }


def test_password_login_uses_generic_invalid_credential_error(monkeypatch) -> None:
    import app.routes.auth as auth_routes

    async def authenticate(session, payload, provider):
        raise HTTPException(status_code=401, detail="Email or password is incorrect.")

    monkeypatch.setattr(auth_routes, "authenticate_password", authenticate)
    _install_test_dependencies()
    try:
        with TestClient(app) as client:
            response = client.post("/api/v1/auth/login", json={
                "email": "missing@example.com",
                "password": "a-long-password",
            })
    finally:
        _clear_test_dependencies()

    assert response.status_code == 401
    assert response.json() == {"detail": "Email or password is incorrect."}


def test_password_registration_rejects_short_password() -> None:
    with TestClient(app) as client:
        response = client.post("/api/v1/auth/register", json={
            "full_name": "Asha Nair",
            "email": "asha@example.com",
            "phone_number": "+919876543210",
            "password": "short",
        })

    assert response.status_code == 422


def test_password_auth_is_disabled_outside_local_environments() -> None:
    _install_test_dependencies(_test_settings(environment="production"))
    try:
        with TestClient(app) as client:
            response = client.post("/api/v1/auth/login", json={
                "email": "asha@example.com",
                "password": "a-long-password",
            })
    finally:
        _clear_test_dependencies()

    assert response.status_code == 503
    assert response.json() == {
        "detail": "Local password authentication is disabled in this environment."
    }


def test_password_auth_requires_a_signing_secret() -> None:
    _install_test_dependencies(_test_settings(password_auth_secret=""))
    try:
        with TestClient(app) as client:
            response = client.post("/api/v1/auth/login", json={
                "email": "asha@example.com",
                "password": "a-long-password",
            })
    finally:
        _clear_test_dependencies()

    assert response.status_code == 503


def test_health_response_includes_browser_security_headers() -> None:
    with TestClient(app) as client:
        response = client.get("/health")

    assert response.status_code == 200
    assert response.headers["cache-control"] == "no-store"
    assert response.headers["permissions-policy"] == "camera=(), microphone=(), geolocation=()"
