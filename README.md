# AKAHELIX App

A modern laboratory genetics operations platform with authentication and team/client dashboards.

## Features

- **Authentication**: Email/password sign-in, account invite onboarding, and password recovery.
- **Dashboards**:
  - **Overview**: Real-time summary of active genetics laboratory set-up projects and phase completions.
  - **Projects**: Comprehensive tracking across the 5 project stages (Assess, Design, Validate, Prepare, Launch), stage sign-offs, and sample logs.
  - **Finance**: Cash-based ledger bookkeeping, invoicing, cost tracking, and bank reconciliation.
  - **Analytics**: Funnel metrics, phase workload distribution, lead inquiries, and cash flow visualizations.
  - **People**: Team and client member directory with role permissions.
  - **Settings & Profile**: User profile, password management, and system preferences.

## Development

Requires Node.js (v20+) and npm.

```bash
# Install dependencies
npm install

# Start local development server
npm run dev

# Run test suite
npm test

# Build production bundle
npm run build
```

## Tech Stack

- **Framework**: TanStack Start / React 19 / Vite
- **Routing**: TanStack Router
- **Data & State**: TanStack Query / Supabase
- **Styling & UI**: Tailwind CSS / Radix UI / Motion
