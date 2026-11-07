import app.models  # noqa: F401
from app.db.base import Base


def test_v1_model_metadata_contains_all_planned_tables() -> None:
    expected = {
        "users",
        "password_credentials",
        "broker_profiles",
        "business_profiles",
        "user_preferences",
        "onboarding_progress",
        "properties",
        "property_categories",
        "user_property_categories",
        "property_secondary_categories",
        "property_locations",
        "property_features",
        "property_water_sources",
        "property_utilities",
        "property_financials",
        "property_legal_details",
        "property_documents",
        "property_signing_authorities",
        "property_notes",
        "share_links",
        "profile_share_links",
    }

    assert set(Base.metadata.tables) == expected


def test_property_list_and_share_token_indexes_are_defined() -> None:
    property_indexes = {index.name for index in Base.metadata.tables["properties"].indexes}

    assert "ix_properties_owner_status_updated" in property_indexes
    assert "ix_properties_owner_category_status" in property_indexes
    assert any(
        constraint.__class__.__name__ == "UniqueConstraint"
        and {column.name for column in constraint.columns} == {"token_hash"}
        for constraint in Base.metadata.tables["share_links"].constraints
    )
    share_link_columns = {column.name for column in Base.metadata.tables["share_links"].columns}
    assert "token_ciphertext" in share_link_columns
    assert {"visibility", "passcode_hash"} <= share_link_columns
