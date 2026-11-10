import { serve } from "@hono/node-server";
import { drizzle } from "drizzle-orm/node-postgres";
import { makeApp } from "./app.ts";

// The clinic's database, on this computer.
const db = drizzle("postgres://localhost/linden");

serve({ fetch: makeApp(db).fetch, port: 3000 }, () => console.log("Listening on http://localhost:3000"));
