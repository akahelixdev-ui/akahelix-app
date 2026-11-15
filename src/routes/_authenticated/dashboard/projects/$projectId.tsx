import { ProjectExtraFields, readProjectExtras } from "@/components/dashboard/ProjectFields";
import { ArrowLeft, CheckCircle, PaperPlaneTilt, Trash } from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { AreaField, SelectField, str, TextField } from "@/components/dashboard/fields";
import {
  ago,
  DashButton,
  EmptyState,
  PageHeader,
  Panel,
  PhasePill,
  PhaseTrack,
  ProjectPill,
  SamplePill,
  shortDate,
} from "@/components/dashboard/kit";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import {
  peopleQuery,
  phaseStatusLabel,
  progressOf,
  projectQuery,
  projectStatusLabel,
  type Phase,
  type PhaseStatus,
  type ProjectStatus,
} from "@/lib/dashboard/data";
import { useMe } from "@/lib/dashboard/use-me";

export const Route = createFileRoute("/_authenticated/dashboard/projects/$projectId")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(projectQuery(params.projectId)),
  component: ProjectPage,
});

type Result = PromiseLike<{ error: { message: string } | null }>;

function ProjectPage() {
  const { projectId } = Route.useParams();
  const { data } = useSuspenseQuery(projectQuery(projectId));
  const me = useMe();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const m = useMutation({
    mutationFn: async (fn: () => Result) => {
      const r = await fn();
      if (r.error) throw new Error(r.error.message);
    },
    onSuccess: () => {
      void qc.invalidateQueries();
      toast.success("Saved");
    },
    onError: (e) => toast.error(e.message),
  });
  if (!data)
    return (
      <Panel>
        <EmptyState
          title="Project not found"
          body="It may have been removed, or you don't have access."
          action={
            <Link to="/dashboard/projects">
              <DashButton variant="outline">Back to projects</DashButton>
            </Link>
          }
        />
      </Panel>
    );
  const { project, updates } = data;
  const post = (body: string, kind: "note" | "status" = "note") =>
    supabase
      .from("project_updates")
      .insert({ project_id: project.id, author_id: me.id, author_name: me.fullName, kind, body });

  return (
    <>
      <Link
        to="/dashboard/projects"
        className="label-mono mb-6 inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft />
        All projects
      </Link>
      <PageHeader
        n="04"
        label={project.lab_name}
        title={project.name}
        description={project.summary ?? undefined}
        actions={
          <>
            <ProjectPill status={project.status} />
            {project.is_sample && <SamplePill />}
          </>
        }
      />
      <Panel className="mb-4" title="Progress" meta={`${progressOf(project.project_phases)}%`}>
        <div className="p-5">
          <PhaseTrack phases={project.project_phases} showLabels />
        </div>
      </Panel>
      <div className="grid gap-4 xl:grid-cols-[1fr_24rem]">
        <div className="space-y-3">
          {project.project_phases.map((ph) => (
            <PhaseRow
              key={ph.id}
              phase={ph}
              admin={me.isAdmin}
              isClient={project.client_id === me.id}
              busy={m.isPending}
              onSave={(patch, note) =>
                m.mutate(async () => {
                  const r = await supabase.from("project_phases").update(patch).eq("id", ph.id);
                  if (r.error || !note) return r;
                  return post(note, "status");
                })
              }
              onSignOff={() => m.mutate(() => supabase.rpc("sign_off_phase", { _phase_id: ph.id }))}
            />
          ))}
        </div>
        <div className="space-y-4">
          {me.isAdmin && (
            <ProjectSettings
              project={project}
              busy={m.isPending}
              onSave={(patch) =>
                m.mutate(() => supabase.from("projects").update(patch).eq("id", project.id))
              }
              onDelete={async () => {
                if (!confirm("Delete this project and all its phases and updates?")) return;
                const r = await supabase.from("projects").delete().eq("id", project.id);
                if (r.error) {
                  toast.error(
                    r.error.message.includes("foreign")
                      ? "This project has finance records. Remove them first."
                      : r.error.message,
                  );
                  return;
                }
                await qc.invalidateQueries();
                void navigate({ to: "/dashboard/projects" });
              }}
            />
          )}
          <Panel title="Updates" meta={String(updates.length)}>
            <form
              className="space-y-3 border-b border-border p-5"
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const body = str(new FormData(form), "body");
                if (!body) return;
                m.mutate(() => post(body));
                form.reset();
              }}
            >
              <AreaField label="Write an update" name="body" maxLength={4000} required />
              <DashButton type="submit" disabled={m.isPending}>
                <PaperPlaneTilt />
                Post
              </DashButton>
            </form>
            <ol className="divide-y divide-border">
              {updates.map((u) => (
                <li key={u.id} className="p-5 text-sm">
                  <p className="label-mono mb-1.5 text-muted-foreground">
                    {u.author_name || "Team"} · {ago(u.created_at)}
                    {u.kind !== "note" && <span className="text-blue"> · {u.kind}</span>}
                  </p>
                  <p className="whitespace-pre-wrap">{u.body}</p>
                  {me.isAdmin && (
                    <button
                      type="button"
                      className="label-mono mt-2 text-muted-foreground hover:text-destructive"
                      onClick={() =>
                        m.mutate(() => supabase.from("project_updates").delete().eq("id", u.id))
                      }
                    >
                      Remove
                    </button>
                  )}
                </li>
              ))}
              {!updates.length && (
                <li className="p-5 text-sm text-muted-foreground">No updates yet.</li>
              )}
            </ol>
          </Panel>
        </div>
      </div>
    </>
  );
}

