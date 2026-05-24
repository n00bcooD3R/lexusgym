-- ============================================================
-- PT Features Migration
-- Run in Supabase SQL Editor
-- ============================================================

-- Client access tokens (for client portal)
create table if not exists client_tokens (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references members(id) on delete cascade unique,
  token text unique not null default encode(gen_random_bytes(24), 'hex'),
  created_at timestamptz default now()
);
create index if not exists client_tokens_token_idx on client_tokens(token);
create index if not exists client_tokens_member_idx on client_tokens(member_id);

-- Workout plans (5-day split per client)
-- Each row = one day plan for a member
create table if not exists workout_plans (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references members(id) on delete cascade,
  day_number int not null check (day_number between 1 and 7),
  day_label text not null,          -- e.g. "Day 1 – Push", "Monday – Chest & Triceps"
  exercises jsonb default '[]'::jsonb,
  -- exercises: [{name, sets, reps, weight, rest, notes}]
  notes text,
  updated_at timestamptz default now(),
  created_at timestamptz default now(),
  unique(member_id, day_number)
);
create index if not exists wp_member_idx on workout_plans(member_id);

-- Diet plans per client
create table if not exists diet_plans (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references members(id) on delete cascade,
  meal_label text not null,         -- e.g. "Breakfast", "Pre-Workout", "Dinner"
  items jsonb default '[]'::jsonb,  -- [{food, qty, calories, protein, carbs, fat}]
  meal_order int default 0,
  notes text,
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);
create index if not exists dp_member_idx on diet_plans(member_id);

-- Food diary (client logs what they ate)
create table if not exists food_diary (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references members(id) on delete cascade,
  diary_date date not null default current_date,
  entries jsonb default '[]'::jsonb,
  -- entries: [{time, food, qty, calories, notes}]
  mood text,                        -- "great","good","okay","tired"
  water_ml int default 0,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(member_id, diary_date)
);
create index if not exists fd_member_idx on food_diary(member_id);
create index if not exists fd_date_idx on food_diary(diary_date);

-- RLS
alter table client_tokens enable row level security;
alter table workout_plans enable row level security;
alter table diet_plans enable row level security;
alter table food_diary enable row level security;

-- Admin (authenticated) full access
create policy "auth all client_tokens" on client_tokens for all using (auth.role() = 'authenticated');
create policy "auth all workout_plans" on workout_plans for all using (auth.role() = 'authenticated');
create policy "auth all diet_plans"    on diet_plans    for all using (auth.role() = 'authenticated');
create policy "auth all food_diary"    on food_diary    for all using (auth.role() = 'authenticated');

-- Public read via token for workout_plans, diet_plans (client portal)
create policy "public read workout via token"
  on workout_plans for select
  using (
    exists (
      select 1 from client_tokens ct
      where ct.member_id = workout_plans.member_id
    )
  );

create policy "public read diet via token"
  on diet_plans for select
  using (
    exists (
      select 1 from client_tokens ct
      where ct.member_id = diet_plans.member_id
    )
  );

-- Public insert/update food_diary (client logs own food)
create policy "public rw food_diary"
  on food_diary for all
  using (true)
  with check (true);

-- Auto-generate token when member is set as PT client
create or replace function ensure_client_token() returns trigger as $$
begin
  if new.is_pt_client = true and old.is_pt_client = false then
    insert into client_tokens (member_id)
    values (new.id)
    on conflict (member_id) do nothing;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_client_token on members;
create trigger trg_client_token
  after update on members
  for each row execute function ensure_client_token();

-- Update timestamp trigger
create or replace function update_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_wp_updated on workout_plans;
create trigger trg_wp_updated before update on workout_plans
  for each row execute function update_updated_at();

drop trigger if exists trg_dp_updated on diet_plans;
create trigger trg_dp_updated before update on diet_plans
  for each row execute function update_updated_at();

drop trigger if exists trg_fd_updated on food_diary;
create trigger trg_fd_updated before update on food_diary
  for each row execute function update_updated_at();
