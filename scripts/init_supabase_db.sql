-- SMTP Orchestrator - Supabase Database Schema
-- Run this script in your Supabase SQL editor to initialize the database
-- It uses "IF NOT EXISTS" to safely create tables without errors if they already exist

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- RELAYS TABLE
-- Stores SMTP relay configurations
CREATE TABLE IF NOT EXISTS public.relays (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  host VARCHAR(255) NOT NULL,
  port INTEGER NOT NULL DEFAULT 587,
  username VARCHAR(255) NOT NULL,
  password TEXT NOT NULL,
  use_tls BOOLEAN NOT NULL DEFAULT TRUE,
  status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'testing')),
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(host, username)
);

-- TEMPLATES TABLE
-- Stores email templates
CREATE TABLE IF NOT EXISTS public.templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL UNIQUE,
  category VARCHAR(100),
  subject VARCHAR(255) NOT NULL,
  body_content TEXT NOT NULL,
  reply_to VARCHAR(255),
  in_reply_to_id VARCHAR(255),
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- CAMPAIGNS TABLE
-- Stores campaign metadata
CREATE TABLE IF NOT EXISTS public.campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'paused', 'completed', 'failed')),
  relay_id UUID NOT NULL REFERENCES public.relays(id) ON DELETE RESTRICT,
  template_id UUID NOT NULL REFERENCES public.templates(id) ON DELETE RESTRICT,
  sender_email VARCHAR(255) NOT NULL,
  sender_name VARCHAR(255),
  total_recipients INTEGER NOT NULL DEFAULT 0,
  sent_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- CAMPAIGN_RECIPIENTS TABLE
-- Tracks individual recipient status within campaigns
CREATE TABLE IF NOT EXISTS public.campaign_recipients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'bounced')),
  provider VARCHAR(100),
  metadata JSONB DEFAULT '{}',
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(campaign_id, email)
);

-- INDEXES for better query performance
CREATE INDEX IF NOT EXISTS idx_relays_status ON public.relays(status);
CREATE INDEX IF NOT EXISTS idx_relays_created_at ON public.relays(created_at);
CREATE INDEX IF NOT EXISTS idx_templates_name ON public.templates(name);
CREATE INDEX IF NOT EXISTS idx_templates_category ON public.templates(category);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_relay_id ON public.campaigns(relay_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_template_id ON public.campaigns(template_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_at ON public.campaigns(created_at);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_campaign_id ON public.campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_email ON public.campaign_recipients(email);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_status ON public.campaign_recipients(status);

-- ROW LEVEL SECURITY (Optional - uncomment if you want to enable RLS)
-- ALTER TABLE public.relays ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.campaign_recipients ENABLE ROW LEVEL SECURITY;

-- SETTINGS TABLE
-- Stores application configuration settings
CREATE TABLE IF NOT EXISTS public.settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key VARCHAR(255) NOT NULL UNIQUE,
  value TEXT NOT NULL,
  category VARCHAR(100) NOT NULL DEFAULT 'general',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ADMINS TABLE
-- Stores administrator user accounts
CREATE TABLE IF NOT EXISTS public.admins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'moderator', 'viewer')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- NOTIFICATIONS TABLE
-- Stores system notifications for admins
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('info', 'warning', 'error', 'success')),
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  admin_id UUID REFERENCES public.admins(id) ON DELETE CASCADE,
  related_entity VARCHAR(100),
  related_entity_id VARCHAR(255),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INDEXES for settings, admins, and notifications
CREATE INDEX IF NOT EXISTS idx_settings_key ON public.settings(key);
CREATE INDEX IF NOT EXISTS idx_settings_category ON public.settings(category);
CREATE INDEX IF NOT EXISTS idx_admins_email ON public.admins(email);
CREATE INDEX IF NOT EXISTS idx_admins_is_active ON public.admins(is_active);
CREATE INDEX IF NOT EXISTS idx_notifications_admin_id ON public.notifications(admin_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);

-- GRANT permissions (adjust as needed for your auth setup)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.relays TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaigns TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_recipients TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admins TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;

-- Create triggers to automatically update updated_at timestamps
-- Drop existing triggers first to allow safe re-runs
DROP TRIGGER IF EXISTS relays_update_timestamp ON public.relays CASCADE;
DROP TRIGGER IF EXISTS templates_update_timestamp ON public.templates CASCADE;
DROP TRIGGER IF EXISTS campaigns_update_timestamp ON public.campaigns CASCADE;
DROP TRIGGER IF EXISTS campaign_recipients_update_timestamp ON public.campaign_recipients CASCADE;
DROP TRIGGER IF EXISTS settings_update_timestamp ON public.settings CASCADE;
DROP TRIGGER IF EXISTS admins_update_timestamp ON public.admins CASCADE;
DROP TRIGGER IF EXISTS notifications_update_timestamp ON public.notifications CASCADE;

CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER relays_update_timestamp BEFORE UPDATE ON public.relays
FOR EACH ROW EXECUTE PROCEDURE update_timestamp();

CREATE TRIGGER templates_update_timestamp BEFORE UPDATE ON public.templates
FOR EACH ROW EXECUTE PROCEDURE update_timestamp();

CREATE TRIGGER campaigns_update_timestamp BEFORE UPDATE ON public.campaigns
FOR EACH ROW EXECUTE PROCEDURE update_timestamp();

CREATE TRIGGER campaign_recipients_update_timestamp BEFORE UPDATE ON public.campaign_recipients
FOR EACH ROW EXECUTE PROCEDURE update_timestamp();

CREATE TRIGGER settings_update_timestamp BEFORE UPDATE ON public.settings
FOR EACH ROW EXECUTE PROCEDURE update_timestamp();

CREATE TRIGGER admins_update_timestamp BEFORE UPDATE ON public.admins
FOR EACH ROW EXECUTE PROCEDURE update_timestamp();

CREATE TRIGGER notifications_update_timestamp BEFORE UPDATE ON public.notifications
FOR EACH ROW EXECUTE PROCEDURE update_timestamp();

-- Insert default settings (safe - uses ON CONFLICT to handle existing rows)
INSERT INTO public.settings (key, value, category, description)
VALUES
  ('smtp_timeout', '30', 'email', 'SMTP connection timeout in seconds'),
  ('max_recipients_per_batch', '100', 'performance', 'Maximum recipients to process in single batch'),
  ('notification_retention_days', '30', 'general', 'Days to keep notifications before auto-delete'),
  ('enable_ip_reputation_check', 'true', 'security', 'Enable IP reputation checking for campaigns')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = NOW();

-- Log successful initialization
SELECT 'Database initialization completed successfully!' AS status;