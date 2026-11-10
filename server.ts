import { serve } from "@hono/node-server";
import pg from "pg";
import { makeApp } from "./app.ts";

// The clinic's database, on this computer.
const db = new pg.Pool({ connectionString: "postgres://localhost/linden" });

serve({ fetch: makeApp(db).fetch, port: 3000 }, () => console.log("Listening on http://localhost:3000"));
