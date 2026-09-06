import { completeWithNvidia } from "@/lib/ai/providers/nvidia";
import { parsedIntentSchema, type ParsedIntent } from "@/lib/ai/schemas/parsed-intent";
import { outcomeGraphSchema, type OutcomeGraphResult } from "@/lib/ai/schemas/outcome-graph";
import { INTENT_PARSER_SYSTEM_PROMPT } from "@/lib/ai/prompts/intent-parser.v1";
import { OUTCOME_GRAPH_SYSTEM_PROMPT } from "@/lib/ai/prompts/outcome-graph.v1";
import { db } from "@/lib/db/client";
import { aiRuns } from "@/lib/db/schema";

function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  return fenced && fenced[1] ? fenced[1].trim() : text.trim();
}

type StageResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: "validation_failed" | "provider_error"; details?: unknown };

async function runStage<T>(params: {
  stage: string;
  promptVersion: string;
  systemPrompt: string;
  userMessage: string;
  schema: { safeParse: (input: unknown) => { success: boolean; data?: T; error?: unknown } };
  retryContext?: string;
}): Promise<StageResult<T>> {
  const startedAt = Date.now();

  try {
    const userMessage = params.retryContext
      ? `${params.userMessage}\n\n[Your previous response failed validation: ${params.retryContext}. Return ONLY corrected JSON matching the schema exactly.]`
      : params.userMessage;

    const { text, inputTokens, outputTokens } = await completeWithNvidia({
      systemPrompt: params.systemPrompt,
      userMessage,
      maxTokens: 4096,
    });

    const jsonText = extractJson(text);
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(jsonText);
    } catch {
      await logAiRun({ stage: params.stage, promptVersion: params.promptVersion, status: "validation_failed", inputTokens, outputTokens, startedAt, rawResponse: text });
      return { ok: false, error: "validation_failed", details: "Response was not valid JSON" };
    }

    const validated = params.schema.safeParse(parsedJson);
    if (!validated.success) {
      await logAiRun({ stage: params.stage, promptVersion: params.promptVersion, status: "validation_failed", inputTokens, outputTokens, startedAt, rawResponse: text });
      return { ok: false, error: "validation_failed", details: validated.error };
    }

    await logAiRun({ stage: params.stage, promptVersion: params.promptVersion, status: "success", inputTokens, outputTokens, startedAt, rawResponse: text });
    return { ok: true, data: validated.data as T };
  } catch (err) {
    await logAiRun({ stage: params.stage, promptVersion: params.promptVersion, status: "provider_error", inputTokens: null, outputTokens: null, startedAt, rawResponse: String(err) });
    return { ok: false, error: "provider_error", details: err instanceof Error ? err.message : String(err) };
  }
}

async function withOneRetry<T>(
  attempt: (retryContext?: string) => Promise<StageResult<T>>
): Promise<StageResult<T>> {
  const first = await attempt();
  if (first.ok) return first;

  const retryReason =
    first.error === "validation_failed" ? JSON.stringify(first.details).slice(0, 500) : "the request failed";

  return attempt(retryReason);
}

export type ParseResult = StageResult<ParsedIntent>;

export async function parseIntent(rawText: string): Promise<ParseResult> {
  return withOneRetry((retryContext) =>
    runStage({
      stage: "parse",
      promptVersion: "intent-parser.v1",
      systemPrompt: INTENT_PARSER_SYSTEM_PROMPT,
      userMessage: rawText,
      schema: parsedIntentSchema,
      retryContext,
    })
  );
}

export type GraphResult = StageResult<OutcomeGraphResult>;

export async function generateOutcomeGraph(parsedIntent: ParsedIntent): Promise<GraphResult> {
  return withOneRetry((retryContext) =>
    runStage({
      stage: "outcome_graph",
      promptVersion: "outcome-graph.v1",
      systemPrompt: OUTCOME_GRAPH_SYSTEM_PROMPT,
      userMessage: JSON.stringify(parsedIntent),
      schema: outcomeGraphSchema,
      retryContext,
    })
  );
}

async function logAiRun(params: {
  stage: string;
  promptVersion: string;
  status: "success" | "validation_failed" | "provider_error";
  inputTokens: number | null;
  outputTokens: number | null;
  startedAt: number;
  rawResponse: string;
}) {
  try {
    await db.insert(aiRuns).values({
      stage: params.stage,
      provider: "nvidia",
      model: process.env.AI_MODEL_DEFAULT ?? "deepseek-ai/deepseek-v4-flash-0731",
      promptVersion: params.promptVersion,
      inputTokens: params.inputTokens,
      outputTokens: params.outputTokens,
      latencyMs: Date.now() - params.startedAt,
      status: params.status,
      rawResponse: params.rawResponse.slice(0, 10000),
    });
  } catch {
    // Logging failure should never break the actual pipeline call.
  }
}
