import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { AreaField, str, TextField } from "@/components/dashboard/fields";
import { AvatarPicker } from "@/components/dashboard/AvatarPicker";
import { DashButton, PageHeader, Panel } from "@/components/dashboard/kit";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/dashboard/use-me";

export const Route = createFileRoute("/_authenticated/dashboard/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const me = useMe();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  async function saveProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
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
      .eq("id", me.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await qc.invalidateQueries({ queryKey: ["me"] });
    toast.success("Profile saved");
  }
  async function savePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const password = str(f, "password");
    if (password !== str(f, "confirm")) {
      toast.error("The two passwords don't match.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({
      password,
      current_password: str(f, "current"),
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    form.reset();
    toast.success("Password changed");
  }
  return (
    <>
      <PageHeader n="07" label="Settings" title="Your account" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Profile">
          <div className="border-b border-border p-5">
            <AvatarPicker
              userId={me.id}
              name={me.fullName || me.email}
              src={me.avatarUrl}
              onDone={() => void qc.invalidateQueries()}
            />
          </div>
          <form className="space-y-4 p-5" onSubmit={saveProfile}>
            <TextField
              label="Full name"
              name="name"
              defaultValue={me.fullName}
              required
              maxLength={200}
            />
            <TextField label="Email" value={me.email} disabled readOnly />
            <TextField
              label="Organisation"
              name="org"
              defaultValue={me.organization ?? ""}
              maxLength={300}
            />
            <TextField
              label="Job title"
              name="title"
              defaultValue={me.jobTitle ?? ""}
              maxLength={200}
            />
            <TextField label="Phone" name="phone" defaultValue={me.phone ?? ""} maxLength={50} />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="Department"
                name="department"
                defaultValue={me.department ?? ""}
                maxLength={200}
              />
              <TextField
                label="Location"
                name="location"
                defaultValue={me.location ?? ""}
                maxLength={200}
              />
            </div>
            <AreaField label="Short bio" name="bio" defaultValue={me.bio ?? ""} maxLength={1000} />
            <DashButton type="submit" disabled={busy}>
              Save profile
            </DashButton>
          </form>
        </Panel>
        <Panel title="Password">
          <form className="space-y-4 p-5" onSubmit={savePassword}>
            <TextField
              label="Current password"
              name="current"
              type="password"
              required
              autoComplete="current-password"
            />
            <TextField
              label="New password"
              name="password"
              type="password"
              required
              minLength={10}
              autoComplete="new-password"
            />
            <TextField
              label="Repeat new password"
              name="confirm"
              type="password"
              required
              minLength={10}
              autoComplete="new-password"
            />
            <DashButton type="submit" disabled={busy}>
              Change password
            </DashButton>
          </form>
        </Panel>
      </div>
    </>
  );
}
