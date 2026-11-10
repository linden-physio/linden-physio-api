import { test } from "node:test";
import assert from "node:assert/strict";
import { serve } from "@hono/node-server";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { makeApp } from "./routes.ts";
import { setting } from "./env.ts";
import { seed } from "./seed.ts";

test("three bookings for the same time at the same moment, with two physiotherapists: two get in, one is refused", async (t) => {
  // A database of its own, emptied and built from the migrations, so the test never touches real bookings.
  const db = drizzle(setting("TEST_DATABASE_URL"));
  await db.execute(sql`DROP SCHEMA IF EXISTS public, drizzle CASCADE`);
  await db.execute(sql`CREATE SCHEMA public`);
  await migrate(db, { migrationsFolder: "migrations" });
  await seed(db);
  // A server that has been running a while has its connections open already. Open three, so that the
  // three bookings below really do run side by side.
  await Promise.all([db.execute(sql`SELECT 1`), db.execute(sql`SELECT 1`), db.execute(sql`SELECT 1`)]);
  const server = serve({ fetch: makeApp(db, []).fetch, port: 3001 });
  t.after(async () => {
    server.close();
    await db.$client.end();
  });

  const book = (name: string) =>
    fetch("http://localhost:3001/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        start: "2026-11-10T09:00:00.000Z",
        service: "first-visit",
        name,
        email: "test@example.com",
      }),
    });
  const answers = await Promise.all([book("Maja Lund"), book("Anna Holm"), book("Leo Strand")]);

  assert.deepEqual(answers.map((a) => a.status).sort(), [201, 201, 409]);
  const rows = await db.execute(sql`SELECT name FROM bookings`);
  assert.equal(rows.rowCount, 2);
});
