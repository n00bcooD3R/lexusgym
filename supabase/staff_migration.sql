-- Staff Migration SQL
-- Run this in your Supabase SQL Editor

alter table members add column if not exists is_staff boolean default false;
create index if not exists members_is_staff_idx on members(is_staff);
