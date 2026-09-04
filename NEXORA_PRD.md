# NEXORA — Month 1 MVP Product Requirements Document

**Product:** INTENT OS
**Core Technology:** REALITY ENGINE
**Core Promise:** *Turn human intent into measurable outcomes.*
**Scope of this PRD:** Month 1 MVP only — Intent Input → Intent Parser → Outcome Graph → Strategy Generator → Dashboard. No autonomous execution.

---

## 1. Product Vision

### What NEXORA is
NEXORA is an intent-driven computing company. Instead of a user learning an application's workflows, the user states an outcome they want, and NEXORA's software does the work of translating that outcome into a structured plan, a set of measurable sub-goals, and a recommended path to get there.

### What INTENT OS is
INTENT OS is the product surface — the interface where a person or team states an objective and receives back a structured plan, a visual decomposition of that plan (the Outcome Graph), a set of competing strategies with tradeoffs, and a dashboard to track progress against reality.

### What REALITY ENGINE is
REALITY ENGINE is the underlying reasoning system. In the full vision, it doesn't just plan — it observes what actually happened in the world, compares it to what was predicted, and recompiles the strategy. In the Month 1 MVP, REALITY ENGINE is deliberately reduced to its planning core: intent parsing, decomposition, and strategy generation. Observation, execution, and recompilation are explicitly out of scope (see Section 17).

### The problem it solves
Most software requires the user to already know the steps. Project management tools, marketing tools, and even most "AI agent" products assume the user has already broken their goal into tasks. Most people haven't — they know the *outcome* they want, not the plan. NEXORA's job is to do that decomposition well, transparently, and with explicit tracking of what's known, assumed, and unknown.

### Why this isn't a normal AI chatbot or agent
A chatbot answers questions. An "AI agent" product typically executes a fixed workflow or takes autonomous actions on tools. NEXORA is neither:
- It produces a **persistent, structured artifact** (the Outcome Graph) rather than a transient answer.
- It is explicit about **epistemic status** — every number is tagged as fact, assumption, prediction, or inference (this shows up starting in Phase 3, but the parser lays the groundwork in Month 1 by separating "known" from "assumed" from "unknown").
- It generates **competing strategies with tradeoffs**, not a single answer, and explains its recommendation.
- It is architected around a **permission boundary** between "the AI can plan and recommend" and "the AI can act in the world" — the MVP never crosses that boundary.

### The long-term moonshot
A new computing paradigm where humans communicate with computers primarily through stated intent rather than through applications — where the system assembles whatever software, data, and (eventually, permissioned) actions are needed to pursue a goal, while continuously measuring reality and adapting the plan. The Month 1 MVP is the first six inches of that: prove the loop **Intent → Structure → Decompose → Strategize → Recommend → Display** works reliably on real objectives before anything autonomous is added.

---

## 2. Month 1 MVP — Exact Scope

### In scope
1. A user can type a free-text objective (e.g., *"Get my app to 1,000 users in 30 days with a $500 budget"*).
2. The system parses it into structured data: objective, target, deadline, budget, geography, constraints, resources, assumptions, unknowns, success criteria.
3. If critical fields are missing or ambiguous, the system asks clarifying questions before proceeding.
4. The system decomposes the objective into an **Outcome Graph** — a tree/DAG of measurable sub-goals.
5. The system generates **2–4 candidate strategies**, each with cost, expected outcome range, timeline, risks, and confidence, and recommends one with a stated rationale.
6. The user selects (or edits) a strategy.
7. The system displays a **Mission Control dashboard**: objective, progress placeholder (0% at creation — no live tracking yet), deadline, budget, Outcome Graph, selected strategy, and a static execution roadmap.
8. All AI output is validated against a schema before being shown to the user; invalid output triggers a retry, not a broken UI.

### Explicitly out of scope for Month 1
- Any autonomous action (sending messages, spending money, publishing, deploying).
- Live observation/metrics ingestion from external systems.
- The Recompiler.
- Experiments.
- Multi-user/team collaboration (single-user accounts only).
- Payments (architecture should allow it later; no billing UI now).
- Integrations with third-party tools.

### Definition of "it works"
A user can go from a one-sentence objective to a reviewed, editable, persisted plan with a recommended strategy and a dashboard — end to end, in under 3 minutes, without the flow breaking on ambiguous or incomplete input.

---

## 3. User Flow

```
Landing Page
    │
    ▼
Sign up / Log in (Supabase Auth)
    │
    ▼
Create Intent
  "What do you want to accomplish?"
  + optional structured fields (deadline, budget, geography)
    │
    ▼
Parse Intent (AI call, streaming/loading state)
    │
    ▼
Clarification Step (conditional)
  Shown only if the parser flags required-but-missing fields
  or low-confidence interpretations
    │
    ▼
Review Structured Intent
  Editable summary: objective, target, deadline, budget,
  constraints, assumptions, unknowns
  [Confirm & Continue]
    │
    ▼
Outcome Graph Generation (AI call)
    │
    ▼
Review Outcome Graph
  Visual tree, each node expandable/editable
  [Generate Strategies]
    │
    ▼
Strategy Generation (AI call)
    │
    ▼
Strategy Comparison
  2–4 strategy cards side by side, one marked "Recommended"
  with a written rationale
    │
    ▼
Strategy Selection
  User picks one (or requests regeneration with feedback)
    │
    ▼
Mission Control Dashboard
  Persisted view of the full plan
```

