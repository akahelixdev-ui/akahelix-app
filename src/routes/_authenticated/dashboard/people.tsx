import { Key, PencilSimple, Plus, Trash } from "@phosphor-icons/react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { AvatarPicker } from "@/components/dashboard/AvatarPicker";
import { AreaField, SelectField, str, TextField } from "@/components/dashboard/fields";
import {
  Avatar,
  DashButton,
  EmptyState,
  PageHeader,
  Panel,
  shortDate,
} from "@/components/dashboard/kit";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { generatePassword, peopleQuery, projectsQuery, type Person } from "@/lib/dashboard/data";
import { createPerson, removePerson, setPersonPassword } from "@/lib/dashboard/people.functions";
import { useMe } from "@/lib/dashboard/use-me";

export const Route = createFileRoute("/_authenticated/dashboard/people")({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(peopleQuery()),
      context.queryClient.ensureQueryData(projectsQuery()),
    ]),
  component: PeoplePage,
});

function PeoplePage() {
  const me = useMe();
  const { data } = useSuspenseQuery(peopleQuery());
  const { data: projects } = useSuspenseQuery(projectsQuery());
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Person | null>(null);
  const [creds, setCreds] = useState<{ email: string; password: string } | null>(null);
  if (!me.isAdmin)
    return (
      <Panel>
        <EmptyState title="Team only" body="Only the AKAHELIX team can manage people." />
      </Panel>
    );

  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const input = {
      fullName: str(f, "name"),
      email: str(f, "email"),
      password: str(f, "password"),
      organization: str(f, "org") || undefined,
      jobTitle: str(f, "title") || undefined,
      phone: str(f, "phone") || undefined,
      department: str(f, "department") || undefined,
      location: str(f, "location") || undefined,
      role: str(f, "role") as "admin" | "client",
      projectId: str(f, "project") || undefined,
    };
    try {
      const r = await createPerson({ data: input });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      setOpen(false);
      setCreds({ email: input.email, password: input.password });
      await qc.invalidateQueries();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add this person.");
    }
  }
  async function reset(p: Person) {
    const password = generatePassword();
    const r = await setPersonPassword({ data: { userId: p.id, password } });
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    setCreds({ email: p.email, password });
  }
  async function remove(p: Person) {
    if (!confirm(`Remove ${p.full_name || p.email}? They will no longer be able to sign in.`))
      return;
    const r = await removePerson({ data: { userId: p.id } });
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    toast.success("Removed");
    await qc.invalidateQueries();
  }

  return (
    <>
      <PageHeader
        n="05"
        label="People"
        title="People"
        description="Sign-up is invite only. Add your team and clients here, then share their sign-in details with them."
        actions={
          <DashButton onClick={() => setOpen(true)}>
            <Plus />
            Add person
          </DashButton>
        }
      />
      <Panel bodyClassName="divide-y divide-border">
        {data.map((p) => (
          <div key={p.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
            <Avatar
              src={p.avatar_url}
              className="size-10"
              name={p.full_name || p.email}
              tone={p.roles.includes("admin") ? "ink" : "blue"}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">
                {p.full_name || "—"}{" "}
                {p.id === me.id && <span className="label-mono text-muted-foreground">(you)</span>}
              </p>
              <p className="truncate text-sm text-muted-foreground">
                {[p.job_title, p.email, p.organization].filter(Boolean).join(" · ")}
              </p>
            </div>
            <span className="label-mono text-muted-foreground">
              {p.roles.includes("admin") ? "Team" : "Client"}
            </span>
            <span className="label-mono hidden text-muted-foreground md:inline">
              Added {shortDate(p.created_at)}
            </span>
            <DashButton variant="ghost" onClick={() => setEditing(p)}>
              <PencilSimple />
              Edit
            </DashButton>
            {p.id !== me.id && (
              <>
                <DashButton variant="ghost" onClick={() => reset(p)} title="New password">
                  <Key />
                  New password
                </DashButton>
                <DashButton variant="ghost" onClick={() => remove(p)} aria-label="Remove">
                  <Trash />
                </DashButton>
              </>
            )}
          </div>
        ))}
      </Panel>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
          <DialogTitle>Add person</DialogTitle>
          <DialogDescription>They can change the password after signing in.</DialogDescription>
          <form className="space-y-4" onSubmit={add}>
            <TextField label="Full name" name="name" required maxLength={200} />
            <TextField label="Email" name="email" type="email" required />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Organisation" name="org" maxLength={300} />
              <TextField label="Job title" name="title" maxLength={200} />
              <TextField label="Phone" name="phone" maxLength={50} />
              <TextField label="Department" name="department" maxLength={200} />
            </div>
            <TextField label="Location" name="location" maxLength={200} />
            <SelectField label="Access" name="role" defaultValue="client">
              <option value="client">Client — sees only their projects</option>
              <option value="admin">Team — sees everything</option>
            </SelectField>
            <SelectField label="Link to project (clients)" name="project" defaultValue="">
              <option value="">None</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </SelectField>
            <TextField
              label="Starting password"
              name="password"
              defaultValue={generatePassword()}
              required
              minLength={10}
            />
            <DashButton type="submit">Add person</DashButton>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>{editing?.email}</DialogDescription>
          {editing && (
            <>
              <AvatarPicker
                userId={editing.id}
                name={editing.full_name || editing.email}
                src={editing.avatar_url}
                onDone={async () => {
                  await qc.invalidateQueries();
                  setEditing(null);
                }}
              />
              <form
                className="space-y-4"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  const { error } = await supabase
                    .from("profiles")
                    .update({
                      full_name: str(f, "name"),
                      organization: str(f, "org") || null,
                      job_title: str(f, "title") || null,
                      phone: str(f, "phone") || null,
                      department: str(f, "department") || null,
                      location: str(f, "location") || null,
                      bio: str(f, "bio") || null,
                    })
                    .eq("id", editing.id);
                  if (error) {
                    toast.error(error.message);
                    return;
                  }
                  toast.success("Saved");
                  setEditing(null);
                  await qc.invalidateQueries();
                }}
              >
                <TextField
                  label="Full name"
                  name="name"
                  defaultValue={editing.full_name}
                  required
                  maxLength={200}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField
                    label="Organisation"
                    name="org"
                    defaultValue={editing.organization ?? ""}
                    maxLength={300}
                  />
                  <TextField
                    label="Job title"
                    name="title"
                    defaultValue={editing.job_title ?? ""}
                    maxLength={200}
                  />
                  <TextField
                    label="Phone"
                    name="phone"
                    defaultValue={editing.phone ?? ""}
                    maxLength={50}
                  />
                  <TextField
                    label="Department"
                    name="department"
                    defaultValue={editing.department ?? ""}
                    maxLength={200}
                  />
                </div>
                <TextField
                  label="Location"
                  name="location"
                  defaultValue={editing.location ?? ""}
                  maxLength={200}
                />
                <AreaField
                  label="Short bio"
                  name="bio"
                  defaultValue={editing.bio ?? ""}
                  maxLength={1000}
                />
                <DashButton type="submit">Save profile</DashButton>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={!!creds} onOpenChange={(o) => !o && setCreds(null)}>
        <DialogContent>
          <DialogTitle>Sign-in details</DialogTitle>
          <DialogDescription>
            Share these privately. This password won't be shown again.
          </DialogDescription>
          <div className="space-y-2 rounded-[4px] bg-mist p-4 font-mono text-sm">
            <p>{creds?.email}</p>
            <p>{creds?.password}</p>
          </div>
          <DashButton
            onClick={() => {
              void navigator.clipboard.writeText(
                `Sign in at ${window.location.origin}/auth\nEmail: ${creds?.email}\nPassword: ${creds?.password}`,
              );
              toast.success("Copied");
            }}
          >
            Copy
          </DashButton>
        </DialogContent>
      </Dialog>
    </>
  );
}
