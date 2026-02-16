-- Compliance Matrix review audit trail setup
-- Run in DatabasePad SQL editor.

create table if not exists public.compliance_matrix_reviews (
  id uuid primary key default gen_random_uuid(),
  entry_id text not null,
  reviewer_user_id uuid not null,
  reviewer_name text,
  review_note text,
  reviewed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_compliance_reviews_entry on public.compliance_matrix_reviews(entry_id, reviewed_at desc);
create index if not exists idx_compliance_reviews_user on public.compliance_matrix_reviews(reviewer_user_id, reviewed_at desc);

alter table public.compliance_matrix_reviews enable row level security;

drop policy if exists compliance_reviews_read_all on public.compliance_matrix_reviews;
create policy compliance_reviews_read_all on public.compliance_matrix_reviews
for select using (auth.role() = 'authenticated');

drop policy if exists compliance_reviews_insert_own on public.compliance_matrix_reviews;
create policy compliance_reviews_insert_own on public.compliance_matrix_reviews
for insert with check (auth.uid() = reviewer_user_id);

-- Optional: admin delete capability
create or replace function public.is_admin(uid uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.user_profiles up where up.user_id = uid and up.role = 'admin'
  );
$$;

drop policy if exists compliance_reviews_admin_delete on public.compliance_matrix_reviews;
create policy compliance_reviews_admin_delete on public.compliance_matrix_reviews
for delete using (public.is_admin(auth.uid()));
