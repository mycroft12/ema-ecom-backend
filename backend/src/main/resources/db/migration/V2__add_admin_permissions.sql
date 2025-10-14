-- Script to ensure the admin user has all permissions
-- This script is idempotent and can be run multiple times

-- First, ensure all permissions exist
INSERT INTO permissions(id, name) VALUES (gen_random_uuid(), 'user:read') ON CONFLICT (name) DO NOTHING;
INSERT INTO permissions(id, name) VALUES (gen_random_uuid(), 'user:create') ON CONFLICT (name) DO NOTHING;
INSERT INTO permissions(id, name) VALUES (gen_random_uuid(), 'user:update') ON CONFLICT (name) DO NOTHING;
INSERT INTO permissions(id, name) VALUES (gen_random_uuid(), 'user:delete') ON CONFLICT (name) DO NOTHING;

INSERT INTO permissions(id, name) VALUES (gen_random_uuid(), 'product:read') ON CONFLICT (name) DO NOTHING;
INSERT INTO permissions(id, name) VALUES (gen_random_uuid(), 'product:create') ON CONFLICT (name) DO NOTHING;
INSERT INTO permissions(id, name) VALUES (gen_random_uuid(), 'product:update') ON CONFLICT (name) DO NOTHING;
INSERT INTO permissions(id, name) VALUES (gen_random_uuid(), 'product:delete') ON CONFLICT (name) DO NOTHING;

INSERT INTO permissions(id, name) VALUES (gen_random_uuid(), 'employee:read') ON CONFLICT (name) DO NOTHING;
INSERT INTO permissions(id, name) VALUES (gen_random_uuid(), 'employee:create') ON CONFLICT (name) DO NOTHING;
INSERT INTO permissions(id, name) VALUES (gen_random_uuid(), 'employee:update') ON CONFLICT (name) DO NOTHING;
INSERT INTO permissions(id, name) VALUES (gen_random_uuid(), 'employee:delete') ON CONFLICT (name) DO NOTHING;

INSERT INTO permissions(id, name) VALUES (gen_random_uuid(), 'delivery:read') ON CONFLICT (name) DO NOTHING;
INSERT INTO permissions(id, name) VALUES (gen_random_uuid(), 'delivery:create') ON CONFLICT (name) DO NOTHING;
INSERT INTO permissions(id, name) VALUES (gen_random_uuid(), 'delivery:update') ON CONFLICT (name) DO NOTHING;
INSERT INTO permissions(id, name) VALUES (gen_random_uuid(), 'delivery:delete') ON CONFLICT (name) DO NOTHING;

INSERT INTO permissions(id, name) VALUES (gen_random_uuid(), 'import:template') ON CONFLICT (name) DO NOTHING;
INSERT INTO permissions(id, name) VALUES (gen_random_uuid(), 'import:configure') ON CONFLICT (name) DO NOTHING;

-- Additional permissions found in @PreAuthorize annotations but not in basePerms
INSERT INTO permissions(id, name) VALUES (gen_random_uuid(), 'role:read') ON CONFLICT (name) DO NOTHING;
INSERT INTO permissions(id, name) VALUES (gen_random_uuid(), 'role:create') ON CONFLICT (name) DO NOTHING;
INSERT INTO permissions(id, name) VALUES (gen_random_uuid(), 'role:update') ON CONFLICT (name) DO NOTHING;
INSERT INTO permissions(id, name) VALUES (gen_random_uuid(), 'role:delete') ON CONFLICT (name) DO NOTHING;

INSERT INTO permissions(id, name) VALUES (gen_random_uuid(), 'permission:read') ON CONFLICT (name) DO NOTHING;
INSERT INTO permissions(id, name) VALUES (gen_random_uuid(), 'permission:create') ON CONFLICT (name) DO NOTHING;
INSERT INTO permissions(id, name) VALUES (gen_random_uuid(), 'permission:update') ON CONFLICT (name) DO NOTHING;
INSERT INTO permissions(id, name) VALUES (gen_random_uuid(), 'permission:delete') ON CONFLICT (name) DO NOTHING;

INSERT INTO permissions(id, name) VALUES (gen_random_uuid(), 'rule:read') ON CONFLICT (name) DO NOTHING;
INSERT INTO permissions(id, name) VALUES (gen_random_uuid(), 'rule:create') ON CONFLICT (name) DO NOTHING;
INSERT INTO permissions(id, name) VALUES (gen_random_uuid(), 'rule:update') ON CONFLICT (name) DO NOTHING;
INSERT INTO permissions(id, name) VALUES (gen_random_uuid(), 'rule:delete') ON CONFLICT (name) DO NOTHING;
INSERT INTO permissions(id, name) VALUES (gen_random_uuid(), 'rule:evaluate') ON CONFLICT (name) DO NOTHING;

-- Ensure ADMIN role exists
INSERT INTO roles(id, name) VALUES (gen_random_uuid(), 'ADMIN') ON CONFLICT (name) DO NOTHING;

-- Get the ADMIN role ID
DO $$
DECLARE
    admin_role_id UUID;
BEGIN
    SELECT id INTO admin_role_id FROM roles WHERE name = 'ADMIN';

    -- Grant all permissions to ADMIN role
    INSERT INTO roles_permissions(role_id, permission_id)
    SELECT admin_role_id, id FROM permissions
    ON CONFLICT DO NOTHING;

    -- Ensure admin user exists and has ADMIN role
    -- This assumes the admin user has username 'admin'
    -- If the admin user doesn't exist, this will do nothing
    INSERT INTO users_roles(user_id, role_id)
    SELECT id, admin_role_id FROM users WHERE username = 'admin'
    ON CONFLICT DO NOTHING;
END $$;