# NEXORA — Month 1 MVP scaffold

This is the Step 1 (project setup) + Step 2 (authentication) scaffold from
the NEXORA PRD's build order. It's real source, not a mockup — but it was
written in a sandbox with no network access, so it has **not** been
`npm install`'d or run. Do that first, locally.

## Get it running

```bash
npm install
cp .env.example .env.local
```

Fill in `.env.local`:
- Create a Supabase project. Copy the URL, anon key, and service role key
  into `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`.
- Copy the Postgres connection string into `DATABASE_URL`.
- Add an `ANTHROPIC_API_KEY` (or your provider of choice).

Apply the migration in `supabase/migrations/0001_users_mirror.sql` via the
Supabase SQL editor or the Supabase CLI. This creates `users`,
`organizations`, `organization_members`, a trigger that provisions a
personal org on signup, and RLS policies scoping each user to their own
rows.

```bash
npm run dev
```

Visit `http://localhost:3000`. You should be able to:
1. Land on the landing page.
2. Sign up → get redirected to `/dashboard` (or see "check your email" if
   your Supabase project requires email confirmation).
3. Log out and try visiting `/dashboard` directly → redirected to `/login`.
4. Log back in → land on `/dashboard`.

That's Step 1 + Step 2's definition of done from the PRD.

## What's here vs. what's next

Present:
- Next.js App Router + TypeScript + Tailwind, configured per the PRD's
  design tokens (`tailwind.config.ts`).
- Supabase Auth wired end to end: browser client, server client,
  middleware-based session refresh and route protection, RLS-backed
  `users`/`organizations` tables provisioned automatically on signup.

Not yet built (see PRD Sections 17–18 for the order): the `intents`,
`outcome_nodes`, and `strategies` tables and Drizzle schema (Step 3); the
intent input UI and parser pipeline (Steps 4–5); the Outcome Graph and
Strategy Generator (Steps 6–7); the real Mission Control dashboard (Step 8).

Full spec: see `NEXORA_PRD.md` alongside this project.
