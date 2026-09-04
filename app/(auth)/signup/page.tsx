"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserSupabaseClient } from "@/lib/auth/client";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // If email confirmation is required, there's no session yet.
    if (!data.session) {
      setCheckEmail(true);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  if (checkEmail) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6">
        <div className="max-w-sm text-center space-y-2">
          <h1 className="font-display text-2xl">Check your email</h1>
          <p className="text-mist text-sm">
            We sent a confirmation link to {email}. Follow it to finish
            creating your account.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-5">
        <h1 className="font-display text-2xl">Create your account</h1>

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
            minLength={8}
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
          {loading ? "Creating account…" : "Sign up"}
        </button>

        <p className="text-xs text-mist text-center">
          Already have an account?{" "}
          <Link href="/login" className="text-white underline underline-offset-2">
            Log in
          </Link>
        </p>
      </form>
    </main>
  );
}
