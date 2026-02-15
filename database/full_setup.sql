-- FinBR full database setup (Supabase/Postgres)
-- Run this in SQL editor before using the app end-to-end.

create extension if not exists pgcrypto;

create or replace function public.is_admin(uid uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.user_profiles up
    where up.user_id = uid
      and up.role = 'admin'
  );
$$;

-- -----------------------------------------------------------------------------
-- Core user profile table
-- -----------------------------------------------------------------------------
create table if not exists public.user_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  email text not null,
  full_name text,
  cpf text,
  phone text,
  role text not null default 'user' check (role in ('user', 'admin')),
  experience_level text default 'beginner' check (experience_level in ('beginner', 'intermediate', 'professional')),
  current_plan text not null default 'free',
  plan_status text not null default 'active' check (plan_status in ('active', 'pending', 'inactive', 'cancelled')),
  discount_percentage numeric(10,2) default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Subscription plans
-- -----------------------------------------------------------------------------
create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  price_monthly numeric(12,2) not null default 0,
  price_yearly numeric(12,2) not null default 0,
  features jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  sort_order int not null default 0,
  has_automation boolean not null default false,
  has_consulting boolean not null default false,
  has_reports boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Financial data
-- -----------------------------------------------------------------------------
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  type text not null check (type in ('income', 'expense')),
  category text not null,
  description text not null,
  amount numeric(14,2) not null,
  date date not null,
  bank text,
  notes text,
  imported_from text,
  project_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.investments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  type text not null,
  name text not null,
  ticker text,
  institution text,
  quantity numeric(18,6) not null,
  purchase_price numeric(14,4) not null,
  current_price numeric(14,4),
  purchase_date date not null,
  maturity_date date,
  rate_type text,
  rate_value numeric(14,4),
  project_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  target_amount numeric(14,2) not null,
  current_amount numeric(14,2) not null default 0,
  deadline date,
  category text,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'paused', 'cancelled')),
  project_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Upgrade & marketing workflow
-- -----------------------------------------------------------------------------
create table if not exists public.plan_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  user_email text,
  user_name text,
  requested_plan text not null,
  current_plan text,
  billing_cycle text not null default 'monthly' check (billing_cycle in ('monthly', 'yearly')),
  discount_code text,
  discount_amount numeric(12,2) default 0,
  final_price numeric(12,2) default 0,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.discount_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  description text,
  discount_type text not null default 'percentage' check (discount_type in ('percentage', 'fixed')),
  discount_value numeric(12,2) not null,
  max_uses int not null default -1,
  current_uses int not null default 0,
  valid_until timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  discount_type text not null default 'percentage' check (discount_type in ('percentage', 'fixed')),
  discount_value numeric(12,2) not null,
  start_date timestamptz,
  end_date timestamptz,
  is_active boolean not null default true,
  applicable_plans jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Logical sub-databases
-- -----------------------------------------------------------------------------
create table if not exists public.subprojects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  name text not null,
  slug text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id, slug)
);

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null,
  action text not null,
  target_table text,
  target_id text,
  payload jsonb,
  result jsonb,
  created_at timestamptz not null default now()
);

alter table public.transactions add column if not exists project_id uuid;
alter table public.investments add column if not exists project_id uuid;
alter table public.goals add column if not exists project_id uuid;

