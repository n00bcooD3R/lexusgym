-- Add credential columns to client_tokens
-- Run in Supabase SQL Editor

alter table client_tokens
  add column if not exists username text unique,
  add column if not exists password_hash text;

create index if not exists client_tokens_username_idx on client_tokens(username);
