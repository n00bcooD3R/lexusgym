-- Create Settings Table
-- Run this in your Supabase SQL Editor

create table if not exists settings (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  value text,
  updated_at timestamptz default now()
);

-- Enable RLS
alter table settings enable row level security;

-- Create Policy
drop policy if exists "auth all settings" on settings;
create policy "auth all settings" on settings for all using (true);
