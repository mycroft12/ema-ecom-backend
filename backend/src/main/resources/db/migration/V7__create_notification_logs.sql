CREATE TABLE IF NOT EXISTS notification_logs (
    id UUID PRIMARY KEY,
    domain VARCHAR(64) NOT NULL,
    action VARCHAR(32) NOT NULL,
    row_id UUID,
    row_number BIGINT,
    changed_columns TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    is_read BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_notification_logs_created_at ON notification_logs(created_at DESC);
