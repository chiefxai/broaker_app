"""Add broker profile and portfolio share links."""

import sqlalchemy as sa
from alembic import op

revision = "0008_profile_share_links"
down_revision = "0007_voice_memo_documents"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "profile_share_links",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("owner_user_id", sa.Uuid(), nullable=False),
        sa.Column("token_hash", sa.LargeBinary(length=32), nullable=False),
        sa.Column("token_ciphertext", sa.LargeBinary(), nullable=True),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("include_profile", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column(
            "include_properties", sa.Boolean(), server_default=sa.text("true"), nullable=False
        ),
        sa.Column("visibility", sa.String(length=16), server_default="unlisted", nullable=False),
        sa.Column("passcode_hash", sa.String(length=256), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.CheckConstraint(
            "octet_length(token_hash) = 32", name="profile_share_token_hash_sha256_length"
        ),
        sa.CheckConstraint(
            "expires_at IS NULL OR expires_at > created_at",
            name="profile_share_expiry_after_create",
        ),
        sa.CheckConstraint(
            "visibility IN ('protected', 'unlisted')", name="profile_share_visibility_valid"
        ),
        sa.CheckConstraint(
            "visibility != 'protected' OR passcode_hash IS NOT NULL",
            name="profile_share_protected_has_passcode",
        ),
        sa.CheckConstraint(
            "include_profile OR include_properties", name="profile_share_has_content"
        ),
        sa.ForeignKeyConstraint(["owner_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token_hash"),
    )
    op.create_index(
        "ix_profile_share_links_owner_state",
        "profile_share_links",
        ["owner_user_id", "revoked_at", "expires_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_profile_share_links_owner_state", table_name="profile_share_links")
    op.drop_table("profile_share_links")
