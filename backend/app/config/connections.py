from uuid import UUID

from sqlalchemy import text
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.config.database import SessionFactory, engine, get_db_session
from app.config.redis import close_redis_client, get_redis_client
from app.db.base import Base
from app.models import PropertyCategory

CATEGORY_SEEDS = [
    {
        "id": UUID("00000000-0000-4000-8000-000000000001"),
        "code": "agriculture",
        "label": "Agriculture Land",
        "sort_order": 0,
    },
    {
        "id": UUID("00000000-0000-4000-8000-000000000002"),
        "code": "plots",
        "label": "Plots",
        "sort_order": 1,
    },
    {
        "id": UUID("00000000-0000-4000-8000-000000000003"),
        "code": "house_villa",
        "label": "House / Villa",
        "sort_order": 2,
    },
    {
        "id": UUID("00000000-0000-4000-8000-000000000004"),
        "code": "commercial",
        "label": "Commercial Building",
        "sort_order": 3,
    },
    {
        "id": UUID("00000000-0000-4000-8000-000000000005"),
        "code": "apartment",
        "label": "Apartment",
        "sort_order": 4,
    },
]


async def connect_to_database() -> None:
    """Verify PostgreSQL connectivity using the configured async SQLAlchemy engine."""
    async with engine.connect() as connection:
        await connection.execute(text("SELECT 1"))


async def connect_to_redis() -> None:
    """Verify Redis connectivity using the shared async client."""
    await get_redis_client().ping()


async def connect_to_services() -> None:
    """Probe configured PostgreSQL and Redis connections."""
    await connect_to_database()
    await connect_to_redis()


async def create_local_database() -> None:
    """Create current model tables and seed categories for disposable local environments."""
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
        await connection.execute(
            pg_insert(PropertyCategory)
            .values(CATEGORY_SEEDS)
            .on_conflict_do_nothing(index_elements=[PropertyCategory.code])
        )


async def close_connections() -> None:
    """Close process-wide database and Redis pools during application shutdown."""
    await close_redis_client()
    await engine.dispose()


__all__ = [
    "SessionFactory",
    "close_connections",
    "connect_to_database",
    "connect_to_redis",
    "connect_to_services",
    "engine",
    "get_db_session",
    "get_redis_client",
]
