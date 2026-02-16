-- Subprojects full recovery (idempotent)
-- Run this whole script once in DatabasePad SQL Editor.
-- It safely covers: database/subdatabase_setup.sql + database/fix_subprojects_api_access.sql

create extension if not exists pgcrypto;

create table if not exists public.subprojects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid,
  name text not null,
  slug text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (slug)
);

alter table public.subprojects add column if not exists owner_id uuid;
alter table public.subprojects add column if not exists is_active boolean not null default true;
alter table public.subprojects add column if not exists created_at timestamptz not null default now();
alter table public.subprojects add column if not exists updated_at timestamptz not null default now();

alter table if exists public.transactions add column if not exists project_id uuid references public.subprojects(id) on delete restrict;
alter table if exists public.investments add column if not exists project_id uuid references public.subprojects(id) on delete restrict;
alter table if exists public.goals add column if not exists project_id uuid references public.subprojects(id) on delete restrict;
alter table if exists public.user_profiles add column if not exists project_id uuid references public.subprojects(id) on delete restrict;
alter table if exists public.plan_requests add column if not exists project_id uuid references public.subprojects(id) on delete restrict;
alter table if exists public.plans add column if not exists project_id uuid references public.subprojects(id) on delete restrict;

create index if not exists idx_subprojects_slug on public.subprojects(slug);
create index if not exists idx_subprojects_owner_id on public.subprojects(owner_id);
create index if not exists idx_transactions_project_id on public.transactions(project_id);
create index if not exists idx_investments_project_id on public.investments(project_id);
create index if not exists idx_goals_project_id on public.goals(project_id);
create index if not exists idx_user_profiles_project_id on public.user_profiles(project_id);
create index if not exists idx_plan_requests_project_id on public.plan_requests(project_id);
create index if not exists idx_plans_project_id on public.plans(project_id);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_subprojects_updated_at on public.subprojects;
create trigger trg_subprojects_updated_at before update on public.subprojects
for each row execute function public.set_updated_at();

alter table public.subprojects enable row level security;

grant usage on schema public to anon, authenticated, service_role;
grant select on public.subprojects to anon;
grant select, insert, update, delete on public.subprojects to authenticated, service_role;

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

drop policy if exists subprojects_own_all on public.subprojects;
create policy subprojects_own_all on public.subprojects
for all
using (owner_id is null or auth.uid() = owner_id)
with check (owner_id is null or auth.uid() = owner_id);

drop policy if exists subprojects_admin_all on public.subprojects;
create policy subprojects_admin_all on public.subprojects
for all
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

insert into public.subprojects (name, slug, description, owner_id)
values ('Finance Investment Admin', 'finance-investment-admin', 'Default FinBR workspace', null)
on conflict (slug) do nothing;

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

notify pgrst, 'reload schema';

-- verification
select id, owner_id, slug, name, created_at
from public.subprojects
order by created_at asc
limit 20;
