"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const MIN_LENGTH = 10;
const MAX_LENGTH = 2000;

export default function NewIntentPage() {
  const router = useRouter();
  const [rawText, setRawText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const remaining = MAX_LENGTH - rawText.length;
  const tooShort = rawText.trim().length > 0 && rawText.trim().length < MIN_LENGTH;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (rawText.trim().length < MIN_LENGTH) {
      setError(`Say a bit more -- at least ${MIN_LENGTH} characters.`);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/intents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw_text: rawText.trim() }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Something went wrong");
      }

      const intent = await res.json();
      router.push(`/dashboard?created=${intent.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="max-w-xl mx-auto space-y-6">
        <div>
          <Link href="/dashboard" className="text-xs text-mist underline underline-offset-2">
            ← Back
          </Link>
        </div>

        <h1 className="font-display text-2xl">What do you want to accomplish?</h1>
        <p className="text-mist text-sm">
          Say the outcome in your own words -- include a target number,
          deadline, or budget if you have one. NEXORA will ask if anything
          important is missing.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            maxLength={MAX_LENGTH}
            rows={6}
            placeholder="e.g. Get my app to 1,000 users in 30 days with a $500 budget."
            className="w-full rounded-node bg-graphite border border-steel px-3 py-3 text-sm resize-none"
          />

          <div className="flex justify-between text-xs text-mist">
            <span className={tooShort ? "text-amber" : ""}>
              {tooShort ? `At least ${MIN_LENGTH} characters` : "\u00A0"}
            </span>
            <span>{remaining} left</span>
          </div>

          {error && <p className="text-rose text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading || rawText.trim().length < MIN_LENGTH}
            className="w-full rounded-node bg-signal text-void font-medium px-4 py-3 disabled:opacity-40"
          >
            {loading ? "Saving…" : "Continue"}
          </button>
        </form>
      </div>
    </main>
  );
}
