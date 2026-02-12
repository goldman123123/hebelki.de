-- Staff online detection: heartbeat column for business members
ALTER TABLE business_members ADD COLUMN staff_last_seen_at TIMESTAMPTZ;
