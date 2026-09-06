export async function completeWithNvidia(params: {
  systemPrompt: string;
  userMessage: string;
  model?: string;
  maxTokens?: number;
}): Promise<{ text: string; inputTokens: number | null; outputTokens: number | null }> {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    throw new Error("NVIDIA_API_KEY is not set");
  }

  const model = params.model ?? process.env.AI_MODEL_DEFAULT ?? "nvidia/nemotron-3.5-lightning-30b-a3b";

  const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: params.systemPrompt },
        { role: "user", content: params.userMessage },
      ],
      temperature: 0.2,
      max_tokens: params.maxTokens ?? 2048,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`NVIDIA API error ${res.status}: ${body.slice(0, 300)}`);
  }

  const json = await res.json();
  const text = json.choices?.[0]?.message?.content ?? "";

  return {
    text,
    inputTokens: json.usage?.prompt_tokens ?? null,
    outputTokens: json.usage?.completion_tokens ?? null,
  };
}
