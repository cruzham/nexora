import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { outcomeNodes } from "@/lib/db/schema";
import type { LeverNode, LeafNode } from "@/lib/ai/schemas/outcome-graph";

export async function saveOutcomeGraph(params: {
  intentId: string;
  root: {
    label: string;
    goalDescription: string | null;
    metric: string;
    targetValue: number | null;
    unit: string | null;
    deadline: string | null;
  };
  levers: LeverNode[];
}) {
  const rootRows = await db
    .insert(outcomeNodes)
    .values({
      intentId: params.intentId,
      parentId: null,
      label: params.root.label,
      goalDescription: params.root.goalDescription,
      metric: params.root.metric,
      targetValue: params.root.targetValue?.toString() ?? null,
      unit: params.root.unit,
      deadline: params.root.deadline,
      sortOrder: 0,
    })
    .returning();
  const rootRow = rootRows[0];
  if (!rootRow) throw new Error("Failed to create root outcome node");

  let leverIndex = 0;
  for (const lever of params.levers) {
    const leverRows = await db
      .insert(outcomeNodes)
      .values({
        intentId: params.intentId,
        parentId: rootRow.id,
        label: lever.label,
        goalDescription: lever.goal_description,
        metric: lever.metric,
        targetValue: lever.target_value?.toString() ?? null,
        unit: lever.unit,
        confidence: lever.confidence.toString(),
        assumptions: lever.assumptions,
        recommendedActions: lever.recommended_actions,
        sortOrder: leverIndex,
      })
      .returning();
    const leverRow = leverRows[0];
    if (!leverRow) throw new Error("Failed to create lever outcome node");

    let leafIndex = 0;
    for (const leaf of lever.children as LeafNode[]) {
      await db.insert(outcomeNodes).values({
        intentId: params.intentId,
        parentId: leverRow.id,
        label: leaf.label,
        goalDescription: leaf.goal_description,
        metric: leaf.metric,
        targetValue: leaf.target_value?.toString() ?? null,
        unit: leaf.unit,
        confidence: leaf.confidence.toString(),
        assumptions: leaf.assumptions,
        recommendedActions: leaf.recommended_actions,
        sortOrder: leafIndex,
      });
      leafIndex++;
    }
    leverIndex++;
  }

  return rootRow.id;
}

export async function getOutcomeNodesForIntent(intentId: string) {
  return db.select().from(outcomeNodes).where(eq(outcomeNodes.intentId, intentId));
}

export async function deleteOutcomeGraphForIntent(intentId: string) {
  await db.delete(outcomeNodes).where(eq(outcomeNodes.intentId, intentId));
}
