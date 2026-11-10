import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serve } from "@hono/node-server";
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

// Times already booked.
const bookings: Booking[] = [
  { date: "2026-11-10", start: "09:00", end: "10:00" },
  { date: "2026-11-10", start: "10:00", end: "11:00" },
  { date: "2026-11-11", start: "11:00", end: "12:00" },
];

function addMinutes(time: string, minutes: number): string {
  const total = Number(time.slice(0, 2)) * 60 + Number(time.slice(3)) + minutes;
  return String(Math.floor(total / 60)).padStart(2, "0") + ":" + String(total % 60).padStart(2, "0");
}

const app = new Hono();
app.use(logger());
app.use(cors({ origin: "http://localhost:5173" }));

app.get("/free-times", (c) => {
  const date = c.req.query("date")!;
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
  if (!freeTimes(booking.date, length, hours, bookings).includes(booking.time)) {
    return c.json({ error: "That time is no longer free." }, 409);
  }
  bookings.push({ date: booking.date, start: booking.time, end: addMinutes(booking.time, length) });
  return c.json({ date: booking.date, time: booking.time }, 201);
});

serve({ fetch: app.fetch, port: 3000 }, () => console.log("Listening on http://localhost:3000"));
