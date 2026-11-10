import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import pg from "pg";
import { and, eq, gte, lt, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import type { z } from "zod";
import { bookings, openingHours, services, staff } from "./schema.ts";
import { FreeTimes, FreeTimesQuery, NewBooking } from "./schemas.ts";
import { toInstant, fromInstant } from "./clock.ts";
import { freeTimes, nearestFreeTime, type Booking, type OpeningHours } from "./slots.ts";

function addMinutes(time: string, minutes: number): string {
  const total = Number(time.slice(0, 2)) * 60 + Number(time.slice(3)) + minutes;
  return String(Math.floor(total / 60)).padStart(2, "0") + ":" + String(total % 60).padStart(2, "0");
}

function addDays(date: string, days: number): string {
  const d = new Date(date + "T12:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// The clinic's wall clock, as Postgres writes it.
const wall = (column: AnyPgColumn, format: string) =>
  sql<string>`to_char(${column} AT TIME ZONE 'Europe/Stockholm', ${format})`;

// Postgres's own error, under the one drizzle wraps it in.
function postgresError(error: unknown): pg.DatabaseError | null {
  const cause = error instanceof Error ? error.cause : null;
  return cause instanceof pg.DatabaseError ? cause : null;
}

// A 400 answer that names each field that failed, and why.
function problems(error: z.ZodError) {
  return {
    error: "The request doesn't have the right shape.",
    problems: error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
  };
}

// The earliest of some { date, time } answers, or null if there are none.
function earliest(answers: ({ date: string; time: string } | null)[]) {
  const found = answers.filter((a) => a !== null).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  return found[0] ?? null;
}

// The server, talking to the given database.
export function makeApp(db: NodePgDatabase) {
  // The clinic's opening hours, by weekday (0 is Sunday). A day with no row is closed.
  async function hoursByWeekday(): Promise<Record<number, OpeningHours>> {
    const hours: Record<number, OpeningHours> = {};
    for (let weekday = 0; weekday < 7; weekday++) hours[weekday] = "closed";
    for (const row of await db.select().from(openingHours)) {
      hours[row.weekday] = { open: row.opens.slice(0, 5), close: row.closes.slice(0, 5) };
    }
    return hours;
  }

  // How long a service takes, or null if there's no such service.
  async function minutesFor(service: string): Promise<number | null> {
    const [row] = await db.select().from(services).where(eq(services.id, service));
    return row ? row.minutes : null;
  }

  // Everything needed to work out a day's free times: the hours, the staff, and each one's bookings.
  async function diary(date: string) {
    const [hours, people, booked] = await Promise.all([hoursByWeekday(), db.select().from(staff), bookingsFrom(date)]);
    return {
      hours,
      people: people.map((person) => ({ ...person, bookings: booked.filter((b) => b.staffId === person.id) })),
    };
  }

  // The bookings from the given day to two weeks after it, in the clinic's wall time.
  async function bookingsFrom(date: string): Promise<(Booking & { staffId: number })[]> {
    return db
      .select({
        staffId: bookings.staffId,
        date: wall(bookings.startsAt, "YYYY-MM-DD"),
        start: wall(bookings.startsAt, "HH24:MI"),
        end: wall(bookings.endsAt, "HH24:MI"),
      })
      .from(bookings)
      .where(
        and(
          gte(bookings.startsAt, toInstant(date, "00:00")),
          lt(bookings.startsAt, toInstant(addDays(date, 15), "00:00")),
        ),
      );
  }

  const app = new Hono();
  app.use(logger());
  app.use(cors({ origin: "http://localhost:5173" }));

  app.get("/free-times", async (c) => {
    const query = FreeTimesQuery.safeParse(c.req.query());
    if (!query.success) return c.json(problems(query.error), 400);
    const { date, service } = query.data;
    const length = await minutesFor(service);
    if (length === null) return c.json({ error: "No such service: " + service }, 400);
    const { hours, people } = await diary(date);
    // A time is free if any physiotherapist is free then.
    const times = [...new Set(people.flatMap((person) => freeTimes(date, length, hours, person.bookings)))].sort();
    const closed = hours[new Date(date + "T12:00").getDay()] === "closed";
    const nearest = closed
      ? earliest(people.map((person) => nearestFreeTime(date, length, hours, person.bookings)))
      : null;
    const answer: FreeTimes = {
      closed,
      times: times.map((time) => ({ startsAt: toInstant(date, time) })),
      nearest: nearest && { date: nearest.date, startsAt: toInstant(nearest.date, nearest.time) },
    };
    return c.json(answer);
  });

  app.post("/bookings", async (c) => {
    const parsed = NewBooking.safeParse(await c.req.json());
    if (!parsed.success) return c.json(problems(parsed.error), 400);
    const booking = parsed.data;
    const { date, time } = fromInstant(booking.start);
    const length = await minutesFor(booking.service);
    if (length === null) return c.json({ error: "No such service: " + booking.service }, 400);
    // Try the physiotherapists who are free at that time, one after another. Another request can
    // take the same physiotherapist between our check and our insert, and then the next one may
    // still be free.
    const { hours, people } = await diary(date);
    const free = people.filter((person) => freeTimes(date, length, hours, person.bookings).includes(time));
    for (const person of free) {
      try {
        await db.insert(bookings).values({
          startsAt: toInstant(date, time),
          endsAt: toInstant(date, addMinutes(time, length)),
          service: booking.service,
          staffId: person.id,
          name: booking.name,
          email: booking.email,
        });
        return c.json({ start: booking.start }, 201);
      } catch (error) {
        // The table's rule refused it: 23P01 (exclusion constraint), or now and then 40P01, when two
        // inserts were waiting for each other and Postgres stopped one of them.
        const code = postgresError(error)?.code;
        if (code !== "23P01" && code !== "40P01") throw error;
      }
    }
    return c.json({ error: "That time is no longer free." }, 409);
  });

  return app;
}