Each AI-call step must have a visible loading state and a graceful failure state (see Section 16).

---

## 4. Intent Parser

### Input
Free-text objective, plus any optional structured fields the user filled in directly (deadline, budget, geography), which are treated as **already-known** and passed to the model as constraints rather than re-inferred.

### Output schema (`ParsedIntent`)

```typescript
interface ParsedIntent {
  objective: string;              // normalized restatement of the goal
  objective_type: "acquisition" | "revenue" | "engagement" | "operational" | "other";
  target: {
    metric: string;               // e.g. "signed-up users"
    value: number | null;
    unit: string | null;
  };
  deadline: {
    raw: string | null;           // as stated by user
    resolved_date: string | null; // ISO date, resolved server-side using current date
    duration_days: number | null;
  };
  budget: {
    amount: number | null;
    currency: string;             // default "USD" unless inferable
  };
  geography: string[] | null;
  constraints: string[];          // e.g. "mobile-first"
  resources: string[];            // things the user says they already have
  assumptions: string[];          // things the parser assumed to fill gaps
  unknowns: string[];             // information needed but not provided
  success_criteria: string[];     // how the user will know they succeeded
  confidence: number;             // 0-1, model's confidence in this parse
  needs_clarification: boolean;
  clarification_questions: string[]; // only populated if needs_clarification
}
```

### Rules
- The parser must never silently invent a number for `target.value`, `budget.amount`, or `deadline.resolved_date` — if not stated or clearly implied, it goes to `unknowns`, not into the field.
- `assumptions` is for soft inferences the system is comfortable proceeding with (e.g., "assumes app already exists in an app store"); `unknowns` is for things that materially change the plan and block clarification.
- If `needs_clarification` is true, the UI blocks progression to the Outcome Graph until answered (or the user explicitly chooses "proceed anyway," which converts the unknowns into logged assumptions).
- Every parse is stored verbatim (raw text + structured output) for auditability and future eval.

---

## 5. Outcome Graph

### Purpose
Break one objective into a small number of measurable sub-goals whose combined achievement constitutes the objective, with explicit dependencies between them.

### Data structure (`OutcomeNode`)

```typescript
interface OutcomeNode {
  id: string;
  intent_id: string;
  parent_id: string | null;       // null for root node (the objective itself)
  label: string;                  // e.g. "Traffic", "Conversion", "Retention"
  goal_description: string;
  metric: string;                 // e.g. "landing page visitors"
  target_value: number | null;
  current_value: number | null;   // null in MVP (no live data); user can manually set
  unit: string | null;
  deadline: string | null;        // inherits from parent if not overridden
  dependencies: string[];         // ids of nodes this depends on
  confidence: number;             // model's confidence this node is well-formed
  assumptions: string[];
  recommended_actions: string[];  // short, non-binding suggestions, not tasks yet
  order: number;                  // display order among siblings
}
```

### Generation rules
- Root node = the objective itself.
- Depth is capped at **3 levels** for Month 1 (objective → major levers → sub-levers) to keep the graph readable and the AI call reliable.
- Aim for **3–6 children per level** — enough to be useful, few enough to review in one screen.
- Every leaf node must have a `metric` — nodes without a measurable metric are a validation failure and trigger regeneration of that branch.

### UI
- Rendered as a collapsible tree (desktop) / accordion (mobile).
- Each node is click-to-expand, shows target/current/deadline/confidence, and is editable (label, target, deadline) before the user proceeds — edits are saved and re-used as constraints for strategy generation.
- A "Regenerate this branch" action lets the user re-roll a single node's children without discarding the rest of the graph.

---

## 6. Strategy Generator

### Input
The confirmed `ParsedIntent` + the (possibly user-edited) Outcome Graph.

### Output schema (`Strategy`)

```typescript
interface Strategy {
  id: string;
  intent_id: string;
  name: string;                    // e.g. "Creator Partnerships"
  description: string;
  approach_summary: string;        // 1-2 sentences
  required_resources: string[];
  estimated_cost: { min: number; max: number; currency: string };
  expected_outcome: { metric: string; min: number; max: number };
  timeline_days: number;
  risks: { description: string; severity: "low" | "medium" | "high" }[];
  assumptions: string[];
  confidence: number;
  tradeoffs: string;                // what you give up choosing this vs. others
  is_recommended: boolean;
  recommendation_rationale: string | null; // only set on the recommended strategy
}
```

### Rules
- Generate **2–4 strategies**, spanning meaningfully different approaches (not 3 variations of the same idea) — e.g., organic/low-cost, partnership/mid-cost, paid/high-cost, as in the founder's own sketch.
- Exactly one strategy is marked `is_recommended: true`. The rationale must reference the user's actual constraints (budget, deadline, risk tolerance if stated) — not a generic "this is best."
- Cost ranges must not exceed the user's stated budget for any strategy presented as viable within budget; if no strategy fits the stated budget, the system must say so explicitly rather than silently exceeding it.
- If the user rejects the recommendation and asks to regenerate with feedback (e.g., "lower risk please"), that feedback is passed back into a new generation call, not just re-randomized.

