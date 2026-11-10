import { createServer } from "node:http";
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

const server = createServer((request, response) => {
  const url = new URL(request.url!, "http://localhost");
  console.log(request.method, url.pathname + url.search);

  // The page on localhost:5173 may read our answers.
  response.setHeader("Access-Control-Allow-Origin", "http://localhost:5173");

  if (request.method === "GET" && url.pathname === "/free-times") {
    const date = url.searchParams.get("date")!;
    const length = lengths[url.searchParams.get("service")!];
    const closed = hours[new Date(date + "T12:00").getDay()] === "closed";
    const answer = {
      closed,
      times: freeTimes(date, length, hours, bookings),
      nearest: closed ? nearestFreeTime(date, length, hours, bookings) : null,
    };
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify(answer));
    return;
  }

  response.writeHead(404, { "Content-Type": "application/json" });
  response.end(JSON.stringify({ error: "Not found" }));
});

server.listen(3000, () => console.log("Listening on http://localhost:3000"));
