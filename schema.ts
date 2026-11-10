import { pgTable, serial, timestamp, text } from "drizzle-orm/pg-core";

// The clinic's tables, described in TypeScript. drizzle-kit compares this file with the migrations
// so far and writes the SQL for what changed.

export const bookings = pgTable("bookings", {
  id: serial().primaryKey(),
  startsAt: timestamp("starts_at", { withTimezone: true, mode: "string" }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true, mode: "string" }).notNull(),
  service: text().notNull(),
  name: text().notNull(),
  email: text().notNull(),
});
