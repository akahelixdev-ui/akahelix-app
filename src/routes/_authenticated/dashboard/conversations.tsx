import { Trash } from "@phosphor-icons/react";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { ago, DashButton, EmptyState, PageHeader, Panel } from "@/components/dashboard/kit";
import { supabase } from "@/integrations/supabase/client";
import { conversationsQuery, type TranscriptLine } from "@/lib/dashboard/data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard/conversations")({
  loader: ({ context }) => context.queryClient.ensureQueryData(conversationsQuery()),
  component: ConversationsPage,
});

function ConversationsPage() {
  const { data } = useSuspenseQuery(conversationsQuery());
  const qc = useQueryClient();
  const [id, setId] = useState<string | null>(null);
  const selected = data.find((c) => c.id === id) ?? data[0];
  const lines = (Array.isArray(selected?.messages) ? selected.messages : []) as TranscriptLine[];
  const del = useMutation({
    mutationFn: async (cid: string) => {
      const r = await supabase.from("chat_conversations").delete().eq("id", cid);
      if (r.error) throw new Error(r.error.message);
    },
    onSuccess: () => {
      setId(null);
      void qc.invalidateQueries({ queryKey: ["conversations"] });
      toast.success("Deleted");
    },
    onError: (e) => toast.error(e.message),
  });
  return (
    <>
      <PageHeader
        n="03"
        label="Assistant"
        title="Assistant chats"
        description="What visitors asked the website assistant — useful for spotting common questions."
      />
      {!data.length ? (
        <Panel>
          <EmptyState
            title="No chats yet"
            body="Conversations with the website assistant are saved here once a visitor asks something."
          />
        </Panel>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[22rem_1fr]">
          <Panel bodyClassName="divide-y divide-border max-h-[70dvh] overflow-y-auto">
            {data.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setId(c.id)}
                className={cn(
                  "block w-full px-5 py-4 text-left hover:bg-mist",
                  selected?.id === c.id && "bg-blue-soft",
                )}
              >
                <p className="line-clamp-2 text-sm">{c.first_question || "(no question)"}</p>
                <p className="label-mono mt-2 text-muted-foreground">
                  {c.question_count} questions · {ago(c.updated_at)}
                </p>
              </button>
            ))}
          </Panel>
          {selected && (
            <Panel
              title="Transcript"
              meta={ago(selected.updated_at)}
              action={
                <DashButton
                  variant="ghost"
                  disabled={del.isPending}
                  onClick={() => confirm("Delete this chat?") && del.mutate(selected.id)}
                >
                  <Trash />
                  Delete
                </DashButton>
              }
            >
              <div className="space-y-4 p-5">
                {lines.map((l, i) => (
                  <div
                    key={i}
                    className={cn(
                      "max-w-[80%] whitespace-pre-wrap rounded-[4px] px-4 py-3 text-sm",
                      l.role === "user" ? "ml-auto bg-blue text-on-blue" : "bg-mist",
                    )}
                  >
                    {l.text}
                  </div>
                ))}
                {!lines.length && (
                  <p className="text-sm text-muted-foreground">No messages saved.</p>
                )}
              </div>
            </Panel>
          )}
        </div>
      )}
    </>
  );
}
