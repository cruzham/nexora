import { completeWithNvidia } from "@/lib/ai/providers/nvidia";
import { parsedIntentSchema, type ParsedIntent } from "@/lib/ai/schemas/parsed-intent";
import { INTENT_PARSER_SYSTEM_PROMPT } from "@/lib/ai/prompts/intent-parser.v1";
import { db } from "@/lib/db/client";
import { aiRuns } from "@/lib/db/schema";

function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  return fenced && fenced[1] ? fenced[1].trim() : text.trim();
}

export type ParseResult =
  | { ok: true; data: ParsedIntent }
  | { ok: false; error: "validation_failed" | "provider_error"; details?: unknown };

async function attemptParse(rawText: string, retryContext?: string): Promise<ParseResult> {
  const startedAt = Date.now();

  try {
    const userMessage = retryContext
      ? `${rawText}\n\n[Your previous response failed validation: ${retryContext}. Return ONLY corrected JSON matching the schema exactly.]`
      : rawText;

    const { text, inputTokens, outputTokens } = await completeWithNvidia({
      systemPrompt: INTENT_PARSER_SYSTEM_PROMPT,
      userMessage,
    });

    const jsonText = extractJson(text);
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(jsonText);
    } catch {
      await logAiRun({ stage: "parse", status: "validation_failed", inputTokens, outputTokens, startedAt, rawResponse: text });
      return { ok: false, error: "validation_failed", details: "Response was not valid JSON" };
    }

    const validated = parsedIntentSchema.safeParse(parsedJson);
    if (!validated.success) {
      await logAiRun({ stage: "parse", status: "validation_failed", inputTokens, outputTokens, startedAt, rawResponse: text });
      return { ok: false, error: "validation_failed", details: validated.error.flatten() };
    }

    await logAiRun({ stage: "parse", status: "success", inputTokens, outputTokens, startedAt, rawResponse: text });
    return { ok: true, data: validated.data };
  } catch (err) {
    await logAiRun({ stage: "parse", status: "provider_error", inputTokens: null, outputTokens: null, startedAt, rawResponse: String(err) });
    return { ok: false, error: "provider_error", details: err instanceof Error ? err.message : String(err) };
  }
}

export async function parseIntent(rawText: string): Promise<ParseResult> {
  const first = await attemptParse(rawText);
  if (first.ok) return first;

  const retryReason =
    first.error === "validation_failed"
      ? JSON.stringify(first.details).slice(0, 500)
      : "the request failed";

  return attemptParse(rawText, retryReason);
}

async function logAiRun(params: {
  stage: string;
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
      model: process.env.AI_MODEL_DEFAULT ?? "nvidia/nemotron-3.5-lightning-30b-a3b",
      promptVersion: "intent-parser.v1",
      inputTokens: params.inputTokens,
      outputTokens: params.outputTokens,
      latencyMs: Date.now() - params.startedAt,
      status: params.status,
      rawResponse: params.rawResponse.slice(0, 10000),
    });
  } catch {
    // Logging failure should never break the actual parse flow.
  }
}
