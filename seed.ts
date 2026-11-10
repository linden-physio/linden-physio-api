import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { openingHours, services, staff } from "./schema.ts";
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

// `npm run seed` fills the database named in DATABASE_URL.
if (import.meta.main) {
  const db = drizzle(setting("DATABASE_URL"));
  await seed(db);
  await db.$client.end();
  console.log("Seeded the clinic's services, opening hours and staff.");
}
