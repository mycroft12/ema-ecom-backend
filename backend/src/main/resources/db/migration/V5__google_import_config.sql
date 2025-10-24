CREATE TABLE IF NOT EXISTS google_import_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain VARCHAR(50) NOT NULL,
    spreadsheet_id VARCHAR(128) NOT NULL,
    tab_name VARCHAR(128),
    header_hash VARCHAR(128) NOT NULL,
    last_row_imported BIGINT NOT NULL DEFAULT 0,
    source VARCHAR(32) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uk_google_import_domain UNIQUE (domain),
    CONSTRAINT uk_google_import_sheet UNIQUE (spreadsheet_id, tab_name)
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_google_import_config_updated_at') THEN
    CREATE TRIGGER trg_google_import_config_updated_at
    BEFORE UPDATE ON google_import_config
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;
