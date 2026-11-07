from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config.connections import (
    close_connections,
    connect_to_services,
    create_local_database,
)
from app.core.config import get_settings
from app.routes.auth import router as auth_router
from app.routes.dashboard import router as dashboard_router
from app.routes.documents import router as documents_router
from app.routes.profiles import router as profiles_router
from app.routes.properties import router as properties_router
from app.routes.reference import router as reference_router
from app.routes.sharing import private_router as sharing_router
from app.routes.sharing import public_router as public_sharing_router
from app.routes.signing_authorities import router as signing_authorities_router
from app.routes.uploads import router as uploads_router
from app.utils.security import SecurityHeadersMiddleware

settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    try:
        if settings.auto_create_tables:
            if settings.environment.lower() not in {"local", "development", "dev"}:
                raise RuntimeError(
                    "AUTO_CREATE_TABLES is only allowed in local/development environments"
                )
            await connect_to_services()
            await create_local_database()
        yield
    finally:
        await close_connections()


app = FastAPI(title=settings.app_name, debug=settings.debug, lifespan=lifespan)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        origin.strip() for origin in settings.cors_allowed_origins.split(",") if origin.strip()
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Share-Passcode"],
)
app.include_router(auth_router, prefix=settings.api_v1_prefix)
app.include_router(profiles_router, prefix=settings.api_v1_prefix)
app.include_router(dashboard_router, prefix=settings.api_v1_prefix)
app.include_router(properties_router, prefix=settings.api_v1_prefix)
app.include_router(signing_authorities_router, prefix=settings.api_v1_prefix)
app.include_router(documents_router, prefix=settings.api_v1_prefix)
app.include_router(sharing_router, prefix=settings.api_v1_prefix)
app.include_router(public_sharing_router, prefix=settings.api_v1_prefix)
app.include_router(reference_router, prefix=settings.api_v1_prefix)
app.include_router(uploads_router, prefix=settings.api_v1_prefix)


@app.get("/health", tags=["health"])
async def health() -> dict[str, str]:
    return {"status": "ok"}
