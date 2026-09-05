import { z } from "zod";

export const parsedIntentSchema = z.object({
  objective: z.string(),
  objective_type: z.enum([
    "acquisition",
    "revenue",
    "engagement",
    "operational",
    "other",
  ]),
  target: z.object({
    metric: z.string(),
    value: z.number().nullable(),
    unit: z.string().nullable(),
  }),
  deadline: z.object({
    raw: z.string().nullable(),
    resolved_date: z.string().nullable(),
    duration_days: z.number().nullable(),
  }),
  budget: z.object({
    amount: z.number().nullable(),
    currency: z.string(),
  }),
  geography: z.array(z.string()).nullable(),
  constraints: z.array(z.string()),
  resources: z.array(z.string()),
  assumptions: z.array(z.string()),
  unknowns: z.array(z.string()),
  success_criteria: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  needs_clarification: z.boolean(),
  clarification_questions: z.array(z.string()),
});

export type ParsedIntent = z.infer<typeof parsedIntentSchema>;
