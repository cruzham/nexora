"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserSupabaseClient } from "@/lib/auth/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-5">
        <h1 className="font-display text-2xl">Log in</h1>

        <div className="space-y-1">
          <label htmlFor="email" className="text-xs text-mist">Email</label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-node bg-graphite border border-steel px-3 py-2 text-sm"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="password" className="text-xs text-mist">Password</label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-node bg-graphite border border-steel px-3 py-2 text-sm"
          />
        </div>

        {error && <p className="text-rose text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-node bg-signal text-void font-medium px-4 py-2 disabled:opacity-50"
        >
          {loading ? "Logging in…" : "Log in"}
        </button>

        <p className="text-xs text-mist text-center">
          No account?{" "}
          <Link href="/signup" className="text-white underline underline-offset-2">
            Sign up
          </Link>
        </p>
      </form>
    </main>
  );
}
