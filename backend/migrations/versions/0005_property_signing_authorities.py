"""Add property signing authorities.

Revision ID: 0005_signing_authorities
Revises: 0004_share_link_access_modes
"""
import sqlalchemy as sa
from alembic import op

revision = "0005_signing_authorities"
down_revision = "0004_share_link_access_modes"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "property_signing_authorities",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("property_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("phone", sa.String(length=40), nullable=True),
        sa.Column("relationship", sa.String(length=120), nullable=False),
        sa.Column("record_label", sa.String(length=120), nullable=True),
        sa.Column("record_value", sa.String(length=255), nullable=True),
        sa.Column(
            "verification_status", sa.String(length=20), server_default="pending", nullable=False
        ),
        sa.Column(
            "signature_status", sa.String(length=20), server_default="pending", nullable=False
        ),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.CheckConstraint("verification_status = 'pending'", name="verification_status_pending"),
        sa.CheckConstraint("signature_status = 'pending'", name="signature_status_pending"),
        sa.ForeignKeyConstraint(["property_id"], ["properties.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_property_signing_authorities_property",
        "property_signing_authorities",
        ["property_id"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_property_signing_authorities_property", table_name="property_signing_authorities"
    )
    op.drop_table("property_signing_authorities")
