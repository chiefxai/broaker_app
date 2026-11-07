"""Encrypt share bearer tokens for owner-only recovery while retaining hash lookups."""

from cryptography.fernet import Fernet, InvalidToken


def _fernet(key: str) -> Fernet:
    if not key:
        raise RuntimeError("SHARE_LINK_ENCRYPTION_KEY must be configured")
    try:
        return Fernet(key.encode("ascii"))
    except (ValueError, UnicodeEncodeError) as exc:
        raise RuntimeError("SHARE_LINK_ENCRYPTION_KEY must be a valid Fernet key") from exc


def encrypt_share_token(token: str, key: str) -> bytes:
    return _fernet(key).encrypt(token.encode("utf-8"))


def decrypt_share_token(ciphertext: bytes, key: str) -> str:
    try:
        return _fernet(key).decrypt(ciphertext).decode("utf-8")
    except InvalidToken as exc:
        raise RuntimeError("Could not recover this share link token") from exc
