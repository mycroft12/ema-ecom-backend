-- Remove legacy employee and delivery permissions after dropping those domains
DELETE FROM roles_permissions
WHERE permission_id IN (
  SELECT id FROM permissions WHERE name LIKE 'employee:%' OR name LIKE 'delivery:%'
);

DELETE FROM permissions
WHERE name LIKE 'employee:%' OR name LIKE 'delivery:%';
