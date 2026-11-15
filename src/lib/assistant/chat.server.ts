import { createOpenAI } from "@ai-sdk/openai";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

import { checkConversation, countUserMessages } from "./limits";
import { buildAssistantPrompt } from "./prompt";
import {
  createLovableAiGatewayRunIdFetch,
  getLovableAiGatewayRunId,
  withLovableAiGatewayRunIdHeader,
} from "./run-id";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1";
const MODEL = "openai/gpt-6-astra";

function statusOf(error: unknown): number | undefined {
  let current: unknown = error;
  for (let i = 0; i < 4 && current && typeof current === "object"; i++) {
    const status = (current as { statusCode?: unknown }).statusCode;
    if (typeof status === "number") return status;
    current = (current as { cause?: unknown }).cause;
  }
  return undefined;
}

/** What a visitor sees when the assistant can't answer. */
function describeError(error: unknown) {
  const status = statusOf(error);
  console.error("Assistant error", status, error);
  if (status === 429) return "The assistant is busy right now. Please try again in a minute.";
  if (status === 402 || status === 403)
    return "The assistant is unavailable at the moment. Please email us or book a free scoping call instead.";
  return "Something went wrong while answering. Please try again, or email us directly.";
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Keeps a copy of each finished conversation for the team dashboard. Never blocks the answer. */
async function saveConversation(id: string, messages: UIMessage[]) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const transcript = messages
      .map((m) => ({
        role: m.role,
        text: m.parts
          .map((p) => (p.type === "text" ? p.text : ""))
          .join("")
          .trim(),
      }))
      .filter((m) => m.text.length > 0);
    const first = transcript.find((m) => m.role === "user")?.text ?? "";
    const { error } = await supabaseAdmin.from("chat_conversations").upsert({
      id,
      first_question: first.slice(0, 500),
      question_count: countUserMessages(messages),
      messages: transcript,
      updated_at: new Date().toISOString(),
    });
    if (error) console.error("Could not save conversation", error.message);
  } catch (error) {
    console.error("Could not save conversation", error);
  }
}

export async function handleAssistantChat(request: Request) {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) {
    return Response.json({ error: "The assistant isn't set up yet." }, { status: 500 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "That message couldn't be read." }, { status: 400 });
  }

  const check = checkConversation((body as { messages?: unknown } | null)?.messages);
  if (!check.ok) return Response.json({ error: check.message }, { status: 400 });
  const rawId = (body as { conversationId?: unknown } | null)?.conversationId;
  const conversationId = typeof rawId === "string" && UUID.test(rawId) ? rawId : null;

  const runIdFetch = createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(request));
  const provider = createOpenAI({
    baseURL: GATEWAY_URL,
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch.fetch,
  });

  const result = streamText({
    model: provider.responses(MODEL),
    instructions: buildAssistantPrompt(),
    messages: await convertToModelMessages(check.messages),
    abortSignal: request.signal,
    providerOptions: {
      openai: {
        forceReasoning: true,
        reasoningEffort: "low",
        reasoningSummary: "auto",
        store: false,
        include: ["reasoning.encrypted_content"],
      },
    },
  });

  return withLovableAiGatewayRunIdHeader(
    result.toUIMessageStreamResponse({
      originalMessages: check.messages,
      sendReasoning: true,
      onError: describeError,
      onFinish: async ({ messages }) => {
        if (conversationId) await saveConversation(conversationId, messages);
      },
    }),
    runIdFetch,
  );
}