function PhaseRow({
  phase,
  admin,
  isClient,
  busy,
  onSave,
  onSignOff,
}: {
  phase: Phase;
  admin: boolean;
  isClient: boolean;
  busy: boolean;
  onSave: (p: Partial<Phase>, note?: string) => void;
  onSignOff: () => void;
}) {
  const [edit, setEdit] = useState(false);
  const label = `Phase ${String(phase.phase_no).padStart(2, "0")} · ${phase.title}`;
  return (
    <Panel title={label} action={<PhasePill status={phase.status} />}>
      <div className="space-y-4 p-5 text-sm">
        <div className="flex flex-wrap gap-6 text-muted-foreground">
          <span>Due {shortDate(phase.due_date)}</span>
          {phase.signed_off_at && (
            <span className="flex items-center gap-1.5 text-foreground">
              <CheckCircle className="text-blue" />
              Signed off {shortDate(phase.signed_off_at)}
            </span>
          )}
        </div>
        {phase.notes && <p className="whitespace-pre-wrap">{phase.notes}</p>}
        <div className="flex flex-wrap gap-2">
          {admin && phase.status === "in_progress" && (
            <DashButton
              disabled={busy}
              onClick={() =>
                onSave({ status: "awaiting_signoff" }, `${label} is ready for sign-off.`)
              }
            >
              Ask client to sign off
            </DashButton>
          )}
          {admin && phase.status === "not_started" && (
            <DashButton
              variant="outline"
              disabled={busy}
              onClick={() => onSave({ status: "in_progress" }, `${label} started.`)}
            >
              Start phase
            </DashButton>
          )}
          {phase.status === "awaiting_signoff" && (isClient || admin) && (
            <DashButton
              variant="dark"
              disabled={busy}
              onClick={() =>
                confirm(`Sign off ${label}? This closes the phase and starts the next one.`) &&
                onSignOff()
              }
            >
              <CheckCircle />
              {isClient ? "Sign off this phase" : "Sign off for client"}
            </DashButton>
          )}
          {admin && (
            <DashButton variant="ghost" onClick={() => setEdit((v) => !v)}>
              {edit ? "Close" : "Edit"}
            </DashButton>
          )}
        </div>
        {edit && (
          <form
            className="grid gap-4 border-t border-border pt-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              onSave({
                status: str(f, "status") as PhaseStatus,
                due_date: str(f, "due") || null,
                notes: str(f, "notes") || null,
              });
              setEdit(false);
            }}
          >
            <SelectField label="Status" name="status" defaultValue={phase.status}>
              {(Object.keys(phaseStatusLabel) as PhaseStatus[]).map((s) => (
                <option key={s} value={s}>
                  {phaseStatusLabel[s]}
                </option>
              ))}
            </SelectField>
            <TextField
              label="Due date"
              name="due"
              type="date"
              defaultValue={phase.due_date ?? ""}
            />
            <div className="sm:col-span-2">
              <AreaField
                label="Notes for the client"
                name="notes"
                defaultValue={phase.notes ?? ""}
                maxLength={4000}
              />
            </div>
            <DashButton type="submit" disabled={busy}>
              Save phase
            </DashButton>
          </form>
        )}
      </div>
    </Panel>
  );
}

function ProjectSettings({
  project,
  busy,
  onSave,
  onDelete,
}: {
  project: Database["public"]["Tables"]["projects"]["Row"];
  busy: boolean;
  onSave: (p: Database["public"]["Tables"]["projects"]["Update"]) => void;
  onDelete: () => void;
}) {
  const people = useQuery(peopleQuery());
  const clients = (people.data ?? []).filter((p) => p.roles.includes("client"));
  return (
    <Panel title="Project details">
      <form
        key={JSON.stringify(project)}
        className="space-y-4 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          onSave({
            name: str(f, "name"),
            lab_name: str(f, "lab"),
            summary: str(f, "summary") || null,
            status: str(f, "status") as ProjectStatus,
            client_id: str(f, "client") || null,
            start_date: str(f, "start") || null,
            target_date: str(f, "target") || null,
            ...readProjectExtras(f),
          });
        }}
      >
        <TextField label="Name" name="name" defaultValue={project.name} required maxLength={200} />
        <TextField
          label="Laboratory"
          name="lab"
          defaultValue={project.lab_name}
          required
          maxLength={200}
        />
        <AreaField
          label="Summary"
          name="summary"
          defaultValue={project.summary ?? ""}
          maxLength={2000}
        />
        <SelectField label="Status" name="status" defaultValue={project.status}>
          {(Object.keys(projectStatusLabel) as ProjectStatus[]).map((s) => (
            <option key={s} value={s}>
              {projectStatusLabel[s]}
            </option>
          ))}
        </SelectField>
        <SelectField label="Client" name="client" defaultValue={project.client_id ?? ""}>
          <option value="">No client</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.full_name || c.email}
            </option>
          ))}
        </SelectField>
        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="Start"
            name="start"
            type="date"
            defaultValue={project.start_date ?? ""}
          />
          <TextField
            label="Target"
            name="target"
            type="date"
            defaultValue={project.target_date ?? ""}
          />
        </div>
        <ProjectExtraFields p={project} />
        <div className="flex gap-2">
          <DashButton type="submit" disabled={busy}>
            Save
          </DashButton>
          <DashButton variant="danger" className="ml-auto" onClick={onDelete}>
            <Trash />
            Delete
          </DashButton>
        </div>
      </form>
    </Panel>
  );
}
