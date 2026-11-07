from app.services.password_auth import hash_password, verify_password


def test_password_hash_is_salted_and_does_not_contain_plaintext() -> None:
    first = hash_password("a-long-password")
    second = hash_password("a-long-password")

    assert first.startswith("argon2id$")
    assert first != second
    assert "a-long-password" not in first
    assert verify_password("a-long-password", first)
    assert not verify_password("another-password", first)


def test_password_verification_rejects_malformed_hashes() -> None:
    assert not verify_password("password", "not-a-supported-hash")
