"""Store per-property disclosure overrides on profile share links."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0009_property_disclosures"
down_revision = "0008_profile_share_links"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "profile_share_links",
        sa.Column(
            "property_disclosures",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_column("profile_share_links", "property_disclosures")
