-- Fix common PostgREST/API access issues for public.subprojects
-- Run this in DatabasePad SQL editor if /rest/v1/subprojects returns 400.

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

create index if not exists idx_subprojects_slug on public.subprojects(slug);
create index if not exists idx_subprojects_owner_id on public.subprojects(owner_id);

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

-- Optional admin helper if missing in older setups
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

-- Seed default project if missing
insert into public.subprojects (name, slug, description, owner_id)
values ('Finance Investment Admin', 'finance-investment-admin', 'Default FinBR workspace', null)
on conflict (slug) do nothing;

-- API quick checks
select id, owner_id, slug, name, created_at
from public.subprojects
order by created_at asc
limit 20;
