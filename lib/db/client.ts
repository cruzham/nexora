import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

declare global {
  // eslint-disable-next-line no-var
  var __nexoraDb: ReturnType<typeof drizzle> | undefined;
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const client =
  global.__nexoraDb ??
  drizzle(postgres(connectionString, { prepare: false }), { schema });

if (process.env.NODE_ENV !== "production") {
  global.__nexoraDb = client;
}

export const db = client;
