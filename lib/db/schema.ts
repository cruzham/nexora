import {
  pgTable,
  uuid,
  text,
  numeric,
  jsonb,
  integer,
  boolean,
  date,
  timestamp,
} from "drizzle-orm/pg-core";

const timestamptz = (name: string) => timestamp(name, { withTimezone: true });

export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull(),
  displayName: text("display_name"),
  plan: text("plan").notNull().default("free"),
  createdAt: timestamptz("created_at").notNull().defaultNow(),
});

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  ownerId: uuid("owner_id").notNull(),
  plan: text("plan").notNull().default("free"),
  createdAt: timestamptz("created_at").notNull().defaultNow(),
});

export const organizationMembers = pgTable("organization_members", {
  organizationId: uuid("organization_id").notNull(),
  userId: uuid("user_id").notNull(),
  role: text("role").notNull().default("owner"),
});

export const intents = pgTable("intents", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull(),
  createdBy: uuid("created_by").notNull(),
  rawText: text("raw_text").notNull(),
  status: text("status").notNull().default("draft"),
  parsedIntent: jsonb("parsed_intent"),
  parseConfidence: numeric("parse_confidence"),
  planQualityScore: numeric("plan_quality_score"),
  createdAt: timestamptz("created_at").notNull().defaultNow(),
  updatedAt: timestamptz("updated_at").notNull().defaultNow(),
});

export const outcomeNodes = pgTable("outcome_nodes", {
  id: uuid("id").primaryKey().defaultRandom(),
  intentId: uuid("intent_id").notNull(),
  parentId: uuid("parent_id"),
  label: text("label").notNull(),
  goalDescription: text("goal_description"),
  metric: text("metric").notNull(),
  targetValue: numeric("target_value"),
  currentValue: numeric("current_value"),
  unit: text("unit"),
  deadline: date("deadline"),
  confidence: numeric("confidence"),
  assumptions: jsonb("assumptions"),
  recommendedActions: jsonb("recommended_actions"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamptz("created_at").notNull().defaultNow(),
});

export const nodeDependencies = pgTable("node_dependencies", {
  nodeId: uuid("node_id").notNull(),
  dependsOnNodeId: uuid("depends_on_node_id").notNull(),
});

export const strategies = pgTable("strategies", {
  id: uuid("id").primaryKey().defaultRandom(),
  intentId: uuid("intent_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  approachSummary: text("approach_summary"),
  requiredResources: jsonb("required_resources"),
  estimatedCostMin: numeric("estimated_cost_min"),
  estimatedCostMax: numeric("estimated_cost_max"),
  currency: text("currency").default("USD"),
  expectedOutcome: jsonb("expected_outcome"),
  timelineDays: integer("timeline_days"),
  risks: jsonb("risks"),
  assumptions: jsonb("assumptions"),
  confidence: numeric("confidence"),
  tradeoffs: text("tradeoffs"),
  isRecommended: boolean("is_recommended").default(false),
  recommendationRationale: text("recommendation_rationale"),
  isSelected: boolean("is_selected").default(false),
  createdAt: timestamptz("created_at").notNull().defaultNow(),
});

export const aiRuns = pgTable("ai_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  intentId: uuid("intent_id"),
  stage: text("stage").notNull(),
  provider: text("provider").notNull(),
  model: text("model").notNull(),
  promptVersion: text("prompt_version").notNull(),
  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),
  latencyMs: integer("latency_ms"),
  status: text("status").notNull(),
  rawResponse: text("raw_response"),
  createdAt: timestamptz("created_at").notNull().defaultNow(),
});

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull(),
  actorId: uuid("actor_id"),
  action: text("action").notNull(),
  targetType: text("target_type"),
  targetId: uuid("target_id"),
  metadata: jsonb("metadata"),
  createdAt: timestamptz("created_at").notNull().defaultNow(),
});
