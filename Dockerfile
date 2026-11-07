# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS frontend-deps
WORKDIR /app/frontend
COPY ["broaker app/package.json", "./package.json"]
COPY ["broaker app/package-lock.json", "./package-lock.json"]
RUN npm ci
COPY ["broaker app/", "./"]

FROM python:3.12-slim AS backend-deps
WORKDIR /src/backend
COPY ["broaker app backend/pyproject.toml", "./pyproject.toml"]
COPY ["broaker app backend/README.md", "./README.md"]
COPY ["broaker app backend/app/", "./app/"]
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

COPY ["broaker app backend/app/", "/app/backend/app/"]
COPY ["broaker app backend/migrations/", "/app/backend/migrations/"]
COPY ["broaker app backend/alembic.ini", "/app/backend/alembic.ini"]
COPY ["broaker app/scripts/fullstack-entrypoint.sh", "/usr/local/bin/fullstack-entrypoint"]

RUN chmod +x /usr/local/bin/fullstack-entrypoint \
    && mkdir -p /app/frontend/.expo /home/app/.npm \
    && chown -R app:app /app/frontend /home/app

WORKDIR /app
USER app

EXPOSE 8000 8081
ENTRYPOINT ["/usr/local/bin/fullstack-entrypoint"]