### UI
- Side-by-side comparison cards, recommended one visually distinguished (not hidden logic — the "why" is always visible, one click away, not just a badge).
- A lightweight comparison table (cost / expected range / timeline / risk) above or below the cards.

---

## 7. Dashboard (Mission Control)

### Contents (Month 1 — static/manual, no live ingestion)
- Objective statement + target metric
- Progress bar (manually updatable by the user in Month 1; defaults to 0%)
- Deadline countdown
- Budget (allocated vs. stated — spend tracking is Phase 2+)
- Outcome Graph (collapsed by default, expandable)
- Selected strategy summary + link to full strategy detail
- Static execution roadmap (ordered list generated alongside the strategy — not yet task-tracked/checkable in Month 1 beyond simple done/not-done checkboxes stored per user)
- Risks and assumptions surfaced from the strategy and graph
- A "Bottleneck" and "Recommendation" panel is **UI-scaffolded but disabled/placeholder** in Month 1, clearly labeled as "Coming soon — requires live tracking," so the founder can see where Phase 3 (Observation) will plug in without shipping fake intelligence.

### Explicit non-goal
The dashboard must not simulate live tracking with fake numbers. Anything that isn't real (current_value, bottleneck detection) is either null/empty state or clearly marked as not-yet-available. This matters for trust later — do not compromise it now for a prettier demo.

---

## 8. AI Architecture

### Model abstraction layer
All AI calls go through a single internal interface, not direct provider SDK calls scattered through the codebase:

```typescript
interface AIProvider {
  complete(params: {
    systemPrompt: string;
    messages: Message[];
    responseSchema: JSONSchema;   // enforced via provider-native structured output where available
    maxTokens: number;
    temperature?: number;
  }): Promise<{ data: unknown; raw: string; usage: TokenUsage }>;
}
```

Concrete providers (e.g., Anthropic, OpenAI) implement this interface behind a factory/router, so swapping or multi-routing providers doesn't touch call-site code.

### System prompts
One dedicated system prompt per pipeline stage (Intent Parser, Outcome Graph, Strategy Generator), versioned in source control (e.g., `/lib/ai/prompts/intent-parser.v1.ts`), so prompt changes are diffable and reproducible against stored past outputs.

### Structured outputs & validation
- Every AI call requests strict JSON matching a Zod (or equivalent) schema.
- Response is parsed and validated server-side before ever reaching the client.
- On validation failure: **one automatic retry** with the validation error appended to the prompt ("your last response failed validation because X — fix and resend"). On a second failure, surface a typed error to the client (see Section 16), never a raw/broken object.

### Context management
- Each pipeline stage receives only what it needs: the parser gets raw text; the graph generator gets the confirmed `ParsedIntent`; the strategy generator gets `ParsedIntent` + Outcome Graph. No stage re-sends the entire conversation history — this keeps token cost and hallucination surface area down.
- All intermediate objects are persisted, so a stage can be re-run without re-running earlier stages.

### Model routing
- Default: one capable model for all three stages in Month 1 (don't over-engineer routing before there's data on where cheaper models suffice).
- Config-level routing table (`stage → model`) so this can be tuned per-stage later without code changes.

### Token/cost controls
- Per-user and global rate limits on AI-call-triggering endpoints.
- Log token usage per call, per user, per stage, from day one — this is both a cost control and the seed of the "cost per AI run" product metric (Section 14).
- Hard cap on input size (e.g., objective text length, number of user-supplied constraints) to bound worst-case cost.

### Hallucination & confidence handling
- Every AI-generated numeric estimate must come with a `confidence` field and, where applicable, a range rather than a point estimate (see `expected_outcome` in Strategy).
- The parser's `assumptions` vs `unknowns` split is the primary hallucination guard: the system is designed to say "I don't know" rather than invent numbers.
- Low-confidence outputs (below a configurable threshold) are visually flagged in the UI, not hidden.

---

## 9. Technical Architecture

