# FinBR Email Templates

Branded, responsive email templates aligned with the FinBR UI theme (dark navy + emerald gradient).

## Included templates

- `templates/reset-password.html`
- `templates/welcome.html`
- `templates/plan-approved.html`
- `templates/plan-rejected.html`

## Placeholder variables

These templates are designed with merge placeholders you can replace from your email provider / backend logic:

- `{{ .Email }}`
- `{{ .UserName }}`
- `{{ .ConfirmationURL }}`
- `{{ .DashboardURL }}`
- `{{ .PlanName }}`
- `{{ .BillingCycle }}`
- `{{ .FinalPrice }}`
- `{{ .AdminNotes }}`
- `{{ .SupportEmail }}`
- `{{ .CurrentYear }}`

> Keep placeholder syntax compatible with your provider. If your provider uses `{{variable}}` (without spaces/dot), convert accordingly.

## DatabasePad / Supabase Auth integration (password reset)

1. Open your project dashboard.
2. Go to **Authentication** → **Email templates**.
3. Open **Reset password** template.
4. Paste `templates/reset-password.html`.
5. Ensure the button/link uses your confirmation variable (e.g., `{{ .ConfirmationURL }}`).

## App notifications (plan approved/rejected, welcome)

For transactional notifications sent from backend functions, use these templates as HTML source and inject runtime values.

Example data to inject:

- `UserName`: full name
- `DashboardURL`: `http://localhost:5173` (dev) or production URL
- `CurrentYear`: current year

## Visual style choices

- Header gradient: `#0f1729` → `#13233b` → `#0d2137`
- Primary action gradient: `#10b981` → `#14b8a6`
- Rounded cards and soft shadows to match FinBR web app cards/modals
