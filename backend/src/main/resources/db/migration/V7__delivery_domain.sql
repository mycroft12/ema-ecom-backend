-- Delivery Providers domain
CREATE TABLE IF NOT EXISTS delivery_providers (
    id UUID PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    name VARCHAR(255) NOT NULL UNIQUE,
    type VARCHAR(20) NOT NULL,
    contact_name VARCHAR(255),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(64),
    active BOOLEAN NOT NULL DEFAULT TRUE
);

-- updated_at trigger (function set_updated_at is created in V6__add_email_and_password_reset.sql)
DROP TRIGGER IF EXISTS trg_delivery_providers_updated_at ON delivery_providers;
CREATE TRIGGER trg_delivery_providers_updated_at
BEFORE UPDATE ON delivery_providers
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
