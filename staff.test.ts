import { test } from "node:test";
import assert from "node:assert/strict";
import { serve } from "@hono/node-server";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { makeApp } from "./app.ts";
import { setting } from "./env.ts";
import { seed } from "./seed.ts";

test("with two physiotherapists, two people can book Tuesday at ten, and a third can't", async (t) => {
  const db = drizzle(setting("TEST_DATABASE_URL"));
  await db.execute(sql`DROP SCHEMA IF EXISTS public, drizzle CASCADE`);
  await db.execute(sql`CREATE SCHEMA public`);
  await migrate(db, { migrationsFolder: "migrations" });
  await seed(db);
  const server = serve({ fetch: makeApp(db, []).fetch, port: 3002 });
  t.after(async () => {
    server.close();
    await db.$client.end();
  });

  const book = (name: string) =>
    fetch("http://localhost:3002/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        start: "2026-11-10T09:00:00.000Z",
        service: "first-visit",
        name,
        email: "test@example.com",
      }),
    });
  assert.equal((await book("Maja Lund")).status, 201);
  assert.equal((await book("Anna Holm")).status, 201);
  assert.equal((await book("Leo Strand")).status, 409);

  const rows = await db.execute(sql`SELECT staff_id FROM bookings ORDER BY staff_id`);
  assert.deepEqual(
    rows.rows.map((row) => row.staff_id),
    [1, 2],
  );
});
