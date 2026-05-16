-- Run in Supabase SQL Editor

-- Members
create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  admission_no text unique not null,
  name text not null,
  photo_url text,
  address text,
  phone text not null,
  dob date,
  age int,
  gender text,
  weight numeric,
  height numeric,
  join_date date default current_date,
  fee_amount numeric default 0,
  fee_cycle_days int default 30,
  next_due_date date,
  last_payment_date date,
  is_pt_client boolean default false,
  active boolean default true,
  notes text,
  created_at timestamptz default now()
);

create index if not exists members_phone_idx on members(phone);
create index if not exists members_name_idx on members(name);
create index if not exists members_admission_idx on members(admission_no);
create index if not exists members_due_idx on members(next_due_date);
create index if not exists members_pt_idx on members(is_pt_client);

-- Payments
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references members(id) on delete cascade,
  amount numeric not null,
  paid_on date default current_date,
  method text default 'cash',
  notes text,
  created_at timestamptz default now()
);

create index if not exists payments_member_idx on payments(member_id);

-- WhatsApp message log
create table if not exists wa_messages (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references members(id) on delete set null,
  phone text not null,
  body text not null,
  status text default 'sent',
  error text,
  sent_at timestamptz default now()
);

-- PT workouts and diet
create table if not exists workouts (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references members(id) on delete cascade,
  day_label text,            -- e.g. "Mon - Push", "Day 1"
  exercises jsonb,           -- [{name, sets, reps, weight, notes}]
  created_at timestamptz default now()
);

create table if not exists diets (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references members(id) on delete cascade,
  meal_label text,           -- e.g. "Breakfast", "Lunch"
  items jsonb,               -- [{food, qty, calories}]
  notes text,
  created_at timestamptz default now()
);

create index if not exists workouts_member_idx on workouts(member_id);
create index if not exists diets_member_idx on diets(member_id);

-- Auto-update next_due_date when payment recorded
create or replace function bump_due_date() returns trigger as $$
begin
  update members
     set last_payment_date = new.paid_on,
         next_due_date = new.paid_on + (fee_cycle_days || ' days')::interval
   where id = new.member_id;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_bump_due on payments;
create trigger trg_bump_due
  after insert on payments
  for each row execute function bump_due_date();

-- Storage bucket for photos (run separately or via Dashboard):
-- insert into storage.buckets (id, name, public) values ('member-photos','member-photos', true);

-- RLS — keep on, allow authenticated users full access (admin app)
alter table members enable row level security;
alter table payments enable row level security;
alter table wa_messages enable row level security;
alter table workouts enable row level security;
alter table diets enable row level security;

create policy "auth all members"   on members   for all using (auth.role() = 'authenticated');
create policy "auth all payments"  on payments  for all using (auth.role() = 'authenticated');
create policy "auth all wa"        on wa_messages for all using (auth.role() = 'authenticated');
create policy "auth all workouts"  on workouts  for all using (auth.role() = 'authenticated');
create policy "auth all diets"     on diets     for all using (auth.role() = 'authenticated');

-- Settings table for gym details and message templates
create table if not exists settings (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  value text,
  updated_at timestamptz default now()
);

-- RLS for settings
alter table settings enable row level security;
create policy "auth all settings" on settings for all using (auth.role() = 'authenticated');
