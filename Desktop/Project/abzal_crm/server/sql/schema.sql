CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  username TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_unique ON users(username) WHERE username IS NOT NULL;

CREATE TABLE IF NOT EXISTS cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dgd TEXT NOT NULL,
  court_name TEXT,
  debtor_full_name TEXT NOT NULL,
  debtor_iin TEXT NOT NULL,
  registration_address TEXT,
  debtor_contacts TEXT,
  production_language TEXT,
  work_status TEXT,
  representative_full_name TEXT,
  representative_contacts TEXT,
  fu_service_payment_date DATE,
  fu_service_payment_count INTEGER,
  court_decision_status TEXT,
  court_decision_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE cases ADD COLUMN IF NOT EXISTS court_name TEXT;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS registration_address TEXT;

CREATE TABLE IF NOT EXISTS control_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  control_key TEXT NOT NULL,
  label TEXT NOT NULL,
  due_date DATE,
  acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by TEXT,
  acknowledged_telegram_user_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(case_id, control_key)
);

CREATE TABLE IF NOT EXISTS notification_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  control_date_id UUID NOT NULL REFERENCES control_dates(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  telegram_message_id TEXT,
  UNIQUE(control_date_id, notification_type)
);

CREATE INDEX IF NOT EXISTS idx_cases_search ON cases USING gin (
  to_tsvector('simple', coalesce(dgd,'') || ' ' || coalesce(court_name,'') || ' ' || coalesce(debtor_full_name,'') || ' ' || coalesce(debtor_iin,'') || ' ' || coalesce(work_status,''))
);
CREATE INDEX IF NOT EXISTS idx_control_dates_due_date ON control_dates(due_date);
