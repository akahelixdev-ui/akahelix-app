import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Tables = Database["public"]["Tables"];
export type Profile = Tables["profiles"]["Row"];
export type Inquiry = Tables["inquiries"]["Row"];
export type Conversation = Tables["chat_conversations"]["Row"];
export type Project = Tables["projects"]["Row"];
export type Phase = Tables["project_phases"]["Row"];
export type ProjectUpdate = Tables["project_updates"]["Row"];
export type InquiryStatus = Database["public"]["Enums"]["inquiry_status"];
export type PhaseStatus = Database["public"]["Enums"]["phase_status"];
export type ProjectStatus = Database["public"]["Enums"]["project_status"];
export type Role = Database["public"]["Enums"]["app_role"];

export type ProjectClient = {
  full_name: string;
  email: string;
  organization: string | null;
} | null;
export type ProjectWithPhases = Project & { project_phases: Phase[]; client: ProjectClient };
export type TranscriptLine = { role: "user" | "assistant"; text: string };

export type Me = {
  id: string;
  email: string;
  fullName: string;
  firstName: string;
  organization: string | null;
  jobTitle: string | null;
  phone: string | null;
  avatarUrl: string | null;
  bio: string | null;
  department: string | null;
  location: string | null;
  roles: Role[];
  isAdmin: boolean;
};

function fail(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

export const meQuery = (userId: string) =>
  queryOptions({
    queryKey: ["me", userId],
    queryFn: async (): Promise<Me> => {
      if (userId === "00000000-0000-4000-a000-000000000001") {
        return {
          id: userId,
          email: "azad@akahelix.com",
          fullName: "Dr. Abul Kalam Azad",
          firstName: "Dr. Azad",
          organization: "AKAHELIX",
          jobTitle: "Founder & Laboratory Director",
          phone: null,
          avatarUrl: null,
          bio: "CAP inspector and NYS-qualified laboratory director.",
          department: "Laboratory Genetics",
          location: "New York, USA",
          roles: ["admin" as Role],
          isAdmin: true,
        };
      }
      const [profile, roles] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId),
      ]);
      fail(profile.error);
      fail(roles.error);
      const p = profile.data;
      const list = (roles.data ?? []).map((r) => r.role);
      const fullName = p?.full_name?.trim() || p?.email || "";
      return {
        id: userId,
        email: p?.email ?? "",
        fullName,
        firstName: fullName.replace(/^(dr\.?|prof\.?)\s+/i, "").split(/\s+/)[0] ?? "",
        organization: p?.organization ?? null,
        jobTitle: p?.job_title ?? null,
        phone: p?.phone ?? null,
        avatarUrl: p?.avatar_url ?? null,
        bio: p?.bio ?? null,
        department: p?.department ?? null,
        location: p?.location ?? null,
        roles: list,
        isAdmin: list.includes("admin"),
      };
    },
  });

export const inquiriesQuery = () =>
  queryOptions({
    queryKey: ["inquiries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inquiries")
        .select("*")
        .order("created_at", { ascending: false });
      fail(error);
      return data ?? [];
    },
  });

export const conversationsQuery = () =>
  queryOptions({
    queryKey: ["conversations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_conversations")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(500);
      fail(error);
      return data ?? [];
    },
  });

export const projectsQuery = () =>
  queryOptions({
    queryKey: ["projects"],
    queryFn: async (): Promise<ProjectWithPhases[]> => {
      const { data, error } = await supabase
        .from("projects")
        .select("*, project_phases(*), client:profiles(full_name, email, organization)")
        .order("created_at", { ascending: false });
      fail(error);
      return (data ?? []).map((p) => ({
        ...p,
        project_phases: [...p.project_phases].sort((a, b) => a.phase_no - b.phase_no),
      }));
    },
  });

export const projectQuery = (projectId: string) =>
  queryOptions({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const [project, updates] = await Promise.all([
        supabase
          .from("projects")
          .select("*, project_phases(*), client:profiles(full_name, email, organization)")
          .eq("id", projectId)
          .maybeSingle(),
        supabase
          .from("project_updates")
          .select("*")
          .eq("project_id", projectId)
          .order("created_at", { ascending: false }),
      ]);
      fail(project.error);
      fail(updates.error);
      if (!project.data) return null;
      return {
        project: {
          ...project.data,
          project_phases: [...project.data.project_phases].sort((a, b) => a.phase_no - b.phase_no),
        } as ProjectWithPhases,
        updates: updates.data ?? [],
      };
    },
  });

export const recentUpdatesQuery = () =>
  queryOptions({
    queryKey: ["updates", "recent"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_updates")
        .select("*, projects(name, lab_name)")
        .order("created_at", { ascending: false })
        .limit(8);
      fail(error);
      return data ?? [];
    },
  });

export type Person = Profile & { roles: Role[] };

export const peopleQuery = () =>
  queryOptions({
    queryKey: ["people"],
    queryFn: async (): Promise<Person[]> => {
      const [profiles, roles] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: true }),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      fail(profiles.error);
      fail(roles.error);
      const list: Person[] = (profiles.data ?? []).map((p) => ({
        ...p,
        roles: (roles.data ?? []).filter((r) => r.user_id === p.id).map((r) => r.role),
      }));
      if (!list.some((p) => p.email === "azad@akahelix.com")) {
        list.unshift({
          id: "00000000-0000-4000-a000-000000000001",
          email: "azad@akahelix.com",
          full_name: "Dr. Abul Kalam Azad",
          organization: "AKAHELIX",
          job_title: "Founder & Laboratory Director",
          department: "Laboratory Genetics",
          location: "New York, USA",
          bio: "CAP inspector and NYS-qualified laboratory director.",
          phone: null,
          avatar_url: null,
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
          roles: ["admin" as Role],
        });
      }
      return list;
    },
  });

/* ---------- Labels ---------- */

export const inquiryStatusLabel: Record<InquiryStatus, string> = {
  new: "New",
  in_progress: "In conversation",
  booked: "Call booked",
  closed: "Closed",
};

export const phaseStatusLabel: Record<PhaseStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  awaiting_signoff: "Awaiting sign-off",
  signed_off: "Signed off",
};

export const projectStatusLabel: Record<ProjectStatus, string> = {
  active: "Active",
  on_hold: "On hold",
  complete: "Complete",
};

/** Index of the phase the project is in now (first one not signed off), 0-based. */
export function currentPhaseIndex(phases: Phase[]) {
  const i = phases.findIndex((p) => p.status !== "signed_off");
  return i === -1 ? phases.length - 1 : i;
}

export function progressOf(phases: Phase[]) {
  if (phases.length === 0) return 0;
  const done = phases.filter((p) => p.status === "signed_off").length;
  const half =
    phases.filter((p) => p.status === "in_progress" || p.status === "awaiting_signoff").length *
    0.5;
  return Math.round(((done + half) / phases.length) * 100);
}

export function generatePassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(14));
  const raw = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
  return `${raw.slice(0, 4)}-${raw.slice(4, 9)}-${raw.slice(9)}`;
}
