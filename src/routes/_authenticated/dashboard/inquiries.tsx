import { ArrowRight, EnvelopeSimple, Trash } from "@phosphor-icons/react";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { AreaField } from "@/components/dashboard/fields";
import {
  ago,
  DashButton,
  EmptyState,
  fieldClass,
  InquiryPill,
  PageHeader,
  Panel,
  SamplePill,
} from "@/components/dashboard/kit";
import { supabase } from "@/integrations/supabase/client";
import { inquiriesQuery, inquiryStatusLabel, type InquiryStatus } from "@/lib/dashboard/data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard/inquiries")({
  validateSearch: (s: Record<string, unknown>): { id?: string } =>
    typeof s["id"] === "string" ? { id: s["id"] } : {},
  loader: ({ context }) => context.queryClient.ensureQueryData(inquiriesQuery()),
  component: InquiriesPage,
});

const FILTERS: (InquiryStatus | "all")[] = ["all", "new", "in_progress", "booked", "closed"];

function InquiriesPage() {
  const { data } = useSuspenseQuery(inquiriesQuery());
  const { id } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const qc = useQueryClient();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [q, setQ] = useState("");
  const list = data.filter(
    (i) =>
      (filter === "all" || i.status === filter) &&
      `${i.name} ${i.email} ${i.organization ?? ""} ${i.message}`
        .toLowerCase()
        .includes(q.toLowerCase()),
  );
  const selected = data.find((i) => i.id === id) ?? list[0];

  const m = useMutation({
    mutationFn: async (fn: () => PromiseLike<{ error: { message: string } | null }>) => {
      const r = await fn();
      if (r.error) throw new Error(r.error.message);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["inquiries"] });
      toast.success("Saved");
    },
    onError: (e) => toast.error(e.message),
  });

  async function toProject() {
    if (!selected) return;
    const { data: p, error } = await supabase
      .from("projects")
      .insert({
        name: `${selected.organization || selected.name} — accreditation`,
        lab_name: selected.organization || selected.name,
        summary: selected.message.slice(0, 500),
      })
      .select("id")
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    await supabase.from("inquiries").update({ status: "booked" }).eq("id", selected.id);
    await qc.invalidateQueries();
    toast.success("Project created from this inquiry");
    void navigate({ to: "/dashboard/projects/$projectId", params: { projectId: p.id } });
  }

  return (
    <>
      <PageHeader
        n="02"
        label="Inquiries"
        title="Inquiries"
        description="Messages sent through the contact form. Move each one along as you talk to them."
      />
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <DashButton
            key={f}
            variant={filter === f ? "dark" : "outline"}
            onClick={() => setFilter(f)}
          >
            {f === "all" ? "All" : inquiryStatusLabel[f]}{" "}
            <span className="font-mono text-xs opacity-70">
              {f === "all" ? data.length : data.filter((i) => i.status === f).length}
            </span>
          </DashButton>
        ))}
        <input
          className={cn(fieldClass, "ml-auto max-w-xs py-2")}
          placeholder="Search…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search inquiries"
        />
      </div>
      {!data.length ? (
        <Panel>
          <EmptyState
            title="No inquiries yet"
            body="When someone uses the contact form on the website, it will show up here."
          />
        </Panel>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[22rem_1fr]">
          <Panel bodyClassName="divide-y divide-border max-h-[70dvh] overflow-y-auto">
            {list.map((i) => (
              <button
                key={i.id}
                type="button"
                onClick={() => navigate({ search: { id: i.id } })}
                className={cn(
                  "block w-full px-5 py-4 text-left transition-colors hover:bg-mist",
                  selected?.id === i.id && "bg-blue-soft",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium">{i.name}</span>
                  <InquiryPill status={i.status} />
                </div>
                <p className="mt-1 truncate text-sm text-muted-foreground">
                  {i.organization || i.email}
                </p>
                <p className="label-mono mt-2 text-muted-foreground">{ago(i.created_at)}</p>
              </button>
            ))}
            {!list.length && <p className="p-6 text-sm text-muted-foreground">Nothing matches.</p>}
          </Panel>
          {selected && (
            <Panel
              key={selected.id}
              title={selected.name}
              meta={selected.is_sample ? <SamplePill /> : ago(selected.created_at)}
            >
              <div className="space-y-6 p-5">
                <div className="grid gap-4 text-sm sm:grid-cols-3">
                  <div>
                    <p className="label-mono text-muted-foreground">Email</p>
                    <a className="text-blue" href={`mailto:${selected.email}`}>
                      {selected.email}
                    </a>
                  </div>
                  <div>
                    <p className="label-mono text-muted-foreground">Organisation</p>
                    {selected.organization || "—"}
                  </div>
                  <div>
                    <p className="label-mono text-muted-foreground">Interested in</p>
                    {selected.interests.join(", ") || "—"}
                  </div>
                </div>
                <p className="whitespace-pre-wrap border-l-2 border-blue pl-4 text-[0.9375rem]">
                  {selected.message}
                </p>
                <div className="flex flex-wrap gap-2">
                  {(["new", "in_progress", "booked", "closed"] as InquiryStatus[]).map((s) => (
                    <DashButton
                      key={s}
                      variant={selected.status === s ? "primary" : "outline"}
                      disabled={m.isPending}
                      onClick={() =>
                        m.mutate(() =>
                          supabase.from("inquiries").update({ status: s }).eq("id", selected.id),
                        )
                      }
                    >
                      {inquiryStatusLabel[s]}
                    </DashButton>
                  ))}
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const notes = String(new FormData(e.currentTarget).get("notes") ?? "");
                    m.mutate(() =>
                      supabase
                        .from("inquiries")
                        .update({ notes: notes || null })
                        .eq("id", selected.id),
                    );
                  }}
                  className="space-y-3"
                >
                  <AreaField
                    label="Private notes"
                    name="notes"
                    defaultValue={selected.notes ?? ""}
                    maxLength={5000}
                  />
                  <DashButton type="submit" variant="outline" disabled={m.isPending}>
                    Save notes
                  </DashButton>
                </form>
                <div className="flex flex-wrap gap-2 border-t border-border pt-5">
                  <a
                    href={`mailto:${selected.email}?subject=${encodeURIComponent("Re: your AKAHELIX inquiry")}`}
                  >
                    <DashButton variant="outline">
                      <EnvelopeSimple />
                      Reply by email
                    </DashButton>
                  </a>
                  <DashButton onClick={toProject}>
                    Turn into project <ArrowRight />
                  </DashButton>
                  <DashButton
                    variant="danger"
                    className="ml-auto"
                    onClick={() => {
                      if (confirm("Delete this inquiry?")) {
                        m.mutate(() => supabase.from("inquiries").delete().eq("id", selected.id));
                        void navigate({ search: {} });
                      }
                    }}
                  >
                    <Trash />
                    Delete
                  </DashButton>
                </div>
              </div>
            </Panel>
          )}
        </div>
      )}
    </>
  );
}
