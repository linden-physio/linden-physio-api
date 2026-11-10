import { test } from "node:test";
import assert from "node:assert/strict";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { makeApp } from "./app.ts";
import { setting } from "./env.ts";
import { seed } from "./seed.ts";

test("a booking can be cancelled until it starts, and only once", async (t) => {
  const db = drizzle(setting("TEST_DATABASE_URL"));
  await db.execute(sql`DROP SCHEMA IF EXISTS public, drizzle CASCADE`);
  await db.execute(sql`CREATE SCHEMA public`);
  await migrate(db, { migrationsFolder: "migrations" });
  await seed(db);
  t.after(() => db.$client.end());

  // Monday evening, then Tuesday at ten past ten.
  let time = new Date("2026-11-09T18:00:00.000Z");
  const app = makeApp(db, [], () => time);
  const book = (start: string) =>
    app.request("/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ start, service: "first-visit", name: "Maja Lund", email: "maja@example.com" }),
    });
  const cancel = (id: string) => app.request("/bookings/" + id, { method: "DELETE" });

  const first = await (await book("2026-11-10T09:00:00.000Z")).json();
  assert.equal((await cancel(first.id)).status, 204);
  assert.equal((await cancel(first.id)).status, 404);

  const second = await (await book("2026-11-10T09:00:00.000Z")).json();
  time = new Date("2026-11-10T09:10:00.000Z");
  assert.equal((await cancel(second.id)).status, 409);

  assert.equal((await cancel("42")).status, 400);
});
