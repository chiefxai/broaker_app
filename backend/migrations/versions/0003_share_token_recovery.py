"""Persist encrypted share tokens so authenticated owners can reuse public URLs.

Revision ID: 0003_share_token_recovery
Revises: 0002_password_auth
"""

import sqlalchemy as sa
from alembic import op

revision = "0003_share_token_recovery"
down_revision = "0002_password_auth"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("share_links", sa.Column("token_ciphertext", sa.LargeBinary(), nullable=True))


def downgrade() -> None:
    op.drop_column("share_links", "token_ciphertext")