**Stack:** Next.js (App Router) + TypeScript, PostgreSQL via Supabase, Supabase Auth, Tailwind CSS, server-side API routes (Route Handlers), background jobs only where a call is genuinely long-running (Month 1 likely doesn't need a queue yet — see Section 18 build order note).

### Folder structure

```
/app
  /(marketing)/page.tsx              → landing page
  /(app)/dashboard/[intentId]/page.tsx
  /(app)/intents/new/page.tsx
  /(app)/intents/[id]/review/page.tsx
  /(app)/intents/[id]/graph/page.tsx
  /(app)/intents/[id]/strategies/page.tsx
  /api/intents/route.ts              → POST create, GET list
  /api/intents/[id]/parse/route.ts   → POST trigger parser
  /api/intents/[id]/graph/route.ts   → POST generate/regenerate graph
  /api/intents/[id]/strategies/route.ts → POST generate strategies
  /api/intents/[id]/route.ts         → GET/PATCH intent + related data
/components
  /intent/            (IntentForm, ClarificationPanel, ParsedIntentReview)
  /graph/              (OutcomeGraphTree, OutcomeNodeCard)
  /strategy/           (StrategyCard, StrategyComparisonTable)
  /dashboard/          (MissionControl, ProgressBar, RiskPanel)
  /ui/                  (shared design-system primitives)
/lib
  /ai/
    /providers/         (anthropic.ts, openai.ts, index.ts router)
    /prompts/            (intent-parser.v1.ts, outcome-graph.v1.ts, strategy.v1.ts)
    /schemas/            (zod schemas matching the TS interfaces above)
    pipeline.ts          (orchestrates stage calls + validation/retry)
  /db/
    schema.ts            (Drizzle/Prisma schema)
    client.ts
    queries/              (one file per aggregate: intents.ts, outcomes.ts, strategies.ts)
  /auth/
    server.ts, client.ts (Supabase auth helpers)
/types                    (shared TS interfaces, mirrors zod schemas)
/tests
```

### Notes
- Keep the AI pipeline (`lib/ai/pipeline.ts`) framework-agnostic and testable independent of Next.js request/response — API routes are thin wrappers around it.
- No background job/queue system in Month 1 unless a single AI call plus DB write exceeds a few seconds reliably; prefer synchronous request/response with a loading UI first, add a queue only when latency actually requires it (see Section 20 risk list — this is a common overbuild trap).

---

## 10. Database Schema

```sql
-- Users (managed largely by Supabase Auth; this extends it)
users (
  id uuid primary key references auth.users(id),
  email text not null,
  display_name text,
  plan text not null default 'free',   -- free | pro | business | enterprise
  created_at timestamptz not null default now()
)

organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references users(id),
  plan text not null default 'free',
  created_at timestamptz not null default now()
)
-- Month 1: every user gets an implicit personal organization; team membership is Phase-later.

intents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  created_by uuid not null references users(id),
  raw_text text not null,
  status text not null default 'draft',  -- draft | parsed | needs_clarification | graph_ready | strategized | active
  parsed_intent jsonb,                    -- ParsedIntent object
  parse_confidence numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)

outcome_nodes (
  id uuid primary key default gen_random_uuid(),
  intent_id uuid not null references intents(id) on delete cascade,
  parent_id uuid references outcome_nodes(id) on delete cascade,
  label text not null,
  goal_description text,
  metric text not null,
  target_value numeric,
  current_value numeric,
  unit text,
  deadline date,
  confidence numeric,
  assumptions jsonb,          -- string[]
  recommended_actions jsonb,  -- string[]
  sort_order int not null default 0,
  created_at timestamptz not null default now()
)

node_dependencies (
  node_id uuid not null references outcome_nodes(id) on delete cascade,
  depends_on_node_id uuid not null references outcome_nodes(id) on delete cascade,
  primary key (node_id, depends_on_node_id)
)

strategies (
  id uuid primary key default gen_random_uuid(),
  intent_id uuid not null references intents(id) on delete cascade,
  name text not null,
  description text,
  approach_summary text,
  required_resources jsonb,
  estimated_cost_min numeric,
  estimated_cost_max numeric,
  currency text default 'USD',
  expected_outcome jsonb,      -- {metric, min, max}
  timeline_days int,
  risks jsonb,
  assumptions jsonb,
  confidence numeric,
  tradeoffs text,
  is_recommended boolean default false,
  recommendation_rationale text,
  is_selected boolean default false,
  created_at timestamptz not null default now()
)

ai_runs (
  id uuid primary key default gen_random_uuid(),
  intent_id uuid references intents(id) on delete set null,
  stage text not null,          -- parse | outcome_graph | strategy_gen
  provider text not null,
  model text not null,
  prompt_version text not null,
  input_tokens int,
  output_tokens int,
  latency_ms int,
  status text not null,          -- success | validation_failed | provider_error
  raw_response text,
  created_at timestamptz not null default now()
)

audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  actor_id uuid references users(id),
  action text not null,          -- e.g. "intent.created", "strategy.selected"
  target_type text,
  target_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
)
```

`assumptions`/`unknowns` from `ParsedIntent` live inside the `parsed_intent` jsonb blob rather than separate tables in Month 1 — they don't need independent querying yet, and normalizing them prematurely adds migration risk for no MVP benefit.

---

## 11. API Design

All endpoints require an authenticated Supabase session; all mutate/read only rows scoped to the caller's organization (enforced at the query layer, backed by Postgres RLS — see Section 12).

### `POST /api/intents`
Create a draft intent.
```json
// request
{ "raw_text": "Get my app to 1,000 users in 30 days with a $500 budget." }
// response 201
{ "id": "uuid", "status": "draft", "raw_text": "..." }
```
Validation: `raw_text` required, 10–2000 chars.

### `POST /api/intents/:id/parse`
Triggers the Intent Parser AI call.
```json
// response 200
{ "id": "uuid", "status": "parsed" | "needs_clarification", "parsed_intent": { ...ParsedIntent } }
```
On repeated validation failure: `502` with `{ "error": "ai_validation_failed", "stage": "parse" }`.

### `PATCH /api/intents/:id`
User edits to the parsed intent, or answers to clarification questions (merged into `parsed_intent`, re-validated, `status` moves to `parsed`).

### `POST /api/intents/:id/graph`
Generates the Outcome Graph from the confirmed `parsed_intent`. Idempotent-ish: passing `{ "regenerate_node_id": "..." }` regenerates only that node's children.
```json
// response 200
{ "nodes": [ { ...OutcomeNode }, ... ] }
```

### `PATCH /api/intents/:id/graph/nodes/:nodeId`
User edits a single node (label, target, deadline).

### `POST /api/intents/:id/strategies`
Generates strategies from the confirmed intent + graph. Optional `{ "feedback": "lower risk please" }` for regeneration.
```json
// response 200
{ "strategies": [ { ...Strategy }, ... ] }
```

### `POST /api/intents/:id/strategies/:strategyId/select`
Marks a strategy selected, sets `intents.status = 'active'`. Only one strategy per intent may be `is_selected`.

### `GET /api/intents/:id`
Returns the full intent object with nested `parsed_intent`, `outcome_nodes`, and `strategies` — this is what powers the dashboard.

All request bodies validated with the same Zod schemas used for AI output validation, so client-supplied edits can't introduce shapes the rest of the pipeline doesn't expect.

---

## 12. Security

- **Authentication:** Supabase Auth (email/password + optional OAuth), session cookies handled via Supabase SSR helpers in Next.js middleware.
- **Authorization / tenant isolation:** Postgres Row-Level Security on every table keyed by `organization_id`, policy: a row is visible/writable only if the requesting user belongs to that organization. This is enforced at the database layer, not just in application code, so a bug in one API route can't leak cross-tenant data.
- **API key / secrets management:** AI provider keys and Supabase service-role key live only in server-side environment variables, never exposed to the client bundle; a secrets manager (e.g., Vercel encrypted env vars) is used, not `.env` committed to source.
- **Rate limiting:** Per-user rate limits on all AI-triggering endpoints (e.g., token-bucket in Redis/Upstash or Supabase-backed counter) to bound cost and abuse.
- **Input validation:** All API inputs validated with Zod before touching the DB or an AI call; reject with `400` on failure.
- **Audit logging:** Every state-changing action (`intent.created`, `intent.parsed`, `graph.generated`, `strategy.selected`, etc.) writes an `audit_logs` row with actor, action, target, and metadata — this is cheap to add now and expensive to retrofit once execution (Phase 2) exists.
- **No autonomous action:** enforced structurally, not just by policy — in Month 1 there are simply no API routes or AI tool-calls capable of spending money, sending messages, or touching external systems. The permission-level system described in the original sketch (Levels 0–5) is a Phase 2 concern; Month 1 only ever operates at what would be "Level 2 — Generate."

---

## 13. Monetization Architecture

### Month 1 tiers (enforced via `users.plan` / `organizations.plan`, limits checked server-side before AI calls)

| Tier | Price | Limits (Month 1 dimensions) |
|---|---|---|
| Free | $0 | 3 intents/month, basic strategy generation (2 strategies not 4), basic outcome graphs (depth capped at 2 instead of 3) |
| Pro | $29–99/mo | More intents/month, full 4-strategy generation, full depth-3 graphs, priority AI queue |
| Business | $299–999+/mo | Multiple concurrent objectives, (future) team members, higher usage ceilings |
| Enterprise | Custom | Private deployment, custom integrations, dedicated support — sales-led, not self-serve |

### Architectural hooks (built now, not activated)
- `plan` field already on `users`/`organizations`.
- A single `checkUsageLimit(orgId, action)` function gates every AI-triggering endpoint — swapping in real Stripe-driven limits later means changing this function's data source, not every call site.
- `ai_runs` table (Section 10) already gives per-user/per-org cost data needed to price Pro/Business sensibly before committing to numbers.

### Explicitly not built in Month 1
- Stripe integration / billing UI / payment collection.
- Usage-based/performance pricing (requires the Observation phase to even measure attribution — premature before Phase 3).
- Intent API pricing, Capability Marketplace fees — both are Phase 6/7 concerns (Section 17).

---

## 14. Product Metrics (Month 1 instrumentation)

- **Intent completion rate:** % of created intents that reach `status = active` (strategy selected) vs. abandoned at parse/graph/strategy review.
- **Strategy acceptance rate:** % of generated strategy sets where the user selects the AI's `is_recommended` strategy vs. an alternative vs. requests regeneration.
- **Time to useful strategy:** wall-clock time from intent creation to strategy selection.
- **Retention:** % of users who create a second intent within 7/30 days.
- **Cost per AI run:** derived from `ai_runs.input_tokens`/`output_tokens`, broken down by stage.
- **Hallucination/error rate:** % of AI runs with `status = validation_failed` even after retry, and (manually sampled early on) % of accepted outputs a human reviewer flags as containing an invented number.
- **Outcome-plan quality:** see Section 15 (Evaluation System) — this feeds a score, not just a vibe.
- **User satisfaction:** simple in-app thumbs up/down on the generated strategy set and Outcome Graph, logged with the intent id for later correlation with the other metrics.

---

## 15. Evaluation System — "Is this a GOOD plan?"

Rather than trusting a single AI call's self-report, each generated Outcome Graph + Strategy set is scored along explicit dimensions, computed partly by a second-pass AI "critic" call and partly by deterministic checks:

| Dimension | How it's checked |
|---|---|
| **Completeness** | Deterministic: every leaf `OutcomeNode` has a non-null `metric`; every `Strategy` has all required fields populated. |
| **Feasibility** | Critic-model check: does the recommended strategy's `estimated_cost` fit the user's stated budget and `timeline_days` fit the deadline? Flag if not. |
| **Consistency** | Deterministic: do child node targets/deadlines not exceed parent constraints? Do strategy resource requirements not contradict user-stated `resources`/`constraints`? |
| **Constraint satisfaction** | Deterministic: cross-check every `ParsedIntent.constraints` entry (e.g., "mobile-first") appears reflected somewhere in the graph or strategies; flag orphaned constraints. |
| **Evidence quality** | Critic-model check: are `assumptions` reasonable and clearly labeled, or is the model stating something as fact that should be an assumption? |
| **Estimated confidence** | Aggregate of the per-node/per-strategy `confidence` fields, surfaced as one summary score on the dashboard. |

This produces a single stored `plan_quality_score` per intent (not shown prominently to end users in Month 1, but critical for internal eval as prompts change — this is how the founder will know if a prompt edit made things better or worse, rather than guessing).

---

## 16. Error States

| Situation | Behavior |
|---|---|
| Ambiguous intent | Parser sets `needs_clarification: true` with specific `clarification_questions`; UI blocks progression until answered or explicitly overridden. |
| Missing critical info (no target number, no timeframe) | Goes into `unknowns`; if `objective_type` requires a target to generate a meaningful graph, block with a clarification prompt rather than guessing. |
| Invalid AI output (schema mismatch) | One automatic retry with the validation error fed back to the model; second failure surfaces a typed `ai_validation_failed` error, UI shows "We couldn't generate that — try rephrasing" with the option to retry, not a blank screen or raw JSON. |
| Strategy generation fails | Same retry pattern; if it still fails, the user can retry manually or proceed with a placeholder "strategy generation unavailable" state that doesn't block viewing the already-generated Outcome Graph. |
| Database failure | API routes wrap DB calls, return `503` with a generic "something went wrong, your data is safe" message; client shows a retry affordance. Nothing is destructively overwritten on partial failure — writes are per-stage, not one giant transaction spanning the whole pipeline. |
| Model provider outage | Router (Section 8) attempts the configured fallback provider if one is set; if none available, surfaces the same `ai_validation_failed`-style error with a provider-specific message logged server-side for monitoring. |
| Unrealistic goal (e.g., "1,000,000 users in 1 day with $10") | Not silently "solved" — the critic/evaluation pass (Section 15) should cause `feasibility` to fail, and the UI should surface this plainly: "This target may not be achievable with the stated budget/timeline" rather than generating a falsely confident plan. |

---

## 17. Future Architecture (explicitly NOT Month 1)

| Phase | Adds |
|---|---|
| **Phase 2** | Permission system (Levels 0–5) + Execution Engine — AI can perform pre-approved, low-risk actions |
| **Phase 3** | Observation Engine + live metrics ingestion (connect real data sources; populate `current_value`, unlock the Dashboard's bottleneck panel) |
| **Phase 4** | Experiment Engine — controlled A/B-style tests feeding an Experiment Memory |
| **Phase 5** | Recompiler — detects plan/reality divergence, proposes new strategy automatically |
| **Phase 6** | Intent API (`POST /v1/intents`) for programmatic/enterprise access |
| **Phase 7** | Capability Marketplace — third-party developers publish capabilities, platform takes a fee |
| **Phase 8** | Full REALITY ENGINE — world model + capability network + execution fabric across software/human/machine actors |

Month 1's data model is deliberately shaped so these bolt on rather than requiring a rewrite: `outcome_nodes.current_value` already exists (Phase 3 fills it), `strategies` already has the shape Phase 4/5 will read from, `audit_logs` already exists for Phase 2's action trail.

---

## 18. Exact Build Order

For each step: files/components, APIs, DB changes, tests, and definition of done.

### 1. Project setup
- **Files:** Next.js + TS init, Tailwind config, ESLint/Prettier, `.env.example`.
- **DB:** none yet.
- **Tests:** CI pipeline runs lint + typecheck on push.
- **DoD:** `npm run dev` boots a blank app; CI green on an empty commit.

### 2. Authentication
- **Files:** `/lib/auth/server.ts`, `/lib/auth/client.ts`, Next.js middleware for session refresh, `/app/(auth)/login`, `/app/(auth)/signup`.
- **DB:** none beyond Supabase's built-in `auth.users`; create `users` table trigger to mirror new signups.
- **Tests:** signup → login → protected route redirect works; logged-out user is redirected from `/app/*`.
- **DoD:** a real account can sign up, log in, log out, and hit a protected placeholder dashboard route.

### 3. Database
- **Files:** Drizzle/Prisma schema per Section 10, migration files.
- **DB:** create `organizations`, `intents`, `outcome_nodes`, `node_dependencies`, `strategies`, `ai_runs`, `audit_logs`; RLS policies per Section 12.
- **Tests:** migration runs clean on empty DB; RLS policy test (user A cannot read user B's org rows).
- **DoD:** schema deployed to a Supabase project; RLS verified with two test accounts.

### 4. Intent input UI
- **Components:** `IntentForm` (textarea + optional deadline/budget/geography fields).
- **API:** `POST /api/intents`.
- **DB:** insert into `intents` with `status='draft'`.
- **Tests:** form validation (min/max length), API contract test.
- **DoD:** a logged-in user can submit an objective and see it persisted with a generated id.

### 5. Intent parser
- **Files:** `/lib/ai/prompts/intent-parser.v1.ts`, `/lib/ai/schemas/parsed-intent.ts`, `/lib/ai/pipeline.ts` (parse stage).
- **API:** `POST /api/intents/:id/parse`, `PATCH /api/intents/:id`.
- **Components:** `ParsedIntentReview`, `ClarificationPanel`.
- **DB:** update `intents.parsed_intent`, `intents.status`; insert `ai_runs` row.
- **Tests:** schema validation unit tests with fixture LLM outputs (valid + intentionally malformed, to exercise the retry path); e2e test on 5–10 varied real-world-style objective strings.
- **DoD:** for a representative set of test objectives, the parser reliably produces valid structured output or a correct clarification prompt — no unhandled exceptions.

### 6. Outcome Graph
- **Files:** prompt + schema for graph generation.
- **API:** `POST /api/intents/:id/graph`, `PATCH /api/intents/:id/graph/nodes/:nodeId`.
- **Components:** `OutcomeGraphTree`, `OutcomeNodeCard`.
- **DB:** insert `outcome_nodes`, `node_dependencies`.
- **Tests:** every generated leaf node has a `metric` (schema-enforced); depth never exceeds 3; regenerate-single-node path doesn't orphan dependencies.
- **DoD:** a confirmed intent reliably produces a readable, editable 2–3 level graph.

### 7. Strategy Generator
- **Files:** prompt + schema for strategy generation.
- **API:** `POST /api/intents/:id/strategies`, `POST /api/intents/:id/strategies/:strategyId/select`.
- **Components:** `StrategyCard`, `StrategyComparisonTable`.
- **DB:** insert `strategies`.
- **Tests:** exactly one `is_recommended: true` per generation; recommended strategy's cost never exceeds stated budget when a within-budget option exists; regeneration-with-feedback changes output meaningfully (spot-checked).
- **DoD:** user can review 2–4 distinct strategies, see a justified recommendation, and select one.

### 8. Dashboard
- **Components:** `MissionControl`, `ProgressBar`, `RiskPanel` (with disabled "coming soon" bottleneck section).
- **API:** `GET /api/intents/:id` (aggregated).
- **DB:** none new.
- **Tests:** dashboard renders correctly for an intent at every possible `status`.
- **DoD:** selecting a strategy lands the user on a dashboard showing the full plan, matches Section 7.

### 9. AI validation & evaluation pass
- **Files:** `/lib/ai/evaluate.ts` implementing Section 15's checks.
- **DB:** add `plan_quality_score` (+ component scores) to `intents`.
- **Tests:** deterministic checks unit-tested directly; critic-model checks tested against fixtures.
- **DoD:** every intent that reaches `status='active'` has a stored quality score, queryable for internal review.

### 10. Testing (hardening pass)
- End-to-end test of the full flow (intent → parse → graph → strategy → dashboard) against a real (or recorded) AI provider.
- Load/rate-limit test on the AI-triggering endpoints.
- **DoD:** full flow passes e2e reliably across a batch of varied test objectives (not just the one demo example).

### 11. Deployment
- Vercel project, environment variables (AI provider keys, Supabase keys) configured, Supabase project promoted to a real (non-local) instance.
- **DoD:** the app is reachable at a real URL and a fresh account can complete the full flow in production.

### 12. Analytics
- PostHog (or equivalent) events wired for each product metric in Section 14.
- **DoD:** intent creation, parse completion, graph generation, strategy selection, and thumbs up/down all show up as events with the intent id attached.

### 13. Monetization hooks
- `plan` field + `checkUsageLimit()` gating per Section 13, applied to Free-tier limits only (no paid checkout yet).
- **DoD:** a free user is correctly blocked from a 4th intent in a month with a clear upgrade-prompt UI (even if "upgrade" doesn't yet charge anything).

---

## 19. MVP Definition of Done

The Month 1 MVP is **done** only when all of the following are true for a real, non-scripted user:

- [ ] User can sign up, log in, and reach the intent-creation screen.
- [ ] User can type an arbitrary objective in free text (not just the demo example) and receive a structured parse.
- [ ] Ambiguous or incomplete objectives correctly trigger clarification questions rather than silently guessing.
- [ ] Confirmed intent reliably produces a valid, readable Outcome Graph (2–3 levels, every leaf has a metric).
- [ ] Outcome Graph nodes are editable and edits persist.
- [ ] Strategy generation reliably produces 2–4 distinct, budget-aware strategies with exactly one clearly justified recommendation.
- [ ] User can select a strategy (or regenerate with feedback).
- [ ] Dashboard displays the full plan: objective, deadline, budget, graph, selected strategy, roadmap, risks/assumptions.
- [ ] No AI-invalid output ever reaches the UI unhandled (validated end-to-end, retry path exercised in tests).
- [ ] No code path can spend money, send a message, publish anything, or touch a production system outside NEXORA's own database — this is verifiable by inspecting the API surface, not just by policy.
- [ ] Every state-changing action is in `audit_logs`.
- [ ] Row-Level Security verified: one account cannot read or write another account's data.
- [ ] The full loop (Intent → Understand → Structure → Decompose → Generate Strategies → Recommend → Display) completes end-to-end on at least 10 varied real-world-style test objectives without an unhandled failure.
- [ ] Basic analytics events fire for every step of the funnel.

---

## Brutally Honest Critique

**Unnecessary features (cut these if they creep in):**
- Any live-looking "bottleneck" or "health" indicator on the dashboard before Phase 3 actually has data — it's tempting to fake it for a better demo, but it teaches users to distrust the product the first time they check it against reality.
- Team members/multi-user org support. You wrote "Business tier includes team members" in the pricing — don't build the invite/roles system in Month 1. Ship single-user, price Business on usage ceilings and objective count for now.
- A background job queue. Your own roadmap doesn't need it yet — three sequential AI calls with a loading spinner is fine for Month 1. Adding Redis/queue infra now is exactly the kind of "sounds professional" complexity that slows down the only thing that matters right now (proving the loop works).
- Deep model-routing config (per-stage model selection tuned by cost) — build the abstraction (so you're not locked to one provider), but don't spend Month 1 tuning it. One good model for all three stages is enough to learn from.

**Technical risks:**
1. **Schema drift between the AI's actual output and your Zod schema** is the single most likely source of a broken demo. Budget real time for the retry-and-validate loop (Section 8/16) — don't treat it as an afterthought; it's the difference between "usually works" and "reliably works," and reliability is your MVP's entire value proposition.
2. **Outcome Graph quality is the hardest part of this MVP, not the easiest.** Intent parsing is a well-worn LLM task. Decomposing an arbitrary goal into a *good*, non-generic, dependency-correct 3-level tree is genuinely hard and will need real prompt iteration against real, varied objectives — not just your one "1,000 users" example. Budget disproportionate time here.
3. **Strategy cost/outcome estimates are unverifiable guesses dressed as structured data.** A `min`/`max` range with a `confidence` score looks rigorous but the model has no ground truth for "creator partnerships will cost $200 and get you 700–1,300 users" — it's a plausible-sounding hallucination with a schema around it. This is fine *as long as you're honest with users that it's an estimate*, but don't let the polished UI (cards, tables, confidence scores) accidentally imply more certainty than exists. This is a trust risk, not just a technical one.

**Unrealistic assumptions:**
- That one system prompt per stage will generalize across wildly different objective types (a marketing goal vs. a fitness goal vs. a fundraising goal) without per-type tuning. It probably won't at first — expect the Outcome Graph and Strategy prompts especially to need objective-type-aware branches sooner than the "one prompt per stage" architecture implies.
- That "3–6 children per level" and "2–4 strategies" are always the right shape. Some objectives are genuinely simple (they don't need 3 levels of decomposition) and forcing structure onto a simple goal will look like padding. Consider letting the model choose graph depth/breadth within a max bound rather than always targeting the max.

**Where you're overbuilding:** the `ai_runs` table, `plan_quality_score`, and audit logging are *not* overbuilding — keep those; they're cheap now and expensive to retrofit. The genuine overbuild risk is architecture for Phases 2–8 leaking into Month 1's code (permission-level enums, capability-registry abstractions, marketplace fee logic) before there's a single real user. Section 17 exists so you have somewhere to put those ideas that isn't "in the codebase yet."

**Where the MVP is too weak:** the Dashboard has no live tracking at all, which means the product's actual differentiator — the observe/adapt loop — is entirely absent from Month 1. That's the right scope call (you said so yourself: don't build the full Reality Engine yet), but be clear-eyed that Month 1 alone is a very good planning tool, not yet "Reality Engine." If you demo it as more than that, you'll set expectations you can't meet until Phase 3.

**The 3 things most likely to make NEXORA fail:**
1. **The Outcome Graph and Strategy generation aren't actually good enough, often enough, on real objectives** — and you don't find this out until real users try it, because your own testing used one clean example. Test with messy, ambiguous, and genuinely varied objectives before you consider Month 1 done.
2. **You build toward the moonshot (permissions, capabilities, marketplace) before validating that anyone wants a really good *planning* tool in the first place.** The roadmap in Section 17 is ordered correctly — the risk is not following your own ordering under the pressure to look "more autonomous" than a planning tool.
3. **Users don't trust AI-generated cost/outcome estimates without any track record**, and without Phase 3's observation loop to eventually prove the estimates out, that trust gap never closes. Month 1 should be explicit and honest about estimate uncertainty (ranges + confidence, never fake precision) — that's a product decision, not just a UI detail, and it's the thing most likely to determine whether early users come back.
