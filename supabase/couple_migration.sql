-- Couple Pack Migration
-- Run this in your Supabase SQL Editor

-- Add couple linking columns to members table
alter table members
  add column if not exists couple_partner_id uuid references members(id) on delete set null,
  add column if not exists is_couple_main boolean default false;

-- Index for fast partner lookups
create index if not exists members_couple_idx on members(couple_partner_id);
