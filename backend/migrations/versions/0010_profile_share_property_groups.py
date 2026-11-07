"""Support profile share links scoped to a selected active property group."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0010_property_groups"
down_revision = "0009_property_disclosures"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "profile_share_links",
        sa.Column("property_ids", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("profile_share_links", "property_ids")
