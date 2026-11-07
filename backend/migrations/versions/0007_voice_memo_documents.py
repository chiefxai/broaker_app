"""Allow private voice memo property documents."""

from alembic import op

revision = "0007_voice_memo_documents"
down_revision = "0006_signing_timestamp_defaults"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_constraint("category_allowed", "property_documents", type_="check")
    op.create_check_constraint(
        "category_allowed",
        "property_documents",
        "category IN ('photo', 'title_deed', 'survey', 'soil_report', 'voice_memo', 'other')",
    )


def downgrade() -> None:
    op.drop_constraint("category_allowed", "property_documents", type_="check")
    op.create_check_constraint(
        "category_allowed",
        "property_documents",
        "category IN ('photo', 'title_deed', 'survey', 'soil_report', 'other')",
    )
