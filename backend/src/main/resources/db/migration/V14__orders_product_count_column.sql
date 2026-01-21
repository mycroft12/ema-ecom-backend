-- Ensure orders_config stores computed product counts
ALTER TABLE IF EXISTS orders_config
  ADD COLUMN IF NOT EXISTS number_of_products_per_order BIGINT;
