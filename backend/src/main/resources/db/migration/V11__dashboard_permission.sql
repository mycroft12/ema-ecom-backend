-- Add the dashboard:view permission and assign it to ADMIN

INSERT INTO permissions(id, name) VALUES (gen_random_uuid(), 'dashboard:view') ON CONFLICT (name) DO NOTHING;

DO $$
DECLARE
    admin_role_id UUID;
BEGIN
    SELECT id INTO admin_role_id FROM roles WHERE name = 'ADMIN';
    IF admin_role_id IS NOT NULL THEN
        INSERT INTO roles_permissions(role_id, permission_id)
        SELECT admin_role_id, id FROM permissions WHERE name = 'dashboard:view'
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

