import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { intents, outcomeNodes, strategies } from "@/lib/db/schema";

export async function createIntent(params: {
  organizationId: string;
  createdBy: string;
  rawText: string;
}) {
  const [row] = await db
    .insert(intents)
    .values({
      organizationId: params.organizationId,
      createdBy: params.createdBy,
      rawText: params.rawText,
    })
    .returning();
  return row;
}

export async function getIntentById(intentId: string, organizationId: string) {
  const [row] = await db
    .select()
    .from(intents)
    .where(and(eq(intents.id, intentId), eq(intents.organizationId, organizationId)));
  return row ?? null;
}

export async function listIntentsForOrg(organizationId: string) {
  return db.select().from(intents).where(eq(intents.organizationId, organizationId));
}

export async function getIntentWithGraphAndStrategies(
  intentId: string,
  organizationId: string
) {
  const intent = await getIntentById(intentId, organizationId);
  if (!intent) return null;

  const nodes = await db
    .select()
    .from(outcomeNodes)
    .where(eq(outcomeNodes.intentId, intentId));

  const intentStrategies = await db
    .select()
    .from(strategies)
    .where(eq(strategies.intentId, intentId));

  return { intent, nodes, strategies: intentStrategies };
}
