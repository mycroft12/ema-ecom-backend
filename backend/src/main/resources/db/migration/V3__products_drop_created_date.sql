-- V3: Remove products.created_date to align with BaseEntity timestamps (created_at/updated_at)
-- Safe no-op if the column does not exist

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'created_date'
  ) THEN
    EXECUTE 'ALTER TABLE products DROP COLUMN created_date';
  END IF;
END $$;