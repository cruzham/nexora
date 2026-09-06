import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { requireUser } from "@/lib/auth/server";
import { getIntentById } from "@/lib/db/queries/intents";
import { getPrimaryOrganizationId } from "@/lib/db/queries/organizations";
import { generateOutcomeGraph } from "@/lib/ai/pipeline";
import { saveOutcomeGraph, getOutcomeNodesForIntent, deleteOutcomeGraphForIntent } from "@/lib/db/queries/outcome-nodes";
import { db } from "@/lib/db/client";
import { intents } from "@/lib/db/schema";
import type { ParsedIntent } from "@/lib/ai/schemas/parsed-intent";

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const organizationId = await getPrimaryOrganizationId(user.id);
  if (!organizationId) {
    return NextResponse.json({ error: "no_organization" }, { status: 500 });
  }

  const intent = await getIntentById(params.id, organizationId);
  if (!intent) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (!intent.parsedIntent) {
    return NextResponse.json({ error: "not_parsed_yet" }, { status: 400 });
  }

  const parsed = intent.parsedIntent as ParsedIntent;
  if (parsed.needs_clarification) {
    return NextResponse.json({ error: "needs_clarification" }, { status: 400 });
  }

  const result = await generateOutcomeGraph(parsed);
  if (!result.ok) {
    return NextResponse.json(
      { error: "ai_validation_failed", stage: "outcome_graph", details: result.details },
      { status: 502 }
    );
  }

  await deleteOutcomeGraphForIntent(params.id);

  await saveOutcomeGraph({
    intentId: params.id,
    root: {
      label: parsed.objective,
      goalDescription: parsed.objective,
      metric: parsed.target.metric,
      targetValue: parsed.target.value,
      unit: parsed.target.unit,
      deadline: parsed.deadline.resolved_date,
    },
    levers: result.data.levers,
  });

  await db
    .update(intents)
    .set({ status: "graph_ready", updatedAt: new Date() })
    .where(and(eq(intents.id, params.id), eq(intents.organizationId, organizationId)));

  const nodes = await getOutcomeNodesForIntent(params.id);
  return NextResponse.json({ nodes });
}

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const organizationId = await getPrimaryOrganizationId(user.id);
  if (!organizationId) {
    return NextResponse.json({ error: "no_organization" }, { status: 500 });
  }

  const intent = await getIntentById(params.id, organizationId);
  if (!intent) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const nodes = await getOutcomeNodesForIntent(params.id);
  return NextResponse.json({ nodes });
}
