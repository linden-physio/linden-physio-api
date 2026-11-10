import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serve } from "@hono/node-server";
import pg from "pg";
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

// The clinic's database, on this computer.
const db = new pg.Pool({ connectionString: "postgres://localhost/linden" });

// The bookings from the given day to two weeks after it.
async function bookingsFrom(date: string): Promise<Booking[]> {
  const result = await db.query(
    `SELECT to_char(starts_at, 'YYYY-MM-DD') AS date, to_char(starts_at, 'HH24:MI') AS start, to_char(ends_at, 'HH24:MI') AS end
     FROM bookings
     WHERE starts_at >= $1::date AND starts_at < $1::date + 15`,
    [date],
  );
  return result.rows;
}

function addMinutes(time: string, minutes: number): string {
  const total = Number(time.slice(0, 2)) * 60 + Number(time.slice(3)) + minutes;
  return String(Math.floor(total / 60)).padStart(2, "0") + ":" + String(total % 60).padStart(2, "0");
}

const app = new Hono();
app.use(logger());
app.use(cors({ origin: "http://localhost:5173" }));

app.get("/free-times", async (c) => {
  const date = c.req.query("date")!;
  const bookings = await bookingsFrom(date);
  const length = lengths[c.req.query("service")!];
  const closed = hours[new Date(date + "T12:00").getDay()] === "closed";
  return c.json({
    closed,
    times: freeTimes(date, length, hours, bookings),
    nearest: closed ? nearestFreeTime(date, length, hours, bookings) : null,
  });
});

app.post("/bookings", async (c) => {
  const booking = await c.req.json();
  const length = lengths[booking.service];
  const bookings = await bookingsFrom(booking.date);
  if (!freeTimes(booking.date, length, hours, bookings).includes(booking.time)) {
    return c.json({ error: "That time is no longer free." }, 409);
  }
  // The query and its values travel separately, so a name with a quote in it can't change the query.
  await db.query(
    "INSERT INTO bookings (starts_at, ends_at, service, name, email) VALUES ($1, $2, $3, $4, $5)",
    [
      booking.date + " " + booking.time,
      booking.date + " " + addMinutes(booking.time, length),
      booking.service,
      booking.name,
      booking.email,
    ],
  );
  return c.json({ date: booking.date, time: booking.time }, 201);
});

serve({ fetch: app.fetch, port: 3000 }, () => console.log("Listening on http://localhost:3000"));
