-- Logical subdatabase setup for multi-project isolation
-- Run this once in DatabasePad SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.subprojects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  created_at timestamptz not null default now()
);

insert into public.subprojects (name, slug, description)
values ('Finance Investment Admin', 'finance-investment-admin', 'Primary workspace migrated from legacy shared data model')
on conflict (slug) do nothing;

alter table if exists public.transactions add column if not exists project_id uuid references public.subprojects(id) on delete restrict;
alter table if exists public.investments add column if not exists project_id uuid references public.subprojects(id) on delete restrict;
alter table if exists public.goals add column if not exists project_id uuid references public.subprojects(id) on delete restrict;
alter table if exists public.user_profiles add column if not exists project_id uuid references public.subprojects(id) on delete restrict;
alter table if exists public.plan_requests add column if not exists project_id uuid references public.subprojects(id) on delete restrict;
alter table if exists public.plans add column if not exists project_id uuid references public.subprojects(id) on delete restrict;

create index if not exists idx_transactions_project_id on public.transactions(project_id);
create index if not exists idx_investments_project_id on public.investments(project_id);
create index if not exists idx_goals_project_id on public.goals(project_id);
create index if not exists idx_user_profiles_project_id on public.user_profiles(project_id);
create index if not exists idx_plan_requests_project_id on public.plan_requests(project_id);
create index if not exists idx_plans_project_id on public.plans(project_id);

-- Initial migration: move existing records into the finance-investment-admin subdatabase.
with finance_project as (
  select id from public.subprojects where slug = 'finance-investment-admin' limit 1
)
update public.transactions t set project_id = fp.id
from finance_project fp
where t.project_id is null;

with finance_project as (
  select id from public.subprojects where slug = 'finance-investment-admin' limit 1
)
update public.investments i set project_id = fp.id
from finance_project fp
where i.project_id is null;

with finance_project as (
  select id from public.subprojects where slug = 'finance-investment-admin' limit 1
)
update public.goals g set project_id = fp.id
from finance_project fp
where g.project_id is null;

with finance_project as (
  select id from public.subprojects where slug = 'finance-investment-admin' limit 1
)
update public.user_profiles u set project_id = fp.id
from finance_project fp
where u.project_id is null;

with finance_project as (
  select id from public.subprojects where slug = 'finance-investment-admin' limit 1
)
update public.plan_requests pr set project_id = fp.id
from finance_project fp
where pr.project_id is null;

with finance_project as (
  select id from public.subprojects where slug = 'finance-investment-admin' limit 1
)
update public.plans p set project_id = fp.id
from finance_project fp
where p.project_id is null;
