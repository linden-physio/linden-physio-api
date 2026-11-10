import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { bookings, openingHours, services, staff } from "./schema.ts";
import { toInstant } from "./clock.ts";
import { setting } from "./env.ts";

// The clinic as it is today: its services, its opening hours and its physiotherapists.
// Running it again changes nothing.
export async function seed(db: NodePgDatabase) {
  await db
    .insert(services)
    .values([
      { id: "first-visit", title: "First visit", minutes: 60, priceSek: 950 },
      { id: "follow-up", title: "Follow-up", minutes: 30, priceSek: 650 },
      { id: "sports-massage", title: "Sports massage", minutes: 45, priceSek: 750 },
    ])
    .onConflictDoNothing();
  await db
    .insert(openingHours)
    .values([
      { weekday: 1, opens: "09:00", closes: "12:00" },
      { weekday: 2, opens: "09:00", closes: "12:00" },
      { weekday: 3, opens: "09:00", closes: "12:00" },
      { weekday: 4, opens: "13:00", closes: "17:00" },
      { weekday: 5, opens: "09:00", closes: "12:00" },
    ])
    .onConflictDoNothing();
  await db
    .insert(staff)
    .values([
      { id: 1, name: "Karin Holm" },
      { id: 2, name: "Oskar Nyberg" },
    ])
    .onConflictDoNothing();
}

// A week of bookings to work with on this computer. Running it again changes nothing.
export async function seedWeek(db: NodePgDatabase) {
  // The week of Monday 9 November 2026: [day, time, minutes, service, physiotherapist, name].
  const week: [string, string, number, string, number, string][] = [
    ["2026-11-09", "09:00", 60, "first-visit", 1, "Ola Berg"],
    ["2026-11-09", "10:30", 30, "follow-up", 2, "Sara Lund"],
    ["2026-11-10", "09:00", 60, "first-visit", 1, "Erik Sjö"],
    ["2026-11-10", "10:00", 60, "first-visit", 1, "Phone booking"],
    ["2026-11-11", "11:00", 60, "first-visit", 1, "Lina Ek"],
    ["2026-11-11", "09:00", 45, "sports-massage", 2, "Johan Ahl"],
    ["2026-11-12", "14:00", 30, "follow-up", 1, "Maria Dahl"],
    ["2026-11-13", "09:30", 60, "first-visit", 2, "Nils Ström"],
  ];
  // DO NOTHING without a target also skips a row that breaks the no-overlap rule: one that's already there.
  await db
    .insert(bookings)
    .values(
      week.map(([date, time, minutes, service, staffId, name]) => ({
        startsAt: toInstant(date, time),
        endsAt: new Date(Date.parse(toInstant(date, time)) + minutes * 60_000).toISOString(),
        service,
        staffId,
        name,
        email: name.toLowerCase().replace(" ", ".") + "@example.com",
      })),
    )
    .onConflictDoNothing();
}

// `npm run seed` fills the database named in DATABASE_URL.
if (import.meta.main) {
  const db = drizzle(setting("DATABASE_URL"));
  await seed(db);
  await seedWeek(db);
  await db.$client.end();
  console.log("Seeded the clinic's services, opening hours, staff and a week of bookings.");
}
