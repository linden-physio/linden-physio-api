import { test } from "node:test";
import assert from "node:assert/strict";
import { drizzle } from "drizzle-orm/node-postgres";
import { makeApp } from "./routes.ts";
import { setting } from "./env.ts";

test("a booking with no name and a start of 'soon' is refused before it reaches the database", async (t) => {
  const db = drizzle(setting("TEST_DATABASE_URL"));
  t.after(() => db.$client.end());

  const answer = await makeApp(db, []).request("/bookings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ start: "soon", service: "first-visit", email: "maja@example.com" }),
  });

  assert.equal(answer.status, 400);
  const body = await answer.json();
  assert.deepEqual(
    body.problems.map((problem: { path: string }) => problem.path),
    ["start", "name"],
  );
});
