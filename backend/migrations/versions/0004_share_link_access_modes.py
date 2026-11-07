"""Add share-link visibility and protected passcodes.

Revision ID: 0004_share_link_access_modes
Revises: 0003_share_token_recovery
"""
import sqlalchemy as sa
from alembic import op

revision = "0004_share_link_access_modes"
down_revision = "0003_share_token_recovery"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "share_links",
        sa.Column("visibility", sa.String(16), nullable=False, server_default="unlisted"),
    )
    op.add_column("share_links", sa.Column("passcode_hash", sa.String(256), nullable=True))
    op.create_check_constraint(
        "share_link_visibility_valid",
        "share_links",
        "visibility IN ('private', 'protected', 'unlisted')",
    )
    op.create_check_constraint(
        "protected_share_link_has_passcode",
        "share_links",
        "visibility != 'protected' OR passcode_hash IS NOT NULL",
    )


def downgrade() -> None:
    op.drop_constraint("protected_share_link_has_passcode", "share_links", type_="check")
    op.drop_constraint("share_link_visibility_valid", "share_links", type_="check")
    op.drop_column("share_links", "passcode_hash")
    op.drop_column("share_links", "visibility")