-- Optional foreign keys (safe guarded)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'transactions_project_id_fkey'
  ) then
    alter table public.transactions
      add constraint transactions_project_id_fkey
      foreign key (project_id) references public.subprojects(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'investments_project_id_fkey'
  ) then
    alter table public.investments
      add constraint investments_project_id_fkey
      foreign key (project_id) references public.subprojects(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'goals_project_id_fkey'
  ) then
    alter table public.goals
      add constraint goals_project_id_fkey
      foreign key (project_id) references public.subprojects(id) on delete set null;
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- Indexes
-- -----------------------------------------------------------------------------
create index if not exists idx_user_profiles_user_id on public.user_profiles(user_id);
create index if not exists idx_transactions_user_date on public.transactions(user_id, date desc);
create index if not exists idx_investments_user_created on public.investments(user_id, created_at desc);
create index if not exists idx_goals_user_created on public.goals(user_id, created_at desc);
create index if not exists idx_plan_requests_user on public.plan_requests(user_id, created_at desc);
create index if not exists idx_discount_codes_code on public.discount_codes(code);
create index if not exists idx_subprojects_owner_slug on public.subprojects(owner_id, slug);
create index if not exists idx_admin_audit_logs_created_at on public.admin_audit_logs(created_at desc);
create index if not exists idx_admin_audit_logs_actor on public.admin_audit_logs(actor_user_id, created_at desc);

-- -----------------------------------------------------------------------------
-- Updated_at helper trigger
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_user_profiles_updated_at on public.user_profiles;
create trigger trg_user_profiles_updated_at before update on public.user_profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_plans_updated_at on public.plans;
create trigger trg_plans_updated_at before update on public.plans
for each row execute function public.set_updated_at();

drop trigger if exists trg_transactions_updated_at on public.transactions;
create trigger trg_transactions_updated_at before update on public.transactions
for each row execute function public.set_updated_at();

drop trigger if exists trg_investments_updated_at on public.investments;
create trigger trg_investments_updated_at before update on public.investments
for each row execute function public.set_updated_at();

drop trigger if exists trg_goals_updated_at on public.goals;
create trigger trg_goals_updated_at before update on public.goals
for each row execute function public.set_updated_at();

drop trigger if exists trg_plan_requests_updated_at on public.plan_requests;
create trigger trg_plan_requests_updated_at before update on public.plan_requests
for each row execute function public.set_updated_at();

drop trigger if exists trg_discount_codes_updated_at on public.discount_codes;
create trigger trg_discount_codes_updated_at before update on public.discount_codes
for each row execute function public.set_updated_at();

drop trigger if exists trg_promotions_updated_at on public.promotions;
create trigger trg_promotions_updated_at before update on public.promotions
for each row execute function public.set_updated_at();

drop trigger if exists trg_subprojects_updated_at on public.subprojects;
create trigger trg_subprojects_updated_at before update on public.subprojects
for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- RLS policies
-- -----------------------------------------------------------------------------
alter table public.user_profiles enable row level security;
alter table public.plans enable row level security;
alter table public.transactions enable row level security;
alter table public.investments enable row level security;
alter table public.goals enable row level security;
alter table public.plan_requests enable row level security;
alter table public.discount_codes enable row level security;
alter table public.promotions enable row level security;
alter table public.subprojects enable row level security;
alter table public.admin_audit_logs enable row level security;

-- helper SQL expression used repeatedly:
-- exists (select 1 from public.user_profiles up where up.user_id = auth.uid() and up.role = 'admin')

-- user_profiles
drop policy if exists user_profiles_read_own on public.user_profiles;
create policy user_profiles_read_own on public.user_profiles
for select using (auth.uid() = user_id);

drop policy if exists user_profiles_insert_own on public.user_profiles;
create policy user_profiles_insert_own on public.user_profiles
for insert with check (auth.uid() = user_id);

drop policy if exists user_profiles_update_own on public.user_profiles;
create policy user_profiles_update_own on public.user_profiles
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists user_profiles_admin_all on public.user_profiles;
create policy user_profiles_admin_all on public.user_profiles
for all using (
  public.is_admin(auth.uid())
) with check (
  public.is_admin(auth.uid())
);

-- plans
drop policy if exists plans_read_all on public.plans;
create policy plans_read_all on public.plans
for select using (true);

drop policy if exists plans_admin_write on public.plans;
create policy plans_admin_write on public.plans
for all using (
  public.is_admin(auth.uid())
) with check (
  public.is_admin(auth.uid())
);

