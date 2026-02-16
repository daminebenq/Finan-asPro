-- Verify subdatabase setup for finance-investment-admin
-- Run this in DatabasePad SQL editor after running database/subdatabase_setup.sql

with finance_project as (
  select id, slug, name, created_at
  from public.subprojects
  where slug = 'finance-investment-admin'
  limit 1
)
select
  fp.slug,
  fp.id as project_id,
  fp.name,
  fp.created_at,
  coalesce((select count(*) from public.transactions t where t.project_id is null), 0) as transactions_null_project_id,
  coalesce((select count(*) from public.investments i where i.project_id is null), 0) as investments_null_project_id,
  coalesce((select count(*) from public.goals g where g.project_id is null), 0) as goals_null_project_id,
  coalesce((select count(*) from public.user_profiles u where u.project_id is null), 0) as user_profiles_null_project_id,
  coalesce((select count(*) from public.plan_requests pr where pr.project_id is null), 0) as plan_requests_null_project_id,
  coalesce((select count(*) from public.plans p where p.project_id is null), 0) as plans_null_project_id
from finance_project fp;

-- Optional detailed per-table row counts assigned to this subproject
with finance_project as (
  select id
  from public.subprojects
  where slug = 'finance-investment-admin'
  limit 1
)
select 'transactions' as table_name, count(*) as rows_in_subproject
from public.transactions t
join finance_project fp on t.project_id = fp.id
union all
select 'investments', count(*)
from public.investments i
join finance_project fp on i.project_id = fp.id
union all
select 'goals', count(*)
from public.goals g
join finance_project fp on g.project_id = fp.id
union all
select 'user_profiles', count(*)
from public.user_profiles u
join finance_project fp on u.project_id = fp.id
union all
select 'plan_requests', count(*)
from public.plan_requests pr
join finance_project fp on pr.project_id = fp.id
union all
select 'plans', count(*)
from public.plans p
join finance_project fp on p.project_id = fp.id
order by table_name;
