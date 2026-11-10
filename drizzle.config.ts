import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./schema.ts",
  out: "./migrations",
  // Only `drizzle-kit pull` and `studio` connect; `generate` works from the files alone.
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
});
