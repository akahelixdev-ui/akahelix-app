import {
  ChatsCircle,
  Flask,
  GearSix,
  List,
  SignOut,
  SquaresFour,
  Tray,
  UsersThree,
  X,
  Wallet,
  ChartLineUp,
} from "@phosphor-icons/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";

import { EASE } from "@/components/site/motion";
import { Wordmark } from "@/components/site/Wordmark";
import { supabase } from "@/integrations/supabase/client";
import { inquiriesQuery, type Me } from "@/lib/dashboard/data";
import { cn } from "@/lib/utils";

import { Avatar } from "./kit";

type NavItem = {
  to:
    | "/dashboard"
    | "/dashboard/inquiries"
    | "/dashboard/conversations"
    | "/dashboard/projects"
    | "/dashboard/people"
    | "/dashboard/settings"
    | "/dashboard/finance"
    | "/dashboard/analytics";
  label: string;
  icon: typeof Flask;
  exact?: boolean;
  badge?: number;
};

function navFor(me: Me, newInquiries: number): NavItem[] {
  if (!me.isAdmin)
    return [
      { to: "/dashboard", label: "Overview", icon: SquaresFour, exact: true },
      { to: "/dashboard/projects", label: "My projects", icon: Flask },
      { to: "/dashboard/settings", label: "Settings", icon: GearSix },
    ];
  return [
    { to: "/dashboard", label: "Overview", icon: SquaresFour, exact: true },
    { to: "/dashboard/analytics", label: "Analytics", icon: ChartLineUp },
    { to: "/dashboard/inquiries", label: "Inquiries", icon: Tray, badge: newInquiries },
    { to: "/dashboard/conversations", label: "Assistant chats", icon: ChatsCircle },
    { to: "/dashboard/projects", label: "Projects", icon: Flask },
    { to: "/dashboard/people", label: "People", icon: UsersThree },
    { to: "/dashboard/finance", label: "Finance", icon: Wallet },
    { to: "/dashboard/settings", label: "Settings", icon: GearSix },
  ];
}

function NavLinks({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-0.5" aria-label="Dashboard">
      {items.map((item, i) => (
        <Link
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          activeOptions={{ exact: item.exact ?? false }}
          className="group relative flex h-10 items-center gap-3 rounded-[4px] px-3 text-[0.875rem] text-foreground/70 transition-colors duration-300 hover:bg-mist hover:text-foreground data-[status=active]:bg-blue-soft data-[status=active]:text-blue"
        >
          <span className="label-mono w-5 text-[0.625rem] text-muted-foreground group-data-[status=active]:text-blue">
            {String(i + 1).padStart(2, "0")}
          </span>
          <item.icon weight="light" className="size-[1.125rem]" />
          <span className="flex-1">{item.label}</span>
          {!!item.badge && (
            <span className="label-mono flex h-5 min-w-5 items-center justify-center rounded-[3px] bg-blue px-1.5 text-[0.625rem] text-on-blue">
              {item.badge}
            </span>
          )}
        </Link>
      ))}
    </nav>
  );
}

function UserBlock({ me, onSignOut }: { me: Me; onSignOut: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-[4px] border border-border p-2.5">
      <Avatar
        src={me.avatarUrl}
        name={me.fullName || me.email}
        tone={me.isAdmin ? "blue" : "ink"}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[0.8125rem] font-medium">{me.fullName || me.email}</p>
        <p className="label-mono truncate text-[0.5625rem] text-muted-foreground">
          {me.isAdmin ? "AKAHELIX team" : (me.organization ?? "Client lab")}
        </p>
      </div>
      <button
        type="button"
        onClick={onSignOut}
        className="flex size-8 items-center justify-center rounded-[3px] text-muted-foreground transition-colors hover:bg-mist hover:text-foreground"
        aria-label="Sign out"
        title="Sign out"
      >
        <SignOut className="size-4" />
      </button>
    </div>
  );
}

export function DashboardShell({ me, children }: { me: Me; children: ReactNode }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const inquiries = useQuery({ ...inquiriesQuery(), enabled: me.isAdmin });
  const newCount = (inquiries.data ?? []).filter((i) => i.status === "new").length;
  const items = navFor(me, newCount);

  useEffect(() => setOpen(false), [pathname]);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    void navigate({ to: "/auth", replace: true });
  }

  const sidebar = (
    <>
      <div className="flex items-center justify-between px-1">
        <a
          href="https://akahelix.com"
          className="transition-opacity hover:opacity-80"
          aria-label="AKAHELIX"
          title="Go to https://akahelix.com"
        >
          <Wordmark />
        </a>
        <div className="flex items-center gap-1.5">
          <a
            href="https://akahelix.com"
            className="label-mono flex items-center gap-1 rounded-[3px] bg-mist px-1.5 py-0.5 text-[0.625rem] text-muted-foreground transition-colors hover:bg-mist-deep hover:text-foreground"
            title="Go to https://akahelix.com"
          >
            <span>Website</span>
            <span aria-hidden>↗</span>
          </a>
          <span className="label-mono rounded-[3px] bg-mist px-1.5 py-0.5 text-[0.5625rem] text-muted-foreground">
            {me.isAdmin ? "Team" : "Client"}
          </span>
        </div>
      </div>
      <div className="ticks mt-5 text-foreground" aria-hidden />
      <div className="mt-6 flex-1">
        <NavLinks items={items} onNavigate={() => setOpen(false)} />
      </div>
      <div className="space-y-3">
        <UserBlock me={me} onSignOut={signOut} />
      </div>
    </>
  );

  return (
    <div className="min-h-dvh bg-mist">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-card p-4 lg:flex">
        {sidebar}
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-card px-4 lg:hidden">
        <a
          href="https://akahelix.com"
          className="transition-opacity hover:opacity-80"
          aria-label="AKAHELIX"
          title="Go to https://akahelix.com"
        >
          <Wordmark />
        </a>
        <div className="flex items-center gap-3">
          <a
            href="https://akahelix.com"
            className="label-mono flex items-center gap-1 text-[0.75rem] text-muted-foreground transition-colors hover:text-foreground"
            title="Go to https://akahelix.com"
          >
            <span>Website</span>
            <span aria-hidden>↗</span>
          </a>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex size-9 items-center justify-center rounded-[4px] border border-border"
            aria-label="Open menu"
          >
            <List className="size-4" />
          </button>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-ink/30 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.aside
              className="fixed inset-y-0 left-0 z-50 flex w-[17rem] flex-col bg-card p-4 lg:hidden"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.5, ease: EASE }}
            >
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-[3px] text-muted-foreground hover:bg-mist"
                aria-label="Close menu"
              >
                <X className="size-4" />
              </button>
              {sidebar}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <main className="lg:pl-64">
        <div className={cn("mx-auto w-full max-w-[84rem] px-4 py-8 md:px-8 md:py-10")}>
          {children}
        </div>
      </main>
    </div>
  );
}
