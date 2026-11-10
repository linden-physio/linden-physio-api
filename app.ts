import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import pg from "pg";
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

// The server, talking to the given database.
export function makeApp(db: pg.Pool) {
  // The bookings from the given day to two weeks after it.
  async function bookingsFrom(date: string): Promise<Booking[]> {
    // The database holds instants. Ask it for the clinic's wall times.
    const result = await db.query(
      `SELECT to_char(starts_at AT TIME ZONE 'Europe/Stockholm', 'YYYY-MM-DD') AS date,
              to_char(starts_at AT TIME ZONE 'Europe/Stockholm', 'HH24:MI') AS start,
              to_char(ends_at AT TIME ZONE 'Europe/Stockholm', 'HH24:MI') AS end
       FROM bookings
       WHERE starts_at >= $1::date::timestamp AT TIME ZONE 'Europe/Stockholm'
         AND starts_at < ($1::date + 15)::timestamp AT TIME ZONE 'Europe/Stockholm'`,
      [date],
    );
    return result.rows;
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
    const bookings = await bookingsFrom(date);
    if (!freeTimes(date, length, hours, bookings).includes(time)) {
      return c.json({ error: "That time is no longer free." }, 409);
    }
    try {
      // The query and its values travel separately, so a name with a quote in it can't change the query.
      await db.query("INSERT INTO bookings (starts_at, ends_at, service, name, email) VALUES ($1, $2, $3, $4, $5)", [
        toInstant(date, time),
        toInstant(date, addMinutes(time, length)),
        booking.service,
        booking.name,
        booking.email,
      ]);
    } catch (error) {
      // Two requests can both pass the check above. The table's rule lets only one of them in:
      // the other gets 23P01 (exclusion constraint), or now and then 40P01, when both inserts were
      // waiting for each other and Postgres stopped one of them.
      if (error instanceof pg.DatabaseError && (error.code === "23P01" || error.code === "40P01")) {
        return c.json({ error: "That time is no longer free." }, 409);
      }
      throw error;
    }
    return c.json({ start: booking.start }, 201);
  });

  return app;
}
