import { NextResponse } from "next/server";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { requireUser } from "@/lib/auth/server";
import { getIntentById } from "@/lib/db/queries/intents";
import { getPrimaryOrganizationId } from "@/lib/db/queries/organizations";
import { db } from "@/lib/db/client";
import { intents } from "@/lib/db/schema";

const patchSchema = z.object({
  raw_text: z.string().min(10).max(2000),
});

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

  return NextResponse.json(intent);
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
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

  const existing = await getIntentById(params.id, organizationId);
  if (!existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request", details: parsed.error.flatten() }, { status: 400 });
  }

  const [updated] = await db
    .update(intents)
    .set({ rawText: parsed.data.raw_text, status: "draft", updatedAt: new Date() })
    .where(and(eq(intents.id, params.id), eq(intents.organizationId, organizationId)))
    .returning();

  return NextResponse.json(updated);
}
