-- Add google-sheet:access permission and assign to ADMIN role
INSERT INTO permissions(id, name)
VALUES (gen_random_uuid(), 'google-sheet:access')
ON CONFLICT (name) DO NOTHING;

DO $$
DECLARE
    admin_role_id UUID;
    permission_id UUID;
BEGIN
    SELECT id INTO admin_role_id FROM roles WHERE name = 'ADMIN';
    IF admin_role_id IS NOT NULL THEN
        SELECT id INTO permission_id FROM permissions WHERE name = 'google-sheet:access';
        IF permission_id IS NOT NULL THEN
            INSERT INTO roles_permissions(role_id, permission_id)
            VALUES (admin_role_id, permission_id)
            ON CONFLICT DO NOTHING;

            INSERT INTO users_roles(user_id, role_id)
            SELECT id, admin_role_id FROM users WHERE username = 'admin'
            ON CONFLICT DO NOTHING;
        END IF;
    END IF;
END $$;

-- Create table to store Google integration settings (client ID / API key)
CREATE TABLE IF NOT EXISTS google_integration_settings (
    id UUID PRIMARY KEY,
    client_id VARCHAR(255),
    api_key VARCHAR(255),
    updated_at TIMESTAMPTZ DEFAULT now(),
    updated_by VARCHAR(150)
);

-- Ensure a singleton row exists
INSERT INTO google_integration_settings(id, client_id, api_key, updated_at, updated_by)
VALUES ('00000000-0000-0000-0000-000000000001', NULL, NULL, now(), NULL)
ON CONFLICT (id) DO NOTHING;
