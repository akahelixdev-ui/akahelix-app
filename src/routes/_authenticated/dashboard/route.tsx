import { createFileRoute, Outlet } from "@tanstack/react-router";

import { DashboardShell } from "@/components/dashboard/Shell";
import { Skeleton } from "@/components/dashboard/kit";
import { meQuery } from "@/lib/dashboard/data";
import { useMe } from "@/lib/dashboard/use-me";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — AKAHELIX" },
      {
        name: "description",
        content: "Projects, phase sign-offs, inquiries and assistant conversations for AKAHELIX.",
      },
      { property: "og:title", content: "Dashboard — AKAHELIX" },
      {
        property: "og:description",
        content: "Projects, phase sign-offs, inquiries and assistant conversations for AKAHELIX.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(meQuery(context.user.id)),
  pendingComponent: DashboardPending,
  errorComponent: ({ error }) => (
    <div className="flex min-h-dvh items-center justify-center bg-mist p-6 text-center">
      <div>
        <p className="text-lg font-medium">The dashboard didn't load.</p>
        <p className="mt-2 text-sm text-muted-foreground">
          {error instanceof Error ? error.message : "Please refresh the page."}
        </p>
      </div>
    </div>
  ),
  component: DashboardLayout,
});

function DashboardLayout() {
  const me = useMe();
  return (
    <DashboardShell me={me}>
      <Outlet />
    </DashboardShell>
  );
}

function DashboardPending() {
  return (
    <div className="min-h-dvh bg-mist lg:pl-64">
      <div className="mx-auto max-w-[84rem] space-y-6 px-4 py-10 md:px-8">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-80" />
        <div className="grid gap-4 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-80" />
      </div>
    </div>
  );
}
