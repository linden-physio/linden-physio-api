import { serve } from "@hono/node-server";
import { drizzle } from "drizzle-orm/node-postgres";
import { makeApp } from "./app.ts";
import { setting } from "./env.ts";

const db = drizzle(setting("DATABASE_URL"));
const app = makeApp(db, setting("ALLOWED_ORIGINS").split(","));

serve({ fetch: app.fetch, port: 3000 }, () => console.log("Listening on http://localhost:3000"));
