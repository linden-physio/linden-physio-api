import { pgTable, serial, timestamp, text, integer, time } from "drizzle-orm/pg-core";

// The clinic's tables, described in TypeScript. drizzle-kit compares this file with the migrations
// so far and writes the SQL for what changed.

export const bookings = pgTable("bookings", {
  id: serial().primaryKey(),
  startsAt: timestamp("starts_at", { withTimezone: true, mode: "string" }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true, mode: "string" }).notNull(),
  service: text()
    .notNull()
    .references(() => services.id),
  staffId: integer("staff_id")
    .notNull()
    .references(() => staff.id),
  name: text().notNull(),
  email: text().notNull(),
});

export const staff = pgTable("staff", {
  id: serial().primaryKey(),
  name: text().notNull(),
});

export const services = pgTable("services", {
  id: text().primaryKey(), // like "first-visit"
  title: text().notNull(),
  minutes: integer().notNull(),
  priceSek: integer("price_sek").notNull(),
});

// One row for each day the clinic is open. 0 is Sunday. A day with no row is closed.
export const openingHours = pgTable("opening_hours", {
  weekday: integer().primaryKey(),
  opens: time().notNull(),
  closes: time().notNull(),
});
