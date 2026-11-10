export type OpeningHours = { open: string; close: string } | "closed";
export type Booking = { date: string; start: string; end: string };

function toMinutes(time: string): number {
  const [h, m] = time.split(":");
  return Number(h) * 60 + Number(m);
}

function toTime(minutes: number): string {
  const h = String(Math.floor(minutes / 60)).padStart(2, "0");
  const m = String(minutes % 60).padStart(2, "0");
  return h + ":" + m;
}

// A stretch of time, in minutes from midnight.
type Range = { start: number; end: number };

function toRange(start: string, end: string): Range {
  return { start: toMinutes(start), end: toMinutes(end) };
}

function overlaps(a: Range, b: Range): boolean {
  return a.start < b.end && b.start < a.end;
}

// Free start times on one day, for a visit of the given length.
export function freeTimes(
  date: string,
  length: number,
  hours: Record<number, OpeningHours>,
  bookings: Booking[],
): string[] {
  const weekday = new Date(date + "T12:00").getDay();
  const open = hours[weekday];
  if (open === "closed") return [];
  const taken = bookings.filter((b) => b.date === date);
  const times = [];
  for (let start = toMinutes(open.open); start + length <= toMinutes(open.close); start += 30) {
    const visit = { start, end: start + length };
    const clash = taken.some((b) => overlaps(visit, toRange(b.start, b.end)));
    if (!clash) times.push(toTime(start));
  }
  return times;
}

// The first free time after the given day, looking up to two weeks ahead.
export function nearestFreeTime(
  date: string,
  length: number,
  hours: Record<number, OpeningHours>,
  bookings: Booking[],
): { date: string; time: string } | null {
  const day = new Date(date + "T12:00");
  for (let i = 1; i <= 14; i++) {
    day.setDate(day.getDate() + 1);
    const next = day.toISOString().slice(0, 10);
    const times = freeTimes(next, length, hours, bookings);
    if (times.length > 0) return { date: next, time: times[0] };
  }
  return null;
}
