"""Set database timestamp defaults for signing authorities.

Revision ID: 0006_signing_timestamp_defaults
Revises: 0005_signing_authorities
"""
import sqlalchemy as sa
from alembic import op

revision = "0006_signing_timestamp_defaults"
down_revision = "0005_signing_authorities"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        "property_signing_authorities",
        "created_at",
        existing_type=sa.DateTime(timezone=True),
        server_default=sa.func.now(),
    )
    op.alter_column(
        "property_signing_authorities",
        "updated_at",
        existing_type=sa.DateTime(timezone=True),
        server_default=sa.func.now(),
    )


def downgrade() -> None:
    op.alter_column(
        "property_signing_authorities",
        "updated_at",
        existing_type=sa.DateTime(timezone=True),
        server_default=None,
    )
    op.alter_column(
        "property_signing_authorities",
        "created_at",
        existing_type=sa.DateTime(timezone=True),
        server_default=None,
    )
