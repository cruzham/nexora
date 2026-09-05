"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type ParsedIntent = {
  objective: string;
  objective_type: string;
  target: { metric: string; value: number | null; unit: string | null };
  deadline: { raw: string | null; resolved_date: string | null; duration_days: number | null };
  budget: { amount: number | null; currency: string };
  geography: string[] | null;
  constraints: string[];
  resources: string[];
  assumptions: string[];
  unknowns: string[];
  success_criteria: string[];
  confidence: number;
  needs_clarification: boolean;
  clarification_questions: string[];
};

type Intent = {
  id: string;
  rawText: string;
  status: string;
  parsedIntent: ParsedIntent | null;
};

export default function ReviewIntentPage() {
  const params = useParams<{ id: string }>();
  const [intent, setIntent] = useState<Intent | null>(null);
  const [loading, setLoading] = useState(true);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clarificationText, setClarificationText] = useState("");

  async function loadIntent() {
    const res = await fetch(`/api/intents/${params.id}`);
    if (res.ok) {
      setIntent(await res.json());
    }
    setLoading(false);
  }

  async function triggerParse() {
    setParsing(true);
    setError(null);
    try {
      const res = await fetch(`/api/intents/${params.id}/parse`, { method: "POST" });
      if (!res.ok) {
        throw new Error("We couldn't generate that -- try again.");
      }
      setIntent(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setParsing(false);
    }
  }

  useEffect(() => {
    loadIntent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (intent && intent.status === "draft") {
      triggerParse();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intent?.status]);

  async function handleAddDetail() {
    if (!clarificationText.trim()) return;
    setParsing(true);
    setError(null);
    try {
      const updated = intent!.rawText + "\n\n" + clarificationText.trim();
      const patchRes = await fetch(`/api/intents/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw_text: updated }),
      });
      if (!patchRes.ok) throw new Error("Couldn't save that -- try again.");
      setIntent(await patchRes.json());
      setClarificationText("");
      await triggerParse();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setParsing(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen px-6 py-12">
        <p className="text-mist text-sm">Loading…</p>
      </main>
    );
  }

  if (!intent) {
    return (
      <main className="min-h-screen px-6 py-12">
        <p className="text-rose text-sm">Intent not found.</p>
      </main>
    );
  }

  const p = intent.parsedIntent;

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="max-w-xl mx-auto space-y-6">
        <Link href="/dashboard" className="text-xs text-mist underline underline-offset-2">
          ← Back
        </Link>

        <div>
          <p className="text-xs text-mist uppercase tracking-wide">Original objective</p>
          <p className="text-sm mt-1">{intent.rawText}</p>
        </div>

        {parsing && <p className="text-signal text-sm">Reading your objective…</p>}
        {error && <p className="text-rose text-sm">{error}</p>}

        {p && !parsing && (
          <div className="space-y-5">
            <div className="rounded-node bg-graphite border border-steel px-4 py-3 space-y-2">
              <p className="text-sm">{p.objective}</p>
              <div className="grid grid-cols-2 gap-3 text-xs text-mist">
                <div>
                  <p className="uppercase tracking-wide">Target</p>
                  <p className="text-white">
                    {p.target.value != null ? `${p.target.value} ${p.target.unit ?? ""}` : "Not specified"}{" "}
                    {p.target.metric}
                  </p>
                </div>
                <div>
                  <p className="uppercase tracking-wide">Deadline</p>
                  <p className="text-white">{p.deadline.raw ?? "Not specified"}</p>
                </div>
                <div>
                  <p className="uppercase tracking-wide">Budget</p>
                  <p className="text-white">
                    {p.budget.amount != null ? `${p.budget.amount} ${p.budget.currency}` : "Not specified"}
                  </p>
                </div>
                <div>
                  <p className="uppercase tracking-wide">Confidence</p>
                  <p className="text-white">{Math.round(p.confidence * 100)}%</p>
                </div>
              </div>
            </div>

            {p.constraints.length > 0 && (
              <div>
                <p className="text-xs text-mist uppercase tracking-wide mb-1">Constraints</p>
                <ul className="text-sm space-y-1">
                  {p.constraints.map((c, i) => <li key={i}>• {c}</li>)}
                </ul>
              </div>
            )}

            {p.assumptions.length > 0 && (
              <div>
                <p className="text-xs text-amber uppercase tracking-wide mb-1">Assumptions</p>
                <ul className="text-sm space-y-1">
                  {p.assumptions.map((a, i) => <li key={i}>• {a}</li>)}
                </ul>
              </div>
            )}

            {p.needs_clarification && p.clarification_questions.length > 0 && (
              <div className="rounded-node border border-amber/40 bg-amber/10 px-4 py-3 space-y-3">
                <p className="text-xs text-amber uppercase tracking-wide">
                  A bit more detail would help
                </p>
                <ul className="text-sm space-y-1">
                  {p.clarification_questions.map((q, i) => <li key={i}>• {q}</li>)}
                </ul>
                <textarea
                  value={clarificationText}
                  onChange={(e) => setClarificationText(e.target.value)}
                  rows={3}
                  placeholder="Add the missing details here…"
                  className="w-full rounded-node bg-graphite border border-steel px-3 py-2 text-sm resize-none"
                />
                <button
                  onClick={handleAddDetail}
                  disabled={!clarificationText.trim() || parsing}
                  className="rounded-node bg-signal text-void font-medium px-4 py-2 text-sm disabled:opacity-40"
                >
                  Add details & re-parse
                </button>
              </div>
            )}

            {!p.needs_clarification && (
              <div className="space-y-2">
                <p className="text-xs text-mist">
                  Outcome Graph and Strategy generation come next (Steps 6-7 -- not built yet).
                </p>
                <button
                  disabled
                  className="w-full rounded-node bg-signal text-void font-medium px-4 py-3 opacity-40 cursor-not-allowed"
                >
                  Continue to Outcome Graph
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
