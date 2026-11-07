# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS frontend-deps
WORKDIR /app/frontend
COPY ["frontend/package.json", "./package.json"]
COPY ["frontend/package-lock.json", "./package-lock.json"]
RUN npm ci
COPY ["frontend/", "./"]

FROM python:3.12-slim AS backend-deps
WORKDIR /src/backend
COPY ["backend/pyproject.toml", "./pyproject.toml"]
COPY ["backend/README.md", "./README.md"]
COPY ["backend/app/", "./app/"]
RUN pip install --no-cache-dir --prefix=/install .

FROM node:22-bookworm-slim AS node-runtime

FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app/backend \
    EXPO_NO_TELEMETRY=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends bash ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --uid 10001 app

COPY --from=node-runtime /usr/local/ /usr/local/
COPY --from=backend-deps /install/ /usr/local/
COPY --from=frontend-deps /app/frontend/ /app/frontend/

COPY ["backend/app/", "/app/backend/app/"]
COPY ["backend/migrations/", "/app/backend/migrations/"]
COPY ["backend/alembic.ini", "/app/backend/alembic.ini"]
COPY ["scripts/fullstack-entrypoint.sh", "/usr/local/bin/fullstack-entrypoint"]

RUN chmod +x /usr/local/bin/fullstack-entrypoint \
    && mkdir -p /app/frontend/.expo /home/app/.npm \
    && chown -R app:app /app/frontend /home/app

WORKDIR /app
USER app

EXPOSE 8000 8081
ENTRYPOINT ["/usr/local/bin/fullstack-entrypoint"]
