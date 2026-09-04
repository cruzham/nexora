import { requireUser } from "@/lib/auth/server";

// Placeholder landing spot for a logged-in user with no active intent yet.
// The real Mission Control dashboard (Build Step 8) lives at
// /dashboard/[intentId] and reads the full aggregated intent record.
export default async function DashboardIndexPage() {
  const user = await requireUser();

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="max-w-2xl mx-auto space-y-4">
        <p className="text-xs text-mist font-mono">{user.email}</p>
        <h1 className="font-display text-2xl">No active intents yet</h1>
        <p className="text-mist text-sm">
          Start by stating an outcome you want to accomplish.
        </p>
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
