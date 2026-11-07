# Ownership and document component rules

- Keep each section presentation-only; ownership, identity, private notes, documents, and reference links are supplied by typed props and callbacks.
- Never display mock owner or document values as real production records. Keep sample content in `test/fixtures/`.
- Use `DocumentFileRow` for uploaded-file listings, and keep document actions and verification changes controlled by the caller.
- Legal file uploads use the implemented property-scoped presign → direct PUT → register flow and must carry the selected API document category (`title_deed`, `survey`, `soil_report`, or `other`).
- A backend `upload_status: uploaded` means storage integrity checks passed and the file is ready for legal review. Never describe that state as verified ownership, title validity, identity, or legal standing.
- Clamp signing authority management to 1–6 entries; collect and validate the signer’s full legal name, phone, relationship, and optional record reference through controlled callbacks.
- Live signing-authority edits use the implemented property-scoped GET/PUT API. Treat verification and signature status as server-controlled; new records remain pending until a reviewer workflow changes them. Keep mock-mode edits local and visibly separate from live persistence.
- Keep privacy messaging accurate to the app's actual sharing behavior; do not promise encryption or verification unless backed by product behavior.
- Use central theme tokens and the shared icon registry; add new assets through the category and root registries.
- Test populated and empty states, authority boundaries, accessible actions, and caller callback behavior.
