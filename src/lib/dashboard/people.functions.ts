import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { Database } from "@/integrations/supabase/types";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const email = z.string().trim().toLowerCase().email("Enter a valid email address.").max(320);
const password = z.string().min(10, "Use at least 10 characters for the password.").max(72);
const fullName = z.string().trim().min(1, "Enter a name.").max(200);

function friendly(message: string) {
  if (/already been registered|already registered|exists/i.test(message))
    return "Someone with that email already has an account.";
  if (/pwned|weak|leaked/i.test(message))
    return "That password has appeared in a data breach. Please choose another.";
  return message;
}

async function adminClient() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Public: tells the sign-in page whether the first owner account still needs to be created. */
export const getSetupState = createServerFn({ method: "GET" }).handler(async () => {
  const admin = await adminClient();
  const { count, error } = await admin
    .from("user_roles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin");
  if (error) return { needsOwner: false };
  return { needsOwner: (count ?? 0) === 0 };
});

/** Public, one-time: creates the owner account. Closes for good once any admin exists. */
export const createOwner = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ fullName, email, password }).parse(input))
  .handler(async ({ data }) => {
    const admin = await adminClient();
    const { count } = await admin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if ((count ?? 0) > 0)
      return {
        ok: false as const,
        error: "The owner account has already been set up. Please sign in.",
      };

    const created = await admin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName },
    });
    if (created.error || !created.data.user)
      return {
        ok: false as const,
        error: friendly(created.error?.message ?? "Could not create the account."),
      };

    const id = created.data.user.id;
    await admin
      .from("profiles")
      .upsert({ id, full_name: data.fullName, email: data.email, organization: "AKAHELIX" });
    const role = await admin.from("user_roles").insert({ user_id: id, role: "admin" });
    if (role.error) {
      await admin.auth.admin.deleteUser(id);
      return {
        ok: false as const,
        error: "Could not finish setting up the account. Please try again.",
      };
    }
    return { ok: true as const };
  });

async function requireAdmin(context: { supabase: SupabaseClient<Database>; userId: string }) {
  const { data } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!data) throw new Error("Only the AKAHELIX team can do this.");
}

/** Admin: adds a team member or a client and, optionally, links them to a project. */
export const createPerson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        fullName,
        email,
        password,
        organization: z.string().trim().max(300).optional(),
        jobTitle: z.string().trim().max(200).optional(),
        phone: z.string().trim().max(50).optional(),
        department: z.string().trim().max(200).optional(),
        location: z.string().trim().max(200).optional(),
        role: z.enum(["admin", "client"]),
        projectId: z.string().uuid().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const admin = await adminClient();
    const created = await admin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName },
    });
    if (created.error || !created.data.user)
      return {
        ok: false as const,
        error: friendly(created.error?.message ?? "Could not create the account."),
      };
    const id = created.data.user.id;
    await admin
      .from("profiles")
      .upsert({
        id,
        full_name: data.fullName,
        email: data.email,
        organization: data.organization || null,
        job_title: data.jobTitle || null,
        phone: data.phone || null,
        department: data.department || null,
        location: data.location || null,
      });
    const role = await admin.from("user_roles").insert({ user_id: id, role: data.role });
    if (role.error) {
      await admin.auth.admin.deleteUser(id);
      return { ok: false as const, error: "Could not save the role. Please try again." };
    }
    if (data.projectId && data.role === "client") {
      await admin.from("projects").update({ client_id: id }).eq("id", data.projectId);
    }
    return { ok: true as const, id };
  });

/** Admin: removes someone's account. You cannot remove yourself. */
export const removePerson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    if (data.userId === context.userId)
      return { ok: false as const, error: "You can't remove your own account." };
    const admin = await adminClient();
    const { error } = await admin.auth.admin.deleteUser(data.userId);
    if (error)
      return { ok: false as const, error: "Could not remove this person. Please try again." };
    return { ok: true as const };
  });

/** Admin: sets a new password for someone who is locked out. */
export const setPersonPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ userId: z.string().uuid(), password }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const admin = await adminClient();
    const { error } = await admin.auth.admin.updateUserById(data.userId, {
      password: data.password,
    });
    if (error) return { ok: false as const, error: friendly(error.message) };
    return { ok: true as const };
  });
