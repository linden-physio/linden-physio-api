import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { serve } from "@hono/node-server";
import pg from "pg";
import { makeApp } from "./app.ts";

test("two bookings for the same time at the same moment: one gets in, one is refused", async (t) => {
  // A database of its own, emptied and made from schema.sql, so the test never touches real bookings.
  const db = new pg.Pool({ connectionString: "postgres://localhost/linden_test" });
  await db.query("DROP TABLE IF EXISTS bookings");
  await db.query(await readFile(new URL("schema.sql", import.meta.url), "utf8"));
  // A server that has been running a while has its connections open already. Open two, so that the
  // two bookings below really do run side by side.
  await Promise.all([db.query("SELECT 1"), db.query("SELECT 1")]);
  const server = serve({ fetch: makeApp(db).fetch, port: 3001 });
  t.after(async () => {
    server.close();
    await db.end();
  });

  const book = (name: string) =>
    fetch("http://localhost:3001/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: "2026-11-10",
        time: "10:00",
        service: "first-visit",
        name,
        email: "test@example.com",
      }),
    });
  const answers = await Promise.all([book("Maja Lund"), book("Anna Holm")]);

  assert.deepEqual(answers.map((a) => a.status).sort(), [201, 409]);
  const rows = await db.query("SELECT name FROM bookings");
  assert.equal(rows.rowCount, 1);
});
