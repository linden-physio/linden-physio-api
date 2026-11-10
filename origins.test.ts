import { test } from "node:test";
import assert from "node:assert/strict";
import { drizzle } from "drizzle-orm/node-postgres";
import { makeApp } from "./routes.ts";
import { setting } from "./env.ts";

test("the page's own address and its previews may read the answers, other sites may not", async (t) => {
  const db = drizzle(setting("TEST_DATABASE_URL"));
  t.after(() => db.$client.end());
  const app = makeApp(db, ["https://lindenphysio.com", "https://linden-physio-*-linden-physio.vercel.app"]);

  const allowed = async (origin: string) =>
    (await app.request("/free-times", { method: "OPTIONS", headers: { Origin: origin } })).headers.get(
      "Access-Control-Allow-Origin",
    );
  assert.equal(await allowed("https://lindenphysio.com"), "https://lindenphysio.com");
  assert.equal(
    await allowed("https://linden-physio-git-new-look-linden-physio.vercel.app"),
    "https://linden-physio-git-new-look-linden-physio.vercel.app",
  );
  assert.equal(await allowed("https://example.com"), null);
  assert.equal(await allowed("https://lindenphysio.com.example.com"), null);
});
