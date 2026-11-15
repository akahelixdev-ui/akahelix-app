# Project Guidelines

## Architecture & Code Rules

- Single source of truth for site/company configuration lives in `src/content/site.ts`.
- Shared motion primitives live in `src/components/site/motion.tsx` (RevealText, FadeUp, Counter).
- Finance module uses an admin-only, single-currency cash ledger with integer minor units and database-validated invoice totals/payments.
- Finance reporting is cash-based bookkeeping; balances derive from opening balances plus ledger entries, and project-stage budgets stay separate from actual costs.
