import OpenAI from "openai";

let client: OpenAI | null = null;

function getClient() {
  if (!client) {
    const apiKey = process.env.NVIDIA_API_KEY;
    if (!apiKey) {
      throw new Error("NVIDIA_API_KEY is not set");
    }
    client = new OpenAI({
      apiKey,
      baseURL: "https://integrate.api.nvidia.com/v1",
    });
  }
  return client;
}

export async function completeWithNvidia(params: {
  systemPrompt: string;
  userMessage: string;
  model?: string;
  maxTokens?: number;
}): Promise<{ text: string; inputTokens: number | null; outputTokens: number | null }> {
  const model = params.model ?? process.env.AI_MODEL_DEFAULT ?? "nvidia/nemotron-3.5-lightning-30b-a3b";

  const completion = await getClient().chat.completions.create({
    model,
    messages: [
      { role: "system", content: params.systemPrompt },
      { role: "user", content: params.userMessage },
    ],
    temperature: 0.2,
    max_tokens: params.maxTokens ?? 2048,
  });

  const text = completion.choices[0]?.message?.content ?? "";

  return {
    text,
    inputTokens: completion.usage?.prompt_tokens ?? null,
    outputTokens: completion.usage?.completion_tokens ?? null,
  };
}
