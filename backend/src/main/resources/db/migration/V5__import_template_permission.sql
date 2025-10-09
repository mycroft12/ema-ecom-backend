-- V5: Add import:configure permission and grant to ADMIN role

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM permissions WHERE name = 'import:configure') THEN
    INSERT INTO permissions (id, created_at, updated_at, name, description)
    VALUES (gen_random_uuid(), now(), now(), 'import:configure', 'Configure and analyze import templates');
  END IF;
END $$;

DO $$
DECLARE admin_id uuid;
BEGIN
  SELECT id INTO admin_id FROM roles WHERE name = 'ADMIN' LIMIT 1;
  IF admin_id IS NOT NULL THEN
    INSERT INTO roles_permissions (role_id, permission_id)
    SELECT admin_id, p.id FROM permissions p
    WHERE p.name IN ('import:configure')
      AND NOT EXISTS (
        SELECT 1 FROM roles_permissions rp WHERE rp.role_id = admin_id AND rp.permission_id = p.id
      );
  END IF;
END $$;
