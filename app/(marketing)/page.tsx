import Link from "next/link";

// Landing page -- deliberately restrained for Month 1. The signature move is
// the input itself: the hero IS the intent box, not a headline describing
// the intent box. Full visual pass happens alongside Step 4 (Intent Input UI)
// once the real product surface exists to design around.

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-xl text-center space-y-8">
        <p className="text-xs tracking-[0.2em] text-mist uppercase font-mono">
          Intent OS
        </p>
        <h1 className="font-display text-4xl md:text-5xl leading-tight">
          What do you want to accomplish?
        </h1>
        <p className="text-mist text-sm max-w-md mx-auto">
          Say the outcome. NEXORA structures it, breaks it down, and gives you
          a strategy to get there.
        </p>

        <Link
          href="/signup"
          className="inline-block rounded-node bg-signal text-void font-medium px-6 py-3 hover:opacity-90 transition-opacity"
        >
          Start an intent
        </Link>

        <p className="text-xs text-mist">
          Already have an account?{" "}
          <Link href="/login" className="text-white underline underline-offset-2">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
