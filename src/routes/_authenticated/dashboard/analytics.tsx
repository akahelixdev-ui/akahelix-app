import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { DashButton, EmptyState, PageHeader, Panel } from "@/components/dashboard/kit";
import {
  conversationsQuery,
  inquiriesQuery,
  inquiryStatusLabel,
  projectsQuery,
  type InquiryStatus,
} from "@/lib/dashboard/data";
import { useMe } from "@/lib/dashboard/use-me";
import { cashFlow, money } from "@/lib/finance/calculations";
import { financeQuery } from "@/lib/finance/data";

export const Route = createFileRoute("/_authenticated/dashboard/analytics")({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(projectsQuery()),
      context.queryClient.ensureQueryData(inquiriesQuery()),
      context.queryClient.ensureQueryData(conversationsQuery()),
      context.queryClient.ensureQueryData(financeQuery()),
    ]),
  component: AnalyticsPage,
});

const RANGES = [
  ["3", "3 months"],
  ["6", "6 months"],
  ["12", "12 months"],
] as const;
const axis = {
  fontSize: 11,
  fill: "var(--muted-foreground)",
  fontFamily: "var(--font-mono, monospace)",
};

function monthKeys(n: number) {
  const out: string[] = [];
  const d = new Date();
  d.setDate(1);
  for (let i = n - 1; i >= 0; i--) {
    const x = new Date(d.getFullYear(), d.getMonth() - i, 1);
    out.push(`${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}
const label = (k: string) =>
  new Date(`${k}-01T00:00:00`).toLocaleDateString("en-US", { month: "short" });

function AnalyticsPage() {
  const me = useMe();
  const { data: projects } = useSuspenseQuery(projectsQuery());
  const { data: inquiries } = useSuspenseQuery(inquiriesQuery());
  const { data: chats } = useSuspenseQuery(conversationsQuery());
  const { data: fin } = useSuspenseQuery(financeQuery());
  const [range, setRange] = useState<"3" | "6" | "12">("6");
  const currency = fin.company?.currency || "USD";

  const s = useMemo(() => {
    const keys = monthKeys(Number(range));
    const from = `${keys[0]}-01`;
    const realInq = inquiries.filter((i) => !i.is_sample);
    const realProj = projects.filter((p) => !p.is_sample);
    const months = keys.map((k) => {
      const inMonth = (d: string | null) => !!d && d.slice(0, 7) === k;
      const entries = fin.entries.filter((e) => e.entry_date.slice(0, 7) === k);
      const cf = cashFlow(entries);
      return {
        month: label(k),
        inquiries: realInq.filter((i) => inMonth(i.created_at)).length,
        chats: chats.filter((c) => inMonth(c.created_at)).length,
        signoffs: realProj
          .flatMap((p) => p.project_phases)
          .filter((ph) => ph.status === "signed_off" && inMonth(ph.signed_off_at)).length,
        income: cf.income / 100,
        expenses: cf.expenses / 100,
      };
    });
    const period = realInq.filter((i) => i.created_at >= from);
    const booked = period.filter((i) => i.status === "booked" || i.status === "closed").length;
    const funnel = (Object.keys(inquiryStatusLabel) as InquiryStatus[]).map((st) => ({
      status: inquiryStatusLabel[st],
      count: period.filter((i) => i.status === st).length,
    }));
    const phaseLoad = [1, 2, 3, 4, 5].map((n) => {
      const ph = realProj
        .filter((p) => p.status === "active")
        .map((p) => p.project_phases.find((x) => x.status !== "signed_off"))
        .filter((x) => x?.phase_no === n);
      return {
        phase: realProj[0]?.project_phases.find((x) => x.phase_no === n)?.title ?? `Phase ${n}`,
        projects: ph.length,
      };
    });
    const cf = cashFlow(fin.entries, from);
    const completed = realProj.filter((p) => p.status === "complete").length;
    const fullySigned = realProj.filter(
      (p) =>
        p.project_phases.length &&
        p.project_phases.every((x) => x.status === "signed_off") &&
        p.project_phases.some((x) => x.signed_off_at && x.signed_off_at >= from),
    ).length;
    return {
      months,
      funnel,
      phaseLoad,
      booked,
      period: period.length,
      cf,
      completed,
      fullySigned,
      active: realProj.filter((p) => p.status === "active").length,
    };
  }, [range, inquiries, projects, chats, fin]);

  if (!me.isAdmin)
    return (
      <Panel>
        <EmptyState title="Team only" body="Only the AKAHELIX team can see analytics." />
      </Panel>
    );
  const conv = s.period ? Math.round((s.booked / s.period) * 100) : 0;
  const fmt = (n: number) => money(Math.round(n * 100), currency);

  return (
    <>
      <PageHeader
        n="02"
        label="Analytics"
        title="Analytics"
        description="How leads, projects and cash are moving. Sample records are left out."
        actions={
          <div className="flex gap-1">
            {RANGES.map(([v, l]) => (
              <DashButton
                key={v}
                variant={range === v ? "dark" : "outline"}
                onClick={() => setRange(v)}
              >
                {l}
              </DashButton>
            ))}
          </div>
        }
      />
      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          label="Labs fully signed off"
          value={String(s.fullySigned)}
          note="All five phases, this period"
          accent
        />
        <Kpi label="Inquiries" value={String(s.period)} note={`${conv}% reached a booked call`} />
        <Kpi
          label="Active projects"
          value={String(s.active)}
          note={`${s.completed} completed overall`}
        />
        <Kpi
          label="Net cash"
          value={money(s.cf.income - s.cf.expenses, currency)}
          note={`${money(s.cf.income, currency)} in · ${money(s.cf.expenses, currency)} out`}
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Leads per month" meta="Inquiries and assistant chats">
          <Chart>
            <LineChart data={s.months}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="month" tick={axis} axisLine={false} tickLine={false} />
              <YAxis
                allowDecimals={false}
                tick={axis}
                axisLine={false}
                tickLine={false}
                width={28}
              />
              <Tooltip contentStyle={tip} />
              <Line
                type="monotone"
                dataKey="inquiries"
                name="Inquiries"
                stroke="var(--blue)"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="chats"
                name="Chats"
                stroke="var(--foreground)"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
              />
            </LineChart>
          </Chart>
        </Panel>
        <Panel title="Cash in vs out" meta={currency}>
          <Chart>
            <BarChart data={s.months}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="month" tick={axis} axisLine={false} tickLine={false} />
              <YAxis tick={axis} axisLine={false} tickLine={false} width={56} />
              <Tooltip contentStyle={tip} formatter={(v: number) => fmt(v)} />
              <Bar dataKey="income" name="Income" fill="var(--blue)" radius={[2, 2, 0, 0]} />
              <Bar
                dataKey="expenses"
                name="Expenses"
                fill="var(--mist-deep)"
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </Chart>
        </Panel>
        <Panel title="Where active projects are" meta="Current phase">
          <Chart>
            <BarChart data={s.phaseLoad} layout="vertical">
              <CartesianGrid stroke="var(--border)" horizontal={false} />
              <XAxis
                type="number"
                allowDecimals={false}
                tick={axis}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="phase"
                tick={axis}
                axisLine={false}
                tickLine={false}
                width={72}
              />
              <Tooltip contentStyle={tip} />
              <Bar dataKey="projects" name="Projects" fill="var(--blue)" radius={[0, 2, 2, 0]} />
            </BarChart>
          </Chart>
        </Panel>
        <Panel title="Phase sign-offs per month">
          <Chart>
            <BarChart data={s.months}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="month" tick={axis} axisLine={false} tickLine={false} />
              <YAxis
                allowDecimals={false}
                tick={axis}
                axisLine={false}
                tickLine={false}
                width={28}
              />
              <Tooltip contentStyle={tip} />
              <Bar
                dataKey="signoffs"
                name="Sign-offs"
                fill="var(--foreground)"
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </Chart>
        </Panel>
        <Panel title="Inquiry pipeline" meta="This period" className="lg:col-span-2">
          <div className="grid gap-px bg-border sm:grid-cols-4">
            {s.funnel.map((f) => (
              <div key={f.status} className="bg-card p-5">
                <p className="label-mono text-muted-foreground">{f.status}</p>
                <p className="mt-3 text-3xl tracking-tight">{f.count}</p>
                <div className="mt-4 h-1 bg-mist">
                  <div
                    className="h-1 bg-blue"
                    style={{ width: `${s.period ? (f.count / s.period) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}

const tip = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 4,
  fontSize: 12,
};
function Chart({ children }: { children: React.ReactElement }) {
  return (
    <div className="h-64 p-4">
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}
function Kpi({
  label,
  value,
  note,
  accent,
}: {
  label: string;
  value: string;
  note: string;
  accent?: boolean;
}) {
  return (
    <div
      className={
        accent
          ? "rounded-[4px] bg-blue p-5 text-on-blue"
          : "rounded-[4px] border border-border bg-card p-5"
      }
    >
      <p className="label-mono opacity-70">{label}</p>
      <p className="mt-4 text-3xl tracking-tight">{value}</p>
      <p className="mt-2 text-xs opacity-70">{note}</p>
    </div>
  );
}