-- transactions
drop policy if exists transactions_own_all on public.transactions;
create policy transactions_own_all on public.transactions
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists transactions_admin_all on public.transactions;
create policy transactions_admin_all on public.transactions
for all using (
  public.is_admin(auth.uid())
) with check (
  public.is_admin(auth.uid())
);

-- investments
drop policy if exists investments_own_all on public.investments;
create policy investments_own_all on public.investments
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists investments_admin_all on public.investments;
create policy investments_admin_all on public.investments
for all using (
  public.is_admin(auth.uid())
) with check (
  public.is_admin(auth.uid())
);

-- goals
drop policy if exists goals_own_all on public.goals;
create policy goals_own_all on public.goals
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists goals_admin_all on public.goals;
create policy goals_admin_all on public.goals
for all using (
  public.is_admin(auth.uid())
) with check (
  public.is_admin(auth.uid())
);

-- plan_requests
drop policy if exists plan_requests_read_own on public.plan_requests;
create policy plan_requests_read_own on public.plan_requests
for select using (auth.uid() = user_id);

drop policy if exists plan_requests_insert_own on public.plan_requests;
create policy plan_requests_insert_own on public.plan_requests
for insert with check (auth.uid() = user_id);

drop policy if exists plan_requests_admin_all on public.plan_requests;
create policy plan_requests_admin_all on public.plan_requests
for all using (
  public.is_admin(auth.uid())
) with check (
  public.is_admin(auth.uid())
);

-- discount_codes/promotions
drop policy if exists discount_codes_read_all on public.discount_codes;
create policy discount_codes_read_all on public.discount_codes
for select using (true);

drop policy if exists discount_codes_admin_write on public.discount_codes;
create policy discount_codes_admin_write on public.discount_codes
for all using (
  public.is_admin(auth.uid())
) with check (
  public.is_admin(auth.uid())
);

drop policy if exists promotions_read_all on public.promotions;
create policy promotions_read_all on public.promotions
for select using (true);

drop policy if exists promotions_admin_write on public.promotions;
create policy promotions_admin_write on public.promotions
for all using (
  public.is_admin(auth.uid())
) with check (
  public.is_admin(auth.uid())
);

-- subprojects
drop policy if exists subprojects_own_all on public.subprojects;
create policy subprojects_own_all on public.subprojects
for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists subprojects_admin_all on public.subprojects;
create policy subprojects_admin_all on public.subprojects
for all using (
  public.is_admin(auth.uid())
) with check (
  public.is_admin(auth.uid())
);

-- admin_audit_logs
drop policy if exists admin_audit_logs_admin_read on public.admin_audit_logs;
create policy admin_audit_logs_admin_read on public.admin_audit_logs
for select using (public.is_admin(auth.uid()));

drop policy if exists admin_audit_logs_admin_insert on public.admin_audit_logs;
create policy admin_audit_logs_admin_insert on public.admin_audit_logs
for insert with check (public.is_admin(auth.uid()));

-- -----------------------------------------------------------------------------
-- Seed plans (idempotent)
-- -----------------------------------------------------------------------------
insert into public.plans (slug, name, description, price_monthly, price_yearly, features, sort_order, has_reports)
values
  ('free', 'Free', 'Plano gratuito para começar', 0, 0, '["Controle básico de transações", "Resumo mensal"]'::jsonb, 1, true),
  ('pro', 'Pro', 'Plano para uso pessoal avançado', 59.90, 599.00, '["Tudo do Free", "Metas avançadas", "Importação OFX/CSV", "Relatórios completos"]'::jsonb, 2, true),
  ('expert', 'Expert', 'Plano completo para investidores', 129.90, 1299.00, '["Tudo do Pro", "Gestão de investimentos", "Recomendações", "Suporte prioritário"]'::jsonb, 3, true)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  price_monthly = excluded.price_monthly,
  price_yearly = excluded.price_yearly,
  features = excluded.features,
  sort_order = excluded.sort_order,
  updated_at = now();
