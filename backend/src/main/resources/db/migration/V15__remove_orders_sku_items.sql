-- Drop legacy sku_items column from orders_config
ALTER TABLE IF EXISTS orders_config
  DROP COLUMN IF EXISTS sku_items;

DELETE FROM column_semantics
WHERE table_name = 'orders_config'
  AND column_name = 'sku_items';
