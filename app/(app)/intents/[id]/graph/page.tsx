"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type OutcomeNode = {
  id: string;
  parentId: string | null;
  label: string;
  goalDescription: string | null;
  metric: string;
  targetValue: string | null;
  unit: string | null;
  confidence: string | null;
  assumptions: unknown;
  recommendedActions: unknown;
  sortOrder: number;
};

export default function OutcomeGraphPage() {
  const params = useParams<{ id: string }>();
  const [nodes, setNodes] = useState<OutcomeNode[] | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadNodes() {
    const res = await fetch(`/api/intents/${params.id}/graph`);
    if (res.ok) {
      const body = await res.json();
      setNodes(body.nodes);
    }
  }

  async function generate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/intents/${params.id}/graph`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          body.error === "needs_clarification"
            ? "This intent still needs clarification -- go back and answer the questions first."
            : "We couldn't generate that -- try again."
        );
      }
      const body = await res.json();
      setNodes(body.nodes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setGenerating(false);
    }
  }

  useEffect(() => {
    loadNodes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const root = nodes?.find((n) => n.parentId === null);
  const levers = nodes?.filter((n) => n.parentId === root?.id).sort((a, b) => a.sortOrder - b.sortOrder) ?? [];

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="max-w-xl mx-auto space-y-6">
        <Link href={`/intents/${params.id}/review`} className="text-xs text-mist underline underline-offset-2">
          ← Back
        </Link>

        <h1 className="font-display text-2xl">Outcome Graph</h1>

        {error && <p className="text-rose text-sm">{error}</p>}

        {!nodes || nodes.length === 0 ? (
          <div className="space-y-3">
            <p className="text-mist text-sm">
              Break this objective into the major levers and measurable sub-goals that drive it.
            </p>
            <button
              onClick={generate}
              disabled={generating}
              className="rounded-node bg-signal text-void font-medium px-4 py-3 text-sm disabled:opacity-40"
            >
              {generating ? "Building graph…" : "Generate Outcome Graph"}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {root && (
              <div className="rounded-node bg-graphite border border-steel px-4 py-3">
                <p className="text-xs text-mist uppercase tracking-wide">Objective</p>
                <p className="text-sm mt-1">{root.label}</p>
              </div>
            )}

            {levers.map((lever) => {
              const children = nodes
                .filter((n) => n.parentId === lever.id)
                .sort((a, b) => a.sortOrder - b.sortOrder);

              return (
                <div key={lever.id} className="rounded-node border border-steel px-4 py-3 space-y-2">
                  <div className="flex justify-between items-start">
                    <p className="text-sm font-medium">{lever.label}</p>
                    {lever.confidence && (
                      <span className="text-xs text-mist">{Math.round(Number(lever.confidence) * 100)}%</span>
                    )}
                  </div>
                  <p className="text-xs text-mist">{lever.metric}</p>

                  <ul className="space-y-1 pl-3 border-l border-steel">
                    {children.map((leaf) => (
                      <li key={leaf.id} className="text-sm">
                        <span>{leaf.label}</span>
                        <span className="text-xs text-mist ml-2">
                          {leaf.targetValue ? `${leaf.targetValue} ${leaf.unit ?? ""}` : leaf.metric}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}

            <button
              onClick={generate}
              disabled={generating}
              className="text-xs text-mist underline underline-offset-2 disabled:opacity-40"
            >
              {generating ? "Regenerating…" : "Regenerate graph"}
            </button>

            <div className="pt-2">
              <p className="text-xs text-mist mb-2">
                Strategy generation comes next (Step 7 -- not built yet).
              </p>
              <button
                disabled
                className="w-full rounded-node bg-signal text-void font-medium px-4 py-3 opacity-40 cursor-not-allowed"
              >
                Continue to Strategies
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
