import type { Hono } from "hono";
import { drizzle } from "drizzle-orm/node-postgres";
import { makeApp } from "./routes.ts";
import { setting } from "./env.ts";

// The server, set up from the environment. Vercel looks for this file (app.ts) and runs its default
// export; on this computer, server.ts runs it with Node.
const db = drizzle(setting("DATABASE_URL"));
const app: Hono = makeApp(db, setting("ALLOWED_ORIGINS").split(","));
export default app;
