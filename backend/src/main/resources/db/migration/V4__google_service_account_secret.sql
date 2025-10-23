CREATE TABLE IF NOT EXISTS google_service_account_secret (
    id UUID PRIMARY KEY,
    payload BYTEA NOT NULL,
    iv BYTEA NOT NULL,
    uploaded_by VARCHAR(150),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE google_service_account_secret IS 'Encrypted Google service account credential (single row).';
