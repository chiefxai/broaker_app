"""Add local password credentials and provider-neutral user subjects.

Revision ID: 0002_password_auth
Revises: 0001_initial_schema
"""

import sqlalchemy as sa
from alembic import op

revision = "0002_password_auth"
down_revision = "0001_initial_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_constraint("uq_users_cognito_sub", "users", type_="unique")
    op.alter_column("users", "cognito_sub", new_column_name="identity_sub")
    op.create_unique_constraint("uq_users_identity_sub", "users", ["identity_sub"])
    op.create_table(
        "password_credentials",
        sa.Column("user_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("password_hash", sa.String(length=512), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_id"),
        sa.UniqueConstraint("email", name="uq_password_credentials_email"),
    )
    op.execute(sa.text("""
        INSERT INTO property_categories (id, code, label, sort_order)
        VALUES
            ('00000000-0000-4000-8000-000000000001', 'agriculture', 'Agriculture Land', 0),
            ('00000000-0000-4000-8000-000000000002', 'plots', 'Plots', 1),
            ('00000000-0000-4000-8000-000000000003', 'house_villa', 'House / Villa', 2),
            ('00000000-0000-4000-8000-000000000004', 'commercial', 'Commercial Building', 3),
            ('00000000-0000-4000-8000-000000000005', 'apartment', 'Apartment', 4)
        ON CONFLICT (code) DO NOTHING
    """))


def downgrade() -> None:
    op.drop_table("password_credentials")
    op.drop_constraint("uq_users_identity_sub", "users", type_="unique")
    op.alter_column("users", "identity_sub", new_column_name="cognito_sub")
    op.create_unique_constraint("uq_users_cognito_sub", "users", ["cognito_sub"])
