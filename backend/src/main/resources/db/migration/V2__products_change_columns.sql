-- Products schema change: align columns with new requirements
-- title (string), reference (string), buyPrice (numeric), sellPrice (numeric),
-- affiliate commission (numeric), description (string/text), picture (blob), createdDate (timestamp)

-- Rename existing 'name' to 'title' if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='name'
  ) THEN
    EXECUTE 'ALTER TABLE products RENAME COLUMN name TO title';
  END IF;
END $$;

-- Drop legacy columns if they exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='price') THEN
    EXECUTE 'ALTER TABLE products DROP COLUMN price';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='photo_url') THEN
    EXECUTE 'ALTER TABLE products DROP COLUMN photo_url';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='active') THEN
    EXECUTE 'ALTER TABLE products DROP COLUMN active';
  END IF;
END $$;

-- Add new columns if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='reference') THEN
    EXECUTE 'ALTER TABLE products ADD COLUMN reference varchar(256)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='buy_price') THEN
    EXECUTE 'ALTER TABLE products ADD COLUMN buy_price numeric(18,2) DEFAULT 0 NOT NULL';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='sell_price') THEN
    EXECUTE 'ALTER TABLE products ADD COLUMN sell_price numeric(18,2) DEFAULT 0 NOT NULL';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='affiliate_commission') THEN
    EXECUTE 'ALTER TABLE products ADD COLUMN affiliate_commission numeric(18,2) DEFAULT 0';
  END IF;
  -- description already exists in V1 as text; keep as-is
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='picture') THEN
    EXECUTE 'ALTER TABLE products ADD COLUMN picture bytea';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='created_date') THEN
    EXECUTE 'ALTER TABLE products ADD COLUMN created_date timestamp DEFAULT now()';
  END IF;
END $$;

-- Ensure not-null on title
ALTER TABLE products ALTER COLUMN title SET NOT NULL;
