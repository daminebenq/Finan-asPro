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

An example is provided in `.env.example`.

## 2) Install and run locally

- Install dependencies: `npm install`
- Start dev server: `npm run dev`
- Build production bundle: `npm run build`

## 3) Database setup (required)

Run SQL scripts in your Supabase SQL editor in this order:

1. `database/full_setup.sql` (full schema, policies, indexes, seed plans)
2. `database/subdatabase_setup.sql` (additional logical subdatabase migration script)

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

The app is exposed on host port `43991` by default and can be changed with `HOST_PORT`.

## Stack

- React + TypeScript + Vite
- Tailwind + Radix/shadcn UI
- Supabase Auth, Postgres, Edge Functions
