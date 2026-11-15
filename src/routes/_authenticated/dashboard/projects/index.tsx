import { Plus } from "@phosphor-icons/react";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { AreaField, SelectField, str, TextField } from "@/components/dashboard/fields";
import { DashButton, EmptyState, PageHeader, Panel } from "@/components/dashboard/kit";
import { ProjectExtraFields, readProjectExtras } from "@/components/dashboard/ProjectFields";
import { ProjectCard } from "@/components/dashboard/ProjectCard";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import {
  peopleQuery,
  projectsQuery,
  projectStatusLabel,
  type ProjectStatus,
} from "@/lib/dashboard/data";
import { useMe } from "@/lib/dashboard/use-me";

export const Route = createFileRoute("/_authenticated/dashboard/projects/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(projectsQuery()),
  component: ProjectsPage,
});

function ProjectsPage() {
  const me = useMe();
  const { data } = useSuspenseQuery(projectsQuery());
  const [filter, setFilter] = useState<ProjectStatus | "all">("all");
  const [open, setOpen] = useState(false);
  const list = data.filter((p) => filter === "all" || p.status === filter);
  return (
    <>
      <PageHeader
        n="04"
        label="Projects"
        title={me.isAdmin ? "Projects" : "My projects"}
        description="Each project moves through five phases. A phase is closed once the client signs it off."
        actions={
          me.isAdmin && (
            <DashButton onClick={() => setOpen(true)}>
              <Plus />
              New project
            </DashButton>
          )
        }
      />
      <div className="mb-5 flex flex-wrap gap-2">
        {(["all", "active", "on_hold", "complete"] as const).map((f) => (
          <DashButton
            key={f}
            variant={filter === f ? "dark" : "outline"}
            onClick={() => setFilter(f)}
          >
            {f === "all" ? "All" : projectStatusLabel[f]}
          </DashButton>
        ))}
      </div>
      {list.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((p, i) => (
            <ProjectCard key={p.id} project={p} index={i} showClient={me.isAdmin} />
          ))}
        </div>
      ) : (
        <Panel>
          <EmptyState
            title="No projects here"
            body={
              me.isAdmin
                ? "Create a project to start tracking phases, updates and costs."
                : "When the team starts your project it will appear here."
            }
          />
        </Panel>
      )}
      {me.isAdmin && <NewProject open={open} onOpenChange={setOpen} />}
    </>
  );
}

function NewProject({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const people = useQuery({ ...peopleQuery(), enabled: open });
  const clients = (people.data ?? []).filter((p) => p.roles.includes("client"));
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    const { data, error } = await supabase
      .from("projects")
      .insert({
        name: str(f, "name"),
        lab_name: str(f, "lab"),
        summary: str(f, "summary") || null,
        client_id: str(f, "client") || null,
        start_date: str(f, "start") || null,
        target_date: str(f, "target") || null,
        ...readProjectExtras(f),
      })
      .select("id")
      .single();
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await qc.invalidateQueries({ queryKey: ["projects"] });
    onOpenChange(false);
    toast.success("Project created");
    void navigate({ to: "/dashboard/projects/$projectId", params: { projectId: data.id } });
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogTitle>New project</DialogTitle>
        <DialogDescription>
          Five phases are added automatically, starting with Assess.
        </DialogDescription>
        <form className="space-y-4" onSubmit={submit}>
          <TextField label="Project name" name="name" required maxLength={200} />
          <TextField label="Laboratory" name="lab" required maxLength={200} />
          <AreaField label="Summary" name="summary" maxLength={2000} />
          <SelectField label="Client" name="client" defaultValue="">
            <option value="">No client yet</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.full_name || c.email}
                {c.organization ? ` · ${c.organization}` : ""}
              </option>
            ))}
          </SelectField>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Start" name="start" type="date" />
            <TextField label="Target finish" name="target" type="date" />
          </div>
          <ProjectExtraFields />
          <DashButton type="submit" disabled={busy}>
            {busy ? "Creating…" : "Create project"}
          </DashButton>
        </form>
      </DialogContent>
    </Dialog>
  );
}
