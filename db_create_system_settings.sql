CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  access_key TEXT NOT NULL,
  zoho_access_token TEXT,
  zoho_token_expiry BIGINT,
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE system_settings
  ADD COLUMN IF NOT EXISTS zoho_access_token TEXT;

ALTER TABLE system_settings
  ADD COLUMN IF NOT EXISTS zoho_token_expiry BIGINT;

INSERT INTO system_settings (access_key)
SELECT 'ksmomartinsayomideolamilekanOLAmilekan@$112'
WHERE NOT EXISTS (SELECT 1 FROM system_settings);
