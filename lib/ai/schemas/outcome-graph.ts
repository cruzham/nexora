import { z } from "zod";

const leafNodeSchema = z.object({
  label: z.string(),
  goal_description: z.string(),
  metric: z.string(),
  target_value: z.number().nullable(),
  unit: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  assumptions: z.array(z.string()),
  recommended_actions: z.array(z.string()),
});

const leverNodeSchema = leafNodeSchema.extend({
  children: z.array(leafNodeSchema).min(1).max(6),
});

export const outcomeGraphSchema = z.object({
  levers: z.array(leverNodeSchema).min(2).max(6),
});

export type LeafNode = z.infer<typeof leafNodeSchema>;
export type LeverNode = z.infer<typeof leverNodeSchema>;
export type OutcomeGraphResult = z.infer<typeof outcomeGraphSchema>;
