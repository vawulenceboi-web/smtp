CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  access_key TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO system_settings (access_key)
SELECT 'ksmomartinsayomideolamilekanOLAmilekan@$112'
WHERE NOT EXISTS (SELECT 1 FROM system_settings);
