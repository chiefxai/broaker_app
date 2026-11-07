"""Store a default expiry choice for links created from Settings."""

import sqlalchemy as sa
from alembic import op

revision = "0011_default_share_expiration"
down_revision = "0010_property_groups"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "user_preferences",
        sa.Column("default_expiration_days", sa.Integer(), nullable=True),
    )
    op.create_check_constraint(
        "default_expiration_days_allowed",
        "user_preferences",
        "default_expiration_days IS NULL OR default_expiration_days IN (1, 7, 30, 90, 365)",
    )


def downgrade() -> None:
    op.drop_constraint("default_expiration_days_allowed", "user_preferences", type_="check")
    op.drop_column("user_preferences", "default_expiration_days")
