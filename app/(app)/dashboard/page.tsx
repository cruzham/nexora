import { requireUser } from "@/lib/auth/server";
import { getPrimaryOrganizationId } from "@/lib/db/queries/organizations";
import { listIntentsForOrg } from "@/lib/db/queries/intents";

export default async function DashboardIndexPage() {
  const user = await requireUser();
  const organizationId = await getPrimaryOrganizationId(user.id);
  const intents = organizationId ? await listIntentsForOrg(organizationId) : [];

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="max-w-2xl mx-auto space-y-6">
        <p className="text-xs text-mist font-mono">{user.email}</p>

        {intents.length === 0 ? (
          <>
            <h1 className="font-display text-2xl">No active intents yet</h1>
            <p className="text-mist text-sm">
              Start by stating an outcome you want to accomplish.
            </p>
          </>
        ) : (
          <>
            <h1 className="font-display text-2xl">Your intents</h1>
            <ul className="space-y-3">
              {intents.map((intent) => (
                <li
                  key={intent.id}
                  className="rounded-node bg-graphite border border-steel px-4 py-3"
                >
                  <p className="text-sm">{intent.rawText}</p>
                  <p className="text-xs text-mist mt-1 font-mono">
                    {intent.status}
                  </p>
                </li>
              ))}
            </ul>
          </>
        )}

        <a
          href="/intents/new"
          className="inline-block rounded-node bg-signal text-void font-medium px-4 py-2 text-sm"
        >
          New intent
        </a>
      </div>
    </main>
  );
}
