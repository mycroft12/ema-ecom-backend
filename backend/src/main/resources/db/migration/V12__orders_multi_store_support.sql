-- Allow multiple Google Sheet connections per domain (needed for multi-store orders)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'uk_google_import_domain'
      AND table_name = 'google_import_config'
      AND table_schema = current_schema()
  ) THEN
    ALTER TABLE google_import_config DROP CONSTRAINT uk_google_import_domain;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_google_import_domain ON google_import_config (domain);

-- Ensure orders_config can store the originating sheet/store name
ALTER TABLE IF EXISTS orders_config
  ADD COLUMN IF NOT EXISTS store_name VARCHAR(255);
