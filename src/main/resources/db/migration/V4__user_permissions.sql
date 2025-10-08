-- V4: Add user permissions and grant them to ADMIN role

-- Insert user permissions if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM permissions WHERE name = 'user:read') THEN
    INSERT INTO permissions (id, created_at, updated_at, name, description)
    VALUES (gen_random_uuid(), now(), now(), 'user:read', 'Read users');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM permissions WHERE name = 'user:create') THEN
    INSERT INTO permissions (id, created_at, updated_at, name, description)
    VALUES (gen_random_uuid(), now(), now(), 'user:create', 'Create users');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM permissions WHERE name = 'user:update') THEN
    INSERT INTO permissions (id, created_at, updated_at, name, description)
    VALUES (gen_random_uuid(), now(), now(), 'user:update', 'Update users');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM permissions WHERE name = 'user:delete') THEN
    INSERT INTO permissions (id, created_at, updated_at, name, description)
    VALUES (gen_random_uuid(), now(), now(), 'user:delete', 'Delete users');
  END IF;
END $$;

-- Grant the new user permissions to ADMIN role
DO $$
DECLARE admin_id uuid;
BEGIN
  SELECT id INTO admin_id FROM roles WHERE name = 'ADMIN' LIMIT 1;
  IF admin_id IS NOT NULL THEN
    INSERT INTO roles_permissions (role_id, permission_id)
    SELECT admin_id, p.id FROM permissions p
    WHERE p.name IN ('user:read','user:create','user:update','user:delete')
      AND NOT EXISTS (
        SELECT 1 FROM roles_permissions rp WHERE rp.role_id = admin_id AND rp.permission_id = p.id
      );
  END IF;
END $$;