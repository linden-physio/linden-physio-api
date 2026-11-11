import { pgTable, serial, timestamp, text, integer, time, index, uuid } from "drizzle-orm/pg-core";

// The clinic's tables, described in TypeScript. drizzle-kit compares this file with the migrations
// so far and writes the SQL for what changed.

export const bookings = pgTable(
  "bookings",
  {
    id: serial().primaryKey(),
    // The id we give to the person who booked, to cancel with. Counting ids (1, 2, 3) are easy to guess,
    // so this one is long and random, and the counting one stays inside the database.
    publicId: uuid("public_id").notNull().defaultRandom().unique(),
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
  },
  // The free times ask for a fortnight of bookings by start time, so look them up by start time.
  (table) => [index("bookings_starts_at_idx").on(table.startsAt)],
);

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
