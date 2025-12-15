-- Ensure orders_config always exposes a Status column (for templates that omit it)
ALTER TABLE IF EXISTS orders_config
  ADD COLUMN IF NOT EXISTS status TEXT;

-- Widen existing status column to accept configured labels
ALTER TABLE IF EXISTS orders_config
  ALTER COLUMN status TYPE TEXT;
