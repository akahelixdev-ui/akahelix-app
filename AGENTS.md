<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.

<!-- LOVABLE:END -->

## Project rules

- All site copy and records live in `src/content/site.ts`; pages read from it so facts stay consistent across routes.
- Shared motion primitives live in `src/components/site/motion.tsx` (RevealText, FadeUp, ImageReveal, Counter, Magnetic, Marquee); reuse them instead of ad-hoc animations so motion stays uniform.
- The page intro curtain is pure CSS in the root shell so it never blocks content when JS is slow.
- Smooth scrolling uses Lenis, loaded dynamically in `SmoothScroll` and skipped for reduced-motion users.
- Home-only sections live in `src/components/home/`; service cards explain each service with a small drawn diagram or a photo, never an icon tile.
- Finance uses an admin-only, single-currency cash ledger with integer minor units and database-validated invoice totals/payments; transfers never contribute to income or expenses, preventing double counting.
- Finance reporting is cash-based bookkeeping, not statutory double-entry accounting; balances derive from opening balances plus ledger entries, and project-stage budgets stay separate from actual costs.
