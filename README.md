# FinBR Admin Platform

FinBR is a full-stack finance and investment admin app built with React + Vite + Supabase.

## What is included

- User authentication (signup/login/password reset)
- Personal finance dashboard (transactions, goals, investments)
- Plan request and upgrade flow
- Admin panel (users, plans, discounts, promotions, requests)
- Logical subdatabase management via `subprojects`
- Branded email template assets under `emails/templates`

## 1) Environment variables

Create a `.env` file in project root:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_CPF_SCORE_API_URL` (opcional, para consulta de score CPF)
- `VITE_CPF_SCORE_API_KEY` (opcional)
- `VITE_CPF_SCORE_API_CPF_PARAM` (opcional, padrão: `cpf`)
- `VITE_CPF_SCORE_API_AUTH_HEADER` (opcional, padrão: `x-api-key`)
- `VITE_CPF_SCORE_API_TIMEOUT_MS` (opcional, padrão: `12000`)

An example is provided in `.env.example`.

## 2) Install and run locally

- Install dependencies: `npm install`
- Start dev server: `npm run dev`
- Build production bundle: `npm run build`

## 3) Database setup (required)

Run SQL scripts in your Supabase SQL editor in this order:

1. `database/full_setup.sql` (full schema, policies, indexes, seed plans)
2. `database/subdatabase_setup.sql` (additional logical subdatabase migration script)
3. `database/fix_subprojects_api_access.sql` (one-shot recovery if `/rest/v1/subprojects` returns `400 Bad Request` or `relation "subprojects" does not exist`)

> If you already created some tables manually, both scripts are idempotent-oriented (`if not exists`/safe updates), but review before running in production.

## 4) Deploy backend edge function (required for full admin actions)

The project includes `supabase/functions/admin-setup/index.ts`.

Deploy it with Supabase CLI in your backend project:

- `supabase functions deploy admin-setup`

Required function secrets/environment:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

This function enforces admin role checks via `user_profiles.role = 'admin'`.

## 5) Notes about fallback behavior

Frontend now has graceful fallback for core admin flows if the edge function is temporarily unavailable. For production, keep the edge function deployed to ensure centralized authorization and consistent business rules.

## 6) Admin audit logging

`database/full_setup.sql` creates `admin_audit_logs` and stores privileged admin changes from the edge function (`admin-setup`) for traceability.

## 7) Docker Compose (VPS)

This repository includes:

- `Dockerfile` (multi-stage build + nginx runtime)
- `docker-compose.yml`
- `docker/nginx.conf` (SPA routing support)

On your VPS:

- `HOST_PORT=43991 docker compose up -d --build`

If building with Docker/Compose, also provide frontend env vars at build time:

- `VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co VITE_SUPABASE_ANON_KEY=<your-anon-key> HOST_PORT=43991 docker-compose up -d --build`

Or use a deploy env file:

- `cp .env.deploy.example .env.deploy`
- edit `.env.deploy` with real Supabase values
- `set -a && source .env.deploy && set +a && docker-compose up -d --build`

The app is exposed on host port `43991` by default and can be changed with `HOST_PORT`.

### One-command remote deploy

Use the helper script from your local machine:

- `scripts/deploy_vps.sh`

Optional env overrides:

- `VPS_HOST` (default: `ubuntu@187.84.150.128`)
- `VPS_APP_DIR` (default: `~/Finan-asPro`)
- `VPS_BRANCH` (default: `main`)
- `VPS_PREFERRED_PORTS` (space-separated candidate ports)

The script auto-selects the first free port from `VPS_PREFERRED_PORTS`, sets `HOST_PORT`, rebuilds, and starts the stack.

### VPS-safe release management

Two release scripts are included:

- `scripts/promote_release_vps.sh` — promote a target commit/ref
- `scripts/rollback_release_vps.sh` — rollback to previous promoted release

Examples:

- `scripts/promote_release_vps.sh`
- `RELEASE_REF=origin/main scripts/promote_release_vps.sh`
- `RELEASE_REF=<commit_sha> scripts/promote_release_vps.sh`
- `scripts/rollback_release_vps.sh`

Release metadata is stored on the VPS at:

- `~/Finan-asPro/.release/current.env`
- `~/Finan-asPro/.release/previous.env`

Both scripts perform container rebuild/start and a localhost HTTP health check before marking the release state.

## Stack

- React + TypeScript + Vite
- Tailwind + Radix/shadcn UI
- Supabase Auth, Postgres, Edge Functions
