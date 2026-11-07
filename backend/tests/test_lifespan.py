import pytest

import app.main as main


@pytest.mark.asyncio
async def test_local_lifespan_initializes_services_and_closes(monkeypatch) -> None:
    events = []

    async def connect() -> None:
        events.append("connect")

    async def initialize() -> None:
        events.append("initialize")

    async def close() -> None:
        events.append("close")

    monkeypatch.setattr(main.settings, "environment", "local")
    monkeypatch.setattr(main.settings, "auto_create_tables", True)
    monkeypatch.setattr(main, "connect_to_services", connect)
    monkeypatch.setattr(main, "create_local_database", initialize)
    monkeypatch.setattr(main, "close_connections", close)

    async with main.lifespan(main.app):
        events.append("serve")

    assert events == ["connect", "initialize", "serve", "close"]


@pytest.mark.asyncio
async def test_auto_create_tables_is_rejected_outside_development(monkeypatch) -> None:
    monkeypatch.setattr(main.settings, "environment", "production")
    monkeypatch.setattr(main.settings, "auto_create_tables", True)

    with pytest.raises(RuntimeError, match="only allowed in local/development"):
        async with main.lifespan(main.app):
            pass
