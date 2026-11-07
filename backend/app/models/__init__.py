"""SQLAlchemy models for the solo-broker v1 schema."""

from app.models.account import (
    BrokerProfile,
    BusinessProfile,
    OnboardingProgress,
    PasswordCredential,
    User,
    UserPreference,
)
from app.models.catalog import PropertyCategory, PropertySecondaryCategory, UserPropertyCategory
from app.models.document import PropertyDocument
from app.models.property import (
    Property,
    PropertyFeatures,
    PropertyFinancials,
    PropertyLegalDetails,
    PropertyLocation,
    PropertyNote,
    PropertySigningAuthority,
    PropertyUtility,
    PropertyWaterSource,
)
from app.models.sharing import ProfileShareLink, ShareLink

__all__ = [
    "BrokerProfile",
    "BusinessProfile",
    "OnboardingProgress",
    "PasswordCredential",
    "Property",
    "PropertyCategory",
    "PropertyDocument",
    "PropertyFeatures",
    "PropertyFinancials",
    "PropertyLegalDetails",
    "PropertyLocation",
    "PropertyNote",
    "PropertySigningAuthority",
    "PropertySecondaryCategory",
    "PropertyUtility",
    "PropertyWaterSource",
    "ProfileShareLink",
    "ShareLink",
    "User",
    "UserPreference",
    "UserPropertyCategory",
]
