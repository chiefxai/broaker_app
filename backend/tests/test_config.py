from app.core.config import Settings


def test_default_database_url_matches_local_compose_credentials() -> None:
    settings = Settings(_env_file=None)

    assert settings.database_url == (
        "postgresql+asyncpg://broaker:broaker-dev-password@localhost:5432/broaker"
    )
