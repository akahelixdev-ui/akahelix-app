import { ArrowRight, ChatCircleText, CheckCircle, Signature, Tray } from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";

import {
  ago,
  DashButton,
  EmptyState,
  InquiryPill,
  PageHeader,
  Panel,
  SamplePill,
  Skeleton,
} from "@/components/dashboard/kit";
import { ProjectCard } from "@/components/dashboard/ProjectCard";
import { Stat } from "@/components/dashboard/Stat";
import { company } from "@/content/site";
import { supabase } from "@/integrations/supabase/client";
import {
  conversationsQuery,
  currentPhaseIndex,
  inquiriesQuery,
  projectsQuery,
  recentUpdatesQuery,
  type Me,
  type ProjectWithPhases,
} from "@/lib/dashboard/data";
import { useMe } from "@/lib/dashboard/use-me";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(projectsQuery());
    void context.queryClient.prefetchQuery(recentUpdatesQuery());
  },
  component: OverviewPage,
});

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function OverviewPage() {
  const me = useMe();
  return me.isAdmin ? <AdminOverview me={me} /> : <ClientOverview me={me} />;
}

function today() {
  return new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

/* ---------------- Team ---------------- */

function AdminOverview({ me }: { me: Me }) {
  const projects = useSuspenseQuery(projectsQuery()).data;
  const inquiries = useQuery(inquiriesQuery());
  const chats = useQuery(conversationsQuery());
  const updates = useQuery(recentUpdatesQuery());
  const queryClient = useQueryClient();

  const newInquiries = (inquiries.data ?? []).filter((i) => i.status === "new");
  const active = projects.filter((p) => p.status === "active");
  const waiting = projects.flatMap((p) =>
    p.project_phases
      .filter((ph) => ph.status === "awaiting_signoff")
      .map((ph) => ({ project: p, phase: ph })),
  );
  const weekAgo = Date.now() - 7 * 86_400_000;
  const chatsThisWeek = (chats.data ?? []).filter(
    (c) => new Date(c.updated_at).getTime() > weekAgo,
  ).length;
  const hasSamples =
    projects.some((p) => p.is_sample) || (inquiries.data ?? []).some((i) => i.is_sample);

  const clearSamples = useMutation({
    mutationFn: async () => {
      const a = await supabase.from("inquiries").delete().eq("is_sample", true);
      if (a.error) throw new Error(a.error.message);
      const b = await supabase.from("projects").delete().eq("is_sample", true);
      if (b.error) throw new Error(b.error.message);
    },
    onSuccess: () => {
      toast.success("Example data removed");
      void queryClient.invalidateQueries();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <>
      <PageHeader
        n="01"
        label={today()}
        title={`${greeting()}, ${me.firstName || "there"}.`}
        description="Here is where every lab project, lead and assistant conversation stands today."
      />

      {hasSamples && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-[4px] border border-dashed border-border bg-card px-4 py-3">
          <p className="flex items-center gap-3 text-[0.875rem] text-muted-foreground">
            <SamplePill />
            Example inquiries and projects are shown so you can try things out. The names are made
            up.
          </p>
          <DashButton
            variant="outline"
            onClick={() => clearSamples.mutate()}
            disabled={clearSamples.isPending}
          >
            {clearSamples.isPending ? "Removing…" : "Remove example data"}
          </DashButton>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          index={0}
          accent
          label="New inquiries"
          value={newInquiries.length}
          caption="Waiting for a first reply"
        />
        <Stat
          index={1}
          label="Active projects"
          value={active.length}
          caption={`${projects.length} in total`}
        />
        <Stat
          index={2}
          label="Awaiting sign-off"
          value={waiting.length}
          caption="Phases with the client"
        />
        <Stat
          index={3}
          label="Assistant chats"
          value={chatsThisWeek}
          caption="In the last 7 days"
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Panel
          className="xl:col-span-2"
          delay={0.2}
          title="Projects"
          meta={`${projects.length}`}
          action={
            <Link
              to="/dashboard/projects"
              className="label-mono link-draw text-muted-foreground hover:text-foreground"
            >
              All projects
            </Link>
          }
          bodyClassName="p-4"
        >
          {projects.length === 0 ? (
            <EmptyState
              title="No projects yet"
              body="Create a project when a lab signs on. It starts with the five standard phases."
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {projects.slice(0, 4).map((p, i) => (
                <ProjectCard key={p.id} project={p} index={i} />
              ))}
            </div>
          )}
        </Panel>

        <Panel delay={0.28} title="Needs attention" bodyClassName="divide-y divide-border">
          {inquiries.isLoading ? (
            <div className="space-y-3 p-5">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          ) : newInquiries.length === 0 && waiting.length === 0 ? (
            <div className="flex items-center gap-3 p-5 text-[0.875rem] text-muted-foreground">
              <CheckCircle weight="light" className="size-5 text-blue" /> Nothing is waiting on you.
            </div>
          ) : (
            <>
              {newInquiries.slice(0, 4).map((i) => (
                <Link
                  key={i.id}
                  to="/dashboard/inquiries"
                  search={{ id: i.id }}
                  className="flex items-start gap-3 px-5 py-4 transition-colors hover:bg-mist"
                >
                  <Tray weight="light" className="mt-0.5 size-5 shrink-0 text-blue" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.875rem] font-medium">{i.name}</span>
                    <span className="block truncate text-[0.8125rem] text-muted-foreground">
                      {i.organization || i.email}
                    </span>
                  </span>
                  <span className="label-mono shrink-0 text-muted-foreground">
                    {ago(i.created_at)}
                  </span>
                </Link>
              ))}
              {waiting.map(({ project, phase }) => (
                <Link
                  key={phase.id}
                  to="/dashboard/projects/$projectId"
                  params={{ projectId: project.id }}
                  className="flex items-start gap-3 px-5 py-4 transition-colors hover:bg-mist"
                >
                  <Signature weight="light" className="mt-0.5 size-5 shrink-0 text-blue" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.875rem] font-medium">
                      Phase {String(phase.phase_no).padStart(2, "0")} · {phase.title}
                    </span>
                    <span className="block truncate text-[0.8125rem] text-muted-foreground">
                      {project.lab_name} {project.client ? "" : "· no client linked"}
                    </span>
                  </span>
                  <span className="label-mono shrink-0 text-muted-foreground">Client</span>
                </Link>
              ))}
            </>
          )}
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Panel
          className="xl:col-span-2"
          delay={0.34}
          title="Latest inquiries"
          action={
            <Link
              to="/dashboard/inquiries"
              className="label-mono link-draw text-muted-foreground hover:text-foreground"
            >
              Inbox
            </Link>
          }
        >
          {inquiries.isLoading ? (
            <div className="space-y-3 p-5">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          ) : (inquiries.data ?? []).length === 0 ? (
            <EmptyState
              title="No inquiries yet"
              body="Messages sent from the contact page arrive here."
            />
          ) : (
            <ul className="divide-y divide-border">
              {(inquiries.data ?? []).slice(0, 5).map((i) => (
                <li key={i.id}>
                  <Link
                    to="/dashboard/inquiries"
                    search={{ id: i.id }}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-3.5 transition-colors hover:bg-mist md:grid-cols-[12rem_minmax(0,1fr)_auto_auto]"
                  >
                    <span className="truncate text-[0.875rem] font-medium">{i.name}</span>
                    <span className="hidden truncate text-[0.875rem] text-muted-foreground md:block">
                      {i.message}
                    </span>
                    <span className="hidden md:block">
                      <InquiryPill status={i.status} />
                    </span>
                    <span className="label-mono text-muted-foreground">{ago(i.created_at)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <ActivityPanel delay={0.4} loading={updates.isLoading} items={updates.data ?? []} />
      </div>

      <Panel
        className="mt-6"
        delay={0.46}
        title="Assistant"
        meta={`${chats.data?.length ?? 0} conversations`}
        action={
          <Link
            to="/dashboard/conversations"
            className="label-mono link-draw text-muted-foreground hover:text-foreground"
          >
            Read chats
          </Link>
        }
      >
        {(chats.data ?? []).length === 0 ? (
          <EmptyState
            title="No chats yet"
            body="When visitors ask the website assistant a question, the conversation is saved here."
          />
        ) : (
          <ul className="grid divide-y divide-border md:grid-cols-3 md:divide-x md:divide-y-0">
            {(chats.data ?? []).slice(0, 3).map((c) => (
              <li key={c.id}>
                <Link
                  to="/dashboard/conversations"
                  search={{ id: c.id }}
                  className="block h-full p-5 transition-colors hover:bg-mist"
                >
                  <ChatCircleText weight="light" className="size-5 text-blue" />
                  <p className="mt-3 line-clamp-2 text-[0.9375rem]">
                    “{c.first_question || "Untitled"}”
                  </p>
                  <p className="label-mono mt-3 text-muted-foreground">
                    {c.question_count} {c.question_count === 1 ? "question" : "questions"} ·{" "}
                    {ago(c.updated_at)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}

type UpdateItem = {
  id: string;
  author_name: string;
  body: string;
  created_at: string;
  kind: string;
  projects: { name: string; lab_name: string } | null;
};

function ActivityPanel({
  items,
  loading,
  delay,
}: {
  items: UpdateItem[];
  loading: boolean;
  delay: number;
}) {
  return (
    <Panel delay={delay} title="Activity">
      {loading ? (
        <div className="space-y-3 p-5">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
      ) : items.length === 0 ? (
        <p className="p-5 text-[0.875rem] text-muted-foreground">No updates yet.</p>
      ) : (
        <ol className="relative px-5 py-4">
          <span className="absolute bottom-6 left-[1.5625rem] top-6 w-px bg-border" aria-hidden />
          {items.map((u) => (
            <li key={u.id} className="relative flex gap-4 py-2.5">
              <span
                className={`relative z-10 mt-1.5 size-[0.5625rem] shrink-0 rounded-full border-2 border-card ${u.kind === "signoff" ? "bg-blue" : "bg-ink/40"}`}
              />
              <div className="min-w-0">
                <p className="text-[0.8125rem] leading-snug">
                  <span className="font-medium">{u.author_name || "AKAHELIX"}</span>{" "}
                  <span className="text-muted-foreground">{u.body}</span>
                </p>
                <p className="label-mono mt-1 truncate text-[0.5625rem] text-muted-foreground">
                  {u.projects?.lab_name} · {ago(u.created_at)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}

/* ---------------- Client ---------------- */

function ClientOverview({ me }: { me: Me }) {
  const projects = useSuspenseQuery(projectsQuery()).data;
  const updates = useQuery(recentUpdatesQuery());
  const waiting = projects.flatMap((p: ProjectWithPhases) =>
    p.project_phases
      .filter((ph) => ph.status === "awaiting_signoff")
      .map((ph) => ({ project: p, phase: ph })),
  );

  return (
    <>
      <PageHeader
        n="01"
        label={today()}
        title={`${greeting()}, ${me.firstName || "there"}.`}
        description={
          me.organization
            ? `Here is where ${me.organization}'s laboratory project stands.`
            : "Here is where your laboratory project stands."
        }
      />

      {waiting.map(({ project, phase }) => (
        <Link
          key={phase.id}
          to="/dashboard/projects/$projectId"
          params={{ projectId: project.id }}
          className="surface-blue chamfer group mb-6 flex flex-wrap items-center justify-between gap-4 rounded-[4px] p-6 [--cut:1.75rem]"
        >
          <div>
            <p className="label-mono text-on-blue-muted">Waiting for you</p>
            <p className="mt-2 text-[1.5rem] leading-tight tracking-[-0.035em]">
              Phase {String(phase.phase_no).padStart(2, "0")} · {phase.title} is ready for your
              sign-off.
            </p>
            {phase.notes && (
              <p className="mt-2 max-w-[60ch] text-[0.9375rem] text-on-blue-muted">{phase.notes}</p>
            )}
          </div>
          <span className="flex h-11 items-center gap-3 rounded-[4px] bg-on-blue px-4 text-[0.875rem] font-medium text-blue">
            Review and sign off{" "}
            <ArrowRight className="size-4 transition-transform duration-500 ease-out-expo group-hover:translate-x-1" />
          </span>
        </Link>
      ))}

      {projects.length === 0 ? (
        <Panel>
          <EmptyState
            title="Your project isn't set up yet"
            body={`Once the AKAHELIX team links your laboratory project, its five phases will appear here. Questions? ${company.email}`}
          />
        </Panel>
      ) : (
        <div className="grid gap-6 xl:grid-cols-3">
          <div className="grid gap-4 xl:col-span-2">
            {projects.map((p, i) => (
              <ClientProject key={p.id} project={p} index={i} />
            ))}
          </div>
          <ActivityPanel delay={0.3} loading={updates.isLoading} items={updates.data ?? []} />
        </div>
      )}
    </>
  );
}

function ClientProject({ project, index }: { project: ProjectWithPhases; index: number }) {
  const i = currentPhaseIndex(project.project_phases);
  return (
    <div>
      <ProjectCard project={project} index={index} showClient={false} />
      <p className="mt-2 px-1 text-[0.8125rem] text-muted-foreground">
        Phase {String(i + 1).padStart(2, "0")} ends when: {gateOf(i)}
      </p>
    </div>
  );
}

import { phases as phaseCopy } from "@/content/site";
function gateOf(i: number) {
  return phaseCopy[i]?.gate ?? "";
}
