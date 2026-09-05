import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { organizationMembers } from "@/lib/db/schema";

export async function getPrimaryOrganizationId(userId: string): Promise<string | null> {
  const [row] = await db
    .select({ organizationId: organizationMembers.organizationId })
    .from(organizationMembers)
    .where(eq(organizationMembers.userId, userId));

  return row?.organizationId ?? null;
}
