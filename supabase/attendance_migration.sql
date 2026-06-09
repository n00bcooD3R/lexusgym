-- Run this SQL in your Supabase Dashboard SQL Editor (https://supabase.com)
-- to create the attendance table for your biometric checkins.

-- 1. Create the attendance table
create table if not exists attendance (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references members(id) on delete cascade,
  punch_time timestamptz not null,
  device_name text,
  created_at timestamptz default now()
);

-- 2. Create indices for speed
create index if not exists attendance_member_idx on attendance(member_id);
create index if not exists attendance_punch_time_idx on attendance(punch_time);

-- 3. Enable Row Level Security (RLS)
alter table attendance enable row level security;

-- 4. Create RLS Policies to allow full access to authenticated clients
drop policy if exists "auth all attendance" on attendance;
create policy "auth all attendance" on attendance for all using (auth.role() = 'authenticated');
