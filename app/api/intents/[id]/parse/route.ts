import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { requireUser } from "@/lib/auth/server";
import { getIntentById } from "@/lib/db/queries/intents";
import { getPrimaryOrganizationId } from "@/lib/db/queries/organizations";
import { parseIntent } from "@/lib/ai/pipeline";
import { db } from "@/lib/db/client";
import { intents } from "@/lib/db/schema";

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

  const result = await parseIntent(intent.rawText);

  if (!result.ok) {
    return NextResponse.json(
      { error: "ai_validation_failed", stage: "parse", details: result.details },
      { status: 502 }
    );
  }

  const newStatus = result.data.needs_clarification ? "needs_clarification" : "parsed";

  const [updated] = await db
    .update(intents)
    .set({
      parsedIntent: result.data,
      parseConfidence: String(result.data.confidence),
      status: newStatus,
      updatedAt: new Date(),
    })
    .where(and(eq(intents.id, params.id), eq(intents.organizationId, organizationId)))
    .returning();

  return NextResponse.json(updated);
}
