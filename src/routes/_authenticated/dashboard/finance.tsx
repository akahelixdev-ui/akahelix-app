import { createFileRoute } from "@tanstack/react-router";
import { FinancePage } from "@/components/dashboard/Finance";
import { financeQuery } from "@/lib/finance/data";
import { meQuery } from "@/lib/dashboard/data";

export const Route = createFileRoute("/_authenticated/dashboard/finance")({
  head: () => ({
    meta: [
      { title: "Finance — AKAHELIX" },
      {
        name: "description",
        content: "Private AKAHELIX company accounts, invoices, payments and project-stage costs.",
      },
      { property: "og:title", content: "Finance — AKAHELIX" },
      {
        property: "og:description",
        content: "Private AKAHELIX company accounts, invoices, payments and project-stage costs.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  loader: async ({ context }) => {
    const me = await context.queryClient.ensureQueryData(meQuery(context.user.id));
    if (me.isAdmin) await context.queryClient.ensureQueryData(financeQuery());
  },
  component: FinancePage,
});
