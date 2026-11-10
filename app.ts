import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import pg from "pg";
import { and, gte, lt, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { bookings } from "./schema.ts";
import { toInstant, fromInstant } from "./clock.ts";
import { freeTimes, nearestFreeTime, type Booking, type OpeningHours } from "./slots.ts";

// The clinic's opening hours, by weekday (0 is Sunday).
const hours: Record<number, OpeningHours> = {
  0: "closed",
  1: { open: "09:00", close: "12:00" },
  2: { open: "09:00", close: "12:00" },
  3: { open: "09:00", close: "12:00" },
  4: { open: "13:00", close: "17:00" },
  5: { open: "09:00", close: "12:00" },
  6: "closed",
};

// How long each service takes, in minutes.
const lengths: Record<string, number> = { "first-visit": 60, "follow-up": 30, "sports-massage": 45 };

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

// The server, talking to the given database.
export function makeApp(db: NodePgDatabase) {
  // The bookings from the given day to two weeks after it, in the clinic's wall time.
  async function bookingsFrom(date: string): Promise<Booking[]> {
    return db
      .select({
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
    const date = c.req.query("date")!;
    const bookings = await bookingsFrom(date);
    const length = lengths[c.req.query("service")!];
    const closed = hours[new Date(date + "T12:00").getDay()] === "closed";
    const nearest = closed ? nearestFreeTime(date, length, hours, bookings) : null;
    return c.json({
      closed,
      times: freeTimes(date, length, hours, bookings).map((time) => ({ start: toInstant(date, time) })),
      nearest: nearest && { date: nearest.date, start: toInstant(nearest.date, nearest.time) },
    });
  });

  app.post("/bookings", async (c) => {
    const booking = await c.req.json();
    const { date, time } = fromInstant(booking.start);
    const length = lengths[booking.service];
    if (!freeTimes(date, length, hours, await bookingsFrom(date)).includes(time)) {
      return c.json({ error: "That time is no longer free." }, 409);
    }
    try {
      await db.insert(bookings).values({
        startsAt: toInstant(date, time),
        endsAt: toInstant(date, addMinutes(time, length)),
        service: booking.service,
        name: booking.name,
        email: booking.email,
      });
    } catch (error) {
      // Two requests can both pass the check above. The table's rule lets only one of them in:
      // the other gets 23P01 (exclusion constraint), or now and then 40P01, when both inserts were
      // waiting for each other and Postgres stopped one of them.
      const code = postgresError(error)?.code;
      if (code === "23P01" || code === "40P01") {
        return c.json({ error: "That time is no longer free." }, 409);
      }
      throw error;
    }
    return c.json({ start: booking.start }, 201);
  });

  return app;
}
