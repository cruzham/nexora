import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/server";
import { createIntent, listIntentsForOrg } from "@/lib/db/queries/intents";
import { getPrimaryOrganizationId } from "@/lib/db/queries/organizations";

const createIntentSchema = z.object({
  raw_text: z.string().min(10).max(2000),
});

export async function POST(request: Request) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createIntentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const organizationId = await getPrimaryOrganizationId(user.id);
  if (!organizationId) {
    return NextResponse.json({ error: "no_organization" }, { status: 500 });
  }

  const intent = await createIntent({
    organizationId,
    createdBy: user.id,
    rawText: parsed.data.raw_text,
  });

  return NextResponse.json(intent, { status: 201 });
}

export async function GET() {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const organizationId = await getPrimaryOrganizationId(user.id);
  if (!organizationId) {
    return NextResponse.json([], { status: 200 });
  }

  const rows = await listIntentsForOrg(organizationId);
  return NextResponse.json(rows);
}
