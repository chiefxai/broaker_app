"""Initial solo-broker v1 schema.

Revision ID: 0001_initial_schema
Revises:
"""

from uuid import UUID

import sqlalchemy as sa
from alembic import op

revision = "0001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        sa.text("""
        CREATE TABLE property_categories (
            id UUID NOT NULL,
            code VARCHAR(50) NOT NULL,
            label VARCHAR(100) NOT NULL,
            sort_order INTEGER DEFAULT '0' NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            CONSTRAINT pk_property_categories PRIMARY KEY (id),
            CONSTRAINT uq_property_categories_code UNIQUE (code),
            CONSTRAINT ck_property_categories_code_format CHECK (code ~ '^[a-z][a-z0-9_]*$'),
            CONSTRAINT ck_property_categories_label_nonempty CHECK (length(trim(label)) > 0),
            CONSTRAINT ck_property_categories_sort_order_nonnegative CHECK (sort_order >= 0)
        )
    """)
    )
    op.execute(
        sa.text("""
        CREATE TABLE users (
            id UUID NOT NULL,
            cognito_sub VARCHAR(128) NOT NULL,
            account_email VARCHAR(320) NOT NULL,
            is_active BOOLEAN DEFAULT 'true' NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            CONSTRAINT pk_users PRIMARY KEY (id),
            CONSTRAINT uq_users_cognito_sub UNIQUE (cognito_sub)
        )
    """)
    )
    op.execute(
        sa.text("""
        CREATE INDEX ix_users_is_active ON users (is_active)
    """)
    )
    op.execute(
        sa.text("""
        CREATE TABLE broker_profiles (
            user_id UUID NOT NULL,
            legal_name VARCHAR(200),
            mobile_phone VARCHAR(40),
            operating_language VARCHAR(12) NOT NULL,
            designation VARCHAR(200),
            license_number VARCHAR(100),
            license_jurisdiction VARCHAR(100),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            CONSTRAINT pk_broker_profiles PRIMARY KEY (user_id),
            CONSTRAINT fk_broker_profiles_user_id_users FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE
        )
    """)
    )
    op.execute(
        sa.text("""
        CREATE TABLE business_profiles (
            user_id UUID NOT NULL,
            business_name VARCHAR(200),
            public_phone VARCHAR(40),
            public_email VARCHAR(320),
            city VARCHAR(100),
            district VARCHAR(100),
            state VARCHAR(100),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            CONSTRAINT pk_business_profiles PRIMARY KEY (user_id),
            CONSTRAINT fk_business_profiles_user_id_users FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE
        )
    """)
    )
    op.execute(
        sa.text("""
        CREATE TABLE onboarding_progress (
            user_id UUID NOT NULL,
            current_step VARCHAR(80),
            completed_steps JSONB DEFAULT '[]' NOT NULL,
            completed_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            CONSTRAINT pk_onboarding_progress PRIMARY KEY (user_id),
            CONSTRAINT ck_onboarding_progress_completed_steps_array CHECK (jsonb_typeof(completed_steps) = 'array'),
            CONSTRAINT fk_onboarding_progress_user_id_users FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE
        )
    """)
    )
    op.execute(
        sa.text("""
        CREATE TABLE properties (
            id UUID NOT NULL,
            owner_user_id UUID NOT NULL,
            title VARCHAR(200) NOT NULL,
            description TEXT,
            primary_category_id UUID NOT NULL,
            status VARCHAR(20) DEFAULT 'draft' NOT NULL,
            published_at TIMESTAMP WITH TIME ZONE,
            archived_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            CONSTRAINT pk_properties PRIMARY KEY (id),
            CONSTRAINT ck_properties_status_allowed CHECK (status IN ('draft', 'active', 'archived')),
            CONSTRAINT fk_properties_owner_user_id_users FOREIGN KEY(owner_user_id) REFERENCES users (id) ON DELETE RESTRICT,
            CONSTRAINT fk_properties_primary_category_id_property_categories FOREIGN KEY(primary_category_id) REFERENCES property_categories (id) ON DELETE RESTRICT
        )
    """)
    )
    op.execute(
        sa.text("""
        CREATE INDEX ix_properties_owner_category_status ON properties (owner_user_id, primary_category_id, status)
    """)
    )
    op.execute(
        sa.text("""
        CREATE INDEX ix_properties_owner_status_updated ON properties (owner_user_id, status, updated_at)
    """)
    )
    op.execute(
        sa.text("""
        CREATE TABLE user_preferences (
            user_id UUID NOT NULL,
            theme VARCHAR(10) DEFAULT 'light' NOT NULL,
            language VARCHAR(12) DEFAULT 'en' NOT NULL,
            default_disclosures JSONB NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            CONSTRAINT pk_user_preferences PRIMARY KEY (user_id),
            CONSTRAINT ck_user_preferences_theme_allowed CHECK (theme IN ('light', 'dark')),
            CONSTRAINT fk_user_preferences_user_id_users FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE
        )
    """)
    )
    op.execute(
        sa.text("""
        CREATE TABLE user_property_categories (
            user_id UUID NOT NULL,
            category_id UUID NOT NULL,
            enabled BOOLEAN DEFAULT 'true' NOT NULL,
            sort_order INTEGER DEFAULT '0' NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            CONSTRAINT pk_user_property_categories PRIMARY KEY (user_id, category_id),
            CONSTRAINT ck_user_property_categories_sort_order_nonnegative CHECK (sort_order >= 0),
            CONSTRAINT fk_user_property_categories_user_id_users FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE,
            CONSTRAINT fk_user_property_categories_category_id_property_categories FOREIGN KEY(category_id) REFERENCES property_categories (id) ON DELETE RESTRICT
        )
    """)
    )
    op.execute(
        sa.text("""
        CREATE INDEX ix_user_property_categories_user_enabled ON user_property_categories (user_id, enabled)
    """)
    )
    op.execute(
        sa.text("""
        CREATE TABLE property_documents (
            id UUID NOT NULL,
            property_id UUID NOT NULL,
            uploaded_by_user_id UUID NOT NULL,
            object_key VARCHAR(1024) NOT NULL,
            original_filename VARCHAR(255) NOT NULL,
            display_name VARCHAR(255),
            content_type VARCHAR(150) NOT NULL,
            size_bytes BIGINT,
            checksum_sha256 VARCHAR(64),
            category VARCHAR(50) NOT NULL,
            visibility VARCHAR(20) DEFAULT 'private' NOT NULL,
            upload_status VARCHAR(20) DEFAULT 'pending' NOT NULL,
            deleted_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            CONSTRAINT pk_property_documents PRIMARY KEY (id),
            CONSTRAINT ck_property_documents_size_positive CHECK (size_bytes IS NULL OR size_bytes > 0),
            CONSTRAINT ck_property_documents_checksum_sha256_format CHECK (checksum_sha256 IS NULL OR checksum_sha256 ~ '^[0-9a-f]{64}$'),
            CONSTRAINT ck_property_documents_category_allowed CHECK (category IN ('photo', 'title_deed', 'survey', 'soil_report', 'other')),
            CONSTRAINT ck_property_documents_visibility_allowed CHECK (visibility IN ('private', 'shared', 'public')),
            CONSTRAINT ck_property_documents_upload_status_allowed CHECK (upload_status IN ('pending', 'uploaded', 'rejected', 'deleted')),
            CONSTRAINT fk_property_documents_property_id_properties FOREIGN KEY(property_id) REFERENCES properties (id) ON DELETE CASCADE,
            CONSTRAINT fk_property_documents_uploaded_by_user_id_users FOREIGN KEY(uploaded_by_user_id) REFERENCES users (id) ON DELETE RESTRICT,
            CONSTRAINT uq_property_documents_object_key UNIQUE (object_key)
        )
    """)
    )
    op.execute(
        sa.text("""
        CREATE INDEX ix_property_documents_property_category ON property_documents (property_id, category)
    """)
    )
    op.execute(
        sa.text("""
        CREATE INDEX ix_property_documents_property_upload_status ON property_documents (property_id, upload_status)
    """)
    )
    op.execute(
        sa.text("""
        CREATE TABLE property_features (
            property_id UUID NOT NULL,
            soil_type VARCHAR(40),
            soil_type_other VARCHAR(120),
            water_tds_ppm INTEGER,
            agronomist_notes TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            CONSTRAINT pk_property_features PRIMARY KEY (property_id),
            CONSTRAINT ck_property_features_soil_type_allowed CHECK (soil_type IS NULL OR soil_type IN ('red', 'black', 'alluvial', 'sandy_loam', 'other')),
            CONSTRAINT ck_property_features_tds_nonnegative CHECK (water_tds_ppm IS NULL OR water_tds_ppm >= 0),
            CONSTRAINT ck_property_features_soil_other_consistent CHECK ((soil_type = 'other' AND soil_type_other IS NOT NULL) OR (soil_type IS DISTINCT FROM 'other' AND soil_type_other IS NULL)),
            CONSTRAINT fk_property_features_property_id_properties FOREIGN KEY(property_id) REFERENCES properties (id) ON DELETE CASCADE
        )
    """)
    )
    op.execute(
        sa.text("""
        CREATE TABLE property_financials (
            property_id UUID NOT NULL,
            currency VARCHAR(3) DEFAULT 'INR' NOT NULL,
            asking_price_inr BIGINT,
            minimum_price_inr BIGINT,
            negotiable BOOLEAN,
            area NUMERIC(18, 4),
            area_unit VARCHAR(30),
            advance_amount_inr BIGINT,
            payment_milestones_flexible BOOLEAN,
            lending_bank VARCHAR(200),
            outstanding_loan_inr BIGINT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            CONSTRAINT pk_property_financials PRIMARY KEY (property_id),
            CONSTRAINT ck_property_financials_asking_price_nonnegative CHECK (asking_price_inr IS NULL OR asking_price_inr >= 0),
            CONSTRAINT ck_property_financials_minimum_price_nonnegative CHECK (minimum_price_inr IS NULL OR minimum_price_inr >= 0),
            CONSTRAINT ck_property_financials_minimum_price_le_asking_price CHECK (minimum_price_inr IS NULL OR asking_price_inr IS NULL OR minimum_price_inr <= asking_price_inr),
            CONSTRAINT ck_property_financials_area_positive CHECK (area IS NULL OR area > 0),
            CONSTRAINT ck_property_financials_area_unit_paired CHECK ((area IS NULL AND area_unit IS NULL) OR (area IS NOT NULL AND area_unit IS NOT NULL)),
            CONSTRAINT ck_property_financials_advance_nonnegative CHECK (advance_amount_inr IS NULL OR advance_amount_inr >= 0),
            CONSTRAINT ck_property_financials_loan_nonnegative CHECK (outstanding_loan_inr IS NULL OR outstanding_loan_inr >= 0),
            CONSTRAINT fk_property_financials_property_id_properties FOREIGN KEY(property_id) REFERENCES properties (id) ON DELETE CASCADE
        )
    """)
    )
    op.execute(
        sa.text("""
        CREATE INDEX ix_property_financials_area_unit_area ON property_financials (area_unit, area)
    """)
    )
    op.execute(
        sa.text("""
        CREATE INDEX ix_property_financials_asking_price ON property_financials (asking_price_inr)
    """)
    )
    op.execute(
        sa.text("""
        CREATE TABLE property_legal_details (
            property_id UUID NOT NULL,
            title_classification VARCHAR(40),
            legal_summary TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            CONSTRAINT pk_property_legal_details PRIMARY KEY (property_id),
            CONSTRAINT ck_property_legal_details_title_classification_allowed CHECK (title_classification IS NULL OR title_classification IN ('ryotwari_patta', 'natham', 'gramathu_natham', 'other')),
            CONSTRAINT fk_property_legal_details_property_id_properties FOREIGN KEY(property_id) REFERENCES properties (id) ON DELETE CASCADE
        )
    """)
    )
    op.execute(
        sa.text("""
        CREATE TABLE property_locations (
            property_id UUID NOT NULL,
            address_line VARCHAR(500),
            village VARCHAR(150),
            pincode VARCHAR(20),
            taluk VARCHAR(100),
            district VARCHAR(100),
            state VARCHAR(100),
            country_code VARCHAR(2),
            latitude NUMERIC(9, 6),
            longitude NUMERIC(9, 6),
            survey_numbers JSONB NOT NULL,
            width_ft NUMERIC(12, 2),
            length_ft NUMERIC(12, 2),
            frontage_direction VARCHAR(20),
            road_width_ft NUMERIC(12, 2),
            road_access_type VARCHAR(80),
            road_subdivision_basis VARCHAR(200),
            highway_distance_km NUMERIC(10, 2),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            CONSTRAINT pk_property_locations PRIMARY KEY (property_id),
            CONSTRAINT ck_property_locations_coordinates_paired CHECK ((latitude IS NULL AND longitude IS NULL) OR (latitude IS NOT NULL AND longitude IS NOT NULL)),
            CONSTRAINT ck_property_locations_latitude_range CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
            CONSTRAINT ck_property_locations_longitude_range CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180),
            CONSTRAINT ck_property_locations_width_nonnegative CHECK (width_ft IS NULL OR width_ft >= 0),
            CONSTRAINT ck_property_locations_length_nonnegative CHECK (length_ft IS NULL OR length_ft >= 0),
            CONSTRAINT ck_property_locations_road_width_nonnegative CHECK (road_width_ft IS NULL OR road_width_ft >= 0),
            CONSTRAINT ck_property_locations_highway_distance_nonnegative CHECK (highway_distance_km IS NULL OR highway_distance_km >= 0),
            CONSTRAINT fk_property_locations_property_id_properties FOREIGN KEY(property_id) REFERENCES properties (id) ON DELETE CASCADE
        )
    """)
    )
    op.execute(
        sa.text("""
        CREATE INDEX ix_property_locations_district_state ON property_locations (district, state)
    """)
    )
    op.execute(
        sa.text("""
        CREATE TABLE property_notes (
            property_id UUID NOT NULL,
            body TEXT DEFAULT '' NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            CONSTRAINT pk_property_notes PRIMARY KEY (property_id),
            CONSTRAINT fk_property_notes_property_id_properties FOREIGN KEY(property_id) REFERENCES properties (id) ON DELETE CASCADE
        )
    """)
    )
    op.execute(
        sa.text("""
        CREATE TABLE property_secondary_categories (
            id UUID NOT NULL,
            property_id UUID NOT NULL,
            category_id UUID NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            CONSTRAINT pk_property_secondary_categories PRIMARY KEY (id),
            CONSTRAINT uq_property_secondary_categories_pair UNIQUE (property_id, category_id),
            CONSTRAINT fk_property_secondary_categories_property_id_properties FOREIGN KEY(property_id) REFERENCES properties (id) ON DELETE CASCADE,
            CONSTRAINT fk_property_secondary_categories_category_id_property_c_b322 FOREIGN KEY(category_id) REFERENCES property_categories (id) ON DELETE RESTRICT
        )
    """)
    )
    op.execute(
        sa.text("""
        CREATE TABLE property_utilities (
            id UUID NOT NULL,
            property_id UUID NOT NULL,
            utility_type VARCHAR(40) NOT NULL,
            available BOOLEAN NOT NULL,
            details TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            CONSTRAINT pk_property_utilities PRIMARY KEY (id),
            CONSTRAINT ck_property_utilities_utility_type_allowed CHECK (utility_type IN ('electricity', 'irrigation', 'fencing', 'road_access', 'other')),
            CONSTRAINT fk_property_utilities_property_id_properties FOREIGN KEY(property_id) REFERENCES properties (id) ON DELETE CASCADE
        )
    """)
    )
    op.execute(
        sa.text("""
        CREATE INDEX ix_property_utilities_property ON property_utilities (property_id)
    """)
    )
    op.execute(
        sa.text("""
        CREATE TABLE property_water_sources (
            id UUID NOT NULL,
            property_id UUID NOT NULL,
            source_type VARCHAR(40) NOT NULL,
            label VARCHAR(160),
            depth_ft NUMERIC(10, 2),
            diameter_ft NUMERIC(10, 2),
            yield_inches NUMERIC(8, 2),
            seasonality VARCHAR(200),
            details TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            CONSTRAINT pk_property_water_sources PRIMARY KEY (id),
            CONSTRAINT ck_property_water_sources_source_type_allowed CHECK (source_type IN ('river', 'canal', 'borewell', 'open_well', 'government_supply', 'other')),
            CONSTRAINT ck_property_water_sources_depth_nonnegative CHECK (depth_ft IS NULL OR depth_ft >= 0),
            CONSTRAINT ck_property_water_sources_diameter_nonnegative CHECK (diameter_ft IS NULL OR diameter_ft >= 0),
            CONSTRAINT ck_property_water_sources_yield_nonnegative CHECK (yield_inches IS NULL OR yield_inches >= 0),
            CONSTRAINT fk_property_water_sources_property_id_properties FOREIGN KEY(property_id) REFERENCES properties (id) ON DELETE CASCADE
        )
    """)
    )
    op.execute(
        sa.text("""
        CREATE INDEX ix_property_water_sources_property ON property_water_sources (property_id)
    """)
    )
    op.execute(
        sa.text("""
        CREATE TABLE share_links (
            id UUID NOT NULL,
            property_id UUID NOT NULL,
            created_by_user_id UUID NOT NULL,
            token_hash BYTEA NOT NULL,
            title VARCHAR(200),
            disclosures JSONB NOT NULL,
            expires_at TIMESTAMP WITH TIME ZONE,
            revoked_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            CONSTRAINT pk_share_links PRIMARY KEY (id),
            CONSTRAINT ck_share_links_token_hash_sha256_length CHECK (octet_length(token_hash) = 32),
            CONSTRAINT ck_share_links_expiry_after_create CHECK (expires_at IS NULL OR expires_at > created_at),
            CONSTRAINT fk_share_links_property_id_properties FOREIGN KEY(property_id) REFERENCES properties (id) ON DELETE CASCADE,
            CONSTRAINT fk_share_links_created_by_user_id_users FOREIGN KEY(created_by_user_id) REFERENCES users (id) ON DELETE RESTRICT,
            CONSTRAINT uq_share_links_token_hash UNIQUE (token_hash)
        )
    """)
    )
    op.execute(
        sa.text("""
        CREATE INDEX ix_share_links_property_state ON share_links (property_id, revoked_at, expires_at)
    """)
    )
    categories = sa.table(
        "property_categories",
        sa.column("id", sa.Uuid()),
        sa.column("code", sa.String(50)),
        sa.column("label", sa.String(100)),
        sa.column("sort_order", sa.Integer()),
    )
    op.bulk_insert(
        categories,
        [
            {
                "id": UUID("00000000-0000-4000-8000-000000000001"),
                "code": "agriculture",
                "label": "Agriculture Land",
                "sort_order": 0,
            },
            {
                "id": UUID("00000000-0000-4000-8000-000000000002"),
                "code": "plots",
                "label": "Plots",
                "sort_order": 1,
            },
            {
                "id": UUID("00000000-0000-4000-8000-000000000003"),
                "code": "house_villa",
                "label": "House / Villa",
                "sort_order": 2,
            },
            {
                "id": UUID("00000000-0000-4000-8000-000000000004"),
                "code": "commercial",
                "label": "Commercial Building",
                "sort_order": 3,
            },
            {
                "id": UUID("00000000-0000-4000-8000-000000000005"),
                "code": "apartment",
                "label": "Apartment",
                "sort_order": 4,
            },
        ],
    )


def downgrade() -> None:
    op.execute(sa.text("DROP TABLE IF EXISTS share_links CASCADE"))
    op.execute(sa.text("DROP TABLE IF EXISTS property_water_sources CASCADE"))
    op.execute(sa.text("DROP TABLE IF EXISTS property_utilities CASCADE"))
    op.execute(sa.text("DROP TABLE IF EXISTS property_secondary_categories CASCADE"))
    op.execute(sa.text("DROP TABLE IF EXISTS property_notes CASCADE"))
    op.execute(sa.text("DROP TABLE IF EXISTS property_locations CASCADE"))
    op.execute(sa.text("DROP TABLE IF EXISTS property_legal_details CASCADE"))
    op.execute(sa.text("DROP TABLE IF EXISTS property_financials CASCADE"))
    op.execute(sa.text("DROP TABLE IF EXISTS property_features CASCADE"))
    op.execute(sa.text("DROP TABLE IF EXISTS property_documents CASCADE"))
    op.execute(sa.text("DROP TABLE IF EXISTS user_property_categories CASCADE"))
    op.execute(sa.text("DROP TABLE IF EXISTS user_preferences CASCADE"))
    op.execute(sa.text("DROP TABLE IF EXISTS properties CASCADE"))
    op.execute(sa.text("DROP TABLE IF EXISTS onboarding_progress CASCADE"))
    op.execute(sa.text("DROP TABLE IF EXISTS business_profiles CASCADE"))
    op.execute(sa.text("DROP TABLE IF EXISTS broker_profiles CASCADE"))
    op.execute(sa.text("DROP TABLE IF EXISTS users CASCADE"))
    op.execute(sa.text("DROP TABLE IF EXISTS property_categories CASCADE"))
